import type { Finding, SandboxExecutionSummary, Verdict } from '../core/types.js';

export interface VerdictEvaluation {
  verdict: Verdict;
  reasons: string[];
  newFindings: Finding[];
}

export class VerdictEngine {
  public evaluate(
    findings: Finding[],
    sandbox: SandboxExecutionSummary,
    networkAllowlist: string[] = []
  ): VerdictEvaluation {
    const reasons: string[] = [];
    const newFindings: Finding[] = [];

    // Check sandbox events
    const hasCanaryInPayload = sandbox.events.some((e) => e.kind === 'canary_in_payload');
    const hasCanaryFileAccess = sandbox.events.some((e) => e.kind === 'canary_file_access');
    const netConnectEvents = sandbox.events.filter((e) => e.kind === 'net_connect' || e.kind === 'net_dns');
    const hasNetworkEgress = netConnectEvents.length > 0;

    // Check static / LLM findings
    const staticInjectionHigh = findings.find(
      (f) => f.rule === 'TOOL-DESC-INJECTION' && f.confidence === 'high'
    );
    const llmFlaggedInjection = findings.find(
      (f) => f.source === 'llm' && /injection|prompt override|malicious instruction/i.test(f.title + ' ' + f.description)
    );

    // ==========================================
    // 1. DANGEROUS Rules (Top-Down, First Match)
    // ==========================================

    // D1: A canary value appears in outbound traffic (confirmed exfiltration attempt)
    if (hasCanaryInPayload) {
      const finding: Finding = {
        id: 'SANDBOX-EXFIL-D1',
        source: 'sandbox',
        severity: 'critical',
        rule: 'CANARY-EXFILTRATION',
        title: 'Planted canary secret exfiltrated in network payload',
        description: 'Target transmitted planted confidential canary secrets in an outbound network request.',
        evidence: {
          eventRefs: ['canary_in_payload'],
          snippet: 'Canary credentials matched in captured traffic.',
        },
        confidence: 'high',
      };
      newFindings.push(finding);
      reasons.push('[D1] Confirmed exfiltration attempt: Planted canary secret detected in outbound network payload.');
      return { verdict: 'DANGEROUS', reasons, newFindings };
    }

    // D2: Canary file accessed AND outbound connection in the same run
    if (hasCanaryFileAccess && hasNetworkEgress) {
      const finding: Finding = {
        id: 'SANDBOX-EXFIL-D2',
        source: 'sandbox',
        severity: 'critical',
        rule: 'CANARY-ACCESS-WITH-EGRESS',
        title: 'Canary file read and outbound connection observed in same run',
        description: 'Server accessed planted sensitive credential files and attempted outbound network communication.',
        evidence: {
          eventRefs: ['canary_file_access', 'net_connect'],
        },
        confidence: 'high',
      };
      newFindings.push(finding);
      reasons.push('[D2] Canary file access accompanied by outbound network activity.');
      return { verdict: 'DANGEROUS', reasons, newFindings };
    }

    // D3: Static TOOL-DESC-INJECTION (high) AND LLM triage independently flags the same
    if (staticInjectionHigh && llmFlaggedInjection) {
      reasons.push('[D3] Tool description contains confirmed malicious instructions flagged by both static checks and LLM triage.');
      return { verdict: 'DANGEROUS', reasons, newFindings };
    }

    // Critical static or LLM findings
    const criticalFinding = findings.find((f) => f.severity === 'critical');
    if (criticalFinding) {
      reasons.push(`Critical security finding detected: ${criticalFinding.title} (${criticalFinding.id})`);
      return { verdict: 'DANGEROUS', reasons, newFindings };
    }

    // ==========================================
    // 2. SUSPICIOUS Rules (Accumulative)
    // ==========================================
    let isSuspicious = false;

    // Canary file accessed without network activity
    if (hasCanaryFileAccess) {
      isSuspicious = true;
      const finding: Finding = {
        id: 'SANDBOX-CANARY-READ-001',
        source: 'sandbox',
        severity: 'high',
        rule: 'CANARY-FILE-ACCESS',
        title: 'Planted credential canary was accessed by server',
        description: 'Server opened or inspected planted credential files (~/.aws, ~/.ssh, or .env).',
        evidence: { eventRefs: ['canary_file_access'] },
        confidence: 'high',
      };
      newFindings.push(finding);
      reasons.push('Canary credential file was accessed without observable network egress.');
    }

    // Outbound network activity to non-allowlisted destination
    if (hasNetworkEgress) {
      isSuspicious = true;
      reasons.push('Outbound network connection attempts to non-allowlisted destinations observed.');
    }

    // High severity findings
    const highFinding = findings.find((f) => f.severity === 'high');
    if (highFinding) {
      isSuspicious = true;
      reasons.push(`High severity finding detected: ${highFinding.title} (${highFinding.id})`);
    }

    // Analysis incomplete (server crashed, timeout, or no tools exercised) -> Fail closed
    if (!sandbox.ran || !sandbox.completed || sandbox.toolsDiscovered.length === 0) {
      isSuspicious = true;
      const finding: Finding = {
        id: 'SANDBOX-INCOMPLETE-001',
        source: 'sandbox',
        severity: 'medium',
        rule: 'INCOMPLETE-ANALYSIS',
        title: 'Analysis incomplete: server could not be fully exercised',
        description: 'Server failed to start, timed out, or did not expose any tools during sandbox run. Fail-closed policy applied.',
        evidence: { snippet: `Completed: ${sandbox.completed}, Tools: ${sandbox.toolsDiscovered.length}` },
        confidence: 'high',
      };
      newFindings.push(finding);
      reasons.push('Analysis incomplete: Server could not be exercised in sandbox. Fail-closed: Never SAFE.');
    }

    // Medium findings
    const mediumFinding = findings.find((f) => f.severity === 'medium');
    if (mediumFinding) {
      isSuspicious = true;
      reasons.push(`Medium severity finding requires manual verification: ${mediumFinding.title} (${mediumFinding.id})`);
    }

    if (isSuspicious) {
      return { verdict: 'SUSPICIOUS', reasons, newFindings };
    }

    // ==========================================
    // 3. SAFE (Only if all conditions hold)
    // ==========================================
    reasons.push('Sandbox execution completed successfully; no canary access, unexpected egress, or suspicious instructions observed.');
    return { verdict: 'SAFE', reasons, newFindings };
  }
}
