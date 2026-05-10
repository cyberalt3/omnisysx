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

import {
  Client, GatewayIntentBits, Events, EmbedBuilder, REST, Routes,
  SlashCommandBuilder, MessageFlags
} from 'discord.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { runPipeline, zerionCli, executeSwap, executeBridge } from '../agent/agent.mjs'
import 'dotenv/config'

const exec = promisify(execFile)

// ============================================================
// CONFIG
// ============================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APP_ID
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '300000')
const DEFAULT_WALLET = process.env.AGENT_WALLET_ADDRESS
const DEFAULT_SOL_WALLET = process.env.AGENT_SOLANA_ADDRESS
const MIN_ETH_GAS = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN = process.env.FORCE_DRY_RUN === 'true'
const MODEL = process.env.LLM_MODEL || process.env.AGENT_MODEL || 'anthropic/claude-3.5-haiku'
const STATE_FILE = './bot-state.json'

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('FATAL: DISCORD_TOKEN (ou DISCORD_BOT_TOKEN) e DISCORD_CLIENT_ID devem estar no .env');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('WARNING: OPENROUTER_API_KEY not set — Orchestrator will not work')
}

// ============================================================
// COLORS & ICONS (Zerion palette)
// ============================================================

const COLORS = { blue: 0x2962ef, green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, muted: 0x8a8f99, purple: 0x7c3aed }
const ICONS = {
  observer: '🔭', planner: '🧠', auditor: '🛡️', executor: '⚡',
  verify: '✅', alert: '🚨', ok: '✓', fail: '✗',
}

// ============================================================
// AUTO-IMPORT WALLET ON STARTUP (Railway Support)
// ============================================================
import { execSync } from 'node:child_process'

