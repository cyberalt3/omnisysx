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
import { join } from 'node:path'
import { ethers } from 'ethers'
import 'dotenv/config'

const exec = promisify(execFile)

// ============================================================
// CONFIG
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const ZERION_API_KEY = process.env.ZERION_API_KEY
const AGENT_WALLET_NAME = process.env.AGENT_WALLET_NAME || 'omnisysx-bot'
const TARGET_ADDRESS = process.env.AGENT_WALLET_ADDRESS
const MIN_ETH_GAS = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN = process.env.EXECUTOR_DRY_RUN !== 'false'
const MODEL = process.env.LLM_MODEL || process.env.AGENT_MODEL || 'anthropic/claude-3.5-haiku'

if (!OPENROUTER_API_KEY) console.warn('⚠️ OPENROUTER_API_KEY missing in .env - LLM features will fail')
if (!ZERION_API_KEY) console.warn('⚠️ ZERION_API_KEY missing in .env - Blockchain lookups will fail')
if (!TARGET_ADDRESS) console.warn('⚠️ AGENT_WALLET_ADDRESS missing in .env - Pipeline will need an explicit address')

// ============================================================
// LOGGING (colored, structured)
// ============================================================

const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', green: '\x1b[32m',
  blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m'
}

const log = {
  stage: (name, msg) => console.log(`${c.cyan}[${name.padEnd(9)}]${c.reset} ${msg}`),
  ok: (msg) => console.log(`${c.green}  ✓${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}  ⚠${c.reset} ${msg}`),
  err: (msg) => console.log(`${c.red}  ✗${c.reset} ${msg}`),
  dim: (msg) => console.log(`${c.dim}    ${msg}${c.reset}`),
}

function die(msg) {
  console.error(`${c.red}FATAL:${c.reset} ${msg}`)
  process.exit(1)
}

// ============================================================
// STAGE 1 — OBSERVER
// Reads onchain wallet state via the Zerion HTTP API.
// ============================================================

