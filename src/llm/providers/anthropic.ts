import type { LLMProvider } from './interface.js';
import type { LLMGenerateOptions } from '../types.js';

export class AnthropicProvider implements LLMProvider {
  public readonly name = 'anthropic';
  public readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';

    const body = {
      model: this.model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.1,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const textPart = data?.content?.find((part: any) => part.type === 'text');
    if (!textPart?.text) {
      throw new Error('Anthropic API returned empty message content');
    }

    return textPart.text;
  }
}
