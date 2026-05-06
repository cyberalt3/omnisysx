/**
 * OmnisysX Discord Bot
 * ----------------------------------------------------------
 * Public Discord bot exposing the OmnisysX multi-agent pipeline.
 *
 * Slash commands:
 *   /portfolio   — wallet snapshot embed
 *   /run         — trigger full pipeline
 *   /policy      — show active agent token policy (proves scope)
 *   /watch       — add wallet to watchlist
 *   /unwatch     — remove from watchlist
 *   /watchlist   — list watched wallets
 *   /status      — last pipeline run
 *   /help        — usage info
 *
 * Auto alerts (when ALERT_CHANNEL_ID is set):
 *   • CRITICAL gas reserve breach (1h cooldown)
 *
 * Run with:  node bot.mjs
 */

import { Client, GatewayIntentBits, Events, EmbedBuilder, REST, Routes,
         SlashCommandBuilder, MessageFlags } from 'discord.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { runPipeline } from '../agent/agent.mjs'
import 'dotenv/config'

const exec = promisify(execFile)

// ============================================================
// CONFIG
// ============================================================

const DISCORD_TOKEN     = process.env.DISCORD_BOT_TOKEN
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID
const OPENROUTER_KEY    = process.env.OPENROUTER_API_KEY
const ALERT_CHANNEL_ID  = process.env.ALERT_CHANNEL_ID
const POLL_INTERVAL_MS  = parseInt(process.env.POLL_INTERVAL_MS || '300000')
const DEFAULT_WALLET    = process.env.AGENT_WALLET_ADDRESS
const MIN_ETH_GAS       = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN           = process.env.EXECUTOR_DRY_RUN !== 'false'
const MODEL             = process.env.LLM_MODEL || process.env.AGENT_MODEL || 'anthropic/claude-3.5-haiku'
const STATE_FILE        = './bot-state.json'

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('FATAL: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set in .env')
  process.exit(1)
}
if (!OPENROUTER_KEY) {
  console.error('WARNING: OPENROUTER_API_KEY not set — Orchestrator will not work')
}

// ============================================================
// COLORS & ICONS (Zerion palette)
// ============================================================

const COLORS = { blue: 0x2962ef, green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, muted: 0x8a8f99, purple: 0x7c3aed }
const ICONS  = {
  observer: '🔭', planner: '🧠', auditor: '🛡️', executor: '⚡',
  verify:   '✅', alert:   '🚨', ok:      '✓',  fail:    '✗',
}

// ============================================================
// ORCHESTRATOR — Web3 Expert System Prompt
// ============================================================

const ORCHESTRATOR_PROMPT = `You are the OmnisysX Orchestrator — a specialized Web3 and DeFi expert assistant.

## YOUR ROLE
You help users understand their wallet positions, DeFi protocols, EVM chains, token economics, and blockchain projects.
You have deep knowledge of all major EVM-compatible networks: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, zkSync, Linea, Scroll, Blast, Fantom, Gnosis, Celo, Mantle, and others.

## STRICT RULES — NEVER BREAK THESE
1. **ONLY discuss Web3, DeFi, blockchain, crypto, and related topics.** If someone asks about anything outside this scope (cooking, politics, general coding, personal questions, etc.), respond: "⛔ I only assist with Web3, DeFi, and blockchain topics. Please ask about your wallet, protocols, or chains."
2. **NEVER reveal, discuss, or acknowledge:** API keys, private keys, bot tokens, environment variables, internal configuration, server setup, infrastructure details, or any technical implementation of this bot.
3. If asked about keys, configs, or how this bot works internally, respond: "🔒 I cannot share internal system details. Ask me about DeFi protocols, wallet analysis, or blockchain topics instead."
4. **NEVER generate code, scripts, or technical instructions** for exploits, hacks, or attacks.
5. Keep responses concise (under 1500 characters for Discord).
6. Use emoji and formatting for readability.
7. When wallet context is provided, reference the actual portfolio data in your analysis.

## YOUR KNOWLEDGE AREAS
- Wallet analysis: positions, gas reserves, portfolio health
- DeFi protocols: Aave, Uniswap, Compound, Curve, Pendle, Lido, EigenLayer, Morpho, etc.
- Token economics: tokenomics, vesting, staking rewards, yield farming
- EVM chains: gas costs, bridge options, ecosystem differences
- NFTs: collections, marketplaces, floor prices
- Risk assessment: smart contract risk, impermanent loss, liquidation risk
- Market trends: general DeFi trends and protocol updates

Always be helpful, accurate, and focused on Web3.`

