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
      { slug: "multi-wallet", title: "Multi-wallet support", description: "Managing multiple EVM and Solana identities." },
      { slug: "profit-analysis", title: "Profit Analysis (/tx)", description: "How the agent calculates performance and PnL." },
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
      <p>OmnisysX is an autonomous DeFi orchestration layer designed for the Zerion AI ecosystem. It moves beyond simple command-execution by implementing a multi-agent decision cycle.</p>
      <h2>The Core Mission</h2>
      <p>To provide a safe, high-performance execution environment where AI can manage assets across chains while remaining bounded by human-defined security policies.</p>
      
      <H2>Stack at a glance</H2>
      <Table
        headers={["Layer", "Tech"]}
        rows={[
          ["On-chain perception", <><Code>Zerion CLI</Code> + REST API (EVM & SOL)</>],
          ["Agent connectivity", "Zerion MCP Server"],
          ["Multi-chain swaps", "LI.FI (EVM) · Zerion CLI (Solana)"],
          ["Wallet signing", "Ethers.js (Local) · Zerion Keystore (CLI)"],
          ["Orchestration LLM", "Claude 3.5 Haiku (via OpenRouter)"],
          ["Brain", "Obsidian vault (Local REST API)"],
          ["Frontend", "React via CDN — no build step"],
          ["Runtime", "Node.js 20+ (Railway) · static HTML (Vercel)"]
        ]}
      />
    </>
  ),
  architecture: () => (
    <>
      <h1>Hybrid Architecture & Deployment</h1>
      <p>OmnisysX utilizes a unique <strong>Hybrid Model</strong> to balance speed, reliability, and security:</p>
      <ul>
        <li><strong>REST API Layer:</strong> Uses Zerion and LI.FI APIs for real-time market data, portfolio snapshots, and optimized routing.</li>
        <li><strong>CLI Layer:</strong> Leverages the Zerion CLI for enforcement of Agent Tokens and on-chain Security Policies.</li>
        <li><strong>Local Execution:</strong> Transactions are signed locally using <code>ethers.js</code>, ensuring keys never leave your infrastructure.</li>
      </ul>
      <h2>Cloud-Ready (VPS & Docker)</h2>
      <p>Our architecture is specifically optimized for <strong>VPS environments</strong> (like Railway, AWS, or DigitalOcean). By migrating execution logic to REST APIs, we ensure 100% reliability in Dockerized environments where traditional CLI binaries might face library dependencies or authentication hurdles.</p>
    </>
  ),
  agents: () => (
    <>
      <h1>The Trinity of Agents</h1>
      <p>Our pipeline is divided into three specialized agents, each with a distinct role in the DeFi lifecycle:</p>
      <h3>1. 🔭 The Observer</h3>
      <p>Scans the blockchain via Zerion REST API to build a real-time report of positions, gas reserves, and risk exposure.</p>
      <h3>2. 🧠 The Task Manager</h3>
      <p>Analyzes the Observer's report and generates intents (Swaps, Bridges, or Alerts) based on LLM reasoning.</p>
      <h3>3. 🛡️ The Auditor</h3>
      <p>The final security gate. It validates the Task Manager's proposal against strict safety rules (slippage, gas limits, and token allowlists) before authorization.</p>
    </>
  ),
  pipeline: () => (
    <>
      <h1>The 6-Stage Pipeline (V-Pattern)</h1>
      <p>Every execution cycle follows a rigorous process to ensure safety and transparency:</p>
      <ol>
        <li><strong>OBSERVE:</strong> Fetch wallet state.</li>
        <li><strong>REASON:</strong> LLM analyzes the data.</li>
        <li><strong>PLAN:</strong> Task Manager proposes an action.</li>
        <li><strong>AUDIT:</strong> Auditor validates against policies.</li>
        <li><strong>EXECUTE:</strong> Local signing and broadcast.</li>
        <li><strong>VERIFY:</strong> Trinity report generation.</li>
      </ol>
    </>
  ),
  "multi-wallet": () => (
    <>
      <h1>Multi-wallet support</h1>
      <p>OmnisysX manages independent identities across EVM chains. By using different Agent Tokens, you can partition permissions for different agents.</p>
      <H2>4. Configure <Code>cp .env.example .env</Code></H2>
      <P>Minimum viable config:</P>
      <Pre>{`# API Keys
ZERION_API_KEY=zk_dev_PASTE_HERE
OPENROUTER_API_KEY=sk-or-v1-PASTE_HERE

# EVM Wallet
AGENT_WALLET_ADDRESS=0xPASTE_YOUR_EVM_ADDRESS
AGENT_PRIVATE_KEY=PASTE_EVM_PRIVATE_KEY

# Solana Wallet (Optional but recommended)
AGENT_SOLANA_ADDRESS=PASTE_SOLANA_ADDRESS
AGENT_SOLANA_PRIVATE_KEY=PASTE_SOLANA_PRIVATE_KEY

# Pipeline Settings
EXECUTOR_DRY_RUN=true
MIN_ETH_GAS_RESERVE=0.002`}</Pre>

      <H2>5. Solana Specifics</H2>
      <P>
        OmnisysX uses the Zerion CLI to execute swaps on Solana. To enable this:
      </P>
      <OL>
        <LI>Ensure your Solana private key is in <Code>.env</Code>.</LI>
        <LI>The bot will automatically import the key into a dedicated keystore named <Code>omnisysx-bot-sol</Code>.</LI>
        <LI>Verify funds: The bot requires a small amount of SOL (recommended &gt; 0.05) to handle gas and rent.</LI>
      </OL>
    </>
  ),
  "profit-analysis": () => (
    <>
      <h1>Profit Analysis (/tx)</h1>
      <p>Analyze transaction history to calculate real-time PnL and alpha performance using Zerion's historical data endpoints.</p>
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
          [<Code>OPENROUTER_API_KEY</Code>, "yes", "LLM gateway for Claude 3.5 Haiku"],
          [<Code>AGENT_WALLET_ADDRESS</Code>, "yes", "Wallet to monitor and act on"],
          [<Code>AGENT_PRIVATE_KEY</Code>, "for execution", "Agent wallet private key"],
          [<Code>MIN_ETH_GAS_RESERVE</Code>, "no", "Default 0.002"],
          [<Code>EXECUTOR_DRY_RUN</Code>, "no", "Simulate without broadcasting"],
          [<Code>AGENT_SOLANA_ADDRESS</Code>, "for Solana", "Solana wallet public key"],
          [<Code>AGENT_SOLANA_PRIVATE_KEY</Code>, "for Solana", "Solana wallet private key"]
        ]}
      />
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
        <LI><strong>OpenRouter key</strong> — at <Code>openrouter.ai</Code>, starts with <Code>sk-or-</Code>.</LI>
        <LI><strong>Wallet private key</strong> — use a <strong>dedicated agent wallet</strong>, NOT your main wallet.</LI>
      </UL>

      <H2>4. Configure <Code>cp .env.example .env</Code></H2>
      <P>Minimum viable config:</P>
      <Pre>{`# API Keys
ZERION_API_KEY=zk_dev_PASTE_HERE
OPENROUTER_API_KEY=sk-or-v1-PASTE_HERE

# EVM Wallet
AGENT_WALLET_ADDRESS=0xPASTE_YOUR_EVM_ADDRESS
AGENT_PRIVATE_KEY=PASTE_EVM_PRIVATE_KEY

# Solana Wallet (Optional but recommended)
AGENT_SOLANA_ADDRESS=PASTE_SOLANA_ADDRESS
AGENT_SOLANA_PRIVATE_KEY=PASTE_SOLANA_PRIVATE_KEY

# Pipeline Settings
EXECUTOR_DRY_RUN=true
MIN_ETH_GAS_RESERVE=0.002`}</Pre>

      <H2>5. Solana Specifics</H2>
      <P>OmnisysX uses the Zerion CLI to execute swaps on Solana. To enable this:</P>
      <OL>
        <LI>Ensure your Solana private key is in <Code>.env</Code>.</LI>
        <LI>The bot will automatically import the key into a dedicated keystore named <Code>omnisysx-bot-sol</Code>.</LI>
        <LI>Verify funds: The bot requires a small amount of SOL (recommended &gt; 0.05) to handle gas and rent.</LI>
      </OL>

      <H2>6. Run the Observer (sanity check)</H2>
      <Pre>{`node --loader ts-node/esm agent-core/observer/run.ts`}</Pre>
      <P>You should see a JSON <Code>ObserverReport</Code> printed in the terminal with your
      portfolio summary, gas reserve status, and any active alerts.</P>
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
node --loader ts-node/esm agent-core/orchestrator/run.ts`}</Pre>

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

  "web-interface": () => (
    <>
      <h1>Web interface</h1>
      <P>Two flavors. Pick what fits your deployment.</P>

      <H2>Variant A — Static HTML (recommended)</H2>
      <P>Single <Code>OmnisysX.html</Code>, React via CDN, no build step. Files involved:</P>
      <UL>
        <LI><Code>OmnisysX.html</Code></LI>
        <LI><Code>omnisysx-app.jsx</Code>, <Code>omnisysx-portfolio.jsx</Code>, <Code>omnisysx-pipeline.jsx</Code>, <Code>omnisysx-ops.jsx</Code>, <Code>omnisysx-atoms.jsx</Code></LI>
        <LI><Code>assets/omnisysx-mascot.png</Code></LI>
      </UL>

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

      <H2>Backend (Railway)</H2>
      <Pre>{`# Railway deployment
