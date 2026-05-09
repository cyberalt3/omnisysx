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
      <p>OmnisysX is an autonomous DeFi pipeline orchestrated by three specialized agents.</p>
    </>
  ),
  setup: () => (
    <>
      <h1>Setup</h1>
      <p>From clean machine to working install.</p>
    </>
  ),
  "multi-wallet": () => (
    <>
      <h1>Multi-wallet support</h1>
      <p>OmnisysX can manage multiple independent identities across EVM and Solana chains.</p>
      <h2>Configuration</h2>
      <p>Add your secondary keys to the <code>.env</code> file:</p>
      <pre>{`AGENT_PRIVATE_KEY=0x...
AGENT_SOLANA_PRIVATE_KEY=...`}</pre>
    </>
  ),
  "profit-analysis": () => (
    <>
      <h1>Profit Analysis (/tx)</h1>
      <p>Track your agent's performance with the built-in profit analysis tool.</p>
      <h2>How it works</h2>
      <p>The agent observes transaction history via Zerion and calculates the PnL (Profit and Loss).</p>
    </>
  ),
  "api-reference": () => (
    <>
      <h1>API reference</h1>
      <p>Every type and HTTP endpoint exposed by OmnisysX.</p>
    </>
  )
};

Object.assign(window, {
  DOCS_NAV, DOCS_CONTENT
});
