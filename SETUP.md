# Setup walkthrough

Complete setup from a fresh machine to a working OmnisysX install. Should take about 20 minutes.

## What you'll have at the end

- A dedicated agent wallet on Base
- A scoped Zerion policy + agent token
- The agent running locally in DRY_RUN mode
- Optionally: the Discord bot online in your server

## Prerequisites

You need:
- **Node.js 20 or later** ([nodejs.org](https://nodejs.org))
- **A terminal** (PowerShell on Windows, Terminal on Mac, any shell on Linux)
- **About $10 in crypto** if you want to do real swaps later (a small amount of ETH on Base for gas + some USDC)

## Step 1 — Get your API keys

You need two keys. Both are free.

**Anthropic** — for the LLM that powers the agents
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in
3. Go to **Settings** → **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-`)

**Zerion** — for onchain data
1. Go to [dashboard.zerion.io](https://dashboard.zerion.io)
2. Sign up / log in
3. Create an API key
4. Copy the key (starts with `zk_`)

Keep both keys handy — you'll paste them in a moment.

## Step 2 — Install Zerion CLI

```bash
npm install -g zerion-cli
zerion --version
```

If `zerion --version` prints a number, you're good.

## Step 3 — Initialize the CLI

```bash
zerion init
```

This will prompt you to paste your Zerion API key. After that, the CLI is ready.

## Step 4 — Create the agent wallet

**Important:** this is a NEW wallet, not your main wallet. Treat it like a trading bot account.

```bash
zerion wallet create --name omnisysx-bot
```

The CLI generates a wallet, encrypts it with a passphrase you choose, and prints the public address. Copy that address — you'll need it.

```bash
zerion wallet list
# omnisysx-bot   0x1234...5678
```

## Step 5 — Fund the wallet (only if you want LIVE swaps later)

For pure DRY_RUN testing, you can skip this. To run real swaps, you need:

- A small amount of **ETH on Base** for gas (0.005 ETH is plenty)
- Some **USDC on Base** to swap (start with $5)

```bash
zerion wallet fund
```

This shows the wallet address as a QR code. Send funds from any exchange or other wallet.

Verify with:
```bash
zerion analyze 0xYOUR_AGENT_ADDRESS
```

You should see your balances.

## Step 6 — Create a scoped policy

The policy is what makes the agent **safe**. It defines what the agent token can and cannot do.

```bash
zerion agent create-policy \
  --name safe-base \
  --chains base \
  --expires 7d \
  --deny-transfers
```

Breakdown:
- `--chains base` — only operations on Base are allowed
- `--expires 7d` — the token automatically becomes useless after 7 days
- `--deny-transfers` — the agent CANNOT send funds out of the wallet

If you want to allow more chains: `--chains base,ethereum,arbitrum`.

## Step 7 — Create the agent token

```bash
zerion agent create-token \
  --name omnisysx \
  --wallet omnisysx-bot \
  --policy safe-base
```

The CLI saves the token in its config (you don't need to copy it manually). The agent code will pick it up automatically when it shells out to `zerion swap`.

## Step 8 — Clone OmnisysX and configure

```bash
git clone https://github.com/YOUR_USERNAME/omnisysx
cd omnisysx
npm install
cp .env.example .env
```

Open `.env` in any editor and fill in:

```env
ANTHROPIC_API_KEY=sk-ant-...        # from Step 1
ZERION_API_KEY=zk_...               # from Step 1
AGENT_WALLET_NAME=omnisysx-bot      # from Step 4
AGENT_WALLET_ADDRESS=0x...          # from Step 4
EXECUTOR_DRY_RUN=true               # keep this true for now
```

## Step 9 — Run the sanity check

```bash
node scripts/test-observer.mjs
```

Expected:
```
✓ Zerion CLI works
  Portfolio: $5.42
  Positions: 2
✓ Ready to run the full pipeline
```

If you see this, everything's connected.

## Step 10 — Run the full pipeline

```bash
npm run agent
```

You'll see all six stages execute. Because `DRY_RUN=true`, the Executor won't actually broadcast — it just shows what command it would run.

## Step 11 (optional) — Set up the Discord bot

If you want the Discord interface:

```bash
cd bot
npm install
```

Get Discord credentials:
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → name it
3. **Bot** tab → **Reset Token** → copy
4. **OAuth2** → **General** → copy **Application ID**

Add to `.env` (in the project root):
```env
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_app_id
```

Generate the invite URL:
1. Discord Developer Portal → your app → **OAuth2** → **URL Generator**
2. Scopes: `bot` + `applications.commands`
3. Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
4. Copy the URL at the bottom and open it in a browser
5. Choose your server, authorize

Run the bot:
```bash
npm start
```

In Discord, type `/help` — you should see all the commands.

## Step 12 — Going LIVE

When you're confident:

1. Edit `.env` → `EXECUTOR_DRY_RUN=false`
2. Run `npm run agent` again
3. Watch the Executor actually broadcast the swap
4. The Verify stage will print the new portfolio state with the delta

A successful run prints a real Base transaction hash. You can paste it into [basescan.org](https://basescan.org) to see the swap onchain.

## Troubleshooting

**"zerion: command not found"**
→ The CLI isn't on your PATH. Try `npm install -g zerion-cli` again.

**"Anthropic API 401"**
→ The `ANTHROPIC_API_KEY` is wrong or unset. Double-check in `.env`.

**"No JSON found in response"**
→ The model returned text instead of JSON. Usually transient — try again. If persistent, the Task Manager prompt may need tweaking for your wallet's specific state.

**"Pipeline halts at OBSERVE with CRITICAL gas"**
→ The Golden Rule kicked in. Add more ETH to the agent wallet (just 0.005 is enough).

**"PDR REJECTED" every run**
→ The Auditor is being conservative. Check the `auditorNotes` field — it tells you exactly which rule failed.

**Bot online but slash commands don't appear**
→ Global commands take up to 1 hour to propagate. For instant testing, edit `bot/bot.mjs` and change `Routes.applicationCommands(DISCORD_CLIENT_ID)` to `Routes.applicationGuildCommands(DISCORD_CLIENT_ID, 'YOUR_GUILD_ID')`.

## Next steps

- Read the full [documentation](https://omnisysx.com/docs.html)
- Customize the Task Manager strategy for your trading thesis
- Deploy the web dashboard to a custom domain (Vercel, Netlify, etc.)
- Host the bot 24/7 (Railway, Fly.io, or any VPS)
