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
| CLI skeleton (`scan`, `doctor`) | **Planned** | Phase 1 |
| Test fixtures (benign + malicious servers) | **Planned** | Phase 1 |
| Fetch & inspect (npm packages) | **Planned** | Phase 2 |
| Docker sandbox + canary secrets + monitoring | **Planned** | Phase 3 |
| MCP client harness (initialize, list tools, call tools) | **Planned** | Phase 3 |
| Verdict engine | **Planned** | Phase 3 |
| Terminal report + JSON output | **Planned** | Phase 3 |
| Static checks | **Planned** | Phase 4 |
| LLM triage | **Planned** | Phase 5 |
| `install` gating | **Planned** | Phase 6 |
| Result caching | **Planned** | Phase 7 |
| HTML report / live dashboard | **Planned** | Phase 7 |
| PyPI / other ecosystems | **Planned (post-hackathon)** | Out of current MVP |
| Version-diff / "rug-pull" detection | **Planned (post-hackathon)** | Out of current MVP |

---

## Known Limitations

- **Bounded Analysis**: Detects clear, observable hostile activity in a bounded test run; cannot detect dormant or time-delayed malware that does not trigger.
- **Docker Isolation Boundaries**: Standard container isolation is not a perfect security boundary against kernel-level exploits; disposable testing environments are recommended for untrusted samples.
- **HTTPS Inspection**: In MVP, network monitoring detects host names, DNS queries, and TLS SNI without decrypting HTTPS traffic.
- **Scope**: Current MVP targets npm-based stdio MCP servers and local filesystem targets.
- **LLM Limits**: LLM triage assists in spotting suspicious patterns and raising alarms, but can never clear findings or lower severities.

---

## Setup & Prerequisites (Planned)

- Node.js (v20+) and npm
- Docker engine running locally (for sandbox and sink containers)
- Optional: LLM API key (Gemini / OpenAI / Anthropic) for triage step (runs with `--no-llm` fallback when absent)

---

## License

ISC / MIT (TBD)
