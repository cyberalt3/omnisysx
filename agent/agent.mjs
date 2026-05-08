/**
 * OmnisysX v1.0.2 — Multi-Agent DeFi Pipeline
 * ----------------------------------------------------------
 * A production-grade autonomous DeFi pipeline that observes
 * wallets, reasons about risk, and executes onchain swaps —
 * built on top of the Zerion CLI and Anthropic's Haiku model.
 *
 * Pipeline (the "V Pattern"):
 *
 *   OBSERVE → REASON → PLAN → AUTHORIZE → EXECUTE → VERIFY
 *      │         │       │         │         │        │
 *   Observer  ─────  TaskManager  Auditor  Executor  Verify
 *
 * Run with:  node agent.mjs
 * Run dry:   EXECUTOR_DRY_RUN=true node agent.mjs
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import 'dotenv/config'

const exec = promisify(execFile)

// ============================================================
// CONFIG
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const ZERION_API_KEY     = process.env.ZERION_API_KEY
const AGENT_WALLET_NAME  = process.env.AGENT_WALLET_NAME || 'omnisysx-bot'
const TARGET_ADDRESS     = process.env.AGENT_WALLET_ADDRESS
const MIN_ETH_GAS        = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN            = process.env.EXECUTOR_DRY_RUN !== 'false'
const MODEL              = process.env.LLM_MODEL || process.env.AGENT_MODEL || 'anthropic/claude-3.5-haiku'

if (!OPENROUTER_API_KEY) die('OPENROUTER_API_KEY missing in .env')
if (!ZERION_API_KEY)    die('ZERION_API_KEY missing in .env')
if (!TARGET_ADDRESS)    die('AGENT_WALLET_ADDRESS missing in .env')

// ============================================================
// LOGGING (colored, structured)
// ============================================================

const c = { reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
            blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m' }

const log = {
  stage: (name, msg) => console.log(`${c.cyan}[${name.padEnd(9)}]${c.reset} ${msg}`),
  ok:    (msg)       => console.log(`${c.green}  ✓${c.reset} ${msg}`),
  warn:  (msg)       => console.log(`${c.yellow}  ⚠${c.reset} ${msg}`),
  err:   (msg)       => console.log(`${c.red}  ✗${c.reset} ${msg}`),
  dim:   (msg)       => console.log(`${c.dim}    ${msg}${c.reset}`),
}

function die(msg) {
  console.error(`${c.red}FATAL:${c.reset} ${msg}`)
  process.exit(1)
}

// ============================================================
// STAGE 1 — OBSERVER
// Reads onchain wallet state via the Zerion HTTP API.
// ============================================================

async function runObserver(address) {
  log.stage('OBSERVE', `analyzing ${shortAddr(address)}`)

  const [posData, portData] = await Promise.all([
    zerionGet(`/wallets/${address}/positions/?filter[positions]=only_simple&currency=usd&sort=value&filter[trash]=only_non_trash`),
    zerionGet(`/wallets/${address}/portfolio?currency=usd`),
  ])

  const positions = (posData.data || []).map(p => {
    const attr = p.attributes || {}
    const info = attr.fungible_info || {}
    return {
      symbol: info.symbol || '???',
      chain: attr.chain_id || 'unknown',
      quantity: attr.quantity?.float || 0,
      value: attr.value || 0,
    }
  }).filter(p => p.value > 0.01)

  const totalUsd  = portData.data?.attributes?.total?.positions || positions.reduce((s, p) => s + p.value, 0)
  const change24h = portData.data?.attributes?.changes?.percent_1d || 0
  
  const gasAsset  = findGasAsset(positions, address)
  const gasBal    = gasAsset?.quantity ?? 0
  const gasSymbol = gasAsset?.symbol || 'ETH'
  const gasStatus = computeGasStatus(gasBal, gasSymbol)

  const topPositions = positions
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(p => ({ symbol: p.symbol, chain: p.chain, qty: p.quantity, usd: p.value }))

  const report = {
    address, totalUsd, change24h,
    gasBalance: gasBal, gasSymbol, gasStatus,
    topPositions, timestamp: new Date().toISOString(),
  }

  log.ok(`portfolio: $${totalUsd.toFixed(2)} · ${gasSymbol}=${gasBal.toFixed(6)} (${gasStatus})`)
  return report
}

function findGasAsset(positions, address) {
  // Se o endereço for Solana (comprimento > 42 caracteres ou sem 0x), prioriza SOL
  const isSolana = address.length > 42 || !address.startsWith('0x')
  
  if (isSolana) {
    const sol = positions.find(p => p.symbol === 'SOL' && p.chain === 'solana')
    if (sol) return sol
  }
  
  // Tenta achar ETH (Base ou Ethereum)
  const eth = positions.find(p => p.symbol === 'ETH' && (p.chain === 'ethereum' || p.chain === 'base'))
  if (eth) return eth

  // Fallback para SOL se não achou ETH mas tem SOL
  return positions.find(p => p.symbol === 'SOL' && p.chain === 'solana')
}

function computeGasStatus(balance, symbol) {
  const min = symbol === 'SOL' ? 0.01 : MIN_ETH_GAS
  if (balance < min)     return 'CRITICAL'
  if (balance < min * 2) return 'WARNING'
  return 'SAFE'
}

// ============================================================
// STAGES 2 + 3 — TASK MANAGER (REASON + PLAN)
// LLM decides whether to act and produces a Transaction Intent.
// ============================================================

const TASK_MANAGER_PROMPT = `You are the Task Manager of OmnisysX, a DeFi agent.
Receive an ObserverReport and produce a Transaction Intent Schema (TIS) in JSON.

RULES:
- If the portfolio is stable and there's no clear reason to act, set intentType="ALERT_ONLY"
- NEVER propose a swap that would reduce ETH below ${MIN_ETH_GAS} (Golden Rule — gas reserve)
- Maximum slippage: 200 bps (2%)
- Confidence is between 0 and 1
- Reply with ONLY valid JSON. No markdown, no comments.

JSON shape:
{
  "intentType": "SWAP" | "ALERT_ONLY",
  "rationale": "short string explaining the decision",
  "action": {
    "chain": "base" | "ethereum" | "arbitrum" | "polygon" | "optimism" | "solana",
    "fromToken": "symbol",
    "toToken": "symbol",
    "amount": "string with number",
    "slippageBps": 100
  },
  "confidence": 0.85
}

For ALERT_ONLY, "action" can be null.`

async function runTaskManager(report) {
  log.stage('PLAN', 'TaskManager reasoning...')

  if (report.gasStatus === 'CRITICAL') {
    log.warn('gas CRITICAL — halting before plan')
    return { intentType: 'ALERT_ONLY', rationale: 'Gas reserve critical', confidence: 1, action: null }
  }

  const text = await askClaude(TASK_MANAGER_PROMPT,
    `ObserverReport:\n${JSON.stringify(report, null, 2)}\n\nProduce the TIS.`,
    { maxTokens: 600 })

  const tis = extractJson(text)
  log.ok(`TIS: ${tis.intentType} (confidence=${tis.confidence})`)
  if (tis.rationale) log.dim(tis.rationale)
  return tis
}

// ============================================================
// STAGE 4 — AUDITOR (AUTHORIZE)
// Independent security check. The pipeline halts here unless
// the auditor signs off (APPROVED). Acts as the policy gate.
// ============================================================

const AUDITOR_PROMPT = `You are the Auditor of OmnisysX — the security gate of the pipeline.
Validate the proposed Transaction Intent Schema (TIS) against these rules and reply in JSON.

REJECT (decision="REJECTED") if ANY of these are true:
- The swap would reduce ETH below ${MIN_ETH_GAS} (Golden Rule)
- Slippage > 500 bps
- Confidence < 0.5
- Unsupported chain

NEEDS_REVIEW (decision="NEEDS_REVIEW") if:
- Estimated value > $1000

Otherwise, decision="APPROVED".

Reply with ONLY this JSON:
{ "decision": "APPROVED|REJECTED|NEEDS_REVIEW", "riskScore": 0-100, "notes": "short explanation" }`

async function runAuditor(tis, report) {
  log.stage('AUTHORIZE', 'Auditor reviewing...')

  if (tis.intentType === 'ALERT_ONLY') {
    return { decision: 'APPROVED', riskScore: 0, notes: 'No action to audit' }
  }

  const text = await askClaude(AUDITOR_PROMPT,
    `TIS:\n${JSON.stringify(tis, null, 2)}\n\nGas balance: ${report.gasBalance} ${report.gasSymbol}\nPortfolio: $${report.totalUsd}\n\nEvaluate.`,
    { maxTokens: 400 })

  const pdr = extractJson(text)
  const icon = pdr.decision === 'APPROVED' ? '✓' :
               pdr.decision === 'REJECTED' ? '✗' : '⚠'
  log.dim(`${icon} ${pdr.decision} (risk=${pdr.riskScore}/100) — ${pdr.notes}`)
  return pdr
}

// ============================================================
// STAGE 5 — EXECUTOR
// Executes the swap via Zerion CLI using the agent token.
// ============================================================

async function runExecutor(tis) {
  log.stage('EXECUTE', `executing ${tis.intentType}...`)

  const cmd = buildZerionCommand(tis)

  if (DRY_RUN) {
    log.warn('DRY_RUN active — would execute:')
    log.dim(`zerion ${cmd.join(' ')}`)
    return { txHash: '0xDRY_RUN_SIMULATED', simulated: true }
  }

  log.dim(`> zerion ${cmd.join(' ')}`)
  const result = await zerionCli(cmd)
  const txHash = result.txHash || result.transaction?.hash
  log.ok(`tx submitted: ${txHash || 'unknown'}`)
  return { txHash, raw: result }
}

function buildZerionCommand(tis) {
  const { intentType, action } = tis
  const cmd = []
  const wallet = action.chain === 'solana' ? 'omnisysx-bot-sol' : AGENT_WALLET_NAME

  switch (intentType) {
    case 'SWAP':
      cmd.push('swap', action.chain, String(action.amount), action.fromToken, action.toToken)
      cmd.push('--wallet', wallet)
      if (action.slippageBps) cmd.push('--slippage', String(action.slippageBps / 100))
      break
    case 'BRIDGE':
      // A bridge exige o formato: bridge <from-chain> <from-token> <amount> <to-chain> <to-token>
      cmd.push('bridge', action.chain, action.fromToken, String(action.amount))
      if (action.toChain) cmd.push(action.toChain)
      if (action.toToken) cmd.push(action.toToken)
      cmd.push('--wallet', wallet)
      break
    case 'SEND':
      cmd.push('send', action.fromToken, String(action.amount))
      cmd.push('--to', action.to, '--chain', action.chain, '--wallet', wallet)
      break
    default:
      throw new Error(`Unknown intentType: ${intentType}`)
  }
  cmd.push('--json')
  return cmd
}

// ============================================================
// STAGE 6 — VERIFY
// Re-fetches portfolio after execution and reports the delta.
// ============================================================

async function runVerify(execResult, beforeReport) {
  log.stage('VERIFY', 'verifying onchain state...')

  if (DRY_RUN || execResult.simulated) {
    log.dim('dry-run — skipping onchain verification')
    return { ok: true }
  }

  await sleep(8000) // wait for Zerion to index

  const after = await runObserver(beforeReport.address)
  const deltaUsd = after.totalUsd - beforeReport.totalUsd
  const deltaEth = after.ethBalance - beforeReport.ethBalance
  log.dim(`Δ portfolio: $${deltaUsd.toFixed(2)} | Δ ETH: ${deltaEth.toFixed(6)}`)
  log.ok('verification complete')
  return { ok: true, after, deltaUsd, deltaEth }
}

// ============================================================
// HELPERS
// ============================================================

// Zerion HTTP API — used for reading wallet data (Observer)
async function zerionGet(path) {
  const res = await fetch(`https://api.zerion.io/v1${path}`, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(ZERION_API_KEY + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Zerion API ${res.status}: ${await res.text()}`)
  return res.json()
}

// Zerion CLI — used for executing swaps, policies, and wallet ops
export async function zerionCli(args) {
  try {
    const finalArgs = [...args]
    
    // Decide qual token usar com base na wallet pedida
    let agentToken = process.env.ZERION_AGENT_TOKEN
    const walletIdx = finalArgs.indexOf('--wallet')
    if (walletIdx !== -1) {
      const walletName = finalArgs[walletIdx + 1]
      if (walletName === 'omnisysx-bot-sol') {
        agentToken = process.env.ZERION_AGENT_TOKEN_SOL || agentToken
      }
    }

    if (agentToken) {
      finalArgs.push('--agent-token', agentToken)
    }

    const env = { 
      ...process.env, 
      ZERION_API_KEY: process.env.ZERION_API_KEY || ''
    }

    // DEBUG LOGS (Always visible for now)
    const t = env.ZERION_AGENT_TOKEN || ''
    console.log(`[debug] Zerion Call: wallet=${finalArgs[finalArgs.indexOf('--wallet') + 1]} | token_len=${t.length} | token_start=${t.slice(0,10)}...`)

    const passphrase = process.env.ZERION_PASSPHRASE || ''
    const cmdStr = passphrase 
      ? `echo "${passphrase}" | zerion ${finalArgs.join(' ')}` 
      : `zerion ${finalArgs.join(' ')}`

    const { stdout } = await exec(cmdStr, { env, maxBuffer: 10 * 1024 * 1024, shell: true })
    try { return JSON.parse(stdout) } catch { return { raw: stdout } }
  } catch (e) {
    throw new Error(`zerion ${args[0]} failed: ${e.stderr || e.message}`)
  }
}

async function askClaude(systemPrompt, userPrompt, opts = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer':  'https://omnisysx.io',
      'X-Title':       'OmnisysX Agent',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: opts.maxTokens || 800,
      messages:   [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]+\}/)
  if (!m) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`)
  return JSON.parse(m[0])
}

function shortAddr(a) { return `${a.slice(0, 6)}…${a.slice(-4)}` }
function sleep(ms)    { return new Promise(r => setTimeout(r, ms)) }

// ============================================================
// PIPELINE — orchestrates all stages
// ============================================================

export async function runPipeline(address = TARGET_ADDRESS) {
  const start = Date.now()
  console.log(`\n${c.cyan}═══ OmnisysX Pipeline ═══${c.reset}`)
  console.log(`Wallet: ${address}`)
  console.log(`Model:  ${MODEL}`)
  console.log(`Mode:   ${DRY_RUN ? 'DRY_RUN' : 'LIVE'}\n`)

  try {
    const report = await runObserver(address)
    const tis    = await runTaskManager(report)

    if (tis.intentType === 'ALERT_ONLY') {
      log.dim('No action needed — pipeline complete')
      return { report, tis, status: 'ALERT_ONLY' }
    }

    const pdr = await runAuditor(tis, report)
    if (pdr.decision === 'REJECTED') {
      log.err('Auditor rejected — pipeline halted')
      return { report, tis, pdr, status: 'REJECTED' }
    }
    if (pdr.decision === 'NEEDS_REVIEW') {
      log.warn('Auditor needs human review — pipeline paused')
      return { report, tis, pdr, status: 'NEEDS_REVIEW' }
    }

    const execResult = await runExecutor(tis)
    const verify     = await runVerify(execResult, report)

    const seconds = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n${c.green}═══ Pipeline OK · ${seconds}s ═══${c.reset}\n`)

    return { report, tis, pdr, execResult, verify, status: 'SUCCESS' }
  } catch (e) {
    log.err(`pipeline failed: ${e.message}`)
    throw e
  }
}

// Direct swap execution (used by bot @mention commands)
export async function executeSwap({ fromToken, toToken, amount, chain }) {
  // Determine wallet based on chain
  const wallet = chain.toLowerCase() === 'solana' ? 'omnisysx-bot-sol' : AGENT_WALLET_NAME
  
  // NPM version order: zerion swap <chain> <amount> <from-token> <to-token>
  const cmd = ['swap', chain.toLowerCase(), String(amount), fromToken, toToken, '--wallet', wallet, '--json']
  log.stage('SWAP', `${amount} ${fromToken} → ${toToken} on ${chain}`)
  
  try {
    const result = await zerionCli(cmd)
    const txHash = result.txHash || result.transaction?.hash || result.hash
    log.ok(`tx: ${txHash || 'pending'}`)
    return { txHash, raw: result }
  } catch (e) {
    throw e
  }
}

// Run if invoked directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runPipeline().catch(() => process.exit(1))
}