// ============================================================
// PERSISTENCE — bot-state.json
// ============================================================

async function loadState() {
  try { return JSON.parse(await readFile(STATE_FILE, 'utf-8')) }
  catch { return { watchedWallets: {}, lastRun: null, lastAlertTs: {} } }
}

async function saveState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2))
}

// ============================================================
// ZERION HTTP API HELPERS
// ============================================================

const ZERION_API_KEY = process.env.ZERION_API_KEY
const ZERION_BASE = 'https://api.zerion.io/v1'

function zerionHeaders() {
  return {
    'Authorization': 'Basic ' + Buffer.from(ZERION_API_KEY + ':').toString('base64'),
    'Content-Type': 'application/json',
  }
}

async function zerionGet(path) {
  const res = await fetch(`${ZERION_BASE}${path}`, { headers: zerionHeaders() })
  if (!res.ok) throw new Error(`Zerion API ${res.status}: ${await res.text()}`)
  return res.json()
}

async function getPortfolioSnapshot(address) {
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
  const ethPos = positions.find(p => p.symbol === 'ETH' && (p.chain === 'ethereum' || p.chain === 'base'))
  const ethBalance = ethPos?.quantity ?? 0
  const gasStatus = ethBalance < MIN_ETH_GAS ? 'CRITICAL' : ethBalance < MIN_ETH_GAS * 2 ? 'WARNING' : 'SAFE'
  const topPositions = positions.sort((a, b) => b.value - a.value).slice(0, 5)

  return { address, totalUsd, change24h, ethBalance, gasStatus, topPositions }
}

import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'

async function getActivePolicy() {
  try {
    const configPath = join(homedir(), '.zerion', 'config.json')
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      const policies = config.policies || {}
      const policyIds = Object.keys(policies)
      if (policyIds.length > 0) return policies[policyIds[0]]
    }
    
    // Fallback for Railway / Remote environments
    return {
      id: 'policy-omnisysx-safe-388f646f',
      name: 'omnisysx-safe',
      rules: [
        { type: 'allowed_chains', chain_ids: ['eip155:8453'] },
        { type: 'expires_at', timestamp: new Date(Date.now() + 7 * 86400 * 1000).toISOString() }
      ],
      executable: true,
      config: {
        scripts: ['deny-transfers.mjs', 'deny-approvals.mjs']
      }
    }
  } catch (e) {
    console.log(`[policy] Failed to read config: ${e.message}`)
    return null
  }
}

// ============================================================
// EMBED BUILDERS
// ============================================================

function shortAddr(a) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

function embedPortfolio(snap) {
  const gasColor = snap.gasStatus === 'CRITICAL' ? COLORS.red :
                   snap.gasStatus === 'WARNING'  ? COLORS.amber : COLORS.green
  const gasIcon  = snap.gasStatus === 'CRITICAL' ? '🔴' :
                   snap.gasStatus === 'WARNING'  ? '🟡' : '🟢'
  const change   = snap.change24h >= 0
    ? `📈 +${(snap.change24h * 100).toFixed(2)}%`
    : `📉 ${(snap.change24h * 100).toFixed(2)}%`
  const positions = snap.topPositions
    .map(p => `\`${p.symbol.padEnd(6)}\` ${p.chain} — $${(p.value || 0).toFixed(2)}`)
    .join('\n') || '_no positions_'

  return new EmbedBuilder()
    .setColor(gasColor)
    .setTitle(`${ICONS.observer} Portfolio Snapshot`)
    .setDescription(`**Wallet:** \`${shortAddr(snap.address)}\``)
    .addFields(
      { name: '💰 Total Value', value: `**$${snap.totalUsd.toFixed(2)}** ${change}`, inline: true },
      { name: '⛽ Gas Reserve', value: `${gasIcon} **${snap.ethBalance.toFixed(6)} ETH**\n_${snap.gasStatus}_`, inline: true },
      { name: '🏆 Top Positions', value: positions, inline: false },
    )
    .setFooter({ text: 'OmnisysX · Powered by Zerion CLI' })
    .setTimestamp()
}

