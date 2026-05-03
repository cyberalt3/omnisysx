<div align="center">

# OmnisysX

### Multi-Agent DeFi Pipeline · Built on Zerion CLI

**Browse onchain. Act autonomously.**

A production-grade autonomous agent that observes DeFi wallets, reasons about risk with Claude, and executes onchain transactions through Zerion — all with bounded, auditable powers.

[Live demo](https://omnisysx.com) · [Documentation](https://omnisysx.com/docs.html) · [Discord bot](#-the-discord-bot)

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
- 🪙 **Native Zerion CLI integration** — reads wallet state, executes swaps, all through one tool
- 🛡️ **Policy-bounded execution** — agent token + Zerion policy guarantee the agent can only do what you allow
- 💸 **Cost-optimized** — Claude Haiku 4.5 keeps each pipeline run under $0.05
- 🌐 **Web dashboard** — single-file React app, no build step, deploy anywhere
- 🤖 **Discord bot** — public, slash commands + auto alerts, sharable across communities
- 🔌 **x402 ready** — pay-per-call mode for autonomous wallets that pay for their own data
- 🍴 **Forkable** — MIT license, modular code, swap any component

---

## Repository structure

```
omnisysx/
├── agent/              # Multi-agent pipeline (~290 LOC, single file)
│   ├── agent.mjs       #   Observer → TaskManager → Auditor → Executor → Verify
│   └── package.json
│
├── bot/                # Discord bot (~530 LOC, single file)
│   ├── bot.mjs         #   Slash commands + auto alerts
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

- **Node.js 20+**
- **Zerion CLI** — install with `npm install -g zerion-cli`
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- A **Zerion API key** ([dashboard.zerion.io](https://dashboard.zerion.io)) — free tier works
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

- `ANTHROPIC_API_KEY` — your Anthropic key
- `ZERION_API_KEY` — your Zerion key
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

Public bot anyone can add to their server. It exposes the same pipeline through slash commands, plus automatic gas-reserve alerts.

### Setup

```bash
cd bot
npm install
cp ../.env.example .env  # fill in DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID
npm start
```

Get your Discord credentials at [discord.com/developers/applications](https://discord.com/developers/applications):

1. Create a new Application
2. Go to **Bot** tab → **Reset Token** → copy
3. Go to **OAuth2** → **General** → copy the **Application ID**
4. Generate an invite URL via **OAuth2** → **URL Generator** with scopes `bot` + `applications.commands` and permissions `Send Messages`, `Embed Links`, `Use Slash Commands`

### Commands

| Command | What it does |
|---------|--------------|
| `/portfolio [address]` | Wallet snapshot embed |
| `/run [address]` | Trigger the full pipeline |
| `/policy` | Show the active agent token policy |
| `/watch <address> <name>` | Add a wallet to the watchlist |
| `/unwatch <name>` | Remove from watchlist |
| `/watchlist` | List watched wallets |
| `/status` | Show last pipeline execution |
| `/help` | Show all commands |

### Auto alerts

Set `ALERT_CHANNEL_ID` in `.env` to a Discord channel ID and the bot will post critical alerts there (currently: gas reserve breach, with 1-hour cooldown).

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
- [x] Zerion CLI integration with agent token + policy
- [x] Web dashboard with documentation
- [x] Discord bot with slash commands + auto alerts
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
- **[Anthropic](https://anthropic.com)** — for Claude (Haiku 4.5 powers the agents)
- **[Coinbase](https://www.coinbase.com/developer-platform)** — for the x402 protocol on Base


---

## License

MIT — see [LICENSE](LICENSE). Fork it, ship it, change everything.
