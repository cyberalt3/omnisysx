# Contributing to OmnisysX

Thanks for considering a contribution! This project is intentionally small and easy to fork — most contributions are welcome as PRs.

## Ground rules

1. **Keep it simple.** OmnisysX deliberately avoids heavy frameworks. Each component is a single file. Prefer adding a small helper over a new dependency.
2. **No new build tools.** The agent and bot run as plain `node *.mjs`. The web dashboard runs as plain `<script type="text/babel">`. Please don't introduce webpack, Vite, TypeScript compilation, etc.
3. **Test in DRY_RUN.** All testing should be done with `EXECUTOR_DRY_RUN=true`. Never push code that's only been tested in LIVE.
4. **No secrets in commits.** `.env` is gitignored. Use `.env.example` for documentation.

## Setting up locally

```bash
git clone https://github.com/YOUR_USERNAME/omnisysx
cd omnisysx
npm install
cp .env.example .env
# fill in keys
npm run agent:dry  # runs in DRY_RUN
```

## Where things live

- **Pipeline logic** → `agent/agent.mjs`
- **Discord bot** → `bot/bot.mjs`
- **Web dashboard** → `web/*.jsx` and `web/OmnisysX.html`
- **Documentation pages** → `web/content/docs/*.md`

## Common contribution types

### Adding a new slash command to the bot
1. Add a `SlashCommandBuilder` entry to `commandDefs` in `bot/bot.mjs`
2. Add a handler function to the `commandHandlers` object
3. Update the `/help` embed
4. Update the README

### Adding a new pipeline stage
The pipeline is intentionally exactly six stages. Adding a seventh is a big change — please open a discussion before submitting a PR.

### Adding a new data source (replacing Zerion)
The `zerionCli()` function in `agent/agent.mjs` is the only place that touches the Zerion CLI. Replace it with your alternative source and the rest of the pipeline keeps working.

### Adding a new LLM provider
Swap the `askClaude()` function. Keep the same signature — `(systemPrompt, userPrompt, opts) => string`.

## Pull request checklist

- [ ] Code runs with `npm run agent:dry` without errors
- [ ] No new dependencies (or strong justification in the PR description)
- [ ] `.env.example` updated if new env vars introduced
- [ ] README updated if behavior changes user-facing
- [ ] No secrets / keys / private data in the diff

## Reporting bugs

Open an issue with:
- What you ran (`npm run agent` / `bot` / etc.)
- The full stderr output
- Your `.env` config **with secrets redacted** (just the variable names + whether they're set)
- Node version (`node --version`) and OS

## Code of conduct

Be kind. We're all here to ship good DeFi infrastructure.
