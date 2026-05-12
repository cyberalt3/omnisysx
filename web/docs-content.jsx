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
      <ul>
        <li><code>/swap</code>: REST-based instant token exchange.</li>
        <li><code>/bridge</code>: Cross-chain routing via LI.FI.</li>
        <li><code>/run</code>: Full pipeline execution.</li>
      </ul>
    </>
  )
};

Object.assign(window, {
  DOCS_NAV, DOCS_CONTENT
});