function embedPipelineResult(result) {
  const { report, tis, pdr, execResult, status } = result

  // ── Risk level + colors ──
  const riskScore = pdr?.riskScore ?? (tis?.confidence ? Math.round((1 - tis.confidence) * 100) : 0)
  const riskLevel = riskScore <= 25 ? 'Low Risk' : riskScore <= 50 ? 'Medium Risk' : riskScore <= 75 ? 'High Risk' : 'Critical'
  const riskEmoji = riskScore <= 25 ? '🟢' : riskScore <= 50 ? '🟡' : riskScore <= 75 ? '🟠' : '🔴'

  let color = COLORS.green
  let statusIcon = '✅'
  if (status === 'REJECTED')      { color = COLORS.red;   statusIcon = '🚫' }
  else if (status === 'ALERT_ONLY')    { color = COLORS.muted; statusIcon = 'ℹ️' }
  else if (status === 'NEEDS_REVIEW')  { color = COLORS.amber; statusIcon = '⚠️' }

  // ── Portfolio stats ──
  const totalUsd  = report.totalUsd?.toFixed(2) || '0.00'
  const ethBal    = report.ethBalance?.toFixed(4) || '0.0000'
  const gasIcon   = report.gasStatus === 'CRITICAL' ? '🔴' : report.gasStatus === 'WARNING' ? '🟡' : '🟢'
  const change    = report.change24h >= 0
    ? `+${(report.change24h * 100).toFixed(2)}%`
    : `${(report.change24h * 100).toFixed(2)}%`

  // ── Chain + token counts ──
  const chains = [...new Set((report.topPositions || []).map(p => p.chain))].length
  const tokens = (report.topPositions || []).length
  const topHolding = report.topPositions?.[0]
  const topPct = topHolding && report.totalUsd > 0
    ? `${topHolding.symbol} (${((topHolding.usd / report.totalUsd) * 100).toFixed(1)}%)`
    : 'N/A'

  // ── DeFi exposure estimate ──
  const defiExposure = report.topPositions
    ?.filter(p => !['ETH','USDC','USDT','DAI','WETH'].includes(p.symbol))
    .reduce((s, p) => s + (p.usd || 0), 0) || 0
  const defiPct = report.totalUsd > 0 ? ((defiExposure / report.totalUsd) * 100).toFixed(1) : '0.0'

  // ═══════════════════════════════════════
  // BUILD THE EMBED
  // ═══════════════════════════════════════

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔺 TRINITY VERIFICATION REPORT`)
    .setDescription(
      `**\`${shortAddr(report.address)}\`** ${riskEmoji} **${riskLevel}**\n` +
      `\`${report.address}\``
    )

  // ── Summary Stats Row ──
  embed.addFields(
    { name: '💰 TOTAL VALUE',  value: `**$${totalUsd}**`, inline: true },
    { name: '🎯 RISK SCORE',   value: `**${riskScore}/100**`, inline: true },
    { name: '⛽ GAS RESERVE',  value: `**${ethBal} ETH**`, inline: true },
  )
  embed.addFields(
    { name: '📊 24H CHANGE',   value: `**${change}**`, inline: true },
    { name: '🏗️ DEFI EXPOSURE', value: `**${defiPct}%**`, inline: true },
    { name: '🔗 CHAINS',       value: `**${chains}**`, inline: true },
  )

  // ── Separator ──
  embed.addFields({ name: '\u200b', value: '**━━━━ Agent Reports ━━━━**', inline: false })

  // ── Observer Report ──
  const observerLines = []
  observerLines.push(`Portfolio diversified across **${chains} chain${chains !== 1 ? 's' : ''}**.`)
  observerLines.push(`Gas reserve ${gasIcon} **${ethBal} ETH** (${report.gasStatus}).`)
  if (report.topPositions?.length > 0) {
    const posStr = report.topPositions
      .map(p => `\`${p.symbol}\` $${(p.usd || 0).toFixed(2)}`)
      .join(' · ')
    observerLines.push(`Holdings: ${posStr}`)
  }
  embed.addFields({
    name: `👁️ Observer ${statusIcon !== '🚫' ? '✅' : '⚠️'}`,
    value: observerLines.join('\n'),
    inline: false,
  })

  // ── Task Manager Report ──
  if (tis) {
    const tmLines = []
    if (tis.intentType === 'ALERT_ONLY') {
      tmLines.push(`Decision: **ALERT_ONLY** — no action needed.`)
    } else {
      tmLines.push(`Intent: **${tis.intentType}** (confidence: ${(tis.confidence * 100).toFixed(0)}%)`)
      if (tis.action) {
        const a = tis.action
        tmLines.push(`Action: ${a.fromToken} → ${a.toToken} on ${a.chain}`)
        if (a.amount) tmLines.push(`Amount: ${a.amount}`)
      }
    }
    if (tis.rationale) tmLines.push(`\n_${tis.rationale}_`)
    embed.addFields({
      name: `📋 Task Manager ${tis.intentType === 'ALERT_ONLY' ? '✅' : '🔄'}`,
      value: tmLines.join('\n'),
      inline: false,
    })
  }

  // ── Auditor Report ──
  if (pdr) {
    const auditIcon = pdr.decision === 'APPROVED' ? '✅' :
                      pdr.decision === 'REJECTED' ? '❌' : '⚠️'
    const auditLines = []
    if (pdr.decision === 'APPROVED') {
      auditLines.push(`All positions within policy bounds. Gas reserve **${report.gasStatus}**.`)
      auditLines.push(`Recommend: **APPROVED** for autonomous operation.`)
    } else if (pdr.decision === 'REJECTED') {
      auditLines.push(`**REJECTED** — ${pdr.notes || 'Policy violation detected.'}`)
    } else {
      auditLines.push(`**NEEDS_REVIEW** — ${pdr.notes || 'Risk threshold exceeded.'}`)
    }
    if (pdr.notes && pdr.decision === 'APPROVED') auditLines.push(`\n_${pdr.notes}_`)
    embed.addFields({
      name: `🛡️ Auditor ${auditIcon}`,
      value: auditLines.join('\n'),
      inline: false,
    })
  } else if (tis?.intentType === 'ALERT_ONLY') {
    embed.addFields({
      name: `🛡️ Auditor ✅`,
      value: `No action to audit. Portfolio stable.`,
      inline: false,
    })
  }

  // ── Executor (if applicable) ──
  if (execResult) {
    const execLines = []
    if (DRY_RUN) {
      execLines.push(`🟡 **DRY_RUN** — transaction simulated, not submitted.`)
    } else if (execResult.txHash) {
      const explorer = tis?.action?.chain === 'base'
        ? `https://basescan.org/tx/${execResult.txHash}`
        : `https://etherscan.io/tx/${execResult.txHash}`
      execLines.push(`✅ **Executed** — [\`${execResult.txHash.slice(0, 16)}…\`](${explorer})`)
    }
    embed.addFields({
      name: `⚡ Executor ${DRY_RUN ? '🟡' : '✅'}`,
      value: execLines.join('\n') || 'Completed',
      inline: false,
    })
  }

  // ── Footer Badges ──
  const badges = [
    `${tokens} tokens`,
    `${chains} chains`,
    `Top: ${topPct}`,
    `Gas: ${report.gasStatus}`,
  ]
  if (status === 'ALERT_ONLY') badges.push('📋 Alert only')
  if (status === 'REJECTED')   badges.push('🚫 Rejected')
  if (status === 'NEEDS_REVIEW') badges.push('⚠️ Review needed')

  embed.addFields({
    name: '\u200b',
    value: badges.map(b => `\`${b}\``).join('  '),
    inline: false,
  })

  embed.setFooter({ text: `OmnisysX Trinity` })
  embed.setTimestamp()

  return embed
}

