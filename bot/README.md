# `@omnisysx/bot`

Public Discord bot exposing the OmnisysX pipeline as slash commands + AI-powered Web3 assistant.

## What's new (v0.2.0)

- **Zerion HTTP API** — replaced CLI dependency with direct REST calls for production stability
- **Orchestrator AI** — `/ask` command + `@mention` chat powered by OpenRouter (Claude 3.5 Haiku)
- **Trinity Verification Report** — rich embed for `/run` with risk scoring and agent reports
- **Security guardrails** — AI scope-locked to Web3 topics, never reveals keys or internal config
- **Crash resilience** — global error handler prevents process termination

## Setup

### 1. Create Discord application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → name it (e.g. "OmnisysX")
3. **Bot** tab → **Reset Token** → copy the token
4. **Bot** tab → Enable **Message Content Intent** (required for @mentions)
5. **OAuth2** → **General** → copy the **Application ID**

### 2. Generate invite URL

In **OAuth2** → **URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`

### 3. Configure

Set in `.env` at the project root:

```env
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_application_id_here
OPENROUTER_API_KEY=sk-or-v1-...
ZERION_API_KEY=zk_...
LLM_MODEL=anthropic/claude-3.5-haiku
AGENT_WALLET_ADDRESS=0x...
ALERT_CHANNEL_ID=optional_channel_id_for_alerts
```

### 4. Run

```bash
cd bot
npm install
npm start
```

Output:

```
Registering slash commands globally...
✓ 9 commands registered
✓ OmnisysX#1234 online in 1 server(s)
  Mode:    DRY_RUN (safe)
  Default: 0x7502…c423
  LLM:     OpenRouter ✓ (anthropic/claude-3.5-haiku)
```

## Slash commands

| Command | What it does |
|---------|-------------|
| `/portfolio [address]` | Wallet snapshot embed |
| `/run [address]` | Full pipeline with Trinity Verification Report |
| `/ask <question> [wallet]` | Ask the Orchestrator about Web3/DeFi |
| `/policy` | Show the active agent token policy |
| `/watch <address> <name>` | Add a wallet to the server's watchlist |
| `/unwatch <name>` | Remove from the watchlist |
| `/watchlist` | List watched wallets in this server |
| `/status` | Show last pipeline execution |
| `/help` | Show all commands |

## @Mention chat

Mention the bot anywhere in a channel to chat with the Orchestrator:

```
@OmnisysX what is Aave?
@OmnisysX analyze 0x75029d830749554d2dccc5e00dda7eb7c294c423
@OmnisysX explain gas costs on Base vs Ethereum
```

The Orchestrator automatically injects wallet portfolio data when an address is detected.

### Safety guardrails

- Only discusses Web3, DeFi, and blockchain topics
- Never reveals API keys, tokens, or internal configuration
- Concise responses optimized for Discord (< 1500 chars)

## Auto alerts

When `ALERT_CHANNEL_ID` is set, the bot polls watched wallets every `POLL_INTERVAL_MS` (default 5 minutes) and posts when gas reserve falls below `MIN_ETH_GAS_RESERVE` (1-hour cooldown per wallet).

## State persistence

State (watchlists, last run, alert cooldowns) is saved to `bot-state.json`. This file is gitignored. For production, consider migrating to Redis or Postgres.

## Hosting in production

- **Railway** — connect GitHub repo → add env vars → auto-deploys via Dockerfile
- **Fly.io** — `fly launch` in the `bot/` folder
- **VPS with PM2** — `pm2 start bot.mjs --name omnisysx-bot`

Estimated cost: ~$5/month for Railway starter or small VPS.
