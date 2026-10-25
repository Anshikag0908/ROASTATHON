import type { Config } from '../core/types.js';
import type { LLMProvider } from './providers/interface.js';
import { GeminiProvider } from './providers/gemini.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';

export function createLLMProvider(config: Config): LLMProvider | null {
  const provider = (config.llmProvider || 'gemini').toLowerCase();

  switch (provider) {
    case 'gemini': {
      if (!config.geminiApiKey) return null;
      return new GeminiProvider(config.geminiApiKey, config.llmModel || 'gemini-2.0-flash');
    }
    case 'openai': {
      if (!config.openaiApiKey) return null;
      return new OpenAIProvider(config.openaiApiKey, config.llmModel || 'gpt-4o');
    }
    case 'anthropic': {
      if (!config.anthropicApiKey) return null;
      return new AnthropicProvider(config.anthropicApiKey, config.llmModel || 'claude-3-5-sonnet-20241022');
    }
    default:
      return null;
  }
}
