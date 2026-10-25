# mcpguard

> **Guard your machine before installing Model Context Protocol (MCP) servers.**
> Replaces blind MCP server installation with static analysis, LLM triage, and isolated Docker behavioral sandboxing with planted canary secrets.

---

> [!WARNING]
> **Honest Security Notice**: `SAFE` means no malicious behavior was observed in this bounded run. It is **not** a guarantee or mathematical proof of safety. Time-bombed, evasion-aware, or environment-dependent malware can potentially evade detection.

---

## The Problem

MCP servers run locally with standard user privileges. Installing an unvetted MCP server presents major attack surfaces:
1. **Local Privilege Abuse**: Servers execute on your local machine and can access sensitive directories (`~/.ssh`, `~/.aws`, `.env`, tokens).
2. **Tool Poisoning & Prompt Injection**: Malicious instructions embedded in tool descriptions or tool outputs can manipulate host LLMs into exfiltrating credentials or executing arbitrary code.
3. **Supply Chain Risks**: A package that was safe initially can be updated maliciously later or exploit unpinned dependencies.

---

## The Solution

`mcpguard` implements a multi-layer defense pipeline:

```
Target (npm / path)
       │
       ▼
 1. Fetch & Inspect     ──► Extract to isolated temp dir; parse manifest & entry points (no execution)
       │
       ▼
 2. Static Checks       ──► AST & regex rules (obfuscation, sensitive paths, env harvesting, injection)
       │
       ▼
 3. LLM Triage          ──► Structured review of tool schemas & high-risk static findings (untrusted data framing)
       │
       ▼
 4. Sandbox Test        ──► Isolated internal Docker network, planted canary secrets, DNS/HTTP sink, tool exercising
       │
       ▼
 5. Verdict Engine      ──► Deterministic decision: SAFE, SUSPICIOUS, or DANGEROUS
       │
       ▼
 6. Report / Gate       ──► Terminal report, JSON output, optional HTML dashboard; blocks install on DANGEROUS
```

---

## Current Feature Status

| Feature | Status | Notes |
|---|---|---|
| CLI skeleton (`scan`, `doctor`) | **Complete** | Phase 1 (exit codes, terminal & JSON reports, event bus) |
| Test fixtures (benign + malicious servers) | **Complete** | Phase 1 (benign, exfil, poisoned-description, postinstall) |
| Fetch & inspect (npm packages) | **Complete** | Phase 2 (registry resolution, hash verification, safe extraction) |
| Docker sandbox + canary secrets + monitoring | **Complete** | Phase 3 (canaries planted, inotify/stats, network sink capture) |
| MCP client harness (initialize, list tools, call tools) | **Complete** | Phase 3 (stdio JSON-RPC driver, schema arg generation) |
| Verdict engine | **Complete** | Phase 3 (D1, D2, D3, fail-closed incomplete analysis) |
| Terminal report + JSON output | **Complete** | Phase 3 (evidence citation, formatted verdicts, clean JSON) |
| Static checks | **Planned** | Phase 4 |
| LLM triage | **Planned** | Phase 5 |
| `install` gating | **Planned** | Phase 6 |
| Result caching | **Planned** | Phase 7 |
| HTML report / live dashboard | **Planned** | Phase 7 |
| PyPI / other ecosystems | **Planned (post-hackathon)** | Out of current MVP |
| Version-diff / "rug-pull" detection | **Planned (post-hackathon)** | Out of current MVP |

---

## Getting Started & Usage

### 1. Run Diagnostics
Check your local environment, Node.js version, and Docker engine status:
```bash
node dist/cli/index.js doctor
```

### 2. Scan an MCP Server Target
Scan a local server directory or test fixture:
```bash
# Formatted terminal output
node dist/cli/index.js scan fixtures/benign-server

# Machine-readable JSON output
node dist/cli/index.js scan fixtures/benign-server --json

# Save report to a file
node dist/cli/index.js scan fixtures/benign-server --report scan-report.json
```

### 3. Run Test Suite
```bash
npm test
```

---

## Known Limitations

- **Bounded Analysis**: Detects clear, observable hostile activity in a bounded test run; cannot detect dormant or time-delayed malware that does not trigger.
- **Docker Isolation Boundaries**: Standard container isolation is not a perfect security boundary against kernel-level exploits; disposable testing environments are recommended for untrusted samples.
- **HTTPS Inspection**: In MVP, network monitoring detects host names, DNS queries, and TLS SNI without decrypting HTTPS traffic.
- **Scope**: Current MVP targets npm-based stdio MCP servers and local filesystem targets.
- **LLM Limits**: LLM triage assists in spotting suspicious patterns and raising alarms, but can never clear findings or lower severities.

---

## Setup & Prerequisites

- Node.js (v20+) and npm
- Docker engine (for isolated sandbox containers in Phase 3+)
- Optional: `GEMINI_API_KEY` (or OpenAI/Anthropic) in `.env` for LLM triage (runs with `--no-llm` fallback when absent)

---

## License

MIT