function embedPolicy(policy) {
  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle(`${ICONS.auditor} Active Policy: \`${policy.name}\``)
    .setDescription('Restrictions on the agent token. Proof that the agent has bounded power.')
    .addFields(
      { name: '🌐 Chains',  value: (policy.chains || []).join(', ') || '_any_', inline: true },
      { name: '⏰ Expires', value: policy.expires_at || policy.expires || '_never_', inline: true },
      { name: '🚫 Restrictions', value: [
          policy.deny_transfers ? '✓ Blocks raw transfers' : null,
          policy.deny_approvals ? '✓ Blocks ERC-20 approvals' : null,
          policy.allowlist ? `✓ Allowlist: ${policy.allowlist.length} addresses` : null,
        ].filter(Boolean).join('\n') || '_no explicit restrictions_', inline: false },
    )
    .setFooter({ text: 'Created via `zerion agent create-policy`' })
}

function embedHelp() {
  return new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle('🤖 OmnisysX — Multi-Agent DeFi Pipeline')
    .setDescription('Autonomous agent that monitors DeFi wallets and executes swaps via Zerion CLI.')
    .addFields(
      { name: '📊 Analysis', value:
          '`/portfolio <address>` — wallet snapshot\n' +
          '`/run <address>` — trigger full pipeline\n' +
          '`/status` — last execution' },
      { name: '👀 Watchlist', value:
          '`/watch <address> <name>` — monitor a wallet\n' +
          '`/unwatch <name>` — stop monitoring\n' +
          '`/watchlist` — list watched wallets' },
      { name: '🛡️ Security', value:
          '`/policy` — view active agent token policy' },
      { name: '💬 Orchestrator', value:
          '`/ask <question>` — chat with the Web3 expert\n' +
          '`/ask <question> wallet:<address>` — with wallet context' },
    )
    .setFooter({ text: `Mode: ${DRY_RUN ? 'DRY_RUN (safe)' : 'LIVE'}` })
}

