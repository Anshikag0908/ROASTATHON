import type { LLMProvider } from './interface.js';
import type { LLMGenerateOptions } from '../types.js';

export class OpenAIProvider implements LLMProvider {
  public readonly name = 'openai';
  public readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2048,
      response_format: { type: 'json_object' },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI API returned empty completion');
    }

    return content;
  }
}
