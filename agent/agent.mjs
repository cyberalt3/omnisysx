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
const ZERION_BIN = process.env.ZERION_BIN || (process.platform === 'win32' ? 'zerion' : './node_modules/.bin/zerion')
const ZERION_API_KEY = process.env.ZERION_API_KEY
const AGENT_WALLET_NAME = process.env.AGENT_WALLET_NAME || 'omnisysx-bot'
const TARGET_ADDRESS = process.env.AGENT_WALLET_ADDRESS
const MIN_ETH_GAS = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN = process.env.EXECUTOR_DRY_RUN !== 'false'
const MODEL = process.env.LLM_MODEL || process.env.AGENT_MODEL || 'anthropic/claude-3.5-haiku'

if (!OPENROUTER_API_KEY) console.warn('⚠️ OPENROUTER_API_KEY missing in .env - LLM features will fail')
if (!ZERION_API_KEY) console.warn('⚠️ ZERION_API_KEY missing in .env - Blockchain lookups will fail')
if (!TARGET_ADDRESS) console.warn('⚠️ AGENT_WALLET_ADDRESS missing in .env - Pipeline will need an explicit address')
if (!process.env.AGENT_PRIVATE_KEY) console.warn('⚠️ AGENT_PRIVATE_KEY missing in .env - Real execution (EVM) will fail')

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

export async function runObserver(evmAddress, solAddress = null) {
  log.stage('OBSERVE', `analyzing ${shortAddr(evmAddress)}${solAddress ? ' & ' + shortAddr(solAddress) : ''}`)

  const fetchPositions = async (addr) => {
    if (!addr) return []
    const posData = await zerionGet(`/wallets/${addr}/positions/?filter[positions]=only_simple&currency=usd&sort=value&filter[trash]=only_non_trash`)
    return (posData.data || []).map(p => {
      const attr = p.attributes || {}
      const info = attr.fungible_info || {}
      return {
        symbol: info.symbol || '???',
        chain: attr.chain_id || 'unknown',
        quantity: attr.quantity?.float || 0,
        value: attr.value || 0,
      }
    }).filter(p => p.value > 0.01)
  }

  const [evmPositions, solPositions, portData] = await Promise.all([
    fetchPositions(evmAddress),
    fetchPositions(solAddress),
    zerionGet(`/wallets/${evmAddress}/portfolio?currency=usd`),
  ])

  const positions = [...evmPositions, ...solPositions]
  const totalUsd = positions.reduce((s, p) => s + p.value, 0)
  const change24h = portData.data?.attributes?.changes?.percent_1d || 0

  const gasAsset = findGasAsset(positions, evmAddress)
  const gasBal = gasAsset?.quantity ?? 0
  const gasSymbol = gasAsset?.symbol || 'ETH'
  const gasStatus = computeGasStatus(gasBal, gasSymbol)

  const topPositions = positions
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(p => ({ symbol: p.symbol, chain: p.chain, qty: p.quantity, usd: p.value }))

  const report = {
    address: evmAddress, totalUsd, change24h,
    gasBalance: gasBal, gasSymbol, gasStatus,
    topPositions, timestamp: new Date().toISOString(),
  }

  log.ok(`portfolio: $${totalUsd.toFixed(2)} · ${gasSymbol}=${gasBal.toFixed(6)} (${gasStatus})`)
  return report
}

/**
 * getChains - Fetches the list of supported chains from Zerion API.
 */
export async function getChains() {
  log.stage('CHAINS', 'Fetching supported networks from Zerion...')
  const data = await zerionGet('/chains/')
  return (data.data || []).map(c => ({
    id: c.id,
    name: c.attributes?.name || c.id,
    icon: c.attributes?.icon?.url
  }))
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
  // If address is Solana (length > 42 chars or without 0x), prioritize SOL
  const isSolana = address.length > 42 || !address.startsWith('0x')

  if (isSolana) {
    const sol = positions.find(p => p.symbol === 'SOL' && p.chain === 'solana')
    if (sol) return sol
  }

  // Try to find ETH (Base or Ethereum)
  const eth = positions.find(p => p.symbol === 'ETH' && (p.chain === 'ethereum' || p.chain === 'base'))
  if (eth) return eth

  // Fallback to SOL if ETH is not found but SOL exists
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
  "intentType": "SWAP" | "PRIVATE_SEND" | "ALERT_ONLY",
  "rationale": "short string explaining the decision",
  "action": {
    "chain": "base" | "ethereum" | "arbitrum" | "polygon" | "optimism" | "solana",
    "fromToken": "symbol",
    "toToken": "symbol",
    "amount": "string with number",
    "slippageBps": 100,
    "to": "destination address (required for PRIVATE_SEND)"
  },
  "confidence": 0.85
}

