<div align="center">

# OmnisysX

### Multi-Agent DeFi Pipeline · Built on Zerion CLI

<img src="assets/landing.png" alt="OmnisysX Banner" width="100%" />

**Browse onchain. Act autonomously.**

A production-grade autonomous agent that observes DeFi wallets, reasons about risk with Claude, and executes onchain transactions through Zerion — all with bounded, auditable powers.

· [Documentation](https://omnisysx.xyz/docs.html) · [Discord bot](#-the-discord-bot)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-20%2B-green)
![Status](https://img.shields.io/badge/status-hackathon%20ready-brightgreen)

</div>

---

## What is OmnisysX?

OmnisysX is a **three-agent autonomous pipeline** for DeFi. It coordinates an Observer, a Task Manager, and an Auditor through a six-stage flow ("V Pattern") to monitor wallets and execute trades safely on EVM chains.

```
OBSERVE → REASON → PLAN → AUTHORIZE → EXECUTE → VERIFY
   │         │       │         │         │        │
Observer  ─────  TaskManager  Auditor  Executor  Verify
```

Each agent has one job:

- **Observer** — reads wallet state via Zerion CLI (portfolio, positions, gas, DeFi exposure)
- **Task Manager** — decides whether to act, produces a structured Transaction Intent
- **Auditor** — independently validates the intent against security policies; final gate before any onchain action
- **Executor** — signs and broadcasts via Zerion's swap API on Base

Everything runs under one **Golden Rule**: the agent must never reduce the wallet's ETH balance below the gas reserve threshold (default 0.002 ETH). This is enforced at every layer.

---

## Why three agents instead of one?

Single-agent designs conflate three different concerns: data gathering, strategy, and security. Each one has different failure modes and prompts the model differently.

By splitting them:

- The **Observer** is deterministic. It never hallucinates — it just calls the Zerion API and structures the response.
- The **Task Manager** is allowed to be creative. It can propose, hesitate, or do nothing.
- The **Auditor** is intentionally adversarial. It blocks any plan that breaks the rules — even if the Task Manager was confident.

This is the same pattern professional trading desks use: research, strategy, and risk are different teams.

---

## Features

- 🤖 **Multi-agent pipeline** with explicit security checkpoints
- 🌐 **Zerion HTTP REST API** — production-grade wallet data, no CLI binary dependency
- 🛡️ **Policy-bounded execution** — agent token + Zerion policy guarantee the agent can only do what you allow
- 🧠 **Orchestrator AI** — Web3 expert assistant via `/ask` or `@mention`, powered by OpenRouter
- 🔒 **Security guardrails** — AI scope-locked to Web3 topics, never reveals keys or internal config
- 💸 **Cost-optimized** — Claude 3.5 Haiku keeps each pipeline run under $0.05
- 🌐 **Web dashboard** — single-file React app, no build step, deploy anywhere
- 🤖 **Discord bot** — slash commands, @mention chat, auto alerts, Trinity Verification Report
- 🔌 **x402 ready** — pay-per-call mode for autonomous wallets that pay for their own data
- 🍴 **Forkable** — MIT license, modular code, swap any component

---

## 🛠️ Implementation Milestones (Completed)

We have pushed the boundaries of what is possible with the current Zerion CLI:

*   **CLI Core Monkey-Patch:** Solved the critical "to parameter is required" bug that blocked autonomous swaps in the official CLI.
*   **Dual-Token Agent Support:** Fully implemented EVM and Solana agent token handling in a single pipeline.
*   **Secure Passphrase Injection:** Implemented automated `ZERION_PASSPHRASE` piping to allow encrypted keystores to function in cloud environments like Railway.
*   **Railway-Ready Deployment:** Full Docker support with dynamic configuration bundle restoration.

---

## Repository structure

```
omnisysx/
├── agent/              # Multi-agent pipeline (~370 LOC, single file)
│   ├── agent.mjs       #   Observer → TaskManager → Auditor → Executor → Verify
│   └── package.json
│
├── bot/                # Discord bot (~795 LOC, single file)
│   ├── bot.mjs         #   Slash commands + Orchestrator AI + @mention chat
│   ├── README.md       #   Bot-specific setup and usage
│   └── package.json
│
├── web/                # Static web dashboard (no build step)
│   ├── OmnisysX.html   #   Entry HTML
│   ├── *.jsx           #   React components (loaded via @babel/standalone)
│   ├── docs.html       #   Documentation page
│   └── content/docs/   #   Markdown source for docs
│
├── docs/               # Project documentation (Markdown)
├── scripts/            # Utility scripts (sanity checks, etc.)
├── .env.example        # Environment variable template
└── README.md           # This file
```

The `agent/` is the source of truth for the pipeline logic. The `bot/` and `web/` import from it — they're thin UIs over the same core.

---

## Quick start

### Prerequisites

- **Node.js 22+**
- **Zerion API Key** — [developers.zerion.io](https://developers.zerion.io) (free tier works)
- An **OpenRouter API key** ([openrouter.ai](https://openrouter.ai)) — for LLM inference
- A **dedicated agent wallet** (do NOT use your main wallet) funded with a small amount of ETH on Base

### 1. Clone and install

```bash
git clone https://github.com/cyberalt3/omnisysx
cd omnisysx
npm install
```

### 2. Set up the agent wallet (one-time)

```bash
# Initialize Zerion CLI with your API key
zerion init

# Create a dedicated agent wallet
zerion wallet create --name omnisysx-bot

# Fund it (sends an address/QR — transfer ~0.005 ETH + a few USDC on Base)
zerion wallet fund

# Create a scoped policy (the security boundary)
zerion agent create-policy \
  --name safe-base \
  --chains base \
  --expires 7d \
  --deny-transfers

# Mint an agent token bound to that policy
zerion agent create-token \
  --name omnisysx \
  --wallet omnisysx-bot \
  --policy safe-base
```

The policy ensures the agent can only swap on Base, can't transfer funds out of the wallet, and the token expires automatically in 7 days.

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

- `OPENROUTER_API_KEY` — your OpenRouter key
- `ZERION_API_KEY` — your Zerion key
- `LLM_MODEL` — model to use (default: `anthropic/claude-3.5-haiku`)
- `AGENT_WALLET_ADDRESS` — the public address of the wallet you just created
- `EXECUTOR_DRY_RUN=true` — keep it on `true` until you're ready to execute real swaps

### 4. Run the pipeline

```bash
npm run agent
```

---

## 🤖 The Discord bot

Public bot anyone can add to their server. It exposes the pipeline through slash commands, an AI-powered Web3 assistant (Orchestrator), and automatic gas-reserve alerts.

<div align="center">
  <img src="assets/trinity.png" alt="Trinity Verification Report" width="600px" />
  <p><i>The Trinity Verification Report: AI transparency in action.</i></p>
</div>

### Commands

| Command | What it does |
|---------|--------------|
| `/portfolio [address]` | Wallet snapshot embed |
| `/run [address]` | Full pipeline → Trinity Verification Report |
| `/ask <question> [wallet]` | Ask the Orchestrator about Web3/DeFi |
| `/policy` | Show the active agent token policy |
| `/watch <address> <name>` | Add a wallet to the watchlist |
| `/unwatch <name>` | Remove from watchlist |
| `/watchlist` | List watched wallets |
| `/status` | Show last pipeline execution |
| `/help` | Show all commands |

---

## Security model

OmnisysX is built on **defense in depth**. There are four independent guards against mistakes:

### 1. The Golden Rule
> The agent must never reduce ETH balance below `MIN_ETH_GAS_RESERVE`.

### 2. Auditor as policy gate
The Auditor agent runs in a separate LLM call with adversarial framing. Its job is to find reasons to reject.

### 3. Zerion agent token policy
Even if the entire LLM stack misbehaves, the **agent token** has hard limits set by the Zerion CLI:

- `--chains base` → can only operate on Base
- `--deny-transfers` → cannot send funds out
- `--expires 7d` → token self-destructs in a week

---

## 🛤️ Roadmap (What's Next)

- [x] Three-agent pipeline (Observer / Task Manager / Auditor)
- [x] Zerion CLI Patch for `to` parameter (On-chain Success)
- [x] Railway/Cloud deployment support
- [x] Trinity Verification Report for Discord
- [ ] **Full Web Dashboard Integration:** Porting the Discord's robust execution engine directly to the web UI, allowing real-time swaps via the browser with the same security pipeline.
- [ ] Cross-chain bridge automation.
- [ ] Telegram bot integration.
- [ ] Backtesting harness.

---

## Acknowledgements

- **[Zerion](https://zerion.io)** — for the CLI, the API, and the agent token primitives
- **[Anthropic](https://anthropic.com)** — for Claude (3.5 Haiku powers the agents via OpenRouter)

---

## License

MIT — see [LICENSE](LICENSE). Fork it, ship it, change everything.