1. railway.app/new → from GitHub
2. Build: npm install
3. Start: node agent/agent.mjs`}</Pre>

      <H2>Estimated monthly cost</H2>
      <Table
        headers={["Service", "Cost"]}
        rows={[
          ["Vercel (frontend)", "$0 (Hobby tier)"],
          ["Railway (backend)", "~$5"],
          ["Domain", "~$1/mo amortized"],
          ["OpenRouter API", "$5–30 depending on frequency"],
          ["Zerion API", "$0 free tier"],
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
      <P>Edit the Task Manager persona. The orchestrator reloads on the next run — no code change required.</P>

      <H3>2. New Executor capability</H3>
      <Pre>{`if (tis.intentType === 'STAKE_LIDO') {
  return await executeLidoStake(tis, pdr, portfolio)
}`}</Pre>

      <H3>3. Different LLM</H3>
      <Pre>{`LLM_MODEL=claude-sonnet-4-6
AUDITOR_MODEL=claude-opus-4-7`}</Pre>

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

  faq: () => (
    <>
      <h1>Troubleshooting & FAQ</h1>

      <H2>Setup issues</H2>

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
    </>
  )
};

Object.assign(window, {
  DOCS_NAV, DOCS_FLAT, DOCS_CONTENT,
  findDocBySlug, getAdjacentDocs, getDoc, textOf, slugify,
  P, H2, H3, Code, Pre, Quote, UL, OL, LI, HR, Table
});