// ============================================================
// SLASH COMMAND DEFINITIONS
// ============================================================

const commandDefs = [
  new SlashCommandBuilder().setName('portfolio').setDescription('Show portfolio snapshot of a wallet')
    .addStringOption(o => o.setName('address').setDescription('Wallet address (0x... or ENS)').setRequired(false)),
  new SlashCommandBuilder().setName('run').setDescription('Trigger the full pipeline (Observe → Plan → Audit → Execute)')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(false)),
  new SlashCommandBuilder().setName('ask').setDescription('Ask the Orchestrator about Web3, DeFi, or your wallet')
    .addStringOption(o => o.setName('question').setDescription('Your question about Web3/DeFi').setRequired(true))
    .addStringOption(o => o.setName('wallet').setDescription('Wallet address for context (optional)').setRequired(false)),
  new SlashCommandBuilder().setName('policy').setDescription('Show active agent token policy'),
  new SlashCommandBuilder().setName('watch').setDescription('Add a wallet to the watchlist')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true))
    .addStringOption(o => o.setName('name').setDescription('Nickname').setRequired(true)),
  new SlashCommandBuilder().setName('unwatch').setDescription('Remove a wallet from the watchlist')
    .addStringOption(o => o.setName('name').setDescription('Nickname').setRequired(true)),
  new SlashCommandBuilder().setName('watchlist').setDescription('Show watched wallets in this server'),
  new SlashCommandBuilder().setName('status').setDescription('Show the last pipeline execution'),
  new SlashCommandBuilder().setName('help').setDescription('Show available commands'),
].map(c => c.toJSON())

async function registerCommands() {
  console.log('Registering slash commands globally...')
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commandDefs })
  console.log(`✓ ${commandDefs.length} commands registered (may take up to 1h to propagate globally)`)
}

