import fs from 'node:fs/promises';
import type { ScanResult, Finding } from '../core/types.js';
import { sanitizeText } from './sanitize.js';

export function generateHtmlReport(result: ScanResult): string {
  const isSafe = result.verdict === 'SAFE';
  const isDangerous = result.verdict === 'DANGEROUS';
  const isSuspicious = result.verdict === 'SUSPICIOUS';

  const verdictColor = isSafe ? '#10B981' : isDangerous ? '#EF4444' : '#F59E0B';
  const verdictBg = isSafe ? 'rgba(16, 185, 129, 0.12)' : isDangerous ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)';
  const verdictBorder = isSafe ? 'rgba(16, 185, 129, 0.4)' : isDangerous ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  const criticalCount = result.findings.filter((f) => f.severity === 'critical').length;
  const highCount = result.findings.filter((f) => f.severity === 'high').length;
  const mediumCount = result.findings.filter((f) => f.severity === 'medium').length;
  const lowCount = result.findings.filter((f) => f.severity === 'low' || f.severity === 'info').length;

  const targetName = sanitizeText(result.target.name);
  const targetVersion = sanitizeText(result.target.version || '0.0.0');
  const ecosystem = sanitizeText(result.target.ecosystem);
  const integrity = sanitizeText(result.target.integrity || 'N/A');

  const findingsJson = JSON.stringify(result.findings).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mcpguard Report: ${targetName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B0F17;
      --card-bg: rgba(17, 24, 39, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
      --text-dim: #6B7280;
      --primary: #3B82F6;
      --safe: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.6;
      padding: 2.5rem 1.5rem;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.05) 0%, transparent 50%);
      min-height: 100vh;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header Nav */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--card-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 800;
      font-size: 1.4rem;
      letter-spacing: -0.02em;
    }
    .brand-shield {
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    }
    .brand-text span { color: #60A5FA; }
    .scan-timestamp {
      font-size: 0.85rem;
      color: var(--text-dim);
      font-family: var(--mono);
    }

    /* Hero Verdict Banner */
    .verdict-hero {
      background: ${verdictBg};
      border: 1px solid ${verdictBorder};
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px ${verdictBg};
      position: relative;
      overflow: hidden;
    }
    .verdict-hero::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 6px;
      background: ${verdictColor};
    }
    .target-title {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.25rem;
    }
    .target-meta {
      font-size: 0.95rem;
      color: var(--text-muted);
      display: flex;
      gap: 1rem;
      font-family: var(--mono);
    }
    .badge-verdict {
      padding: 0.75rem 2rem;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      border-radius: 10px;
      color: ${verdictColor};
      background: rgba(0, 0, 0, 0.4);
      border: 2px solid ${verdictColor};
      text-transform: uppercase;
      box-shadow: 0 0 25px ${verdictBg};
    }

    /* Grid Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      backdrop-filter: blur(12px);
    }
    .stat-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 700;
      font-family: var(--mono);
    }
    .stat-detail {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    /* Reasons Section */
    .reasons-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(12px);
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .reason-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .reason-item {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid ${verdictColor};
      font-size: 0.95rem;
    }

    /* Findings Filter & List */
    .findings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filters {
      display: flex;
      gap: 0.5rem;
    }
    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 0.4rem 0.9rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-btn.active, .filter-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3B82F6;
      color: #93C5FD;
    }
    .search-box {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: var(--font);
      outline: none;
    }
    .search-box:focus { border-color: #3B82F6; }

    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      backdrop-filter: blur(12px);
      transition: border-color 0.2s;
    }
    .finding-card:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }
    .finding-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .finding-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text);
    }
    .sev-badge {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
      font-family: var(--mono);
    }
    .sev-critical { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444; }
    .sev-high { background: rgba(249, 115, 22, 0.2); color: #FB923C; border: 1px solid #F97316; }
    .sev-medium { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid #F59E0B; }
    .sev-low { background: rgba(59, 130, 246, 0.2); color: #93C5FD; border: 1px solid #3B82F6; }
    .sev-info { background: rgba(107, 114, 128, 0.2); color: #D1D5DB; border: 1px solid #6B7280; }

    .finding-meta {
      font-size: 0.8rem;
      color: var(--text-dim);
      font-family: var(--mono);
      margin-bottom: 0.6rem;
    }
    .finding-desc {
      font-size: 0.92rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .finding-snippet {
      background: #06090F;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 0.75rem;
      font-family: var(--mono);
      font-size: 0.82rem;
      color: #E5E7EB;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Sandbox Events */
    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .events-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      color: var(--text-dim);
      font-size: 0.75rem;
      text-transform: uppercase;
      border-bottom: 1px solid var(--card-border);
    }
    .events-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      font-family: var(--mono);
      font-size: 0.82rem;
    }
    .event-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .ev-canary { background: rgba(239, 68, 68, 0.2); color: #FCA5A5; }
    .ev-net { background: rgba(245, 158, 11, 0.2); color: #FCD34D; }
    .ev-tool { background: rgba(16, 185, 129, 0.2); color: #6EE7B7; }

    /* Footer Notice */
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--card-border);
      color: var(--text-dim);
      font-size: 0.82rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-shield">🛡️</div>
        <div class="brand-text">mcpguard <span>v${result.mcpguardVersion}</span></div>
      </div>
      <div class="scan-timestamp">Report generated on ${new Date().toISOString()}</div>
    </header>

    <!-- Verdict Hero Banner -->
    <section class="verdict-hero">
      <div>
        <h1 class="target-title">${targetName}</h1>
        <div class="target-meta">
          <span>Version: ${targetVersion}</span>
          <span>Ecosystem: ${ecosystem}</span>
          <span>Integrity: ${integrity.slice(0, 18)}...</span>
        </div>
      </div>
      <div class="badge-verdict">${result.verdict}</div>
    </section>

    <!-- Stats Grid -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Verdict Decision</div>
        <div class="stat-value" style="color: ${verdictColor}">${result.verdict}</div>
        <div class="stat-detail">${result.verdictReasons.length} decision rationale(s)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Security Findings</div>
        <div class="stat-value">${result.findings.length}</div>
        <div class="stat-detail">${criticalCount} critical, ${highCount} high, ${mediumCount} med</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sandbox Harness</div>
        <div class="stat-value">${result.sandbox.toolsCalled.length}/${result.sandbox.toolsDiscovered.length}</div>
        <div class="stat-detail">Exercised in ${result.sandbox.durationMs}ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">LLM Triage Review</div>
        <div class="stat-value">${result.llm.used ? 'ACTIVE' : 'OFFLINE'}</div>
        <div class="stat-detail">${result.llm.suspicions.length} suspicion(s) flagged</div>
      </div>
    </section>

    <!-- Reasons Card -->
    <section class="reasons-card">
      <h2 class="card-title">Verdict Breakdown & Evidence Citations</h2>
      <ul class="reason-list">
        ${result.verdictReasons
          .map((r) => `<li class="reason-item">${sanitizeText(r)}</li>`)
          .join('')}
      </ul>
    </section>

    <!-- Findings Section -->
    <section class="findings-section">
      <div class="findings-header">
        <h2 class="card-title">Discovered Findings (${result.findings.length})</h2>
        <div class="filters">
          <input type="text" id="searchInput" class="search-box" placeholder="Filter findings..." oninput="filterFindings()">
          <button class="filter-btn active" onclick="setFilter('all', this)">All</button>
          <button class="filter-btn" onclick="setFilter('critical', this)">Critical</button>
          <button class="filter-btn" onclick="setFilter('high', this)">High</button>
          <button class="filter-btn" onclick="setFilter('medium', this)">Medium</button>
        </div>
      </div>

      <div id="findingsContainer">
        ${
          result.findings.length === 0
            ? '<div class="finding-card" style="text-align: center; color: var(--text-dim); padding: 2rem;">No static, LLM, or sandbox findings recorded.</div>'
            : result.findings
                .map(
                  (f) => `
          <div class="finding-card" data-severity="${f.severity}" data-title="${sanitizeText(f.title.toLowerCase())}">
            <div class="finding-top">
              <span class="finding-title">${sanitizeText(f.title)}</span>
              <span class="sev-badge sev-${f.severity}">${f.severity}</span>
            </div>
            <div class="finding-meta">
              ID: ${sanitizeText(f.id)} | Source: ${sanitizeText(f.source)} | Rule: ${sanitizeText(f.rule)} | Confidence: ${f.confidence}
              ${f.evidence.file ? ` | File: ${sanitizeText(f.evidence.file)}${f.evidence.line ? `:${f.evidence.line}` : ''}` : ''}
            </div>
            <p class="finding-desc">${sanitizeText(f.description)}</p>
            ${
              f.evidence.snippet
                ? `<div class="finding-snippet">${sanitizeText(f.evidence.snippet)}</div>`
                : ''
            }
          </div>
        `
                )
                .join('')
        }
      </div>
    </section>

    <!-- Sandbox Activity Log -->
    ${
      result.sandbox.events.length > 0
        ? `
    <section class="reasons-card" style="margin-top: 2rem;">
      <h2 class="card-title">Sandbox Event Stream (${result.sandbox.events.length} events)</h2>
      <table class="events-table">
        <thead>
          <tr>
            <th>Event Kind</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${result.sandbox.events
            .map((e) => {
              const badgeClass =
                e.kind.includes('canary') ? 'ev-canary' : e.kind.includes('net') ? 'ev-net' : 'ev-tool';
              return `
              <tr>
                <td><span class="event-badge ${badgeClass}">${sanitizeText(e.kind)}</span></td>
                <td>${sanitizeText(JSON.stringify(e.detail))}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </section>
    `
        : ''
    }

    <!-- Footer -->
    <footer class="footer">
      <p><strong>Security Notice:</strong> "SAFE" means no malicious behavior was observed in this bounded test run. It is not an absolute mathematical proof of safety.</p>
      <p style="margin-top: 0.5rem;">mcpguard — Guard your machine before installing Model Context Protocol servers.</p>
    </footer>
  </div>

  <script>
    let currentFilter = 'all';

    function setFilter(sev, btn) {
      currentFilter = sev;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterFindings();
    }

    function filterFindings() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('#findingsContainer .finding-card');
      cards.forEach(card => {
        const sev = card.getAttribute('data-severity');
        const title = card.getAttribute('data-title') || '';
        const matchesFilter = (currentFilter === 'all' || sev === currentFilter);
        const matchesSearch = !q || title.includes(q) || card.innerText.toLowerCase().includes(q);
        card.style.display = (matchesFilter && matchesSearch) ? 'block' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

export async function writeHtmlReport(result: ScanResult, outputPath: string): Promise<void> {
  const html = generateHtmlReport(result);
  await fs.writeFile(outputPath, html, 'utf8');
}