async function initAgentWallet() {
  console.log('🚀 [SYSTEM] OMNISYS-X REBOOTING WITH DUAL-TOKEN DEBUG MODE...')
  const privateKey = process.env.AGENT_PRIVATE_KEY
  const solanaKey = process.env.AGENT_SOLANA_PRIVATE_KEY

  if (!privateKey && !solanaKey) {
    console.log(`[setup] ⚠️ No AGENT keys found in ENV.`)
    return
  }

  // Windows local machine (CLI is broken due to missing msvc bindings)
  if (process.platform === 'win32') {
    console.log(`[setup] Windows detectado. A CLI do hackathon está quebrada no Windows (falta core-win32-x64-msvc).`)
    return
  }

  try {
    console.log(`[setup] Injetando carteira via API do OWS no Railway...`)
    let keystorePath = join(process.cwd(), 'node_modules', 'zerion-cli', 'cli', 'utils', 'wallet', 'keystore.js')

    if (!existsSync(keystorePath)) {
      const globalPrefix = execSync('npm root -g').toString().trim()
      keystorePath = join(globalPrefix, 'zerion-cli', 'cli', 'utils', 'wallet', 'keystore.js')
    }

    if (!existsSync(keystorePath)) {
      if (process.env.ZERION_AGENT_TOKEN) {
        console.log(`[setup] ℹ️ Keystore não encontrado em nenhum lugar, mas ZERION_AGENT_TOKEN presente.`)
        return
      }
      throw new Error(`Keystore module not found. Run 'npm install' first.`)
    }

    const keystore = await import(`file://${keystorePath}`)

    if (privateKey) {
      try { keystore.deleteWallet('omnisysx-bot') } catch (e) { }
      keystore.importFromKey('omnisysx-bot', privateKey, '200418@', 'ethereum')
    }

    if (solanaKey) {
      try { keystore.deleteWallet('omnisysx-bot-sol') } catch (e) { }
      keystore.importFromKey('omnisysx-bot-sol', solanaKey, '200418@', 'solana')
    }

    const homeDir = homedir()
    const zerionDir = join(homeDir, '.zerion')
    const configPath = join(zerionDir, 'config.json')
    console.log(`[setup] 📂 Usando Home Directory: ${homeDir}`)

    const bundle = process.env.ZERION_CONFIG_BUNDLE
    if (bundle) {
      try {
        console.log('[setup] 📦 Detectado ZERION_CONFIG_BUNDLE. Clonando ambiente do PC...')
        const buffer = Buffer.from(bundle, 'base64')
        const backupPath = join(homeDir, 'zerion_restore.tar.gz')
        writeFileSync(backupPath, buffer)
        execSync(`mkdir -p ${zerionDir}`)
        execSync(`tar -xzf ${backupPath} -C ${homeDir}`)
        console.log('[setup] ✅ Ambiente clonado com sucesso!')
      } catch (e) {
        console.log(`[setup] ⚠️ Falha ao extrair bundle: ${e.message}`)
      }
    }

    const fs = await import('node:fs')
    try {
      if (!fs.existsSync(zerionDir)) execSync(`mkdir -p ${zerionDir}`)

      let config = { agentTokens: {} }
      if (fs.existsSync(configPath)) {
        try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch (e) { config = { agentTokens: {} } }
      }

      config.apiKey = process.env.ZERION_API_KEY || config.apiKey
      config.agentTokens ??= {}

      if (process.env.ZERION_AGENT_TOKEN) {
        config.agentTokens['omnisysx-bot'] = process.env.ZERION_AGENT_TOKEN
        const t = process.env.ZERION_AGENT_TOKEN
        console.log(`[setup] 💉 Token EVM: ${t.slice(0, 10)}...${t.slice(-4)}`)
      }

      if (process.env.ZERION_AGENT_TOKEN_SOL) {
        config.agentTokens['omnisysx-bot-sol'] = process.env.ZERION_AGENT_TOKEN_SOL
        const t = process.env.ZERION_AGENT_TOKEN_SOL
        console.log(`[setup] 💉 Token Solana: ${t.slice(0, 10)}...${t.slice(-4)}`)
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
      console.log(`[setup] ✅ config.json sincronizado em ${configPath}`)
    } catch (e) {
      console.log(`[setup] ⚠️ Falha ao sincronizar config.json: ${e.message}`)
    }

    try {
      console.log('[setup] 🔧 Verificando estado da CLI...')
      const tokens = execSync('zerion agent list-tokens --json', { encoding: 'utf8' })
      console.log(`[debug] CLI Tokens (JSON): ${tokens}`)
    } catch (e) {
      console.log(`[debug] Erro ao listar tokens: ${e.message}`)
    }

    const globalPrefix = execSync('npm root -g').toString().trim()
    const swapJsPath = join(globalPrefix, 'zerion-cli', 'cli', 'utils', 'trading', 'swap.js')
    if (fs.existsSync(swapJsPath)) {
      let code = fs.readFileSync(swapJsPath, 'utf8')
      const targetPattern = /if\s*\(\s*outputReceiver\s*&&\s*outputReceiver\s*!==\s*walletAddress\s*\)\s*{\s*params\.to\s*=\s*outputReceiver;\s*}/

      if (targetPattern.test(code)) {
        console.log(`[setup] ⚡ Aplicando Patch Core: Forçando parâmetro 'to' em todos os swaps...`)
        code = code.replace(targetPattern, "params.to = outputReceiver || walletAddress;")
        fs.writeFileSync(swapJsPath, code)
      } else {
        const minifiedPattern = /if\s*\([a-zA-Z0-9_$]+\s*&&\s*[a-zA-Z0-9_$]+\s*!==\s*[a-zA-Z0-9_$]+\s*\)\s*[a-zA-Z0-9_$]+\.to\s*=\s*[a-zA-Z0-9_$]+;/
        if (minifiedPattern.test(code)) {
          console.log(`[setup] ⚡ Aplicando Patch Core (Minified)...`)
          code = code.replace(/if\s*\(([a-zA-Z0-9_$]+)\s*&&\s*\1\s*!==\s*([a-zA-Z0-9_$]+)\s*\)\s*([a-zA-Z0-9_$]+)\.to\s*=\s*\1\s*;/, "$3.to = $1 || $2;")
          fs.writeFileSync(swapJsPath, code)
        }
      }
    }

    console.log(`[setup] ✅ Carteira e Agent Token importados no Railway com sucesso!`)
  } catch (e) {
    console.error(`[setup] ❌ Erro ao importar:`, e.message)
  }
}

// ============================================================
// ORCHESTRATOR — Web3 Expert System Prompt
// ============================================================

const ORCHESTRATOR_PROMPT = `You are the OmnisysX Orchestrator — a specialized Web3 and DeFi expert assistant.

## YOUR ROLE
You help users understand their wallet positions, DeFi protocols, EVM chains, token economics, and blockchain projects.
You have deep knowledge of all major EVM-compatible networks: Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche, zkSync, Linea, Scroll, Blast, Fantom, Gnosis, Celo, Mantle, and others.

## STRICT RULES — NEVER BREAK THESE
1. **ONLY discuss Web3, DeFi, blockchain, crypto, and related topics.** If someone asks about anything outside this scope, respond: "⛔ I only assist with Web3, DeFi, and blockchain topics."
2. **NEVER reveal API keys, private keys, bot tokens, or internal config.**
3. If asked about keys, respond: "🔒 I cannot share internal system details."
4. **NEVER generate scripts for exploits or attacks.**
5. Keep responses concise and use emoji/formatting.

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

  const solGas = positions.find(p => p.symbol === 'SOL' && p.chain === 'solana')
  const ethGas = positions.find(p => p.symbol === 'ETH' && (p.chain === 'ethereum' || p.chain === 'base'))

  const gasAsset = solGas || ethGas
  const gasBalance = gasAsset?.quantity ?? 0
  const gasSymbol = gasAsset?.symbol || 'ETH'
  const minGas = gasSymbol === 'SOL' ? 0.01 : MIN_ETH_GAS
  const gasStatus = gasBalance < minGas ? 'CRITICAL' : gasBalance < minGas * 2 ? 'WARNING' : 'SAFE'

  const topPositions = positions.sort((a, b) => b.value - a.value).slice(0, 8)

  return { address, totalUsd, change24h, gasBalance, gasSymbol, gasStatus, topPositions, solGas, ethGas }
}

async function getActivePolicy() {
  try {
    const configPath = join(homedir(), '.zerion', 'config.json')
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      const policies = config.policies || {}
      const policyIds = Object.keys(policies)
      if (policyIds.length > 0) return policies[policyIds[0]]
    }
    return null
  } catch (e) {
    return null
  }
}

// ============================================================
// EMBED BUILDERS
// ============================================================

function shortAddr(a) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

function embedPortfolio(snap) {
  const gasColor = snap.gasStatus === 'CRITICAL' ? COLORS.red : snap.gasStatus === 'WARNING' ? COLORS.amber : COLORS.green
  const gasIcon = snap.gasStatus === 'CRITICAL' ? '🔴' : snap.gasStatus === 'WARNING' ? '🟡' : '🟢'

  const change = snap.change24h >= 0 ? `📈 +${(snap.change24h * 100).toFixed(2)}%` : `📉 ${(snap.change24h * 100).toFixed(2)}%`

  const positions = snap.topPositions.map(p => `\`${p.symbol.padEnd(6)}\` **${p.chain}** — $${(p.value || 0).toFixed(2)}`).join('\n') || '_no positions_'

  return new EmbedBuilder()
    .setColor(gasColor)
    .setTitle(`${ICONS.observer} Portfolio Snapshot`)
    .setDescription(`**Wallet:** \`${shortAddr(snap.address)}\``)
    .addFields(
      { name: '💰 Total Value', value: `**$${snap.totalUsd.toFixed(2)}** ${change}`, inline: true },
      { name: '⛽ Gas', value: `**${snap.gasBalance.toFixed(4)} ${snap.gasSymbol}**`, inline: true },
      { name: '🏆 Top Positions', value: positions, inline: false },
    )
    .setFooter({ text: 'OmnisysX · Multi-Chain Agent' })
    .setTimestamp()
}