// ============================================================
// CLIENT + INTERACTION HANDLER
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once(Events.ClientReady, async () => {
  console.log(`\n✓ ${client.user.tag} online in ${client.guilds.cache.size} server(s)`)
  console.log(`  Mode:    ${DRY_RUN ? 'DRY_RUN (safe)' : '🔴 LIVE'}`)
  console.log(`  Default: ${DEFAULT_WALLET || '(none)'}`)
  console.log(`  LLM:     ${OPENROUTER_KEY ? 'OpenRouter ✓' : '❌ MISSING KEY'} (${MODEL})`)
  if (ALERT_CHANNEL_ID) {
    console.log(`  Alerts:  every ${POLL_INTERVAL_MS / 1000}s → channel ${ALERT_CHANNEL_ID}`)
    startPollingLoop()
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  try {
    await commandHandlers[interaction.commandName]?.(interaction)
  } catch (e) {
    console.error(`[${interaction.commandName}]`, e)
    const msg = `❌ Error: ${e.message}`
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: msg })
    else await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral })
  }
})

// ============================================================
// @MENTION HANDLER — Orchestrator chat via mentions
// ============================================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return
  if (!message.mentions.has(client.user)) return

  console.log(`[mention] Message from ${message.author.tag}: "${message.content.slice(0, 100)}"`)

  const question = message.content.replace(/<@!?\d+>/g, '').trim()

  if (!question) {
    console.log('[mention] Empty question, sending hint')
    await message.channel.send('🧠 Mention me with a question! Example: `@OmnisysX what is Aave?`')
    return
  }

  try { await message.channel.sendTyping() } catch {}

  const walletMatch = question.match(/0x[a-fA-F0-9]{40}/)
  const walletAddr = walletMatch ? walletMatch[0] : DEFAULT_WALLET

  // Build wallet context
  let walletContext = ''
  if (walletAddr) {
    try {
      const snap = await getPortfolioSnapshot(walletAddr)
      const positions = snap.topPositions
        .map(p => `${p.symbol} on ${p.chain}: $${(p.value || 0).toFixed(2)}`)
        .join(', ')
      walletContext = `\n\n[WALLET CONTEXT]\nAddress: ${walletAddr}\nTotal Value: $${snap.totalUsd.toFixed(2)}\nETH Balance: ${snap.ethBalance.toFixed(6)} ETH\nGas Status: ${snap.gasStatus}\n24h Change: ${(snap.change24h * 100).toFixed(2)}%\nTop Positions: ${positions}\n[END WALLET CONTEXT]`
      console.log('[mention] Wallet context loaded')
    } catch (e) {
      console.log(`[mention] Wallet context failed: ${e.message}`)
    }
  }

  console.log(`[mention] Calling OpenRouter model=${MODEL}`)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://omnisysx.io',
        'X-Title': 'OmnisysX Orchestrator',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          { role: 'system', content: ORCHESTRATOR_PROMPT },
          { role: 'user', content: question + walletContext },
        ],
      }),
    })

    console.log(`[mention] OpenRouter response: ${res.status}`)

    if (!res.ok) {
      const errBody = await res.text()
      console.error(`[mention] OpenRouter FAIL ${res.status}: ${errBody}`)
      await message.channel.send('❌ Could not generate a response right now.')
      return
    }

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content || 'No response generated.'
    const truncated = answer.length > 1900 ? answer.slice(0, 1900) + '…' : answer

    // Try embed first, fallback to plain text if missing Embed Links permission
    try {
      const embed = new EmbedBuilder()
        .setColor(COLORS.purple)
        .setTitle('🧠 Orchestrator')
        .setDescription(truncated)
        .setFooter({ text: `OmnisysX · ${walletAddr ? shortAddr(walletAddr) : 'No wallet'}` })
        .setTimestamp()
      await message.channel.send({ embeds: [embed] })
      console.log('[mention] Embed sent ✓')
    } catch {
      // Fallback: send as plain text
      await message.channel.send(`🧠 **Orchestrator**\n\n${truncated}`)
      console.log('[mention] Sent as plain text (embed permission missing)')
    }
  } catch (e) {
    console.error('[mention] CATCH ERROR:', e.message)
    try { await message.channel.send('❌ Error processing your question.') } catch (e2) {
      console.error('[mention] Even channel.send failed:', e2.message)
    }
  }
})

