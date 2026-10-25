/**
 * mcpguard core data models
 * Based on Section 3.3 of IMPLEMENTATION_PLAN.md
 */

export type FindingSource = 'static' | 'llm' | 'sandbox';
export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type FindingConfidence = 'low' | 'medium' | 'high';

export interface FindingEvidence {
  file?: string;
  line?: number;
  snippet?: string;
  eventRefs?: string[];
}

export interface Finding {
  id: string; // e.g. "STATIC-SENSITIVE-PATH-001", "SANDBOX-EXFIL-D1"
  source: FindingSource;
  severity: FindingSeverity;
  rule: string;
  title: string;
  description: string;
  evidence: FindingEvidence;
  confidence: FindingConfidence;
}

export type SandboxEventKind =
  | 'canary_file_access'
  | 'net_dns'
  | 'net_connect'
  | 'canary_in_payload'
  | 'process_spawn'
  | 'lifecycle_script'
  | 'tool_call'
  | 'error';

export interface SandboxEvent {
  ts: number;
  kind: SandboxEventKind;
  detail: Record<string, unknown>;
}

export type Verdict = 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';

export interface TargetMetadata {
  name: string;
  version?: string;
  integrity?: string;
  ecosystem: 'npm' | 'local';
  resolvedPath?: string;
}

export interface SandboxExecutionSummary {
  ran: boolean;
  completed: boolean;
  durationMs: number;
  events: SandboxEvent[];
  toolsDiscovered: string[];
  toolsCalled: string[];
}

export interface LLMTriageSummary {
  used: boolean;
  provider?: string;
  model?: string;
  suspicions: string[];
}

export interface ScanResult {
  target: TargetMetadata;
  rulesetVersion: string;
  mcpguardVersion: string;
  findings: Finding[];
  sandbox: SandboxExecutionSummary;
  llm: LLMTriageSummary;
  verdict: Verdict;
  verdictReasons: string[];
}

export interface Config {
  sandboxTimeoutMs: number;
  toolTimeoutMs: number;
  sandboxCpuLimit: string;
  sandboxMemoryLimit: string;
  sandboxPidLimit: number;
  sandboxImage: string;
  sinkImage: string;
  networkAllowlist: string[];
  llmProvider: string;
  llmModel: string;
  llmMaxTokens: number;
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  logLevel: string;
  dashboardPort: number;
}

export interface StageStartEvent {
  stage: string;
  target: string;
}

export interface StageProgressEvent {
  stage: string;
  message: string;
  detail?: unknown;
}

export interface StageCompleteEvent {
  stage: string;
  status: 'success' | 'warn' | 'error';
  message?: string;
}

export interface ScanEventsMap {
  'stage:start': StageStartEvent;
  'stage:progress': StageProgressEvent;
  'stage:complete': StageCompleteEvent;
  'finding:discovered': Finding;
  'sandbox:event': SandboxEvent;
  'scan:complete': ScanResult;
}
