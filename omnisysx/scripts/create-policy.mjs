#!/usr/bin/env node
/**
 * OmnisysX — Policy Setup Script
 * ----------------------------------------------------------
 * Creates a scoped security policy for the OmnisysX agent.
 *
 * Policy: "omnisysx-safe"
 *   - Chain-locked to Base (cheapest gas for hackathon demo)
 *   - Blocks raw ETH transfers (only DEX swaps allowed)
 *   - Blocks ERC-20 approvals (prevents approval exploits)
 *   - Expires in 7 days (time-bounded access)
 *
 * Usage:
 *   node scripts/create-policy.mjs
 *
 * Or via CLI directly:
 *   zerion agent create-policy --name omnisysx-safe \
 *     --chains base \
 *     --expires 7d \
 *     --deny-transfers \
 *     --deny-approvals
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)

const c = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m', red: '\x1b[31m', dim: '\x1b[2m' }

async function zerionCli(args) {
  try {
    const { stdout } = await exec('zerion', args, { env: process.env, maxBuffer: 10 * 1024 * 1024 })
    try { return JSON.parse(stdout) } catch { return { raw: stdout } }
  } catch (e) {
    throw new Error(`zerion ${args[0]} failed: ${e.stderr || e.message}`)
  }
}

async function main() {
  console.log(`\n${c.cyan}═══ OmnisysX Policy Setup ═══${c.reset}\n`)

  // Step 1: Check existing policies
  console.log(`${c.dim}Checking existing policies...${c.reset}`)
  try {
    const existing = await zerionCli(['agent', 'list-policies', '--json'])
    const policies = existing.policies || []
    if (policies.length > 0) {
      console.log(`${c.yellow}  ⚠ Found ${policies.length} existing policy(ies):${c.reset}`)
      policies.forEach(p => console.log(`    • ${p.name || p.id}`))
      console.log(`${c.dim}  Proceeding to create new policy...${c.reset}\n`)
    }
  } catch (e) {
    console.log(`${c.dim}  No existing policies found${c.reset}\n`)
  }

  // Step 2: Create the OmnisysX scoped policy
  console.log(`${c.cyan}Creating policy: omnisysx-safe${c.reset}`)
  console.log(`${c.dim}  Chain:           base (locked)${c.reset}`)
  console.log(`${c.dim}  Expires:         7 days${c.reset}`)
  console.log(`${c.dim}  Deny transfers:  ✓ (blocks raw ETH sends)${c.reset}`)
  console.log(`${c.dim}  Deny approvals:  ✓ (blocks ERC-20 approvals)${c.reset}`)
  console.log()

  try {
    const result = await zerionCli([
      'agent', 'create-policy',
      '--name', 'omnisysx-safe',
      '--chains', 'base',
      '--expires', '7d',
      '--deny-transfers',
      '--deny-approvals',
      '--json',
    ])

    console.log(`${c.green}  ✓ Policy "omnisysx-safe" created successfully!${c.reset}`)
    if (result.id)   console.log(`${c.dim}    ID: ${result.id}${c.reset}`)
    if (result.name) console.log(`${c.dim}    Name: ${result.name}${c.reset}`)

  } catch (e) {
    console.error(`${c.red}  ✗ Failed to create policy: ${e.message}${c.reset}`)
    console.log(`\n${c.yellow}  Try running manually:${c.reset}`)
    console.log(`  zerion agent create-policy --name omnisysx-safe --chains base --expires 7d --deny-transfers --deny-approvals`)
    process.exit(1)
  }

  // Step 3: Verify
  console.log(`\n${c.dim}Verifying...${c.reset}`)
  try {
    const verified = await zerionCli(['agent', 'show-policy', 'omnisysx-safe', '--json'])
    console.log(`${c.green}  ✓ Policy verified:${c.reset}`)
    console.log(`${c.dim}    ${JSON.stringify(verified, null, 2).split('\n').join('\n    ')}${c.reset}`)
  } catch {
    console.log(`${c.dim}  (could not verify — policy may still be propagating)${c.reset}`)
  }

  console.log(`\n${c.green}═══ Policy Setup Complete ═══${c.reset}`)
  console.log(`\nTest in Discord: /policy`)
  console.log(`The bot will show the active policy via the ${c.cyan}Zerion CLI${c.reset}.\n`)
}

main().catch(e => {
  console.error(`${c.red}FATAL: ${e.message}${c.reset}`)
  process.exit(1)
})
