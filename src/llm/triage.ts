import type { Finding, FindingSeverity, FindingConfidence } from '../core/types.js';
import type { LLMProvider } from './providers/interface.js';
import type { TriageInputContext, LLMTriageResult, LLMSuspicion, LLMTriageResponse } from './types.js';
import { SYSTEM_PROMPT, buildTriageUserPrompt, buildRetryPrompt } from './prompt.js';

const VALID_SEVERITIES = new Set<FindingSeverity>(['low', 'medium', 'high', 'critical']);
const VALID_CONFIDENCES = new Set<FindingConfidence>(['low', 'medium', 'high']);

export class LLMTriager {
  private readonly provider: LLMProvider | null;
  private readonly maxTokens: number;

  constructor(provider: LLMProvider | null, maxTokens = 2048) {
    this.provider = provider;
    this.maxTokens = maxTokens;
  }

  public async triage(ctx: TriageInputContext): Promise<LLMTriageResult> {
    if (!this.provider) {
      return {
        used: false,
        suspicions: [],
        findings: [],
      };
    }

    const userPrompt = buildTriageUserPrompt(ctx);
    let rawOutput = '';
    let parsed: LLMTriageResponse | null = null;
    let triageError: string | undefined;

    try {
      rawOutput = await this.provider.generate(SYSTEM_PROMPT, userPrompt, {
        temperature: 0.1,
        maxTokens: this.maxTokens,
      });

      parsed = this.parseAndValidate(rawOutput);
    } catch (firstErr) {
      // Retry once policy
      const errMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      try {
        const retryPrompt = buildRetryPrompt(rawOutput, errMsg);
        const retryOutput = await this.provider.generate(SYSTEM_PROMPT, retryPrompt, {
          temperature: 0.1,
          maxTokens: this.maxTokens,
        });
        parsed = this.parseAndValidate(retryOutput);
      } catch (retryErr) {
        triageError = `LLM triage failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`;
      }
    }

    if (!parsed) {
      return {
        used: true,
        provider: this.provider.name,
        model: this.provider.model,
        suspicions: [],
        findings: [],
        error: triageError || 'LLM triage produced invalid response format',
      };
    }

    // Convert suspicions to formal mcpguard Finding objects
    // Guardrail: LLM findings can only add suspicions or raise alarms.
    const findings: Finding[] = parsed.suspicions.map((s, idx) => {
      const isInjection = /prompt injection|instruction override|system override|adversarial instruction/i.test(
        s.title + ' ' + s.rationale
      );

      return {
        id: `LLM-SUSPICION-${String(idx + 1).padStart(3, '0')}`,
        source: 'llm',
        severity: s.severity,
        rule: isInjection ? 'LLM-PROMPT-INJECTION' : 'LLM-CONTEXTUAL-SUSPICION',
        title: s.title,
        description: s.rationale,
        evidence: {
          file: s.referencedFiles?.[0],
          snippet: s.referencedFindingIds?.join(', ') || undefined,
        },
        confidence: s.confidence,
      };
    });

    return {
      used: true,
      provider: this.provider.name,
      model: this.provider.model,
      suspicions: parsed.suspicions,
      findings,
    };
  }

  private parseAndValidate(raw: string): LLMTriageResponse {
    let clean = raw.trim();

    // Strip markdown fences if the model erroneously included them
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const data = JSON.parse(clean);
    if (!data || typeof data !== 'object') {
      throw new Error('Response is not a JSON object');
    }

    if (!Array.isArray(data.suspicions)) {
      throw new Error('Response is missing "suspicions" array');
    }

    const validatedSuspicions: LLMSuspicion[] = [];
    for (const item of data.suspicions) {
      if (!item || typeof item !== 'object') continue;

      const title = typeof item.title === 'string' && item.title ? item.title : 'Suspicious pattern identified by LLM';
      const rationale = typeof item.rationale === 'string' ? item.rationale : '';
      
      const rawSev = typeof item.severity === 'string' ? item.severity.toLowerCase() : 'medium';
      const severity: FindingSeverity = VALID_SEVERITIES.has(rawSev as FindingSeverity)
        ? (rawSev as FindingSeverity)
        : 'medium';

      const rawConf = typeof item.confidence === 'string' ? item.confidence.toLowerCase() : 'medium';
      const confidence: FindingConfidence = VALID_CONFIDENCES.has(rawConf as FindingConfidence)
        ? (rawConf as FindingConfidence)
        : 'medium';

      validatedSuspicions.push({
        title,
        severity,
        confidence,
        rationale,
        referencedFindingIds: Array.isArray(item.referencedFindingIds) ? item.referencedFindingIds : [],
        referencedFiles: Array.isArray(item.referencedFiles) ? item.referencedFiles : [],
      });
    }

    return { suspicions: validatedSuspicions };
  }
}