For ALERT_ONLY, "action" can be null.
Note: Use PRIVATE_SEND when anonymity or security for the recipient is required (via Umbra).`

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
      // A bridge requires the format: bridge <from-chain> <from-token> <amount> <to-chain> <to-token>
      cmd.push('bridge', action.chain, action.fromToken, String(action.amount))
      if (action.toChain) cmd.push(action.toChain)
      if (action.toToken) cmd.push(action.toToken)
      cmd.push('--wallet', wallet, '--cheapest') // Optimization: Use the cheapest route
      break
    case 'SEND':
      cmd.push('send', action.fromToken, String(action.amount))
      cmd.push('--to', action.to, '--chain', action.chain, '--wallet', wallet)
      break
    case 'PRIVATE_SEND':
      // Umbra skill: zerion umbra <chain> <amount> <token> <recipient>
      cmd.push('umbra', action.chain, String(action.amount), action.fromToken, action.to)
      cmd.push('--wallet', wallet)
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
  const deltaEth = (after.gasSymbol === 'ETH' ? after.gasBalance : 0) - (beforeReport.gasSymbol === 'ETH' ? beforeReport.gasBalance : 0)
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
export async function zerionCli(args, envOverride = {}) {
  try {
    const finalArgs = [...args]

    // Decide which token to use based on the requested wallet
    let agentToken = process.env.ZERION_AGENT_TOKEN
    let walletName = 'default'
    const walletIdx = finalArgs.indexOf('--wallet')
    if (walletIdx !== -1) {
      walletName = finalArgs[walletIdx + 1]
      if (walletName === 'omnisysx-bot-sol') {
        agentToken = process.env.ZERION_AGENT_TOKEN_SOL || agentToken
      }
    }

    if (agentToken) {
      log.dim(`Using Agent Token: ${agentToken.slice(0, 10)}... (Scope: ${walletName || 'default'})`)
    }

    // The CLI reads ZERION_AGENT_TOKEN from env (not from --agent-token flag).
    // Override it in the child process so Solana swaps use the SOL token.
    const env = {
      ...process.env,
      ZERION_API_KEY: process.env.ZERION_API_KEY || '',
      ...(agentToken ? { ZERION_AGENT_TOKEN: agentToken } : {})
    }

    const passphraseFile = process.env.ZERION_PASSPHRASE_FILE || ''
    const passphrase = process.env.ZERION_PASSPHRASE || ''

    if (passphraseFile && !finalArgs.includes('--passphrase-file')) {
      finalArgs.push('--passphrase-file', passphraseFile)
    }

    const cmdStr = (passphrase && !passphraseFile)
      ? `echo "${passphrase}" | ${ZERION_BIN} ${finalArgs.join(' ')}`
      : `${ZERION_BIN} ${finalArgs.join(' ')}`

    const { stdout } = await exec(cmdStr, { env, maxBuffer: 10 * 1024 * 1024, shell: true })
    try { return JSON.parse(stdout) } catch { return { raw: stdout } }
  } catch (e) {
    throw new Error(`zerion ${args[0]} failed: ${e.stderr || e.message}`)
  }
}

import { randomUUID } from 'node:crypto'

/**
 * executeWithSecureCLI
 * Executes Zerion CLI commands privately by generating a temporary wallet 
 * in real-time and destroying it instantly after use.
 * Shell Bypass: Does not expose arguments in bash history (execFile without shell).
 */
export async function executeWithSecureCLI(userPrivateKey, actionArgs) {
  const tempWallet = `dm_tmp_${randomUUID().split('-')[0]}`
  try {
    log.dim(`[SECURE-CLI] Importing temporary wallet in-memory...`)
    await execFile(ZERION_BIN, ['wallet', 'import', '--name', tempWallet, '--private-key', userPrivateKey], { env: process.env })

    log.dim(`[SECURE-CLI] Executing action with temporary wallet...`)
    const args = [...actionArgs, '--wallet', tempWallet, '--json']
    const { stdout } = await execFile(ZERION_BIN, args, { env: process.env, maxBuffer: 10 * 1024 * 1024 })
    return JSON.parse(stdout)
  } finally {
    log.dim(`[SECURE-CLI] Shredding temporary wallet from disk...`)
    try {
      await execFile(ZERION_BIN, ['wallet', 'remove', '--name', tempWallet], { env: process.env })
    } catch (e) { }
  }
}

/**
 * executeUmbra
 * Sends funds while hiding the route using the Umbra protocol via Zerion CLI.
 */
export async function executeUmbra({ token, amount, recipient, chain, userPrivateKey = null }) {
  log.stage('UMBRA-SEND', `Sending ${amount} ${token} to ${recipient} on ${chain} privately`)
  const cmd = ['send', chain.toLowerCase(), token.toUpperCase(), amount, recipient, '--privacy', 'umbra']

  if (!userPrivateKey) {
    cmd.push('--wallet', AGENT_WALLET_NAME, '--json')
    const result = await zerionCli(cmd)
    if (!result.hash && !result.transaction?.hash) throw new Error(result.error?.message || 'Umbra send failed via CLI')
    return { txHash: result.hash || result.transaction.hash, status: 'SUCCESS', method: 'Zerion CLI (Umbra Public)' }
  } else {
    const result = await executeWithSecureCLI(userPrivateKey, cmd)
    if (result.error) throw new Error(result.error.message)
    return { txHash: result.hash || result.transaction?.hash, status: 'SUCCESS', method: 'Zerion CLI (Umbra Secure DM)' }
  }
}

async function askClaude(systemPrompt, userPrompt, opts = {}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://omnisysx.xyz',
      'X-Title': 'OmnisysX Agent',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens || 800,
      messages: [
        { role: 'system', content: systemPrompt + `\n\nCURRENT_DATE: ${new Date().toDateString()}\nCURRENT_YEAR: ${new Date().getFullYear()}` },
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
export async function executeSwap({ fromToken, toToken, amount, chain, userPrivateKey = null }) {
  log.stage('SWAP-API', `${amount} ${fromToken} -> ${toToken} on ${chain} (Executing REAL Transaction)`)

  if (userPrivateKey) {
    throw new Error("Private Mode cannot securely delegate to global CLI yet. Use EVM networks or Public Mode.")
  }

  log.dim(`Executing via Zerion CLI pipeline...`)
  const wallet = chain.toLowerCase() === 'solana' ? `${AGENT_WALLET_NAME}-sol` : AGENT_WALLET_NAME

  const cmd = [
    'swap', chain.toLowerCase(), amount, fromToken, toToken,
    '--wallet', wallet, '--cheapest', '--json'
  ]
  const result = await zerionCli(cmd)
  const txHash = result.tx?.hash || result.txHash || result.transaction?.hash || result.hash
  if (!txHash) throw new Error(result.error?.message || `Swap failed via CLI: ${JSON.stringify(result)}`)

  return {
    txHash,
    method: '(Zerion CLI)',
    status: 'SUCCESS'
  }
}

// Direct bridge execution (REAL ON-CHAIN VERSION)
export async function executeBridge({ fromToken, toToken, amount, fromChain, toChain, toAddress = null, userPrivateKey = null }) {
  log.stage('BRIDGE-API', `${amount} ${fromToken} (${fromChain}) -> ${toToken} (${toChain})`)

  if (userPrivateKey) {
    throw new Error("Private Mode cannot securely delegate to global CLI yet. Use Public Mode.")
  }

  log.dim(`Executing via Zerion CLI pipeline...`)
  const wallet = fromChain.toLowerCase() === 'solana' ? `${AGENT_WALLET_NAME}-sol` : AGENT_WALLET_NAME

  const cmd = [
    'bridge', fromChain.toLowerCase(), fromToken.toUpperCase(), amount,
    toChain.toLowerCase(), toToken.toUpperCase(),
    '--wallet', wallet, '--cheapest', '--json'
  ]

  if (toAddress) {
    cmd.push('--to-address', toAddress)
  }

  const result = await zerionCli(cmd)
  const txHash = result.tx?.hash || result.txHash || result.transaction?.hash || result.hash
  if (!txHash) throw new Error(result.error?.message || `Bridge failed via CLI: ${JSON.stringify(result)}`)

  return {
    txHash,
    method: '(Zerion CLI)',
    status: 'SUCCESS'
  }
}

export async function executeBulkSend({ token, amountPerWallet, recipients, chain, userPrivateKey = null }) {
  log.stage('BULK-SEND', `Distributing ${amountPerWallet} ${token} to ${recipients.length} wallets on ${chain}`)

  const RPCS = {
    'base': 'https://mainnet.base.org', 'eth': 'https://eth.llamarpc.com',
    'arbitrum': 'https://arb1.arbitrum.io/rpc', 'polygon': 'https://polygon-rpc.com',
    'optimism': 'https://mainnet.optimism.io', 'bsc': 'https://bsc-dataseed.binance.org'
  }
  const rpcUrl = RPCS[chain.toLowerCase()] || 'https://mainnet.base.org'
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const pk = userPrivateKey || process.env.AGENT_PRIVATE_KEY
  const wallet = new ethers.Wallet(pk, provider)

  const results = []
  const amountWei = ethers.parseUnits(String(amountPerWallet), token.toUpperCase() === 'USDC' ? 6 : 18)

  for (const recipient of recipients) {
    try {
      log.dim(`Sending to ${recipient.slice(0, 8)}...`)
      let tx;
      if (token.toUpperCase() === 'ETH') {
        tx = await wallet.sendTransaction({ to: recipient, value: amountWei })
      } else {
        const USDC_MAP = {
          'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          'arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          'eth': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
        const tokenAddr = USDC_MAP[chain.toLowerCase()] || token
        const contract = new ethers.Contract(tokenAddr, ['function transfer(address,uint256) returns (bool)'], wallet)
        tx = await contract.transfer(recipient, amountWei)
      }
      results.push({ recipient, hash: tx.hash, status: 'SUCCESS' })
    } catch (e) {
      log.err(`Failed for ${recipient}: ${e.message}`)
      results.push({ recipient, error: e.message, status: 'FAILED' })
    }
  }

  return results
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/'))) {
  runPipeline().catch(() => process.exit(1))
}
