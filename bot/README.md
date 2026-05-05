# `@omnisysx/bot`

Public Discord bot exposing the OmnisysX pipeline as slash commands.

## Setup

### 1. Create Discord application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → name it (e.g. "OmnisysX")
3. **Bot** tab → **Reset Token** → copy the token
4. **OAuth2** → **General** → copy the **Application ID**

### 2. Generate invite URL

In **OAuth2** → **URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`, `Read Message History`

Copy the URL at the bottom — that's your install link. Anyone can add the bot to their server with it.

### 3. Configure

Set in `.env` at the project root:

```env
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_application_id_here
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
✓ 8 commands registered
✓ OmnisysX#1234 online in 1 server(s)
  Mode: DRY_RUN (safe)
```

Slash commands take up to 1 hour to propagate globally. For instant testing in a single guild, change `Routes.applicationCommands(...)` to `Routes.applicationGuildCommands(clientId, guildId)` in `bot.mjs`.

## Slash commands

| Command | What it does |
|---------|-------------|
| `/portfolio [address]` | Wallet snapshot embed |
| `/run [address]` | Trigger the full pipeline (Observe → Audit → Execute) |
| `/policy` | Show the active agent token policy |
| `/watch <address> <name>` | Add a wallet to the server's watchlist |
| `/unwatch <name>` | Remove from the watchlist |
| `/watchlist` | List watched wallets in this server |
| `/status` | Show last pipeline execution |
| `/help` | Show all commands |

## Auto alerts

When `ALERT_CHANNEL_ID` is set in `.env`, the bot polls all watched wallets every `POLL_INTERVAL_MS` (default 5 minutes) and posts to that channel when:

- Gas reserve falls below `MIN_ETH_GAS_RESERVE` (1-hour cooldown per wallet)

Add more alert types by editing the `tick()` function in `bot.mjs`.

## State persistence

The bot saves its state (watchlists, last run, alert cooldowns) to `bot-state.json` in the working directory. This file is gitignored.

## Hosting in production

For 24/7 operation, deploy to:

- **Railway** — `railway.app/new` → from GitHub → set root to `bot/` → add env vars → done
- **Fly.io** — `fly launch` in the `bot/` folder
- **VPS with PM2** — `pm2 start bot.mjs --name omnisysx-bot`

Estimated cost: ~$5/month for a small VPS or Railway starter.
