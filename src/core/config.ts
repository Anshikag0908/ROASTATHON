import dotenv from 'dotenv';
import type { Config } from './types.js';

// Load .env if present (without failing if missing)
dotenv.config();

export const DEFAULT_CONFIG: Config = {
  sandboxTimeoutMs: 30_000,
  toolTimeoutMs: 5_000,
  sandboxCpuLimit: '0.5',
  sandboxMemoryLimit: '512m',
  sandboxPidLimit: 64,
  sandboxImage: 'node:20-alpine',
  sinkImage: 'mcpguard-sink:latest',
  networkAllowlist: [],
  llmProvider: 'gemini',
  llmModel: 'gemini-2.0-flash',
  llmMaxTokens: 2048,
  logLevel: 'info',
  dashboardPort: 3100,
};

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const env = process.env;

  const networkAllowlist = env.MCPGUARD_NETWORK_ALLOWLIST
    ? env.MCPGUARD_NETWORK_ALLOWLIST.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_CONFIG.networkAllowlist;

  const config: Config = {
    sandboxTimeoutMs: env.MCPGUARD_SANDBOX_TIMEOUT_MS
      ? parseInt(env.MCPGUARD_SANDBOX_TIMEOUT_MS, 10)
      : DEFAULT_CONFIG.sandboxTimeoutMs,
    toolTimeoutMs: env.MCPGUARD_TOOL_TIMEOUT_MS
      ? parseInt(env.MCPGUARD_TOOL_TIMEOUT_MS, 10)
      : DEFAULT_CONFIG.toolTimeoutMs,
    sandboxCpuLimit: env.MCPGUARD_SANDBOX_CPU_LIMIT || DEFAULT_CONFIG.sandboxCpuLimit,
    sandboxMemoryLimit: env.MCPGUARD_SANDBOX_MEMORY_LIMIT || DEFAULT_CONFIG.sandboxMemoryLimit,
    sandboxPidLimit: env.MCPGUARD_SANDBOX_PID_LIMIT
      ? parseInt(env.MCPGUARD_SANDBOX_PID_LIMIT, 10)
      : DEFAULT_CONFIG.sandboxPidLimit,
    sandboxImage: env.MCPGUARD_SANDBOX_IMAGE || DEFAULT_CONFIG.sandboxImage,
    sinkImage: env.MCPGUARD_SINK_IMAGE || DEFAULT_CONFIG.sinkImage,
    networkAllowlist,
    llmProvider: env.MCPGUARD_LLM_PROVIDER || DEFAULT_CONFIG.llmProvider,
    llmModel: env.MCPGUARD_LLM_MODEL || DEFAULT_CONFIG.llmModel,
    llmMaxTokens: env.MCPGUARD_LLM_MAX_TOKENS
      ? parseInt(env.MCPGUARD_LLM_MAX_TOKENS, 10)
      : DEFAULT_CONFIG.llmMaxTokens,
    geminiApiKey: env.GEMINI_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    logLevel: env.MCPGUARD_LOG_LEVEL || DEFAULT_CONFIG.logLevel,
    dashboardPort: env.MCPGUARD_DASHBOARD_PORT
      ? parseInt(env.MCPGUARD_DASHBOARD_PORT, 10)
      : DEFAULT_CONFIG.dashboardPort,
    ...overrides,
  };

  return config;
}
