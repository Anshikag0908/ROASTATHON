import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export async function computeFileHash(filePath: string, algorithm: 'sha256' | 'sha512' = 'sha512'): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const hash = crypto.createHash(algorithm).update(buffer).digest('base64');
  return `${algorithm}-${hash}`;
}

export function computeBufferHash(buffer: Buffer, algorithm: 'sha256' | 'sha512' = 'sha512'): string {
  const hash = crypto.createHash(algorithm).update(buffer).digest('base64');
  return `${algorithm}-${hash}`;
}

export function verifyIntegrity(buffer: Buffer, expectedIntegrity: string): boolean {
  if (!expectedIntegrity) return false;

  // NPM integrity format: "<algo>-<base64hash>"
  if (expectedIntegrity.startsWith('sha512-')) {
    const actual = computeBufferHash(buffer, 'sha512');
    return actual === expectedIntegrity;
  }

  if (expectedIntegrity.startsWith('sha256-')) {
    const actual = computeBufferHash(buffer, 'sha256');
    return actual === expectedIntegrity;
  }

  // Fallback for hex shasum (legacy npm shasum is 40-char hex sha1)
  if (expectedIntegrity.length === 40 && /^[0-9a-fA-F]+$/.test(expectedIntegrity)) {
    const actualHex = crypto.createHash('sha1').update(buffer).digest('hex');
    return actualHex.toLowerCase() === expectedIntegrity.toLowerCase();
  }

  return false;
}
