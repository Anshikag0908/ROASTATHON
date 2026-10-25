import type { LLMGenerateOptions } from '../types.js';

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  generate(systemPrompt: string, userPrompt: string, options?: LLMGenerateOptions): Promise<string>;
}
