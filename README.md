<div align="center">

# OmnisysX

### Multi-Agent DeFi Pipeline · Built on Zerion CLI + API

**Browse onchain. Act autonomously.**

A production-grade autonomous agent that observes DeFi wallets, reasons about risk with LLM, and executes onchain transactions through Zerion — all with bounded, auditable powers.

[Live demo](https://omnisysx.com) · [Documentation](https://omnisysx.com/docs.html) · [Discord bot](#-the-discord-bot)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-20%2B-green)


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

- **Observer** — reads multi-chain wallet state via Zerion HTTP REST API (portfolio, positions, gas, DeFi exposure)
- **Task Manager** — decides whether to act, produces a structured Transaction Intent
- **Auditor** — independently validates the intent against security policies; final gate before any onchain action
- **Executor** — signs and broadcasts transactions via **Zerion & LI.FI REST APIs** using local `ethers.js` signing. This ensures high reliability and eliminates binary dependencies in ephemeral cloud environments.

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
- 🌐 **Zerion & LI.FI REST APIs + CLI** — high-performance, real-time swap and bridge execution
- 🛡️ **Self-Custodial Execution** — transactions signed locally via `ethers.js`, keeping your keys secure
- 🛡️ **Policy-bounded execution** — integrated with Zerion CLI policies for manual safety checks
- 🧠 **Orchestrator AI** — Web3 expert assistant via `/ask` or `@mention`, powered by OpenRouter
- 🔒 **Security guardrails** — AI scope-locked to Web3 topics, never reveals keys or internal config
- 💸 **Cost-optimized** — Claude 3.5 Haiku keeps each pipeline run under $0.05
- 🌐 **Web dashboard** — single-file React app, no build step, deploy anywhere
- 🤖 **Discord bot** — slash commands, @mention chat, auto alerts, Trinity Verification Report
- 🍴 **Forkable** — MIT license, modular code, swap any component

---

## 🛠 The Zerion Hybrid Architecture

OmnisysX implements a high-performance hybrid model, utilizing the Zerion ecosystem for two distinct purposes:

### 1. Intelligence (Zerion HTTP REST API + CLI)
For the **Observer** and **Analyzer** stages, we use the Zerion REST API. This allows the agent to:
- Retrieve real-time, multi-chain portfolio snapshots in milliseconds.
- Analyze transaction history to identify alpha and profit strategies.

### 2. Automation (Direct REST API + Ethers.js)
The **Executor** utilizes the Zerion and LI.FI APIs to fetch optimized quotes and routes.
- **On-chain Signing**: Transactions are signed locally using `ethers.js` and the `AGENT_PRIVATE_KEY`, ensuring fast and reliable broadcasting without CLI overhead.
- **Auto-Approval**: Implements smart ERC-20 allowance management to prevent `TRANSFER_FROM_FAILED` errors automatically.

### 3. Sovereignty (Zerion CLI + Agent Tokens)
For the user, the **Zerion CLI** remains the ultimate control layer:
- **Policy Enforcement**: Users define the agent's boundaries (chains, tokens, expiries) via the CLI.
- **Manual Override**: The WSL-based CLI allows for manual intervention and "reverse swaps" to verify wallet ownership during live demos.

> **Judge's Note**: This hybrid approach leverages the **Zerion REST API** for speed/intelligence and the **Zerion CLI** for governance/security.

---

## Repository structure

```
omnisysx/
├── agent/              # Multi-agent pipeline (v1.0.2)
│   ├── agent.mjs       #   Observer → TaskManager → Auditor → Executor → Verify
│   ├── server.mjs      #   SSE API Server for web dashboard
│   └── package.json
│
├── bot/                # Discord bot (v1.1.0 - Production)
│   ├── bot.mjs         #   1245 LOC: Slash commands + Orchestrator + Multi-wallet
│   ├── README.md       #   Bot-specific setup
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

Expected output:

```
═══ OmnisysX Pipeline ═══
Wallet: 0xd8dA…6045
Model:  claude-haiku-4-5-20251001
Mode:   DRY_RUN

[OBSERVE  ] analyzing 0xd8dA…6045
  ✓ portfolio: $12.40 · ETH=0.004212 (SAFE)
[PLAN     ] TaskManager reasoning...
  ✓ TIS: SWAP (confidence=0.78)
    Portfolio has idle USDC; convert a small amount to ETH for gas reserve
[AUTHORIZE] Auditor reviewing...
    ✓ APPROVED (risk=15/100) — Within gas and slippage limits
[EXECUTE  ] executing SWAP...
  ⚠ DRY_RUN active — would execute:
    zerion swap usdc eth 1 --chain base --wallet omnisysx-bot --slippage 1 --json
[VERIFY   ] verifying onchain state...
    dry-run — skipping onchain verification

═══ Pipeline OK · 4.2s ═══
```

### 5. Go live

When you're ready, set `EXECUTOR_DRY_RUN=false` in `.env` and run again. The Executor will sign and broadcast the swap. The transaction hash will appear in the verify stage.

---

## 🤖 The Discord bot

Public bot anyone can add to their server. It exposes the pipeline through slash commands, an AI-powered Web3 assistant (Orchestrator), and automatic gas-reserve alerts.

### Setup

```bash
cd bot
npm install
cp ../.env.example .env  # fill in all required keys
npm start
```

Get your Discord credentials at [discord.com/developers/applications](https://discord.com/developers/applications):

1. Create a new Application
2. Go to **Bot** tab → **Reset Token** → copy
3. Go to **Bot** tab → Enable **Message Content Intent** (required for @mentions)
4. Go to **OAuth2** → **General** → copy the **Application ID**
5. Generate an invite URL via **OAuth2** → **URL Generator** with scopes `bot` + `applications.commands` and permissions `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`

### Commands

| Command | What it does |
|---------|--------------|
| `/portfolio [address]` | Wallet snapshot embed |
| `/run [address]` | Full pipeline → Trinity Verification Report |
| `/swap <chain> <amount> <from> <to>` |Execute instant swap via Zerion REST API + CLI
| `/bridge <amount> <f_chain> <t_chain> <f_token> <t_token>` | Cross-chain bridge via LI.FI with bests routes
| `/tx <address>` | Analyze wallet for profit & alpha strategies - *(Being deployed)*
| `/ask <question> [wallet]` | Ask the Orchestrator about Web3/DeFi |
| `/policy` | Show the active agent token policy |
| `/watch <address> <name>` | Add a wallet to the watchlist |
| `/unwatch <name>` | Remove from watchlist |
| `/watchlist` | List watched wallets |
| `/status` | Show last pipeline execution |
| `/help` | Show all commands |

### @Mention chat

Mention the bot to chat with the Orchestrator AI:

```
@OmnisysX what is Aave?
@OmnisysX analyze 0x75029d830749554d2dccc5e00dda7eb7c294c423
```

The Orchestrator is scope-locked to Web3 topics and automatically injects wallet portfolio data when an address is detected. It will never reveal API keys or internal configuration.

### Auto alerts

Set `ALERT_CHANNEL_ID` in `.env` to a Discord channel ID and the bot will post critical alerts there (currently: gas reserve breach, with 1-hour cooldown).

See [bot/README.md](bot/README.md) for detailed setup and hosting instructions.

---

## 🌐 The web dashboard

A single-file React app that runs entirely in the browser. No build step, no Node.js required to host it.

```bash
cd web
# just open OmnisysX.html in any browser
# or serve with any static host (Vercel, Netlify, GitHub Pages, etc.)
```

The dashboard reads pipeline state from `bot-state.json` if you co-deploy with the bot, or shows mock data for demos.

To deploy on a custom domain, drag-drop the `web/` folder onto Vercel or Netlify.

---

## Cost breakdown

Running the pipeline every 5 minutes (288 runs/day):

| Item | Per day | Per month |
|------|---------|-----------|
| Anthropic Haiku 4.5 (Task Manager + Auditor) | ~$0.20 | ~$6 |
| Zerion API (free tier) | $0 | $0 |
| Discord bot hosting (Railway / VPS) | — | ~$5 |
| Onchain gas (per swap on Base) | ~$0.01–0.10 | varies |
| **Fixed total** | **~$0.20** | **~$11** |

To go cheaper: increase the polling interval. Most autonomous DeFi strategies don't need 5-minute granularity.

---

## Security model

OmnisysX is built on **defense in depth**. There are four independent guards against mistakes:

### 1. The Golden Rule
> The agent must never reduce ETH balance below `MIN_ETH_GAS_RESERVE`.

Enforced at every layer: Observer alerts, Task Manager prompt, Auditor check, Executor pre-flight.

### 2. Auditor as policy gate
The Auditor agent runs in a separate LLM call with adversarial framing. Its job is to find reasons to reject. It blocks:

- Slippage > 500 bps
- Confidence < 0.5
- Unsupported chains
- Any move that violates the Golden Rule

### 3. Zerion agent token policy
Even if the entire LLM stack misbehaves, the **agent token** has hard limits set by the Zerion CLI:

- `--chains base` → can only operate on Base
- `--deny-transfers` → cannot send funds out
- `--expires 7d` → token self-destructs in a week

This is the most important boundary: the LLM cannot exceed what the policy allows, period.

### 4. DRY_RUN by default
The Executor refuses to broadcast unless `EXECUTOR_DRY_RUN=false` is explicitly set. Forks and demo deployments stay safe by default.

---

## Forking & customization

OmnisysX is intentionally modular. Common modifications:

| You want to... | What to change |
|----------------|----------------|
| Use a different LLM | `agent/agent.mjs` → swap the `askClaude()` function for OpenAI/Gemini SDK |
| Change the strategy | Edit `TASK_MANAGER_PROMPT` in `agent/agent.mjs` |
| Add new policies | Edit `AUDITOR_PROMPT` in `agent/agent.mjs` and the `zerion agent create-policy` invocation |
| Support more chains | Adjust the `--chains` flag on the policy + the chain enum in the Task Manager prompt |
| Add a Telegram bot instead of Discord | Copy `bot/bot.mjs` structure, swap discord.js for the Telegram SDK |
| Replace Zerion with another data source | Replace `zerionCli()` calls in `agent/agent.mjs` |

The pipeline contract (`runPipeline()` returning a `{ report, tis, pdr, execResult }` object) is stable — that's the integration point any UI plugs into.

---

## Roadmap

- [x] Three-agent pipeline (Observer / Task Manager / Auditor)
- [x] Zerion HTTP REST API integration + CLI
- [x] Web dashboard with documentation
- [x] Discord bot with slash commands + auto alerts
- [x] Orchestrator AI — `/ask` + `@mention` chat with security guardrails
- [x] Trinity Verification Report for `/run` output
- [x] Railway deployment with Docker (Node 22)
- [ ] Telegram bot (community contribution welcome)
- [ ] Multi-chain orchestration (currently single-chain per run)
- [ ] Backtesting harness — replay past wallet states
- [ ] Webhook support for custom integrations

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

For a fork-friendly project, the architecture is intentionally minimal: every component is a single file, no monorepo tooling, no TypeScript-only abstractions. If you're stuck, open an issue.

---

## Acknowledgements

- **[Zerion](https://zerion.io)** — for the CLI, the API, and the agent token primitives
- **[Anthropic](https://anthropic.com)** — for Claude (3.5 Haiku powers the agents via OpenRouter)
- **[OpenRouter](https://openrouter.ai)** — for LLM gateway and model routing

---

MIT — see [LICENSE](LICENSE). Fork it, ship it, change everything.

---

Built with ❤️ by the OmnisysX Team. Powered by Zerion
