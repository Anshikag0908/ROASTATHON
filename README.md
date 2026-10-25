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
| Static checks | **Complete** | Phase 4 (7 rules: paths, lifecycle, URLs, exec, eval, env, injection) |
| LLM triage | **Complete** | Phase 5 (untrusted-data framing, Gemini/OpenAI/Anthropic/Mock, schema validation, retry-once, prompt injection defense, D3 rule) |
| `install` gating | **Complete** | Phase 6 (TOCTOU version & integrity verification, DANGEROUS hard-block, SUSPICIOUS gating/--yes, safe client config generation) |
| Result caching | **Complete** | Phase 7 (SHA-256 cache key, fail-closed caching policy, --no-cache bypass) |
| HTML report / live dashboard | **Complete** | Phase 7 (standalone responsive HTML dashboard report, real-time SSE live web dashboard) |
| PyPI / other ecosystems | **Planned (post-hackathon)** | Out of current MVP |
| Version-diff / "rug-pull" detection | **Planned (post-hackathon)** | Out of current MVP |

---

## Implemented Static Rules Catalog

| Rule ID | Family | Severity | Description |
|---|---|---|---|
| `STATIC-SENSITIVE-PATH-001` | `SENSITIVE-PATH` | Medium / High | References to `~/.ssh`, `.aws`, `.env`, `.npmrc`, `.kube`, wallet files (raised to high if network calls present) |
| `STATIC-INSTALL-SCRIPT-001` | `INSTALL-SCRIPT` | Medium / High | Manifest `preinstall`, `install`, `postinstall` scripts (raised to high if remote commands/shell present) |
| `STATIC-NETWORK-DEST-001` | `NETWORK-DEST` | Medium | Hardcoded external IP addresses and non-allowlisted remote URLs |
| `STATIC-EXEC-001` | `EXEC` | Medium | Invocation of `child_process`, `exec`, or `spawn` |
| `STATIC-OBFUSCATION-001` | `OBFUSCATION` | High | Dynamic `eval`, `new Function`, clustered hex escapes, or base64 decoding fed to execution |
| `STATIC-ENV-HARVEST-001` | `ENV-HARVEST` | Medium | Bulk enumeration of `process.env` or access to sensitive credential variable names |
| `STATIC-TOOL-DESC-INJECTION-001` | `TOOL-DESC-INJECTION` | High | Prompt injection patterns and hidden/zero-width unicode characters in tool descriptions and outputs |

---

## Getting Started & Usage

### 1. Run Diagnostics
Check your local environment, Node.js version, and Docker engine status:
```bash
node dist/cli/index.js doctor
```

### 2. Scan an MCP Server Target
Scan a local server directory or test fixture without installing:
```bash
# Formatted terminal output
node dist/cli/index.js scan fixtures/benign-server

# Machine-readable JSON output
node dist/cli/index.js scan fixtures/benign-server --json

# Save report to a file
node dist/cli/index.js scan fixtures/benign-server --report scan-report.json
```

### 3. Safely Gate MCP Server Installation
Verify a server through the full pipeline before installing or adding to your MCP client config:
```bash
# Gated install: blocks DANGEROUS, prompts on SUSPICIOUS, outputs client config on SAFE
node dist/cli/index.js install fixtures/benign-server

# Machine-readable JSON output with verified pinned spec & config snippet
node dist/cli/index.js install fixtures/benign-server --json

# Non-interactive override for CI/automation
node dist/cli/index.js install fixtures/benign-server --yes

# TOCTOU protection: enforce expected version and tarball integrity hash
node dist/cli/index.js install <package> --expected-version 1.0.0 --expected-integrity sha512-...
```

### 4. Interactive HTML Reports & Live Dashboard
Generate a standalone HTML dashboard report or launch the real-time pipeline monitoring dashboard:
```bash
# Save an interactive standalone HTML report
node dist/cli/index.js scan fixtures/benign-server --html scan-report.html

# Launch real-time web dashboard during scan
node dist/cli/index.js scan fixtures/benign-server --dashboard

# Run standalone live dashboard server
node dist/cli/index.js dashboard --port 3100
```

### 5. Result Caching
mcpguard caches clean, completed scan results by package version and tarball integrity hash:
```bash
# Force fresh scan, bypassing cache
node dist/cli/index.js scan fixtures/benign-server --no-cache
```

### 6. Run Test Suite
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

