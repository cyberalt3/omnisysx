# Fork notice

This repository is a **fork of [`zeriontech/zerion-ai`](https://github.com/zeriontech/zerion-ai)** with the OmnisysX multi-agent pipeline added on top.

## What's the same as upstream

Everything at the repository root that came from `zeriontech/zerion-ai`:

- The Zerion CLI binary and skill packages
- The agent token + policy primitives (`zerion agent create-policy`, `zerion agent create-token`)
- The wallet management commands (`zerion wallet create`, `fund`, `sync`, etc.)
- The trading commands (`zerion swap`, `bridge`, `send`)
- The analytics commands (`zerion analyze`, `portfolio`, `positions`, `pnl`, `history`)

We have not modified any upstream code. You can `git pull upstream main` at any time to get new Zerion CLI versions without merge conflicts.

## What this fork adds

Everything inside the `omnisysx/` folder:

```
omnisysx/
├── agent/           # Multi-agent pipeline (Observer + TaskManager + Auditor + Executor)
├── bot/             # Public Discord bot exposing the pipeline as slash commands
├── web/             # Static web dashboard
├── docs/            # Documentation in Markdown
└── scripts/         # Sanity check + utility scripts
```

The OmnisysX layer is a **client** of the Zerion CLI — it shells out to `zerion`
commands and orchestrates them through a six-stage pipeline guarded by Claude
agents and a hard-coded "Golden Rule" (never let ETH balance fall below the
gas reserve threshold).

## Why a fork instead of a separate repo?

The Zerion AI Agent Hackathon required forking `zerion-ai` as the starting point.
Beyond that requirement, keeping everything in one repo means:

1. The submission is **self-contained** — judges can clone one repo and have everything
2. The relationship between the upstream CLI and the OmnisysX layer is **explicit**
3. Future Zerion CLI updates can be merged in without rewriting the OmnisysX layer

## Pulling upstream changes

```bash
# Add upstream remote (one-time)
git remote add upstream https://github.com/zeriontech/zerion-ai
git fetch upstream

# Pull latest changes
git merge upstream/main
```

Because OmnisysX lives in its own folder, conflicts are extremely unlikely.

## License

Both the upstream Zerion CLI and the OmnisysX layer are MIT licensed.
