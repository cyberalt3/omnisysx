# `@omnisysx/agent`

The multi-agent pipeline at the core of OmnisysX. Single file, zero build step.

```
OBSERVE → REASON → PLAN → AUTHORIZE → EXECUTE → VERIFY
```

## Run standalone

```bash
cd agent
npm install
node agent.mjs                          # uses .env from project root
EXECUTOR_DRY_RUN=true node agent.mjs    # safe test mode
```

## Use as a library

```javascript
import { runPipeline } from '@omnisysx/agent'

const result = await runPipeline('0xYOUR_WALLET')

// result.status: 'SUCCESS' | 'ALERT_ONLY' | 'REJECTED' | 'NEEDS_REVIEW'
// result.report:    ObserverReport
// result.tis:       Transaction Intent Schema (Task Manager output)
// result.pdr:       Policy Decision Record (Auditor output)
// result.execResult: { txHash, simulated, raw }
// result.verify:    { ok, after, deltaUsd, deltaEth }
```

This is how `bot/bot.mjs` integrates the pipeline. The web dashboard uses the same shape via SSE.

## Customizing

- **Change the strategy** → edit `TASK_MANAGER_PROMPT` in `agent.mjs`
- **Tighten or loosen security** → edit `AUDITOR_PROMPT` in `agent.mjs`
- **Different model** → set `AGENT_MODEL` env var (any Claude model id)
- **Different LLM provider** → swap the `askClaude()` function

## Environment variables

See [`.env.example`](../.env.example) at the project root for all variables.

The agent only needs:
- `ANTHROPIC_API_KEY`
- `ZERION_API_KEY`
- `AGENT_WALLET_NAME`
- `AGENT_WALLET_ADDRESS`
- `MIN_ETH_GAS_RESERVE` (optional, default 0.002)
- `EXECUTOR_DRY_RUN` (optional, default true)