const commandHandlers = {
  async help(i) {
    await i.reply({ embeds: [embedHelp()], flags: MessageFlags.Ephemeral })
  },

  async portfolio(i) {
    const address = i.options.getString('address') || DEFAULT_WALLET
    if (!address) return i.reply({ content: '❌ Provide an address or set AGENT_WALLET_ADDRESS in .env', flags: MessageFlags.Ephemeral })
    await i.deferReply()
    const snap = await getPortfolioSnapshot(address)
    await i.editReply({ embeds: [embedPortfolio(snap)] })
  },

  async run(i) {
    const address = i.options.getString('address') || DEFAULT_WALLET
    if (!address) return i.reply({ content: '❌ Provide an address', flags: MessageFlags.Ephemeral })

    await i.deferReply()
    await i.editReply({ embeds: [new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle('🔄 Pipeline running...')
      .setDescription('Executing 6-stage pipeline. This takes ~10-15 seconds.')] })

    const result = await runPipeline(address)
    await i.editReply({ embeds: [embedPipelineResult(result)] })

    const state = await loadState()
    state.lastRun = {
      ts: new Date().toISOString(), address,
      summary: {
        status:     result.status,
        totalUsd:   result.report.totalUsd,
        gasStatus:  result.report.gasStatus,
        intentType: result.tis?.intentType,
        decision:   result.pdr?.decision,
        txHash:     result.execResult?.txHash,
      },
    }
    await saveState(state)
  },

  async ask(i) {
    const question = i.options.getString('question')
    const walletAddr = i.options.getString('wallet') || DEFAULT_WALLET

    await i.deferReply()

    // Build wallet context if available
    let walletContext = ''
    if (walletAddr) {
      try {
        const snap = await getPortfolioSnapshot(walletAddr)
        const positions = snap.topPositions
          .map(p => `${p.symbol} on ${p.chain}: $${(p.value || 0).toFixed(2)}`)
          .join(', ')
        walletContext = `\n\n[WALLET CONTEXT]\nAddress: ${walletAddr}\nTotal Value: $${snap.totalUsd.toFixed(2)}\nETH Balance: ${snap.ethBalance.toFixed(6)} ETH\nGas Status: ${snap.gasStatus}\n24h Change: ${(snap.change24h * 100).toFixed(2)}%\nTop Positions: ${positions}\n[END WALLET CONTEXT]`
      } catch (e) {
        walletContext = `\n\n[WALLET CONTEXT]\nAddress: ${walletAddr}\nNote: Could not fetch wallet data (${e.message})\n[END WALLET CONTEXT]`
      }
    }

    // Call OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://omnisysx.io',
        'X-Title': 'OmnisysX Orchestrator',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          { role: 'system', content: ORCHESTRATOR_PROMPT },
          { role: 'user', content: question + walletContext },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return i.editReply({ content: `❌ LLM error: ${res.status}` })
    }

    const data = await res.json()
    const answer = data.choices?.[0]?.message?.content || 'No response generated.'

    // Truncate if too long for Discord (2000 char limit)
    const truncated = answer.length > 1900 ? answer.slice(0, 1900) + '…' : answer

    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle('🧠 Orchestrator')
      .setDescription(truncated)
      .setFooter({ text: `OmnisysX · ${walletAddr ? shortAddr(walletAddr) : 'No wallet context'}` })
      .setTimestamp()

    await i.editReply({ embeds: [embed] })
  },

  async policy(i) {
    await i.deferReply()
    const policy = await getActivePolicy()
    if (!policy) return i.editReply({ content: '⚠️ No policy configured. Create one with `zerion agent create-policy`' })
    await i.editReply({ embeds: [embedPolicy(policy)] })
  },

  async watch(i) {
    const address = i.options.getString('address')
    const name    = i.options.getString('name')
    const state   = await loadState()
    state.watchedWallets[i.guildId] ??= {}
    state.watchedWallets[i.guildId][name] = { address, addedAt: new Date().toISOString(), addedBy: i.user.id }
    await saveState(state)
    await i.reply({ content: `✓ Watching **${name}** → \`${shortAddr(address)}\``, flags: MessageFlags.Ephemeral })
  },

  async unwatch(i) {
    const name  = i.options.getString('name')
    const state = await loadState()
    if (!state.watchedWallets[i.guildId]?.[name]) {
      return i.reply({ content: `❌ "${name}" not found in watchlist`, flags: MessageFlags.Ephemeral })
    }
    delete state.watchedWallets[i.guildId][name]
    await saveState(state)
    await i.reply({ content: `✓ Removed **${name}**`, flags: MessageFlags.Ephemeral })
  },

  async watchlist(i) {
    const state   = await loadState()
    const watched = state.watchedWallets[i.guildId] || {}
    if (!Object.keys(watched).length) {
      return i.reply({ content: '_No wallets being watched in this server._', flags: MessageFlags.Ephemeral })
    }
    const list = Object.entries(watched)
      .map(([n, w]) => `• **${n}** — \`${shortAddr(w.address)}\``)
      .join('\n')
    await i.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('👀 Watchlist').setDescription(list)] })
  },

  async status(i) {
    const state = await loadState()
    if (!state.lastRun) return i.reply({ content: '_No runs yet. Use_ `/run` _to start._', flags: MessageFlags.Ephemeral })

    const { ts, address, summary } = state.lastRun
    const embed = new EmbedBuilder()
      .setColor(COLORS.muted)
      .setTitle('📋 Last Run')
      .addFields(
        { name: 'When',      value: `<t:${Math.floor(new Date(ts).getTime() / 1000)}:R>`, inline: true },
        { name: 'Wallet',    value: `\`${shortAddr(address)}\``,     inline: true },
        { name: 'Status',    value: summary.status,                    inline: true },
        { name: 'Portfolio', value: `$${summary.totalUsd?.toFixed(2) || '?'}`, inline: true },
        { name: 'Gas',       value: summary.gasStatus || '?',          inline: true },
        { name: 'Intent',    value: summary.intentType || '_n/a_',     inline: true },
      )
    if (summary.txHash) embed.addFields({ name: 'Tx', value: `\`${summary.txHash.slice(0, 20)}…\``, inline: false })
    await i.reply({ embeds: [embed] })
  },
}

