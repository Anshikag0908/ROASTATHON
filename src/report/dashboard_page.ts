export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mcpguard — Live Security Pipeline Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0A0E17;
      --card-bg: rgba(16, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --text: #F9FAFB;
      --text-muted: #9CA3AF;
      --text-dim: #6B7280;
      --primary: #3B82F6;
      --safe: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --font: 'Inter', sans-serif;
      --mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 2rem;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 10%, rgba(16, 185, 129, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 50% 90%, rgba(239, 68, 68, 0.06) 0%, transparent 50%);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--card-border);
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
    }
    .brand-title {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-title span { color: #60A5FA; }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      font-family: var(--mono);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 10px #10B981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    /* Interactive Launcher Card */
    .launcher-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.75rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    }
    .target-field {
      flex: 1;
      min-width: 280px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text);
      font-size: 0.95rem;
      font-family: var(--mono);
      outline: none;
      transition: border-color 0.2s;
    }
    .target-field:focus {
      border-color: #3B82F6;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563EB, #1D4ED8);
      border: 1px solid #3B82F6;
      color: white;
      font-weight: 700;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      transition: all 0.2s ease;
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.4);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .quick-targets {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .pill-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 0.35rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: var(--mono);
    }
    .pill-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3B82F6;
      color: #93C5FD;
    }
    .pill-btn.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #EF4444;
      color: #FCA5A5;
    }
    .pill-btn.warning:hover {
      background: rgba(245, 158, 11, 0.2);
      border-color: #F59E0B;
      color: #FCD34D;
    }

    /* Pipeline Stages Tracker */
    .pipeline-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }
    .pipeline-title {
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      font-weight: 700;
      margin-bottom: 1.5rem;
    }
    .stages-track {
      display: flex;
      justify-content: space-between;
      position: relative;
    }
    .stages-track::before {
      content: '';
      position: absolute;
      top: 24px;
      left: 30px;
      right: 30px;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 1;
    }
    .stage-step {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }
    .step-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #111827;
      border: 2px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-family: var(--mono);
      font-size: 1rem;
      transition: all 0.3s ease;
    }
    .step-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stage-step.active .step-circle {
      border-color: #3B82F6;
      background: rgba(59, 130, 246, 0.2);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
      color: #93C5FD;
      animation: pulse 1.5s infinite;
    }
    .stage-step.active .step-name { color: #93C5FD; }

    .stage-step.done .step-circle {
      border-color: #10B981;
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
    }
    .stage-step.done .step-name { color: #34D399; }

    .stage-step.warn .step-circle {
      border-color: #F59E0B;
      background: rgba(245, 158, 11, 0.2);
      color: #FBBF24;
    }
    .stage-step.warn .step-name { color: #FBBF24; }

    /* Dual Column Layout */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }
    @media (max-width: 900px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }

    .panel-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.5rem;
      backdrop-filter: blur(12px);
      height: 480px;
      display: flex;
      flex-direction: column;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--card-border);
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
    }
    .panel-count {
      font-size: 0.8rem;
      font-family: var(--mono);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
    }

    .scroll-area {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    /* Event Feed Items */
    .event-item {
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 8px;
      border-left: 3px solid #3B82F6;
      font-size: 0.85rem;
      animation: fadeIn 0.3s ease;
    }
    .event-item.canary { border-color: #EF4444; background: rgba(239, 68, 68, 0.08); }
    .event-item.net { border-color: #F59E0B; }
    .event-item.tool { border-color: #10B981; }

    .ev-time {
      font-size: 0.75rem;
      color: var(--text-dim);
      font-family: var(--mono);
    }
    .ev-msg {
      margin-top: 0.2rem;
      color: var(--text);
    }

    /* Findings Cards */
    .live-finding {
      padding: 0.85rem 1rem;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 8px;
      border: 1px solid var(--card-border);
      animation: fadeIn 0.4s ease;
    }
    .lf-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.3rem;
    }
    .lf-title { font-weight: 600; font-size: 0.92rem; }
    .lf-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
      font-family: var(--mono);
    }
    .b-critical { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444; }
    .b-high { background: rgba(249, 115, 22, 0.2); color: #FB923C; border: 1px solid #F97316; }
    .b-medium { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid #F59E0B; }
    .lf-desc { font-size: 0.82rem; color: var(--text-muted); }

    /* Verdict Banner (Revealed when complete) */
    .verdict-banner {
      display: none;
      background: rgba(17, 24, 39, 0.85);
      border-radius: 16px;
      padding: 2rem;
      margin-top: 2rem;
      border: 2px solid #3B82F6;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.6);
      animation: fadeIn 0.5s ease;
    }
    .verdict-banner.show { display: block; }
    .vb-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .vb-title { font-size: 1.6rem; font-weight: 800; }
    .vb-badge {
      font-size: 1.2rem;
      font-weight: 800;
      padding: 0.5rem 1.5rem;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .v-safe { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 2px solid #10B981; }
    .v-suspicious { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 2px solid #F59E0B; }
    .v-dangerous { background: rgba(239, 68, 68, 0.2); color: #F87171; border: 2px solid #EF4444; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="dashboard-header">
      <div class="brand-wrap">
        <div class="brand-logo">🛡️</div>
        <div>
          <div class="brand-title">mcpguard <span>Live Dashboard</span></div>
          <div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 0.2rem;">Model Context Protocol Security Pipeline Server</div>
        </div>
      </div>
      <div class="status-pill">
        <div class="status-dot"></div>
        <span id="connStatus">STREAMING</span>
      </div>
    </header>

    <!-- Interactive Launcher -->
    <div class="launcher-card">
      <form id="scanForm" onsubmit="event.preventDefault(); submitScan();" style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <input type="text" id="targetInput" class="target-field" placeholder="Enter package name or local path (e.g. fixtures/benign-server)" value="fixtures/benign-server" required>
        <button type="submit" id="btnScan" class="btn-primary">
          <span>🛡️</span> Run Security Scan
        </button>
      </form>
      <div class="quick-targets">
        <span style="font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; font-weight: 600;">Demo Targets:</span>
        <button class="pill-btn" onclick="setAndRun('fixtures/benign-server')">Benign Server (SAFE)</button>
        <button class="pill-btn danger" onclick="setAndRun('fixtures/malicious-exfil-server')">Canary Exfiltration (DANGEROUS)</button>
        <button class="pill-btn warning" onclick="setAndRun('fixtures/poisoned-description-server')">Prompt Injection (DANGEROUS)</button>
        <button class="pill-btn" onclick="setAndRun('fixtures/triage-injection-server')">Triage Injection (SUSPICIOUS)</button>
      </div>
    </div>

    <!-- Pipeline Stages Tracker -->
    <div class="pipeline-card">
      <div class="pipeline-title">Active Security Pipeline Stages</div>
      <div class="stages-track">
        <div class="stage-step" id="step-fetch">
          <div class="step-circle">1</div>
          <div class="step-name">Fetch</div>
        </div>
        <div class="stage-step" id="step-static">
          <div class="step-circle">2</div>
          <div class="step-name">Static</div>
        </div>
        <div class="stage-step" id="step-llm">
          <div class="step-circle">3</div>
          <div class="step-name">LLM Triage</div>
        </div>
        <div class="stage-step" id="step-sandbox">
          <div class="step-circle">4</div>
          <div class="step-name">Sandbox</div>
        </div>
        <div class="stage-step" id="step-verdict">
          <div class="step-circle">5</div>
          <div class="step-name">Verdict</div>
        </div>
      </div>
    </div>

    <!-- Dual Column Live Grid -->
    <div class="dashboard-grid">
      <!-- Live Event Log -->
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">Pipeline Event Feed</div>
          <div class="panel-count" id="eventCount">0 events</div>
        </div>
        <div class="scroll-area" id="eventsList">
          <div style="text-align: center; color: var(--text-dim); padding-top: 2rem;">Awaiting pipeline activity...</div>
        </div>
      </div>

      <!-- Realtime Findings -->
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">Discovered Findings</div>
          <div class="panel-count" id="findingCount">0 findings</div>
        </div>
        <div class="scroll-area" id="findingsList">
          <div style="text-align: center; color: var(--text-dim); padding-top: 2rem;">No security findings yet.</div>
        </div>
      </div>
    </div>

    <!-- Final Verdict Banner -->
    <div class="verdict-banner" id="verdictBanner">
      <div class="vb-header">
        <div>
          <div class="vb-title" id="vbTarget">Target Scanned</div>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.3rem;" id="vbMeta">Ecosystem & Version</div>
        </div>
        <div class="vb-badge" id="vbBadge">SAFE</div>
      </div>
      <div id="vbReasons" style="margin-top: 1rem; color: var(--text); font-size: 0.95rem;"></div>
    </div>
  </div>

  <script>
    let eventsCount = 0;
    let findingsCount = 0;

    const evtSource = new EventSource('/events');

    evtSource.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        handleLiveEvent(data);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    evtSource.onerror = function() {
      document.getElementById('connStatus').innerText = 'OFFLINE';
      document.getElementById('connStatus').style.color = '#9CA3AF';
    };

    function handleLiveEvent(evt) {
      const type = evt.type;
      const payload = evt.payload;

      if (type === 'stage:start') {
        setStageStatus(payload.stage, 'active');
        addLogItem('stage', 'Stage started: ' + payload.stage.toUpperCase() + ' (' + payload.target + ')');
      } else if (type === 'stage:progress') {
        addLogItem('progress', payload.message);
      } else if (type === 'stage:complete') {
        setStageStatus(payload.stage, payload.status === 'warn' ? 'warn' : 'done');
        addLogItem('stage', 'Stage complete: ' + payload.stage.toUpperCase() + ' [' + payload.status + ']');
      } else if (type === 'sandbox:event') {
        const kind = payload.kind || 'sandbox';
        addLogItem(kind, 'Sandbox Event: ' + kind + ' - ' + JSON.stringify(payload.detail));
      } else if (type === 'finding:discovered') {
        addFindingCard(payload);
      } else if (type === 'scan:complete') {
        showFinalVerdict(payload);
      }
    }

    function setStageStatus(stage, status) {
      const el = document.getElementById('step-' + stage);
      if (!el) return;
      el.classList.remove('active', 'done', 'warn');
      el.classList.add(status);
    }

    function addLogItem(kind, text) {
      const list = document.getElementById('eventsList');
      if (eventsCount === 0) list.innerHTML = '';
      eventsCount++;
      document.getElementById('eventCount').innerText = eventsCount + ' events';

      const item = document.createElement('div');
      item.className = 'event-item';
      if (kind.includes('canary')) item.classList.add('canary');
      else if (kind.includes('net')) item.classList.add('net');
      else if (kind.includes('tool')) item.classList.add('tool');

      const time = new Date().toLocaleTimeString();
      item.innerHTML = '<div class="ev-time">' + time + ' [' + kind + ']</div><div class="ev-msg">' + escapeHtml(text) + '</div>';
      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
    }

    function addFindingCard(f) {
      const list = document.getElementById('findingsList');
      if (findingsCount === 0) list.innerHTML = '';
      findingsCount++;
      document.getElementById('findingCount').innerText = findingsCount + ' findings';

      const card = document.createElement('div');
      card.className = 'live-finding';
      const sevClass = 'b-' + f.severity;

      card.innerHTML = 
        '<div class="lf-top">' +
          '<span class="lf-title">' + escapeHtml(f.title) + '</span>' +
          '<span class="lf-badge ' + sevClass + '">' + f.severity + '</span>' +
        '</div>' +
        '<div class="lf-desc">' + escapeHtml(f.description) + '</div>';

      list.appendChild(card);
      list.scrollTop = list.scrollHeight;
    }

    function showFinalVerdict(res) {
      const banner = document.getElementById('verdictBanner');
      banner.classList.add('show');
      document.getElementById('vbTarget').innerText = res.target.name;
      document.getElementById('vbMeta').innerText = 'Version ' + (res.target.version || '0.0.0') + ' (' + res.target.ecosystem + ')';

      const badge = document.getElementById('vbBadge');
      badge.innerText = res.verdict;
      badge.className = 'vb-badge ' + (res.verdict === 'SAFE' ? 'v-safe' : res.verdict === 'SUSPICIOUS' ? 'v-suspicious' : 'v-dangerous');

      const reasonsContainer = document.getElementById('vbReasons');
      reasonsContainer.innerHTML = '<strong>Verdict Rationale:</strong><ul style="margin-top: 0.5rem; padding-left: 1.25rem;">' +
        res.verdictReasons.map(r => '<li>' + escapeHtml(r) + '</li>').join('') + '</ul>';
    }

    function escapeHtml(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async function submitScan() {
      const target = document.getElementById('targetInput').value.trim();
      if (!target) return;
      await runTarget(target);
    }

    function setAndRun(target) {
      document.getElementById('targetInput').value = target;
      runTarget(target);
    }

    async function runTarget(target) {
      const btn = document.getElementById('btnScan');
      btn.disabled = true;
      btn.innerText = 'Scanning...';
      resetDashboard();

      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target })
        });
        const data = await res.json();
        if (!data.success) {
          alert('Scan error: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Scan request error:', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🛡️</span> Run Security Scan';
      }
    }

    function resetDashboard() {
      eventsCount = 0;
      findingsCount = 0;
      document.getElementById('eventsList').innerHTML = '<div style="text-align: center; color: var(--text-dim); padding-top: 2rem;">Awaiting pipeline activity...</div>';
      document.getElementById('findingsList').innerHTML = '<div style="text-align: center; color: var(--text-dim); padding-top: 2rem;">No security findings yet.</div>';
      document.getElementById('eventCount').innerText = '0 events';
      document.getElementById('findingCount').innerText = '0 findings';
      document.getElementById('verdictBanner').classList.remove('show');
      ['fetch', 'static', 'llm', 'sandbox', 'verdict'].forEach(s => {
        const el = document.getElementById('step-' + s);
        if (el) el.classList.remove('active', 'done', 'warn');
      });
    }
  </script>
</body>
</html>`;
}
