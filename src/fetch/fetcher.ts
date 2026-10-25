import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as tar from 'tar';
import { parseManifest } from './manifest.js';
import { computeBufferHash, verifyIntegrity } from './integrity.js';
import type { FetchedPackage, ManifestSummary } from './types.js';
import type { TargetMetadata } from '../core/types.js';

export interface PackageSpecifier {
  name: string;
  version?: string;
}

export function parsePackageSpecifier(input: string): PackageSpecifier {
  const trimmed = input.trim();

  // Scoped package: @scope/name or @scope/name@version
  if (trimmed.startsWith('@')) {
    const slashIdx = trimmed.indexOf('/');
    if (slashIdx === -1) {
      throw new Error(`Invalid scoped package specifier: ${trimmed}`);
    }
    const atIdx = trimmed.indexOf('@', slashIdx);
    if (atIdx !== -1) {
      return {
        name: trimmed.slice(0, atIdx),
        version: trimmed.slice(atIdx + 1),
      };
    }
    return { name: trimmed };
  }

  // Non-scoped: name or name@version
  const atIdx = trimmed.indexOf('@');
  if (atIdx !== -1) {
    return {
      name: trimmed.slice(0, atIdx),
      version: trimmed.slice(atIdx + 1),
    };
  }

  return { name: trimmed };
}

export class PackageFetcher {
  private tempBaseDir: string;

  constructor(tempBaseDir = path.resolve('temp')) {
    this.tempBaseDir = tempBaseDir;
  }

  /**
   * Fetches and inspects either a local path or an npm package name.
   * STRICT SAFETY GUARANTEE: No package code or lifecycle scripts are ever executed.
   */
  public async fetchAndInspect(targetInput: string): Promise<FetchedPackage> {
    const isLocal = await this.isLocalPath(targetInput);

    if (isLocal) {
      return this.inspectLocal(targetInput);
    } else {
      return this.fetchFromNpm(targetInput);
    }
  }

  private async inspectLocal(localPath: string): Promise<FetchedPackage> {
    const resolved = path.resolve(localPath);
    const pkgJsonPath = path.join(resolved, 'package.json');

    let manifestRaw: Record<string, any> = {};
    try {
      const content = await fs.readFile(pkgJsonPath, 'utf8');
      manifestRaw = JSON.parse(content);
    } catch {
      manifestRaw = {
        name: path.basename(resolved),
        version: '0.0.0',
      };
    }

    const manifest = parseManifest(manifestRaw);
    const target: TargetMetadata = {
      name: manifest.name,
      version: manifest.version,
      ecosystem: 'local',
      resolvedPath: resolved,
    };

    return {
      target,
      extractedDir: resolved,
      manifest,
      integrityHash: 'local-directory',
      cleanup: async () => {}, // No-op for local directories
    };
  }

  private async fetchFromNpm(pkgSpecInput: string): Promise<FetchedPackage> {
    const spec = parsePackageSpecifier(pkgSpecInput);
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(spec.name).replace('%40', '@')}`;

    const res = await fetch(registryUrl, {
      headers: {
        Accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Package "${spec.name}" not found in npm registry.`);
      }
      throw new Error(`Failed to query npm registry for "${spec.name}": HTTP ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as any;

    let targetVersion = spec.version;
    if (!targetVersion) {
      targetVersion = data['dist-tags']?.latest;
      if (!targetVersion) {
        throw new Error(`Could not resolve latest version for "${spec.name}".`);
      }
    }

    const versionData = data.versions?.[targetVersion];
    if (!versionData) {
      throw new Error(`Version "${targetVersion}" of "${spec.name}" not found.`);
    }

    const dist = versionData.dist;
    if (!dist || !dist.tarball) {
      throw new Error(`No tarball URL provided in registry for "${spec.name}@${targetVersion}".`);
    }

    const tarballUrl = dist.tarball;
    const expectedIntegrity = dist.integrity || dist.shasum;

    // Create unique temp directory
    const runId = crypto.randomBytes(8).toString('hex');
    const extractDir = path.join(this.tempBaseDir, `scan-${spec.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${runId}`);
    const tarballPath = path.join(extractDir, 'package.tgz');
    const unpackedDir = path.join(extractDir, 'package');

    await fs.mkdir(extractDir, { recursive: true });

    // Download tarball into memory buffer
    const tarballRes = await fetch(tarballUrl);
    if (!tarballRes.ok) {
      await fs.rm(extractDir, { recursive: true, force: true });
      throw new Error(`Failed to download tarball from ${tarballUrl}: HTTP ${tarballRes.status}`);
    }

    const arrayBuffer = await tarballRes.arrayBuffer();
    const tarballBuffer = Buffer.from(arrayBuffer);

    // Verify integrity
    if (expectedIntegrity) {
      const isValid = verifyIntegrity(tarballBuffer, expectedIntegrity);
      if (!isValid) {
        await fs.rm(extractDir, { recursive: true, force: true });
        throw new Error(`Integrity verification failed for ${spec.name}@${targetVersion}. Expected: ${expectedIntegrity}`);
      }
    }

    await fs.writeFile(tarballPath, tarballBuffer);
    await fs.mkdir(unpackedDir, { recursive: true });

    // Extract tarball safely using tar (which strips path traversal)
    await tar.x({
      file: tarballPath,
      cwd: unpackedDir,
      strip: 1, // npm tarballs have root folder named 'package/'
    });

    // Read extracted package.json
    let extractedManifest: ManifestSummary;
    try {
      const pkgContent = await fs.readFile(path.join(unpackedDir, 'package.json'), 'utf8');
      extractedManifest = parseManifest(JSON.parse(pkgContent));
    } catch {
      extractedManifest = parseManifest(versionData);
    }

    const computedIntegrity = computeBufferHash(tarballBuffer, 'sha512');
    const target: TargetMetadata = {
      name: spec.name,
      version: targetVersion,
      integrity: expectedIntegrity || computedIntegrity,
      ecosystem: 'npm',
      resolvedPath: unpackedDir,
    };

    return {
      target,
      extractedDir: unpackedDir,
      manifest: extractedManifest,
      tarballPath,
      integrityHash: computedIntegrity,
      cleanup: async () => {
        try {
          await fs.rm(extractDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      },
    };
  }

  private async isLocalPath(input: string): Promise<boolean> {
    if (
      input.startsWith('.') ||
      input.startsWith('/') ||
      input.startsWith('\\') ||
      /^[a-zA-Z]:\\/.test(input) ||
      input.includes(path.sep)
    ) {
      return true;
    }

    try {
      const stats = await fs.stat(path.resolve(input));
      return stats.isDirectory() || stats.isFile();
    } catch {
      return false;
    }
  }
}
