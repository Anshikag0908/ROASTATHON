import type { TargetMetadata } from '../core/types.js';

export interface LifecycleScript {
  name: string;
  command: string;
}

export interface ManifestSummary {
  name: string;
  version: string;
  description?: string;
  main?: string;
  bin?: Record<string, string> | string;
  scripts: Record<string, string>;
  lifecycleScripts: LifecycleScript[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  repository?: string;
  license?: string;
}

export interface FetchedPackage {
  target: TargetMetadata;
  extractedDir: string;
  manifest: ManifestSummary;
  tarballPath?: string;
  integrityHash: string;
  cleanup: () => Promise<void>;
}
