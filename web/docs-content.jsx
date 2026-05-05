// ----- Documentation content + helpers -----

const DOCS_NAV = [
  {
    section: "Get started",
    pages: [
      { slug: "overview", title: "Overview", description: "What OmnisysX is and how the three agents work together." },
      { slug: "setup", title: "Setup", description: "From clean machine to working install." },
      { slug: "running", title: "Running it", description: "Three modes: one-shot, on-demand, continuous." }
    ]
  },
  {
    section: "Concepts",
    pages: [
      { slug: "architecture", title: "Architecture", description: "Layered architecture: perceive, plan, act, verify." },
      { slug: "agents", title: "The Trinity", description: "Observer, Task Manager, Auditor, and the Executor." },
      { slug: "pipeline", title: "Pipeline", description: "Six stages from OBSERVE to VERIFY." },
      { slug: "security", title: "Security model", description: "Conservative defaults, Golden Rule, dry-run mode." }
    ]
  },
  {
    section: "Integrations",
    pages: [
      { slug: "zerion-stack", title: "The Zerion stack", description: "CLI, MCP, and x402 — the three Zerion building blocks." },
      { slug: "obsidian", title: "Obsidian brain", description: "Persona, memory, and audit log in plain Markdown." },
      { slug: "web-interface", title: "Web interface", description: "Static HTML or Next.js frontend." }
    ]
  },
  {
    section: "Reference",
    pages: [
      { slug: "deployment", title: "Deployment", description: "Get OmnisysX live on your domain." },
      { slug: "forking", title: "Forking guide", description: "Common fork patterns and stable contracts." },
      { slug: "api-reference", title: "API reference", description: "HTTP endpoints, SSE events, environment variables." },
      { slug: "faq", title: "Troubleshooting & FAQ", description: "Common issues and hackathon tips." }
    ]
  }
];

const DOCS_FLAT = DOCS_NAV.flatMap(s => s.pages);

function findDocBySlug(slug) {
  return DOCS_FLAT.find(p => p.slug === slug) || null;
}

function getAdjacentDocs(slug) {
  const i = DOCS_FLAT.findIndex(p => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? DOCS_FLAT[i - 1] : null,
    next: i < DOCS_FLAT.length - 1 ? DOCS_FLAT[i + 1] : null
  };
}

function getDoc(slug) {
  return DOCS_CONTENT[slug] ? DOCS_CONTENT[slug]() : null;
}

function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node.props && node.props.children != null) return textOf(node.props.children);
  return "";
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ----- JSX helpers -----
function P({ children }) { return <p>{children}</p>; }
function H2({ children, id }) { return <h2 id={id || slugify(textOf(children))}>{children}</h2>; }
function H3({ children, id }) { return <h3 id={id || slugify(textOf(children))}>{children}</h3>; }
function Code({ children }) { return <code>{children}</code>; }
function Quote({ children }) { return <blockquote>{children}</blockquote>; }
function UL({ children }) { return <ul>{children}</ul>; }
function OL({ children }) { return <ol>{children}</ol>; }
function LI({ children }) { return <li>{children}</li>; }
function HR() { return <hr />; }

function Pre({ children }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (!ref.current) return;
    const text = ref.current.innerText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <pre>
      <button className="copy-btn" onClick={onCopy}>{copied ? "✓ copied" : "copy"}</button>
      <code ref={ref}>{children}</code>
    </pre>
  );
}

