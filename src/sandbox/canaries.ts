import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface CanarySecrets {
  runId: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  sshKeyToken: string;
  sshPrivateKey: string;
  envSecret: string;
  githubToken: string;
}

export function generateCanaries(runId?: string): CanarySecrets {
  const id = runId || crypto.randomBytes(4).toString('hex');
  const rand16 = crypto.randomBytes(8).toString('hex').toUpperCase();
  const rand40 = crypto.randomBytes(30).toString('base64');
  const sshUuid = crypto.randomUUID();
  const envHex = crypto.randomBytes(16).toString('hex');
  const ghToken = 'ghp_' + crypto.randomBytes(18).toString('hex');

  // Format-valid OpenSSH private key with embedded unique canary UUID
  const sshPrivateKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEA${Buffer.from(sshUuid).toString('base64')}mcpguard-canary-${id}
-----END OPENSSH PRIVATE KEY-----\n`;

  return {
    runId: id,
    awsAccessKeyId: `AKIA${rand16}`,
    awsSecretAccessKey: rand40,
    sshKeyToken: sshUuid,
    sshPrivateKey,
    envSecret: `SECRET_${envHex}`,
    githubToken: ghToken,
  };
}

export async function plantCanaryFiles(homeDir: string, canaries: CanarySecrets): Promise<string[]> {
  const plantedPaths: string[] = [];

  // 1. ~/.aws/credentials
  const awsDir = path.join(homeDir, '.aws');
  await fs.mkdir(awsDir, { recursive: true });
  const awsCredsPath = path.join(awsDir, 'credentials');
  const awsConfigPath = path.join(awsDir, 'config');
  const awsCredsContent = `[default]\naws_access_key_id = ${canaries.awsAccessKeyId}\naws_secret_access_key = ${canaries.awsSecretAccessKey}\n`;
  const awsConfigContent = `[default]\nregion = us-east-1\noutput = json\n`;
  await fs.writeFile(awsCredsPath, awsCredsContent, { mode: 0o600 });
  await fs.writeFile(awsConfigPath, awsConfigContent, { mode: 0o600 });
  plantedPaths.push(awsCredsPath, awsConfigPath);

  // 2. ~/.ssh/id_rsa
  const sshDir = path.join(homeDir, '.ssh');
  await fs.mkdir(sshDir, { recursive: true });
  const sshKeyPath = path.join(sshDir, 'id_rsa');
  await fs.writeFile(sshKeyPath, canaries.sshPrivateKey, { mode: 0o600 });
  plantedPaths.push(sshKeyPath);

  // 3. ~/.env
  const homeEnvPath = path.join(homeDir, '.env');
  const homeEnvContent = `DATABASE_URL=postgres://app:secret@db.internal:5432/prod\nAPI_SECRET=${canaries.envSecret}\nGITHUB_TOKEN=${canaries.githubToken}\n`;
  await fs.writeFile(homeEnvPath, homeEnvContent, { mode: 0o600 });
  plantedPaths.push(homeEnvPath);

  return plantedPaths;
}

export interface CanaryMatch {
  canaryName: string;
  matchedValue: string;
  encoding: 'plain' | 'base64' | 'hex';
}

export function findCanariesInPayload(payload: string, canaries: CanarySecrets): CanaryMatch[] {
  if (!payload || typeof payload !== 'string') return [];

  const matches: CanaryMatch[] = [];
  const searchValues: Array<{ name: string; value: string }> = [
    { name: 'AWS_ACCESS_KEY_ID', value: canaries.awsAccessKeyId },
    { name: 'AWS_SECRET_ACCESS_KEY', value: canaries.awsSecretAccessKey },
    { name: 'SSH_KEY_TOKEN', value: canaries.sshKeyToken },
    { name: 'ENV_SECRET', value: canaries.envSecret },
    { name: 'GITHUB_TOKEN', value: canaries.githubToken },
  ];

  for (const { name, value } of searchValues) {
    if (!value || value.length < 8) continue;

    // Plain match
    if (payload.includes(value)) {
      matches.push({ canaryName: name, matchedValue: value, encoding: 'plain' });
      continue;
    }

    // Base64 match
    const b64 = Buffer.from(value).toString('base64');
    if (payload.includes(b64)) {
      matches.push({ canaryName: name, matchedValue: value, encoding: 'base64' });
      continue;
    }

    // Hex match
    const hex = Buffer.from(value).toString('hex');
    if (payload.includes(hex)) {
      matches.push({ canaryName: name, matchedValue: value, encoding: 'hex' });
      continue;
    }
  }

  return matches;
}
