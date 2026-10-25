import type { LLMProvider } from './interface.js';
import type { LLMGenerateOptions } from '../types.js';

export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  public readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        maxOutputTokens: options.maxTokens ?? 2048,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini API returned empty candidate response');
    }

    return candidateText;
  }
}