function Table({ headers, rows }) {
  return (
    <table>
      <thead>
        <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

// ----- Page content -----
const DOCS_CONTENT = {
  overview: () => (
    <>
      <h1>OmnisysX — Multi-Agent DeFi Pipeline</h1>
      <P>
        OmnisysX is an autonomous DeFi pipeline orchestrated by three specialized agents —
        <strong> Observer</strong>, <strong>Task Manager</strong>, and <strong>Auditor</strong> —
        plus a deterministic <strong>Executor</strong>. It runs a six-stage flow, is open source,
        and demonstrates the full Zerion stack:
        Zerion CLI, Zerion MCP Server, and x402 on Base.
      </P>

      <H2>TL;DR</H2>
      <Pre>{`git clone https://github.com/YOUR_USERNAME/omnisysx
cd omnisysx
cp .env.example .env
npm install
npm run dev`}</Pre>
      <P>Open <Code>http://localhost:3000</Code> and click <strong>Trigger Pipeline</strong>.</P>

      <H2>What it does</H2>
      <OL>
        <LI>Observer Agent scans your wallet via Zerion CLI and REST API.</LI>
        <LI>Task Manager Agent analyzes the data and produces a TIS (Task Intent Spec).</LI>
        <LI>Auditor validates the TIS against security rules and produces a PDR (Policy Decision Record).</LI>
        <LI>Executor signs and broadcasts via the Zerion swap API on Base.</LI>
        <LI>Brain Bridge logs every artifact of the run to your Obsidian vault.</LI>
      </OL>

      <H2>The Golden Rule</H2>
      <Quote>The agent must never let ETH balance drop below 0.002.</Quote>
      <P>
        The pipeline halts immediately if this rule is violated at any of the four enforcement
        layers (Observer, Task Manager, Auditor, Executor pre-flight).
      </P>

      <H2>Stack at a glance</H2>
      <Table
        headers={["Layer", "Tech"]}
        rows={[
          ["On-chain perception", <><Code>Zerion CLI</Code> + REST API</>],
          ["Agent connectivity", "Zerion MCP Server"],
          ["Autonomous payments", "x402 protocol on Base"],
          ["Wallet signing", "viem (default) or Coinbase CDP Wallet"],
          ["Orchestration LLM", "Claude Opus 4.7"],
          ["Brain", "Obsidian vault (Local REST API)"],
          ["Frontend", "React via CDN — no build step"],
          ["Runtime", "Node.js 20+ (backend) · static HTML (frontend)"]
        ]}
      />

      <H2>Why three agents</H2>
      <UL>
        <LI><strong>specialization</strong> — Observer is deterministic, Auditor is conservative, Task Manager is creative.</LI>
        <LI><strong>swappable</strong> — use a different LLM for each, or replace one entirely.</LI>
        <LI><strong>auditable</strong> — every stage produces a structured artifact in your Obsidian vault.</LI>
      </UL>
    </>
  ),

  setup: () => (
    <>
      <h1>Setup</h1>
      <P>From clean machine to working install.</P>

      <H2>Prerequisites</H2>
      <UL>
        <LI>Node.js 20+</LI>
        <LI>npm 10+</LI>
        <LI>Git</LI>
        <LI>Obsidian (optional, for the brain layer)</LI>
        <LI>An EVM wallet (Base, Ethereum, etc.)</LI>
      </UL>

      <H2>1. Clone the repo</H2>
      <Pre>{`git clone https://github.com/YOUR_USERNAME/omnisysx
cd omnisysx`}</Pre>

      <H2>2. Install dependencies</H2>
      <Pre>{`npm install
npm install -g zerion-cli`}</Pre>

      <H2>3. Get the keys you need</H2>
      <UL>
        <LI><strong>Zerion API key</strong> — at <Code>dashboard.zerion.io</Code>, starts with <Code>zk_</Code>.</LI>
        <LI><strong>Anthropic key</strong> — at <Code>console.anthropic.com</Code>, starts with <Code>sk-ant-</Code>.</LI>
        <LI><strong>Wallet private key</strong> — use a <strong>dedicated agent wallet</strong>, NOT your main wallet, only required for x402.</LI>
      </UL>

      <H2>4. Configure <Code>cp .env.example .env</Code></H2>
      <P>Minimum viable config:</P>
      <Pre>{`ZERION_API_KEY=zk_dev_PASTE_HERE
ANTHROPIC_API_KEY=sk-ant-PASTE_HERE
AGENT_WALLET_ADDRESS=0xPASTE_YOUR_WALLET_HERE
EXECUTOR_DRY_RUN=true
MIN_ETH_GAS_RESERVE=0.002`}</Pre>

      <H2>5. Run the Observer (sanity check)</H2>
      <Pre>{`node --loader ts-node/esm agent-core/observer/run.ts`}</Pre>
      <P>You should see a JSON <Code>ObserverReport</Code> printed in the terminal with your
      portfolio summary, gas reserve status, and any active alerts.</P>

      <H2>6. Run the full stack</H2>
      <Pre>{`# terminal 1 — orchestrator
node --loader ts-node/esm agent-core/orchestrator/server/server.ts

# terminal 2 — web (Next.js)
cd web && npm run dev
# OR static-site: open OmnisysX.html in your browser`}</Pre>
    </>
  ),

  running: () => (
    <>
      <h1>Running it</h1>
      <P>Three modes depending on use case:</P>
      <Table
        headers={["Mode", "When", "How"]}
        rows={[
          ["One-shot", "Quick check, debugging", "CLI script"],
          ["On-demand", "Demo, testing", "Web UI button"],
          ["Continuous", "Production", "cron / systemd / PM2"]
        ]}
      />

      <H2>One-shot via CLI</H2>
      <Pre>{`# Observer only
node --loader ts-node/esm agent-core/observer/run.ts

# Full pipeline
node --loader ts-node/esm agent-core/orchestrator/run.ts

# Executor smoke test (dry-run)
node --loader ts-node/esm agent-core/executor/smoke.ts`}</Pre>

      <H2>On-demand via UI</H2>
      <P>Run both servers, open <Code>localhost:3000</Code>, click <strong>Trigger Pipeline</strong>.
      The pipeline streams stage updates over SSE into the Pipeline Control panel.</P>

      <H2>Continuous via PM2</H2>
      <Pre>{`pm2 start ecosystem.config.js
pm2 save
pm2 startup`}</Pre>

      <H2>Recommended cadence</H2>
      <Table
        headers={["Profile", "Cadence"]}
        rows={[
          ["Demo / dev", "manual trigger only"],
          ["Casual monitoring", "every 30 min"],
          ["Active strategy", "every 5 min"],
          ["Executor watch", "every 1 min"]
        ]}
      />
    </>
  ),

  architecture: () => (
    <>
      <h1>Architecture</h1>
      <P>Layered architecture: perceive → plan → act → verify, extended into six stages.</P>

      <H2>High-level diagram</H2>
      <Pre>{`        +-----------------+
        |  Web Interface  |
        +--------+--------+
                 |
                 v
       +---------+----------+
       |  Orchestrator HTTP |
       |   (port 3001, SSE) |
       +----+--+--+--+------+
            |  |  |  |
       +----+  |  |  +----+
       |       |  |       |
       v       v  v       v
  +--------++--------++--------++--------+
  |Observer||  Task  || Auditor||Executor|
  |        ||Manager ||Auditor||        |
  +--------++--------++--------++---+----+
                                    |
                                    v
                       +------------+----------+
                       |  Obsidian Brain Bridge |
                       +-----------------------+`}</Pre>

      <H2>Layered responsibilities</H2>

      <H3>1. Web layer</H3>
      <P>Static HTML + React via CDN, OR a Next.js 15 app — both talk to the orchestrator over HTTP and SSE.</P>

      <H3>2. Orchestrator layer</H3>
      <P>Node HTTP server on port 3001. Acts as the coordinator and API gateway between the web UI and each agent.</P>

      <H3>3. Agent layer</H3>
      <Table
        headers={["Agent", "Input", "Output"]}
        rows={[
          ["Observer", "wallet address", "ObserverReport"],
          ["Task Manager", "ObserverReport", "TIS"],
          ["Auditor", "TIS + portfolio", "PDR"],
          ["Executor", "TIS + PDR + portfolio", "ExecutionResult"]
        ]}
      />

      <H3>4. Brain layer</H3>
      <P>Obsidian Bridge — every stage writes a structured Markdown artifact to the vault, so the entire pipeline is human-readable and replayable.</P>

      <H2>Design principles</H2>
      <UL>
        <LI><strong>Separation of duties</strong> — no single agent can both plan and execute.</LI>
        <LI><strong>Replaceability</strong> — every agent is a folder; swap the persona or LLM independently.</LI>
        <LI><strong>Auditability</strong> — every artifact lands in the vault as plain Markdown.</LI>
      </UL>
    </>
  ),

  agents: () => (
    <>
      <h1>The Trinity</h1>
      <P>OmnisysX coordinates three specialized agents plus a deterministic Executor.</P>

      <H2>Observer Agent</H2>
      <P>Role: deterministic data gatherer. Calls the Zerion API for positions, history, and gas data,
      computes the gas reserve, generates alerts, and outputs an <Code>ObserverReport</Code>.</P>

      <H2>Task Manager Agent</H2>
      <P>Role: creative strategist. Reads the latest <Code>ObserverReport</Code>, consults its persona
      file in Obsidian, and drafts a <Code>TIS</Code> (Task Intent Spec) describing the next action.</P>

      <H2>Auditor Agent</H2>
      <P>Role: conservative reviewer. Independently re-checks the TIS against policy. Default rules:</P>
      <UL>
        <LI>BLOCK if tx pushes ETH below 0.002</LI>
        <LI>BLOCK slippage &gt; 500 bps</LI>
        <LI>BLOCK unverified contract address</LI>
        <LI>WARN price impact &gt; 5%</LI>
        <LI>WARN gas &gt; $10</LI>
        <LI>REQUIRE human approval &gt; $1000</LI>
      </UL>

      <H2>Executor Agent</H2>
      <P>Role: deterministic broadcaster. Flow: pre-flight → resolve tokens → fetch offers →
      approve → broadcast → verify receipt. Never decides, only executes a fully-approved PDR.</P>
    </>
  ),

  pipeline: () => (
    <>
      <h1>Pipeline</h1>
      <Pre>{`OBSERVE → REASON → PLAN → AUTHORIZE → EXECUTE → VERIFY`}</Pre>

      <H2>Stage 1 — OBSERVE</H2>
      <P>Parallel calls to Zerion endpoints (positions, history, gas). The Observer collates a normalized
      <Code>ObserverReport</Code>.</P>

      <H2>Stage 2 — REASON</H2>
      <P>Task Manager interprets the report and writes the TIS rationale — what to do and why.</P>

      <H2>Stage 3 — PLAN</H2>
      <P>Task Manager produces the structured <Code>TIS</Code> with intent type, amounts, slippage, and reasoning.</P>

      <H2>Stage 4 — AUTHORIZE</H2>
      <Table
        headers={["Decision", "Pipeline behavior"]}
        rows={[
          ["APPROVED", "Continue to EXECUTE"],
          ["REJECTED", "Halt — log to vault"],
          ["NEEDS_REVIEW", <>Pause — emit SSE <Code>pdr:pending</Code>, wait for human</>]
        ]}
      />
      <P>PDRs expire after 5 minutes. Past that, the pipeline records SKIPPED and a fresh run is required.</P>

      <H2>Stage 5 — EXECUTE</H2>
      <P>Executor: pre-flight → resolve tokens → get offers → pick best → approve → broadcast.</P>

      <H2>Stage 6 — VERIFY</H2>
      <P>Re-fetches the receipt, sets status <Code>CONFIRMED</Code> or <Code>FAILED</Code>, and writes the result back to the vault.</P>
    </>
  ),

  security: () => (
    <>
      <h1>Security model</h1>
      <P>Conservative by default.</P>

      <H2>The Golden Rule</H2>
      <Quote>The agent must never let ETH balance drop below 0.002.</Quote>
      <P>Enforced at four layers:</P>
      <OL>
        <LI>Observer — generates a CRITICAL alert if reserve is at risk.</LI>
        <LI>Task Manager — prompt forbids drafting any breach.</LI>
        <LI>Auditor — independently re-checks the TIS.</LI>
        <LI>Executor — final pre-flight check immediately before signing.</LI>
      </OL>

      <H2>Default policy rules</H2>
      <Table
        headers={["Rule", "Severity", "Trigger"]}
        rows={[
          ["ETH gas reserve", "BLOCK", "post-tx ETH < 0.002"],
          ["Slippage cap", "BLOCK", "slippage > 500 bps"],
          ["Unverified contract", "BLOCK", "target not verified"],
          ["Price impact", "WARN", "impact > 5%"],
          ["Gas spend", "WARN", "gas cost > $10"],
          ["Large notional", "REQUIRE_REVIEW", "notional > $1000"]
        ]}
      />

      <H2>Wallet key handling</H2>
      <Table
        headers={["Mode", "When", "Setup"]}
        rows={[
          ["viem", "Dev, demo", <>Set <Code>WALLET_PRIVATE_KEY</Code> in <Code>.env</Code></>],
          ["Coinbase CDP", "Production", "Server-side MPC, no key in code"]
        ]}
      />

      <H2>Dry-run mode</H2>
      <P>Set <Code>EXECUTOR_DRY_RUN=true</Code> for full simulation — every stage runs end to end except
      the broadcast itself, which is logged but never sent.</P>
    </>
  ),

  "zerion-stack": () => (
    <>
      <h1>The Zerion stack — CLI · MCP · x402</h1>
      <P>OmnisysX is built on three Zerion building blocks. Each handles a distinct concern.</P>

      <H2>1. Zerion CLI</H2>
      <P>Open-source CLI wrapping the Zerion API. The Observer shells out to it for fast normalized portfolio data.</P>
      <Pre>{`npx -y zerion-cli init -y --browser
npm install -g zerion-cli`}</Pre>

      <H3>Commands OmnisysX uses</H3>
      <Table
        headers={["Command", "What it does", "Where"]}
        rows={[
          [<Code>zerion analyze</Code>, "Full wallet analysis", "Observer"],
          [<Code>zerion positions</Code>, "Token + DeFi positions", "Observer"],
          [<Code>zerion history</Code>, "Recent transactions", "Observer"]
        ]}
      />

      <H2>2. Zerion MCP</H2>
      <P>Zerion API documentation exposed as a Model Context Protocol server, so any MCP-aware client
      (Claude, Cursor, etc.) can ask the docs directly.</P>
      <Pre>{`claude mcp add --transport http zerion-api https://developers.zerion.io/mcp`}</Pre>

      <H2>3. x402 on Base</H2>
      <P>x402 is the protocol the Executor uses for autonomous payment of swap routing on Base.
      Wallet keys are required for this layer only — everything else runs read-only.</P>
    </>
  ),

  obsidian: () => (
    <>
      <h1>Obsidian brain</h1>
      <P>Persona, memory, and audit log live in plain Markdown files inside your Obsidian vault.</P>

      <H2>Setup</H2>
      <OL>
        <LI>Install Obsidian.</LI>
        <LI>Create a vault for OmnisysX.</LI>
        <LI>Install the Local REST API community plugin.</LI>
        <LI>Enable HTTPS or HTTP (HTTP is fine for localhost).</LI>
        <LI>Copy the API key.</LI>
        <LI>Note the port (default 27124 / 27123).</LI>
        <LI>Add <Code>OBSIDIAN_API_KEY</Code> and <Code>OBSIDIAN_PORT</Code> to <Code>.env</Code>.</LI>
      </OL>

      <H2>Vault structure</H2>
      <Pre>{`vault/
  00_System_Architecture/
  01_Agent_Personas/
  02_Sensory_Intelligence/
  03_Governance_&_Safety/
  04_Operations_Log/`}</Pre>

      <H2>Customize without code</H2>
      <P>Edit any persona file in <Code>01_Agent_Personas/</Code> and the orchestrator picks up the
      changes on the next run. No restart, no rebuild.</P>
    </>
  ),

  "web-interface": () => (
    <>
      <h1>Web interface</h1>
      <P>Two flavors. Pick what fits your deployment.</P>

      <H2>Variant A — Static HTML (recommended for hackathon)</H2>
      <P>Single <Code>OmnisysX.html</Code>, React via CDN, no build step. Files involved:</P>
      <UL>
        <LI><Code>OmnisysX.html</Code></LI>
        <LI><Code>omnisysx-app.jsx</Code>, <Code>omnisysx-portfolio.jsx</Code>, <Code>omnisysx-pipeline.jsx</Code>, <Code>omnisysx-ops.jsx</Code>, <Code>omnisysx-atoms.jsx</Code></LI>
        <LI><Code>assets/omnisysx-mascot.png</Code></LI>
      </UL>

      <H2>Variant B — Next.js app</H2>
      <P>Full Next.js 15 + Tailwind for production deployments.</P>

      <H2>Sections</H2>
      <Table
        headers={["Section", "Content"]}
        rows={[
          ["Header", "Sticky pill nav with collapsible logo"],
          ["Hero", "Oversized headline, CTAs, stat strip"],
          ["Portfolio Dashboard", "KPI cards, top positions, alerts, DeFi"],
          ["Pipeline Control", "6-stage flow with live SSE log"],
          ["PDR Queue", "Human-in-the-loop with Approve / Reject"],
          ["Operations Console", "Chat with Orchestrator + run history"],
          ["CTA Section", "Fork it / Read docs"]
        ]}
      />
    </>
  ),

  deployment: () => (
    <>
      <h1>Deployment</h1>
      <P>How to get OmnisysX live on your domain.</P>

      <H2>Static-site variant (simplest)</H2>
      <P>Drop <Code>OmnisysX.html</Code> + the <Code>.jsx</Code> files + <Code>assets/</Code> on any static host:</P>
      <UL>
        <LI>Vercel</LI>
        <LI>Netlify</LI>
        <LI>GitHub Pages</LI>
        <LI>Cloudflare Pages</LI>
      </UL>

      <H2>Next.js variant</H2>
      <Pre>{`# Frontend → Vercel
1. Push to GitHub
2. vercel.com/new → import repo
3. Root directory: web/
4. Add NEXT_PUBLIC_ORCHESTRATOR_URL env var
5. Deploy

# Backend → Railway
1. railway.app/new → from GitHub
2. Build: npm install
3. Start: node --loader ts-node/esm agent-core/orchestrator/server/server.ts`}</Pre>

      <H2>Custom domain</H2>
      <Table
        headers={["Record", "Type", "Value"]}
        rows={[
          ["@", "A", "76.76.21.21"],
          ["www", "CNAME", "cname.vercel-dns.com"],
          ["api", "CNAME", "your-app.up.railway.app"]
        ]}
      />

      <H2>Estimated monthly cost</H2>
      <Table
        headers={["Service", "Cost"]}
        rows={[
          ["Vercel (frontend)", "$0 (Hobby tier)"],
          ["Railway (backend)", "~$5"],
          ["Domain", "~$1/mo amortized"],
          ["Anthropic API", "$5–30 depending on frequency"],
          ["Zerion API", "$0 free tier or ~$3/day x402"],
          [<strong>Total</strong>, <strong>$10–40/mo for hobby use</strong>]
        ]}
      />
    </>
  ),

  forking: () => (
    <>
      <h1>Forking guide</h1>
      <P>OmnisysX is built to be forked. The architecture is intentionally modular.</P>

      <H2>Common fork patterns</H2>

      <H3>1. New Task Manager strategy</H3>
      <P>Edit <Code>01_Agent_Personas/TaskManager_Persona.md</Code> in your vault. The orchestrator
      reloads the persona on the next run — no code change required.</P>

      <H3>2. New Executor capability</H3>
      <Pre>{`if (tis.intentType === 'STAKE_LIDO') {
  return await executeLidoStake(tis, pdr, portfolio)
}`}</Pre>

      <H3>3. Different LLM</H3>
      <Pre>{`TASK_MANAGER_MODEL=claude-sonnet-4-6
AUDITOR_MODEL=claude-opus-4-7`}</Pre>

      <H3>4. Replace Obsidian with Notion</H3>
      <P>Create <Code>agent-core/brain/notion-bridge.ts</Code> with the same exports as the Obsidian
      bridge. The orchestrator only depends on the interface, not the storage.</P>

      <H2>What NOT to fork</H2>
      <P>These are stable contracts — change them and you break the pipeline:</P>
      <UL>
        <LI>The <Code>TIS</Code> schema</LI>
        <LI>The <Code>PDR</Code> schema</LI>
        <LI>SSE event names</LI>
        <LI>Golden Rule enforcement points</LI>
      </UL>
    </>
  ),

  "api-reference": () => (
    <>
      <h1>API reference</h1>
      <P>Every type and HTTP endpoint exposed by OmnisysX.</P>

      <H2>HTTP endpoints</H2>
      <P>Orchestrator runs on port 3001. The frontend talks via <Code>/api/orchestrator/*</Code>.</P>
      <Table
        headers={["Method", "Path", "Description"]}
        rows={[
          ["GET", <Code>/api/health</Code>, "Liveness check"],
          ["GET", <Code>/api/portfolio</Code>, "Latest cached ObserverReport"],
          ["POST", <Code>/api/observe</Code>, "Trigger one-off observation"],
          ["POST", <Code>/api/pipeline/run</Code>, "Trigger full pipeline run"],
          ["GET", <Code>/api/pipeline/stream</Code>, "SSE event stream"],
          ["GET", <Code>/api/pipeline/history</Code>, "Past pipeline runs"],
          ["GET", <Code>/api/pdr/pending</Code>, "List PDRs awaiting approval"],
          ["POST", <Code>/api/pdr/:id/approve</Code>, "Approve a PDR"],
          ["POST", <Code>/api/pdr/:id/reject</Code>, "Reject a PDR"],
          ["POST", <Code>/api/chat</Code>, "Chat with the Orchestrator"]
        ]}
      />

      <H2>SSE events</H2>
      <UL>
        <LI><Code>connected</Code> — initial handshake</LI>
        <LI><Code>observation:start</Code> / <Code>observation:complete</Code></LI>
        <LI><Code>pipeline:start</Code> / <Code>pipeline:complete</Code> / <Code>pipeline:error</Code></LI>
        <LI><Code>pdr:pending</Code> / <Code>pdr:approved</Code> / <Code>pdr:rejected</Code></LI>
      </UL>

      <H2>Environment variables</H2>
      <Table
        headers={["Variable", "Required", "Description"]}
        rows={[
          [<Code>ZERION_API_KEY</Code>, "yes", "From dashboard.zerion.io"],
          [<Code>ANTHROPIC_API_KEY</Code>, "yes", "Orchestrator + Task Manager + Auditor"],
          [<Code>AGENT_WALLET_ADDRESS</Code>, "yes", "Wallet to monitor and act on"],
          [<Code>WALLET_PRIVATE_KEY</Code>, "for x402", "Agent wallet private key"],
          [<Code>MIN_ETH_GAS_RESERVE</Code>, "no", "Default 0.002"],
          [<Code>EXECUTOR_DRY_RUN</Code>, "no", "Simulate without broadcasting"],
          [<Code>OBSIDIAN_API_KEY</Code>, "for brain", "Local REST API plugin key"]
        ]}
      />
    </>
  ),

  faq: () => (
    <>
      <h1>Troubleshooting & FAQ</h1>

      <H2>Setup issues</H2>

      <H3>Cannot find module 'ts-node/esm'</H3>
      <P>Run <Code>npm install</Code> at the project root.</P>

      <H3>zerion: command not found</H3>
      <Pre>{`npm install -g zerion-cli`}</Pre>

      <H3>Observer fails with 401 Unauthorized</H3>
      <P>Confirm <Code>ZERION_API_KEY</Code> starts with <Code>zk_</Code>. If it still fails, regenerate
      the key at <Code>dashboard.zerion.io</Code>.</P>

      <H2>Pipeline issues</H2>

      <H3>Pipeline halts at OBSERVE with CRITICAL gas alert</H3>
      <P>The Golden Rule kicked in. Top up ETH on the agent wallet above 0.002 and re-run.</P>

      <H3>Task Manager always returns HOLD_STEADY</H3>
      <P>It's being conservative because nothing warrants action. Edit the persona to be more
      aggressive (or change the threshold) to test.</P>

      <H3>Executor returns SKIPPED with PDR expired</H3>
      <P>Approval took longer than 5 minutes. Re-run the pipeline.</P>

      <H2>UI issues</H2>

      <H3>Cannot connect to Orchestrator</H3>
      <P>Is the orchestrator running on port 3001?</P>
      <Pre>{`curl http://localhost:3001/api/health`}</Pre>

      <H3>SSE not updating UI</H3>
      <P>Check devtools Network → EventStream. Corporate proxies sometimes block SSE.</P>

      <H2>Hackathon-specific</H2>

      <H3>What should I show in 2 minutes?</H3>
      <OL>
        <LI>10s — Hero of the live UI on a custom domain.</LI>
        <LI>20s — Click <strong>Trigger Pipeline</strong>, watch all 6 stages light up.</LI>
        <LI>15s — PDR queue pops up, approve with a click.</LI>
        <LI>30s — Execution confirmed, tx hash links to Basescan.</LI>
        <LI>15s — Show Obsidian: agent's brain in plain Markdown.</LI>
        <LI>10s — Mention: open source, MIT, fork-ready.</LI>
      </OL>
    </>
  )
};

Object.assign(window, {
  DOCS_NAV, DOCS_FLAT, DOCS_CONTENT,
  findDocBySlug, getAdjacentDocs, getDoc, textOf, slugify,
  P, H2, H3, Code, Pre, Quote, UL, OL, LI, HR, Table
});