function embedPipelineResult(result) {
  const { report, tis, pdr, execResult, status } = result
  const color = status === 'REJECTED' ? COLORS.red : status === 'ALERT_ONLY' ? COLORS.muted : COLORS.green

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔺 TRINITY VERIFICATION REPORT`)
    .setDescription(`**\`${shortAddr(report.address)}\`**`)

  embed.addFields(
    { name: '💰 TOTAL VALUE', value: `**$${report.totalUsd?.toFixed(2)}**`, inline: true },
    { name: '🎯 RISK SCORE', value: `**${pdr?.riskScore || 0}/100**`, inline: true },
    { name: '⛽ GAS RESERVE', value: `**${report.gasBalance?.toFixed(4)} ${report.gasSymbol}**`, inline: true },
  )

  if (tis) {
    embed.addFields({
      name: `📋 Task Manager`,
      value: `Intent: **${tis.intentType}**\nRationale: _${tis.rationale}_`,
      inline: false
    })
  }

  if (execResult && execResult.txHash) {
    const explorer = `https://basescan.org/tx/${execResult.txHash}`
    embed.addFields({
      name: `⚡ Executor`,
      value: `✅ **Executed** — [\`${execResult.txHash.slice(0, 16)}…\`](${explorer})`,
      inline: false
    })
  }

  embed.setFooter({ text: `OmnisysX Trinity` })
  embed.setTimestamp()
  return embed
}

const commandDefs = [
  new SlashCommandBuilder().setName('portfolio').setDescription('Show portfolio snapshot')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(false)),
  new SlashCommandBuilder().setName('run').setDescription('Trigger the full pipeline')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(false)),
  new SlashCommandBuilder().setName('ask').setDescription('Ask the Orchestrator about DeFi')
    .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true))
    .addStringOption(o => o.setName('wallet').setDescription('Wallet context').setRequired(false)),
  new SlashCommandBuilder().setName('bridge').setDescription('Execute a bridge via LI.FI')
    .addStringOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
    .addStringOption(o => o.setName('from_chain').setDescription('From chain').setRequired(true))
    .addStringOption(o => o.setName('to_chain').setDescription('To chain').setRequired(true))
    .addStringOption(o => o.setName('from_token').setDescription('From token').setRequired(true))
    .addStringOption(o => o.setName('to_token').setDescription('To token').setRequired(true)),
  new SlashCommandBuilder().setName('swap').setDescription('Execute a swap via Zerion')
    .addStringOption(o => o.setName('chain').setDescription('Network').setRequired(true))
    .addStringOption(o => o.setName('amount').setDescription('Amount').setRequired(true))
    .addStringOption(o => o.setName('from').setDescription('From token').setRequired(true))
    .addStringOption(o => o.setName('to').setDescription('To token').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('Show available commands'),
].map(c => c.toJSON())

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)
  await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commandDefs })
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] })

