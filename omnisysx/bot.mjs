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

import { Client, GatewayIntentBits, EmbedBuilder, REST, Routes,
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
const ALERT_CHANNEL_ID  = process.env.ALERT_CHANNEL_ID
const POLL_INTERVAL_MS  = parseInt(process.env.POLL_INTERVAL_MS || '300000')
const DEFAULT_WALLET    = process.env.AGENT_WALLET_ADDRESS
const MIN_ETH_GAS       = parseFloat(process.env.MIN_ETH_GAS_RESERVE || '0.002')
const DRY_RUN           = process.env.EXECUTOR_DRY_RUN !== 'false'
const STATE_FILE        = './bot-state.json'

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('FATAL: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set in .env')
  process.exit(1)
}

// ============================================================
// COLORS & ICONS (Zerion palette)
// ============================================================

const COLORS = { blue: 0x2962ef, green: 0x10b981, amber: 0xf59e0b, red: 0xef4444, muted: 0x8a8f99 }
const ICONS  = {
  observer: '🔭', planner: '🧠', auditor: '🛡️', executor: '⚡',
  verify:   '✅', alert:   '🚨', ok:      '✓',  fail:    '✗',
}

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
// ZERION CLI HELPERS
// ============================================================

async function zerionCli(args) {
  try {
    const { stdout } = await exec('zerion', args, { env: process.env, maxBuffer: 10 * 1024 * 1024 })
    return JSON.parse(stdout)
  } catch (e) {
    throw new Error(`zerion ${args[0]} failed: ${e.stderr || e.message}`)
  }
}

async function getPortfolioSnapshot(address) {
  const data = await zerionCli(['analyze', address, '--json'])
  const positions = data.positions || []
  const ethPos = positions.find(p => p.symbol === 'ETH' && (p.chain === 'ethereum' || p.chain === 'base'))
  const ethBalance = ethPos?.quantity ?? 0
  const totalUsd = data.portfolio?.totals?.positions ?? 0
  const change24h = data.portfolio?.changes?.percent_1d ?? 0
  const gasStatus = ethBalance < MIN_ETH_GAS ? 'CRITICAL' : ethBalance < MIN_ETH_GAS * 2 ? 'WARNING' : 'SAFE'
  const topPositions = positions.filter(p => p.value).sort((a, b) => b.value - a.value).slice(0, 5)
  return { address, totalUsd, change24h, ethBalance, gasStatus, topPositions }
}

async function getActivePolicy() {
  try {
    const { policies = [] } = await zerionCli(['agent', 'list-policies', '--json'])
    if (!policies.length) return null
    return await zerionCli(['agent', 'show-policy', policies[0].name, '--json'])
  } catch { return null }
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

  let color = COLORS.green, title = `${ICONS.verify} Pipeline Complete`, statusText = '✓ Executed successfully'
  if (status === 'REJECTED')     { color = COLORS.red;   title = `${ICONS.fail} Pipeline Halted`; statusText = '🚫 Auditor rejected the action' }
  else if (status === 'ALERT_ONLY')   { color = COLORS.muted; title = `${ICONS.observer} No Action Required`; statusText = 'ℹ️ Conditions are stable' }
  else if (status === 'NEEDS_REVIEW') { color = COLORS.amber; title = `⚠️ Human Approval Needed`; statusText = '👤 Risk threshold exceeded' }

  const stages = [
    `${ICONS.observer} **Observer** — $${report.totalUsd.toFixed(2)} · gas ${report.gasStatus}`,
    tis ? `${ICONS.planner} **TaskManager** — ${tis.intentType} (${(tis.confidence * 100).toFixed(0)}% conf)` : null,
    pdr ? `${ICONS.auditor} **Auditor** — ${pdr.decision} · risk ${pdr.riskScore}/100` : null,
    execResult ? `${ICONS.executor} **Executor** — ${DRY_RUN ? '🟡 DRY_RUN' : `tx \`${(execResult.txHash || '?').slice(0, 16)}…\``}` : null,
  ].filter(Boolean).join('\n')

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(statusText)
    .addFields({ name: '🔄 Pipeline', value: stages, inline: false })
    .setTimestamp()

  if (tis?.rationale) embed.addFields({ name: '💭 Rationale',    value: tis.rationale, inline: false })
  if (pdr?.notes)     embed.addFields({ name: '🛡️ Auditor notes', value: pdr.notes,    inline: false })

  if (execResult?.txHash && !DRY_RUN) {
    const explorer = tis?.action?.chain === 'base'
      ? `https://basescan.org/tx/${execResult.txHash}`
      : `https://etherscan.io/tx/${execResult.txHash}`
    embed.addFields({ name: '🔗 Transaction', value: `[View on explorer](${explorer})`, inline: false })
  }
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
    )
    .setFooter({ text: `Mode: ${DRY_RUN ? 'DRY_RUN (safe)' : 'LIVE'} · Model: Haiku 4.5` })
}

// ============================================================
// SLASH COMMAND DEFINITIONS
// ============================================================

const commandDefs = [
  new SlashCommandBuilder().setName('portfolio').setDescription('Show portfolio snapshot of a wallet')
    .addStringOption(o => o.setName('address').setDescription('Wallet address (0x... or ENS)').setRequired(false)),
  new SlashCommandBuilder().setName('run').setDescription('Trigger the full pipeline (Observe → Plan → Audit → Execute)')
    .addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(false)),
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  console.log(`\n✓ ${client.user.tag} online in ${client.guilds.cache.size} server(s)`)
  console.log(`  Mode:    ${DRY_RUN ? 'DRY_RUN (safe)' : '🔴 LIVE'}`)
  console.log(`  Default: ${DEFAULT_WALLET || '(none)'}`)
  if (ALERT_CHANNEL_ID) {
    console.log(`  Alerts:  every ${POLL_INTERVAL_MS / 1000}s → channel ${ALERT_CHANNEL_ID}`)
    startPollingLoop()
  }
})

client.on('interactionCreate', async (interaction) => {
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
