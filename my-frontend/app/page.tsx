"use client";

import React, { useState, useEffect } from "react";
import PerspectiveTunnelHero from "@/components/ui/perspective-tunnel-hero";
import ScannerDashboard from "@/components/scanner-dashboard";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Cpu,
  Lock,
  Zap,
  ExternalLink,
  CheckCircle2,
  FileCode,
  Network,
  Bug,
  ChevronRight,
  ArrowDown,
  Layers,
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    fetch("http://127.0.0.1:3100/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "online") setBackendStatus("online");
        else setBackendStatus("offline");
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500 selection:text-white">
      {/* Top Floating Glass Navigation Header */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-neutral-950/75 border-b border-white/10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Shield className="size-5 text-white" />
              <div className="absolute -inset-0.5 rounded-xl bg-indigo-500/20 blur-sm -z-10" />
            </div>
            <div>
              <div className="font-mono font-bold tracking-tight text-white flex items-center gap-2">
                <span>MCP GUARD</span>
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  v0.1.0
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase hidden sm:block">
                Pre-Execution Security Sandbox
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-white transition-colors"
            >
              Warp Tunnel
            </button>
            <button
              onClick={() => scrollTo("scanner-console")}
              className="hover:text-white transition-colors"
            >
              Scanner Console
            </button>
            <button
              onClick={() => scrollTo("defense-pillars")}
              className="hover:text-white transition-colors"
            >
              Architecture
            </button>
            <button
              onClick={() => scrollTo("rule-matrix")}
              className="hover:text-white transition-colors"
            >
              Rule Matrix
            </button>
            <button
              onClick={() => scrollTo("cli-guide")}
              className="hover:text-white transition-colors"
            >
              CLI Gating
            </button>
          </nav>

          {/* Right Status Indicator & Actions */}
          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                backendStatus === "online"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : backendStatus === "checking"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-400 animate-pulse"
                    : backendStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-neutral-500"
                }`}
              />
              <span>{backendStatus === "online" ? "BACKEND :3100" : "OFFLINE / DEMO"}</span>
            </div>

            <button
              onClick={() => scrollTo("scanner-console")}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="size-3.5" />
              <span>Launch Scan</span>
            </button>

            <a
              href="https://github.com/Anshikag0908/ROASTATHON"
              target="_blank"
              rel="noreferrer"
              className="size-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all"
              title="GitHub Repository"
            >
              <GithubIcon className="size-4" />
            </a>
          </div>
        </div>
      </header>

      {/* 1. Perspective 3D Tunnel Hero Section */}
      <section className="relative pt-16">
        <PerspectiveTunnelHero />
      </section>

      {/* 2. Live Interactive Scanner Console */}
      <section id="scanner-console" className="relative border-t border-white/10 bg-black/60 pt-20 pb-24">
        {/* Ambient Backlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
        <ScannerDashboard />
      </section>

      {/* 3. Defense Pillars Architecture */}
      <section id="defense-pillars" className="relative border-t border-white/10 py-24 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono uppercase tracking-widest mb-4">
              <Layers className="size-3.5" />
              Defense-In-Depth Architecture
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              3 Layers of Defense Before Execution
            </h2>
            <p className="mt-4 text-neutral-400 text-sm sm:text-base leading-relaxed">
              Standard MCP clients blindly spawn child processes from untrusted npm packages.
              MCP Guard inspects code statically, triages semantics with LLMs, and traps malicious behaviors inside a Docker sandbox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Layer 1: Static AST Analysis */}
            <div className="relative group rounded-2xl border border-white/10 bg-neutral-900/50 p-8 backdrop-blur-sm transition-all hover:border-indigo-500/50 hover:bg-neutral-900/80">
              <div className="size-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <FileCode className="size-6" />
              </div>
              <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-1">Layer 1</div>
              <h3 className="text-xl font-bold mb-3 text-white">Deterministic AST Analysis</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Zero host code execution. Scans JavaScript/TypeScript Abstract Syntax Trees for prototype pollution, dynamic code generation, and prompt injection patterns in tool descriptors.
              </p>
              <ul className="space-y-2 text-xs font-mono text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>7 Deterministic AST Security Rules</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>Prototype Pollution Detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-indigo-400 shrink-0" />
                  <span>Sub-millisecond Pre-screening</span>
                </li>
              </ul>
            </div>

            {/* Layer 2: LLM Triage Engine */}
            <div className="relative group rounded-2xl border border-white/10 bg-neutral-900/50 p-8 backdrop-blur-sm transition-all hover:border-indigo-500/50 hover:bg-neutral-900/80">
              <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="size-6" />
              </div>
              <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">Layer 2</div>
              <h3 className="text-xl font-bold mb-3 text-white">Framed LLM Triage</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Evaluates semantic ambiguities and tool description injections. Package data is strictly quarantined inside untrusted data boundaries with schema enforcement.
              </p>
              <ul className="space-y-2 text-xs font-mono text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>&lt;&lt;&lt;UNTRUSTED_PACKAGE_DATA&gt;&gt;&gt; Framing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>Automated Retry-Once Schema Validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-purple-400 shrink-0" />
                  <span>Gemini, OpenAI, Anthropic Support</span>
                </li>
              </ul>
            </div>

            {/* Layer 3: Docker Sandbox & Canaries */}
            <div className="relative group rounded-2xl border border-white/10 bg-neutral-900/50 p-8 backdrop-blur-sm transition-all hover:border-indigo-500/50 hover:bg-neutral-900/80">
              <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Lock className="size-6" />
              </div>
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">Layer 3</div>
              <h3 className="text-xl font-bold mb-3 text-white">Docker Sandbox & Honeytokens</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Spawns the target in an ephemeral, resource-constrained container with planted decoy AWS secrets and SSH keys. Exercises discovered tools and monitors outbound egress.
              </p>
              <ul className="space-y-2 text-xs font-mono text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Planted ~/.aws and ~/.ssh Canaries</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Active Egress Sink Payload Interception</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Auto Discovery & JSON-RPC Probing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Deterministic Rule Matrix Showcase */}
      <section id="rule-matrix" className="relative border-t border-white/10 py-24 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono uppercase tracking-widest mb-4">
              <ShieldAlert className="size-3.5" />
              Deterministic Heuristics
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              7 Core Static Security Rules
            </h2>
            <p className="mt-4 text-neutral-400 text-sm sm:text-base">
              Engineered specifically against known MCP supply-chain and jailbreak attack vectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "TOOL-DYNAMIC-IMPORT",
                severity: "HIGH",
                desc: "Flags runtime `import()` or dynamic module resolution which bypasses static bundle audits.",
                target: "Remote code inclusion & supply chain hiding",
              },
              {
                id: "TOOL-EVAL-EXEC",
                severity: "CRITICAL",
                desc: "Flags `eval()`, `new Function()`, `child_process.exec()`, or `spawn()` without safe arguments.",
                target: "Arbitrary command execution on host",
              },
              {
                id: "CANARY-CREDENTIAL-SEARCH",
                severity: "HIGH",
                desc: "Detects file operations or grep patterns searching for `.aws`, `.ssh`, `.env`, or keychain tokens.",
                target: "Credential harvesting & local reconnaissance",
              },
              {
                id: "PROTOTYPE-POLLUTION",
                severity: "HIGH",
                desc: "Detects unsafe property assignments to `__proto__`, `constructor.prototype`, or Object.assign.",
                target: "Process hijacking & privilege escalation",
              },
              {
                id: "TOOL-DESC-INJECTION",
                severity: "HIGH",
                desc: "Flags adversarial override prompts inside tool descriptions designed to coerce host LLMs.",
                target: "Prompt injection & hidden tool sabotage",
              },
              {
                id: "NETWORK-UNSAFE-EGRESS",
                severity: "MEDIUM",
                desc: "Detects hardcoded IP addresses or external URL sinks not present in the manifest allowlist.",
                target: "Data exfiltration sinks & telemetry smuggling",
              },
              {
                id: "CANARY-LEAK-PAYLOAD",
                severity: "CRITICAL",
                desc: "Hard verdict block (D1): Triggered when planted canary secret tokens appear in outbound network payloads.",
                target: "Confirmed data theft & exfiltration",
              },
            ].map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-xl border border-white/10 bg-neutral-900/60 backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-white">{r.id}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        r.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : r.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed mb-3">{r.desc}</p>
                </div>
                <div className="text-[11px] font-mono text-neutral-500 border-t border-white/5 pt-2 flex items-center gap-1.5">
                  <span className="text-indigo-400">Target Vector:</span> {r.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CLI & Claude Desktop Gated Installation */}
      <section id="cli-guide" className="relative border-t border-white/10 py-24 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-widest mb-4">
                <Terminal className="size-3.5" />
                Gated Installation
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Enforce Security at the CLI Level
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                Run <code className="text-indigo-400 font-mono">mcpguard install</code> to automatically verify integrity hashes, validate the pre-computed scan result, and safely inject verified entries into Claude Desktop&apos;s configuration file.
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-white/10 bg-neutral-900/60">
                  <div className="font-mono text-xs text-indigo-400 mb-1">1. Full Pipeline Scan</div>
                  <code className="font-mono text-xs text-neutral-200">
                    node dist/cli/index.js scan @modelcontextprotocol/server-memory
                  </code>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-neutral-900/60">
                  <div className="font-mono text-xs text-emerald-400 mb-1">2. Gated Install with TOCTOU Check</div>
                  <code className="font-mono text-xs text-neutral-200">
                    node dist/cli/index.js install &lt;pkg&gt; --expected-version 1.0.0
                  </code>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-neutral-900/60">
                  <div className="font-mono text-xs text-purple-400 mb-1">3. Start Real-Time Web Dashboard</div>
                  <code className="font-mono text-xs text-neutral-200">
                    node dist/cli/index.js dashboard --port 3100
                  </code>
                </div>
              </div>
            </div>

            {/* Config Generator Card */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-red-500/80" />
                  <div className="size-3 rounded-full bg-yellow-500/80" />
                  <div className="size-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-xs text-neutral-400">claude_desktop_config.json</span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  VERIFIED ONLY
                </span>
              </div>
              <pre className="font-mono text-xs text-neutral-300 overflow-x-auto p-4 rounded-xl bg-black/60 border border-white/5 leading-relaxed">
{`{
  "mcpServers": {
    "verified-memory-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory@1.0.0"],
      "env": {
        "MCPGUARD_VERIFIED_SHA": "sha512-c28f9d0e..."
      }
    }
  }
}`}
              </pre>
              <div className="mt-4 text-xs text-neutral-400 flex items-center gap-2">
                <Lock className="size-4 text-emerald-400 shrink-0" />
                <span>
                  Dangerous servers (D1, D2, D3 triggers) exit with code 20 and are blocked from touching your config.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 text-xs font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-indigo-400" />
            <span className="text-neutral-300 font-bold">MCP GUARD</span>
            <span>• Hackathon Edition</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/Anshikag0908/ROASTATHON"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <GithubIcon className="size-3.5" />
              <span>Anshikag0908/ROASTATHON</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div>Fail-Closed Security • Zero Host Code Execution</div>
        </div>
      </footer>
    </div>
  );
}