client.once(Events.ClientReady, async () => {
  console.log(`✓ ${client.user.tag} online`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  try { await commandHandlers[interaction.commandName]?.(interaction) }
  catch (e) {
    console.error(e)
    await interaction.editReply(`❌ Error: ${e.message}`)
  }
})

const commandHandlers = {
  async help(i) { await i.reply({ embeds: [embedHelp()], flags: MessageFlags.Ephemeral }) },
  async portfolio(i) {
    const address = i.options.getString('address') || DEFAULT_WALLET
    await i.deferReply()
    const snap = await getPortfolioSnapshot(address)
    await i.editReply({ embeds: [embedPortfolio(snap)] })
  },
  async run(i) {
    const address = i.options.getString('address') || DEFAULT_WALLET
    await i.deferReply()
    const result = await runPipeline(address)
    await i.editReply({ embeds: [embedPipelineResult(result)] })
  },
  async swap(i) {
    await i.deferReply()
    const chain = i.options.getString('chain').toLowerCase()
    const amount = i.options.getString('amount')
    const from = i.options.getString('from').toUpperCase()
    const to = i.options.getString('to').toUpperCase()
    await i.editReply(`⚡ **Executing swap via Zerion...**`)
    const result = await executeSwap({ fromToken: from, toToken: to, amount, chain })
    const explorer = `https://basescan.org/tx/${result.txHash}`
    const embed = new EmbedBuilder()
      .setColor(COLORS.green)
      .setTitle('✅ Swap Transaction Sent')
      .setDescription(`Successfully swap via Zerion (Routed via LI.FI)`)
      .addFields(
        { name: 'Route', value: `**${from}** ➡️ **${to}** on **${chain.toUpperCase()}**` },
        { name: 'Transaction Hash', value: `[\`${result.txHash.slice(0, 16)}…\`](${explorer})` }
      )
      .setFooter({ text: 'Powered by Zerion & OmnisysX' })
    await i.editReply({ embeds: [embed] })
  },
  async bridge(i) {
    await i.deferReply()
    const amount = i.options.getString('amount')
    const fromChain = i.options.getString('from_chain').toLowerCase()
    const toChain = i.options.getString('to_chain').toLowerCase()
    const fromToken = i.options.getString('from_token').toUpperCase()
    const toToken = i.options.getString('to_token').toUpperCase()
    await i.editReply(`🌉 **Requesting bridge via Zerion API...**`)
    const result = await executeBridge({ fromToken, toToken, amount, fromChain, toChain })
    const explorer = `https://basescan.org/tx/${result.txHash}`
    const embed = new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle('✅ Bridge Transaction Sent')
      .setDescription(`Successfully routed via Zerion (LI.FI)`)
      .addFields(
        { name: 'Route', value: `**${fromChain.toUpperCase()}** ➡️ **${toChain.toUpperCase()}**` },
        { name: 'Transaction Hash', value: `[\`${result.txHash.slice(0, 16)}…\`](${explorer})` }
      )
      .setFooter({ text: 'Powered by Zerion & OmnisysX' })
    await i.editReply({ embeds: [embed] })
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.mentions.has(client.user)) return
  const question = message.content.replace(/<@!?\d+>/g, '').trim()
  if (!question) return message.channel.send('🧠 Ask me anything!')
  const swapMatch = question.match(/swap\s+([\d.]+)\s+(\w+)\s+(?:to|→|->|for)\s+(\w+)(?:\s+(?:on|chain)\s+(\w+))?/i)
  if (swapMatch) {
    let [, amount, fromToken, toToken, chain] = swapMatch
    chain = chain || 'base'
    await message.channel.send(`⚡ **Executing swap via Zerion API...**`)
    const result = await executeSwap({ fromToken, toToken, amount, chain })
    await message.channel.send(`✅ **Swap Transaction Sent!**\nTx: \`${result.txHash}\``)
    return
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: ORCHESTRATOR_PROMPT }, { role: 'user', content: question }] })
  })
  const data = await res.json()
  await message.channel.send(data.choices?.[0]?.message?.content || 'No response.')
})

; (async () => {
  await initAgentWallet()
  await registerCommands()
  await client.login(DISCORD_TOKEN)
})()
