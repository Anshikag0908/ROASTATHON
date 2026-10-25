import fs from 'node:fs/promises';
import type { ScanResult } from '../core/types.js';

export function formatJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export async function writeJsonReport(result: ScanResult, filePath: string): Promise<void> {
  const json = formatJsonReport(result);
  await fs.writeFile(filePath, json, 'utf8');
}
