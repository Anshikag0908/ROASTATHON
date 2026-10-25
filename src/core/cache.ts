import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type { ScanResult, TargetMetadata } from './types.js';

export interface CacheOptions {
  cacheDir?: string;
}

export class ScanCache {
  private readonly cacheDir: string;

  constructor(options: CacheOptions = {}) {
    this.cacheDir = options.cacheDir || path.resolve('.mcpguard', 'cache');
  }

  public computeCacheKey(
    target: TargetMetadata,
    rulesetVersion: string,
    mcpguardVersion: string
  ): string {
    const eco = target.ecosystem || 'npm';
    const name = target.name;
    const version = target.version || '0.0.0';
    const integrity = target.integrity || 'none';

    const rawKey = `${eco}:${name}@${version}:${integrity}:${rulesetVersion}:${mcpguardVersion}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    return hash;
  }

  public isCacheable(result: ScanResult): boolean {
    // Rule: Never cache incomplete runs as final verdicts
    if (!result.sandbox.ran || !result.sandbox.completed) {
      return false;
    }
    if (result.verdictReasons.some((r) => /incomplete|crash|timeout/i.test(r))) {
      return false;
    }
    return true;
  }

  public async get(cacheKey: string): Promise<ScanResult | null> {
    const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data) as ScanResult;
      return parsed;
    } catch {
      return null;
    }
  }

  public async set(cacheKey: string, result: ScanResult): Promise<void> {
    if (!this.isCacheable(result)) {
      return;
    }

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
    } catch {
      // Ignore cache write failure
    }
  }

  public async clear(): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let count = 0;
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }
}
