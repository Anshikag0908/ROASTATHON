import type { ManifestSummary, LifecycleScript } from './types.js';

export const LIFECYCLE_SCRIPT_NAMES = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
  'prepublishOnly',
  'prepack',
  'postpack',
]);

export function parseManifest(raw: Record<string, any>): ManifestSummary {
  const name = typeof raw.name === 'string' ? raw.name : 'unknown-package';
  const version = typeof raw.version === 'string' ? raw.version : '0.0.0';
  const description = typeof raw.description === 'string' ? raw.description : undefined;
  const main = typeof raw.main === 'string' ? raw.main : undefined;
  const bin = raw.bin;

  const scripts: Record<string, string> = {};
  const lifecycleScripts: LifecycleScript[] = [];

  if (raw.scripts && typeof raw.scripts === 'object') {
    for (const [key, val] of Object.entries(raw.scripts)) {
      if (typeof val === 'string') {
        scripts[key] = val;
        if (LIFECYCLE_SCRIPT_NAMES.has(key)) {
          lifecycleScripts.push({ name: key, command: val });
        }
      }
    }
  }

  const dependencies: Record<string, string> = {};
  if (raw.dependencies && typeof raw.dependencies === 'object') {
    for (const [key, val] of Object.entries(raw.dependencies)) {
      if (typeof val === 'string') dependencies[key] = val;
    }
  }

  const devDependencies: Record<string, string> = {};
  if (raw.devDependencies && typeof raw.devDependencies === 'object') {
    for (const [key, val] of Object.entries(raw.devDependencies)) {
      if (typeof val === 'string') devDependencies[key] = val;
    }
  }

  let repository: string | undefined;
  if (typeof raw.repository === 'string') {
    repository = raw.repository;
  } else if (raw.repository && typeof raw.repository === 'object' && typeof raw.repository.url === 'string') {
    repository = raw.repository.url;
  }

  const license = typeof raw.license === 'string' ? raw.license : undefined;

  return {
    name,
    version,
    description,
    main,
    bin,
    scripts,
    lifecycleScripts,
    dependencies,
    devDependencies,
    repository,
    license,
  };
}
