#!/usr/bin/env node
/**
 * Sanity check: runs the Observer agent in isolation
 * to verify Zerion CLI + API key are working before
 * running the full pipeline.
 *
 * Usage:  node scripts/test-observer.mjs
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import 'dotenv/config'

const exec = promisify(execFile)
const address = process.env.AGENT_WALLET_ADDRESS

if (!address) {
  console.error('FATAL: AGENT_WALLET_ADDRESS not set in .env')
  process.exit(1)
}

console.log(`Testing Observer for ${address}...`)

try {
  const { stdout } = await exec('zerion', ['analyze', address, '--json'], {
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  })
  const data = JSON.parse(stdout)
  const total = data.portfolio?.totals?.positions ?? 0
  const positions = data.positions?.length ?? 0
  console.log(`✓ Zerion CLI works`)
  console.log(`  Portfolio: $${total.toFixed(2)}`)
  console.log(`  Positions: ${positions}`)
  console.log(`✓ Ready to run the full pipeline (npm run agent)`)
} catch (e) {
  console.error('✗ Observer test failed')
  console.error(e.stderr || e.message)
  console.error('\nCommon fixes:')
  console.error('  • Did you run `npm install -g zerion-cli`?')
  console.error('  • Did you run `zerion init` and provide your API key?')
  console.error('  • Is AGENT_WALLET_ADDRESS a valid 0x... address?')
  process.exit(1)
}
