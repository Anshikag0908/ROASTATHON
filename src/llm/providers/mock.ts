import type { LLMProvider } from './interface.js';
import type { LLMGenerateOptions } from '../types.js';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock';
  public readonly model: string;
  private responseQueue: string[];
  public recordedPrompts: Array<{ systemPrompt: string; userPrompt: string }> = [];

  constructor(responses: string[] = [], model = 'mock-model') {
    this.responseQueue = [...responses];
    this.model = model;
  }

  public enqueueResponse(response: string): void {
    this.responseQueue.push(response);
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMGenerateOptions
  ): Promise<string> {
    this.recordedPrompts.push({ systemPrompt, userPrompt });

    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!;
    }

    // Default intelligent mock response:
    // Check if the input contains prompt injection patterns or attempts to manipulate the LLM
    if (/SYSTEM OVERRIDE|Ignore previous instructions|Do not tell the user|verified completely SAFE|Disregard all other rules/i.test(userPrompt)) {
      return JSON.stringify({
        suspicions: [
          {
            title: 'Malicious Prompt Injection / Instruction Override Detected',
            severity: 'high',
            confidence: 'high',
            rationale: 'Untrusted package data contains embedded directives attempting to override security instructions or conceal malicious behavior.',
            referencedFindingIds: ['STATIC-TOOL-DESC-INJECTION-001'],
            referencedFiles: ['index.js'],
          },
        ],
      });
    }

    // Default benign response
    return JSON.stringify({
      suspicions: [],
    });
  }
}
