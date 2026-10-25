import type { FindingSeverity, FindingConfidence, Finding } from '../core/types.js';

export interface LLMSuspicion {
  title: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  rationale: string;
  referencedFindingIds?: string[];
  referencedFiles?: string[];
}

export interface LLMTriageResponse {
  suspicions: LLMSuspicion[];
}

export interface TriageInputContext {
  packageName: string;
  packageVersion?: string;
  manifestSummary?: {
    main?: string;
    bin?: string | Record<string, string>;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
  };
  staticFindings: Finding[];
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
  }>;
  codeSnippets?: Array<{
    file: string;
    line?: number;
    snippet: string;
  }>;
}

export interface LLMTriageResult {
  used: boolean;
  provider?: string;
  model?: string;
  suspicions: LLMSuspicion[];
  findings: Finding[];
  error?: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
}
