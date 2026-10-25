import type { Finding, FindingSeverity, FindingConfidence } from '../core/types.js';
import type { ManifestSummary } from '../fetch/types.js';

export interface StaticRuleContext {
  filePath: string;
  relativePath: string;
  content: string;
  lines: string[];
  manifest?: ManifestSummary;
  networkAllowlist?: string[];
}

export interface StaticRule {
  id: string;
  family: string;
  name: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  description: string;
  falsePositiveNotes: string;
  check: (ctx: StaticRuleContext) => Finding[];
}