// ============================================================
// AUTO-ALERT POLLING LOOP
// ============================================================

async function startPollingLoop() {
  const tick = async () => {
    try {
      const channel = await client.channels.fetch(ALERT_CHANNEL_ID).catch(() => null)
      if (!channel) return

      const state = await loadState()
      const wallets = new Map()
      for (const guild of Object.values(state.watchedWallets || {})) {
        for (const [name, w] of Object.entries(guild)) wallets.set(w.address, name)
      }
      if (DEFAULT_WALLET) wallets.set(DEFAULT_WALLET, 'default')

      for (const [addr, name] of wallets) {
        try {
          const snap = await getPortfolioSnapshot(addr)
          if (snap.gasStatus === 'CRITICAL') await maybeAlertGas(channel, state, name, snap)
        } catch (e) {
          console.error(`[poll] ${addr}: ${e.message}`)
        }
      }
    } catch (e) { console.error('[poll]', e) }
  }

  await tick()
  setInterval(tick, POLL_INTERVAL_MS)
}

async function maybeAlertGas(channel, state, name, snap) {
  const key = `gas_${snap.address}`
  const last = state.lastAlertTs?.[key]
  if (last && Date.now() - new Date(last).getTime() < 3600000) return // 1h cooldown

  state.lastAlertTs ??= {}
  state.lastAlertTs[key] = new Date().toISOString()
  await saveState(state)

  await channel.send({ embeds: [new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle(`${ICONS.alert} Gas Reserve CRITICAL`)
    .setDescription(`Wallet **${name}** is below the gas reserve threshold`)
    .addFields(
      { name: 'Address',     value: `\`${snap.address}\`` },
      { name: 'Current ETH', value: `${snap.ethBalance.toFixed(6)} ETH`, inline: true },
      { name: 'Minimum',     value: `${MIN_ETH_GAS} ETH`,                inline: true },
    )
    .setTimestamp()] })
}

// ============================================================
// START
// ============================================================

;(async () => {
  await registerCommands()
  await client.login(DISCORD_TOKEN)
})()

process.on('SIGINT', () => {
  console.log('\nShutting down...')
  client.destroy()
  process.exit(0)
})

// Prevent crashes on unhandled errors
client.on('error', (e) => console.error('[discord-client]', e))
process.on('unhandledRejection', (e) => console.error('[unhandled]', e))