export async function runObserver(address) {
  log.stage('OBSERVE', `analyzing ${shortAddr(address)}`)

  // 1. Observe positions and portfolio
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

  const totalUsd = portData.data?.attributes?.total?.positions || positions.reduce((s, p) => s + p.value, 0)
  const change24h = portData.data?.attributes?.changes?.percent_1d || 0

  const gasAsset = findGasAsset(positions, address)
  const gasBal = gasAsset?.quantity ?? 0
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

export async function runMultiObserver(addresses) {
  log.stage('OBSERVE', `multi-scan: ${addresses.length} wallets`)
  const reports = await Promise.all(addresses.map(addr => runObserver(addr)));

  const totalUsd = reports.reduce((sum, r) => sum + r.totalUsd, 0);
  const wallets = reports.map(r => ({
    address: r.address,
    totalUsd: r.totalUsd,
    topPositions: r.topPositions,
    gasStatus: r.gasStatus
  }));

  const globalReport = {
    type: 'MULTI_WALLET_SNAPSHOT',
    totalUsd,
    walletCount: addresses.length,
    wallets,
    timestamp: new Date().toISOString(),
  };

  log.ok(`multi-portfolio total: $${totalUsd.toFixed(2)}`);
  return globalReport;
}

export async function runTransactionAnalysis(address) {
  log.stage('HISTORY', `analyzing transactions for ${shortAddr(address)}`)
  const history = await zerionCli(['history', address, '--json'])
  const txs = (history.data || history || []).slice(0, 15)

  const prompt = `Analyze these recent transactions and explain the profit strategy.
Identify alpha moves, yield farming, or successful trades. Use a sharp, expert tone.
Data: ${JSON.stringify(txs, null, 2)}`

  const analysis = await askClaude("You are the OmnisysX Alpha Strategist.", prompt, { maxTokens: 800 })
  log.ok(`Analysis complete for ${shortAddr(address)}`)
  return analysis
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
  if (balance < min) return 'CRITICAL'
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

export async function runTaskManager(report) {
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

export async function runAuditor(tis, report) {
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

export async function runExecutor(tis) {
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

export const ZERION_BIN = 'npx --no-install zerion'

export async function zerionCli(args, envOverride = {}) {
  try {
    const finalArgs = [...args]

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

    const t = env.ZERION_AGENT_TOKEN || ''
    console.log(`[debug] Zerion Call: wallet=${finalArgs[finalArgs.indexOf('--wallet') + 1]} | token_len=${t.length} | token_start=${t.slice(0, 10)}...`)

    const passphrase = process.env.ZERION_PASSPHRASE || ''
    const cmdStr = passphrase
      ? `echo "${passphrase}" | ${ZERION_BIN} ${finalArgs.join(' ')}`
      : `${ZERION_BIN} ${finalArgs.join(' ')}`

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
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://omnisysx.io',
      'X-Title': 'OmnisysX Agent',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens || 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export async function runPipeline(address = TARGET_ADDRESS) {
  const start = Date.now()
  console.log(`\n${c.cyan}═══ OmnisysX Pipeline ═══${c.reset}`)
  console.log(`Wallet: ${address}`)
  console.log(`Model:  ${MODEL}`)
  console.log(`Mode:   ${DRY_RUN ? 'DRY_RUN' : 'LIVE'}\n`)

  try {
    const report = await runObserver(address)
    const tis = await runTaskManager(report)

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
    const verify = await runVerify(execResult, report)

    const seconds = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`\n${c.green}═══ Pipeline OK · ${seconds}s ═══${c.reset}\n`)

    return { report, tis, pdr, execResult, verify, status: 'SUCCESS' }
  } catch (e) {
    log.err(`pipeline failed: ${e.message}`)
    throw e
  }
}

// Direct swap execution (REAL ON-CHAIN VERSION)
export async function executeSwap({ fromToken, toToken, amount, chain }) {
  log.stage('SWAP-API', `${amount} ${fromToken} → ${toToken} on ${chain} (Executing REAL Transaction)`)
  
  if (chain.toLowerCase() !== 'base') {
    throw new Error('Real on-chain swaps currently only enabled for BASE in this demo.')
  }

  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider)

  try {
    const TOKENS = {
      'ETH': '0x0000000000000000000000000000000000000000',
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
    const fromAddr = TOKENS[fromToken.toUpperCase()] || fromToken
    const toAddr = TOKENS[toToken.toUpperCase()] || toToken

    log.dim(`Requesting real quote from LI.FI API...`)
    
    const url = new URL('https://li.quest/v1/quote')
    url.searchParams.set('fromChain', '8453') // Base
    url.searchParams.set('toChain', '8453')
    url.searchParams.set('fromToken', fromAddr)
    url.searchParams.set('toToken', toAddr)
    url.searchParams.set('fromAmount', ethers.parseUnits(String(amount), fromToken.toUpperCase() === 'USDC' ? 6 : 18).toString())
    url.searchParams.set('fromAddress', wallet.address)
    url.searchParams.set('slippage', '0.03') // 3%

    const response = await fetch(url.toString())
    const quote = await response.json()

    if (!response.ok) {
      throw new Error(`LI.FI Quote Error: ${quote.message || 'Unknown error'}`)
    }

    if (fromToken.toUpperCase() !== 'ETH') {
      const tokenContract = new ethers.Contract(fromAddr, [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ], wallet)

      const spender = quote.transactionRequest.to
      const allowance = await tokenContract.allowance(wallet.address, spender)
      const required = BigInt(quote.action.fromAmount)

      if (allowance < required) {
        log.stage('APPROVE', `Granting permission for ${fromToken} to LI.FI...`)
        const approveTx = await tokenContract.approve(spender, ethers.MaxUint256)
        log.dim(`Waiting for approval confirmation...`)
        await approveTx.wait()
        log.ok(`Approval successful!`)
      }
    }

    log.dim(`Signing and broadcasting swap transaction to Base...`)

    const txResponse = await wallet.sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value,
      gasLimit: quote.transactionRequest.gasLimit ? (BigInt(quote.transactionRequest.gasLimit) * 13n / 10n) : 1000000n // 30% buffer
    })

    log.ok(`Transaction Broadcasted! Hash: ${txResponse.hash.slice(0, 10)}...`)
    
    return { 
      txHash: txResponse.hash, 
      method: 'Zerion / LI.FI API',
      status: 'SUCCESS',
      amountReceived: quote.estimate.toAmountMin
    }
  } catch (e) {
    log.err(`Real Swap failed: ${e.message}`)
    throw e
  }
}

// Direct bridge execution (REAL ON-CHAIN VERSION)
export async function executeBridge({ fromToken, toToken, amount, fromChain, toChain }) {
  log.stage('BRIDGE-API', `${amount} ${fromToken} (${fromChain}) → ${toToken} (${toChain})`)
  
  const CHAIN_IDS = { 
    'base': 8453, 'eth': 1, 'ethereum': 1, 'arbitrum': 42161, 
    'polygon': 137, 'optimism': 10, 'avalanche': 43114, 
    'bsc': 56, 'linea': 59144, 'zksync': 324 
  }
  const fId = CHAIN_IDS[fromChain.toLowerCase()]
  const tId = CHAIN_IDS[toChain.toLowerCase()]

  if (!fId || !tId) throw new Error(`Chain ${fromChain} or ${toChain} not supported in API demo.`)

  const RPCS = {
    8453: 'https://mainnet.base.org',
    1: 'https://eth.llamarpc.com',
    42161: 'https://arb1.arbitrum.io/rpc',
    137: 'https://polygon-rpc.com',
    10: 'https://mainnet.optimism.io',
    56: 'https://bsc-dataseed.binance.org'
  }
  
  const rpcUrl = RPCS[fId] || 'https://mainnet.base.org'
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider)

  try {
    const TOKENS = {
      'ETH': '0x0000000000000000000000000000000000000000',
      'USDC': fromChain.toLowerCase() === 'base' ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' : '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    }
    const fromAddr = TOKENS[fromToken.toUpperCase()] || fromToken
    const toAddr = TOKENS[toToken.toUpperCase()] || toToken

    log.dim(`Requesting bridge quote from LI.FI...`)
    const url = new URL('https://li.quest/v1/quote')
    url.searchParams.set('fromChain', String(fId))
    url.searchParams.set('toChain', String(tId))
    url.searchParams.set('fromToken', fromAddr)
    url.searchParams.set('toToken', toAddr)
    url.searchParams.set('fromAmount', ethers.parseUnits(String(amount), fromToken.toUpperCase() === 'USDC' ? 6 : 18).toString())
    url.searchParams.set('fromAddress', wallet.address)

    const response = await fetch(url.toString())
    const quote = await response.json()
    if (!response.ok) throw new Error(`LI.FI Bridge Error: ${quote.message}`)

    if (fromToken.toUpperCase() !== 'ETH') {
      const tokenContract = new ethers.Contract(fromAddr, ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'], wallet)
      const spender = quote.transactionRequest.to
      const allowance = await tokenContract.allowance(wallet.address, spender)
      if (allowance < BigInt(quote.action.fromAmount)) {
        log.stage('APPROVE', `Approving ${fromToken} for bridge...`)
        await (await tokenContract.approve(spender, ethers.MaxUint256)).wait()
      }
    }

    log.dim(`Broadcasting bridge transaction...`)
    const tx = await wallet.sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value,
      gasLimit: 1000000n
    })

    log.ok(`Bridge sent! Hash: ${tx.hash.slice(0, 10)}...`)
    return { txHash: tx.hash, status: 'SUCCESS' }
  } catch (e) {
    log.err(`Bridge failed: ${e.message}`)
    throw e
  }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/'))) {
  runPipeline().catch(() => process.exit(1))
}
