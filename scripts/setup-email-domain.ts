#!/usr/bin/env npx tsx
/**
 * Email domain setup automation.
 *
 * Usage:
 *   npx tsx scripts/setup-email-domain.ts --check   # read-only status check
 *   npx tsx scripts/setup-email-domain.ts --setup   # interactive setup (Resend + manual DNS instructions)
 *
 * Requires:
 *   RESEND_API_KEY        (already in .env.local)
 */

import * as readline from 'readline'
import { loadEnvConfig } from '@next/env'

// Load .env.local (same way Next.js does it)
loadEnvConfig(process.cwd())

import {
  normalizeRecordName,
} from '../utils/services/godaddy-dns'

import {
  findDomainByName,
  createDomain,
  verifyDomain,
  pollVerification,
  type ResendDomain,
  type ResendDnsRecord,
} from '../utils/services/resend-domains'

// ── Constants ──────────────────────────────────────────────────────────

const ROOT_DOMAIN = 'leadershipquarter.com'
const MAIL_SUBDOMAIN = `mail.${ROOT_DOMAIN}`

// ── Helpers ────────────────────────────────────────────────────────────

const autoYes = process.argv.includes('--yes')
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function ask(question: string): Promise<string> {
  if (autoYes) {
    console.log(question)
    return Promise.resolve('')
  }
  return new Promise((resolve) => rl.question(question, resolve))
}

async function confirm(question: string): Promise<boolean> {
  if (autoYes) {
    console.log(`${question} (y/n): y [--yes]`)
    return true
  }
  const answer = await ask(`${question} (y/n): `)
  return answer.trim().toLowerCase() === 'y'
}

function heading(text: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${text}`)
  console.log('='.repeat(60))
}

function subheading(text: string) {
  console.log(`\n--- ${text} ---`)
}

function printDnsTable(records: ResendDnsRecord[]) {
  // Header
  console.log('')
  console.log(`  ${'Type'.padEnd(8)} ${'Name'.padEnd(50)} Value`)
  console.log(`  ${'─'.repeat(8)} ${'─'.repeat(50)} ${'─'.repeat(50)}`)
  for (const r of records) {
    const name = normalizeRecordName(r.name, ROOT_DOMAIN)
    console.log(`  ${r.type.padEnd(8)} ${name.padEnd(50)} ${r.value}`)
  }
  console.log('')
}

// ── Check mode ─────────────────────────────────────────────────────────

async function runCheck() {
  heading('Email Domain Status Check')

  subheading(`Resend: ${MAIL_SUBDOMAIN}`)
  try {
    const domain = await findDomainByName(MAIL_SUBDOMAIN)
    if (domain) {
      console.log(`  Domain ID: ${domain.id}`)
      console.log(`  Status:    ${domain.status}`)
      if (domain.records.length > 0) {
        console.log('\n  DNS records Resend expects:')
        console.log(`  ${'Type'.padEnd(8)} ${'Record'.padEnd(10)} ${'Name'.padEnd(50)} ${'Status'.padEnd(14)} Value`)
        console.log(`  ${'─'.repeat(8)} ${'─'.repeat(10)} ${'─'.repeat(50)} ${'─'.repeat(14)} ${'─'.repeat(40)}`)
        for (const r of domain.records) {
          const name = normalizeRecordName(r.name, ROOT_DOMAIN)
          const statusTag = r.status === 'verified' ? '[ok]' : `[${r.status}]`
          console.log(`  ${r.type.padEnd(8)} ${r.record.padEnd(10)} ${name.padEnd(50)} ${statusTag.padEnd(14)} ${r.value.slice(0, 60)}${r.value.length > 60 ? '...' : ''}`)
        }

        const pending = domain.records.filter((r) => r.status !== 'verified')
        if (pending.length > 0) {
          console.log(`\n  ${pending.length} record(s) not yet verified.`)
          console.log('  Add the records above in GoDaddy DNS, then run --setup to trigger verification.')
        } else {
          console.log('\n  All records verified.')
        }
      }
    } else {
      console.log('  Not found in Resend. Run --setup to create it.')
    }
  } catch (e) {
    console.log(`  Error: ${e instanceof Error ? e.message : e}`)
  }

  console.log('')
}

// ── Setup mode ─────────────────────────────────────────────────────────

async function runSetup() {
  heading('Email Domain Setup')
  console.log(`\nThis will set up ${MAIL_SUBDOMAIN} as a dedicated sending domain.`)
  console.log('Resend operations are automated; DNS records must be added manually in GoDaddy.\n')

  // Step 1: Create domain in Resend (or find existing)
  subheading('Step 1: Create sending domain in Resend')
  let domain: ResendDomain | null = null

  try {
    domain = await findDomainByName(MAIL_SUBDOMAIN)
  } catch (e) {
    console.log(`  Error checking Resend: ${e instanceof Error ? e.message : e}`)
    return
  }

  if (domain) {
    console.log(`  Domain already exists in Resend (ID: ${domain.id}, status: ${domain.status})`)
  } else {
    console.log(`  Domain ${MAIL_SUBDOMAIN} not found in Resend.`)
    if (!(await confirm('  Create it now?'))) {
      console.log('  Aborted.')
      return
    }
    try {
      domain = await createDomain(MAIL_SUBDOMAIN)
      console.log(`  Created! ID: ${domain.id}, status: ${domain.status}`)
    } catch (e) {
      console.log(`  Error: ${e instanceof Error ? e.message : e}`)
      return
    }
  }

  if (domain.records.length === 0) {
    console.log('  No DNS records returned by Resend. Check the Resend dashboard.')
    return
  }

  // Step 2: Print DNS records to add manually
  subheading('Step 2: Add these DNS records in GoDaddy')
  console.log('  Go to: GoDaddy > My Products > DNS > leadershipquarter.com')
  console.log('  Add each record below. Use the "Name" column as the Host field.\n')

  // Group by purpose for clarity
  const spfRecords = domain.records.filter((r) => r.record === 'SPF')
  const dkimRecords = domain.records.filter((r) => r.record === 'DKIM' || r.record === 'DKIM2')
  const mxRecords = domain.records.filter((r) => r.type === 'MX')
  const otherRecords = domain.records.filter(
    (r) => !['SPF', 'DKIM', 'DKIM2'].includes(r.record) && r.type !== 'MX'
  )

  if (spfRecords.length > 0) {
    console.log('  -- SPF (proves Resend is allowed to send from this subdomain) --')
    printDnsTable(spfRecords)
  }

  if (dkimRecords.length > 0) {
    console.log('  -- DKIM (cryptographic signature for email authenticity) --')
    printDnsTable(dkimRecords)
  }

  if (mxRecords.length > 0) {
    console.log('  -- MX (receive bounce notifications) --')
    for (const r of mxRecords) {
      const name = normalizeRecordName(r.name, ROOT_DOMAIN)
      console.log(`  Type: MX    Name: ${name}    Value: ${r.value}    Priority: ${r.priority ?? 10}`)
    }
    console.log('')
  }

  if (otherRecords.length > 0) {
    console.log('  -- Other --')
    printDnsTable(otherRecords)
  }

  // Step 3: Wait for user to add records
  console.log('  After adding all records above in GoDaddy, press enter to continue.')
  console.log('  (DNS propagation can take minutes to hours, but often works immediately.)')
  await ask('\n  Press Enter when records are added...')

  // Step 4: Trigger verification
  subheading('Step 3: Verify domain in Resend')
  if (domain.status === 'verified') {
    console.log('  Domain is already verified!')
  } else {
    console.log('  Triggering verification...')
    try {
      await verifyDomain(domain.id)
      console.log('  Verification triggered. Polling for ~2 minutes...\n')
      const result = await pollVerification(domain.id, 12, 10_000)
      if (result?.status === 'verified') {
        console.log('\n  Domain verified successfully!')
      } else {
        console.log(`\n  Current status: ${result?.status ?? 'unknown'}`)
        console.log('  DNS propagation may still be in progress.')
        console.log('  Run "npm run email:domain:check" later to see the current status.')
        console.log('  You can also re-run "npm run email:domain:setup" to retry verification.')
      }
    } catch (e) {
      console.log(`  Error: ${e instanceof Error ? e.message : e}`)
    }
  }

  // Step 5: DMARC + SPF cleanup instructions
  subheading('Step 4: Manual DNS cleanup (do after verification)')
  console.log(`
  Once ${MAIL_SUBDOMAIN} is verified, make these additional changes in GoDaddy DNS:

  a) ROOT SPF CLEANUP
     Edit the existing TXT record for @ (root domain) that contains "v=spf1".
     Remove any "include:resend.com" or similar Resend entry.
     Keep the Google Workspace include (e.g. include:_spf.google.com).
     Resend now sends from the mail subdomain, not the root domain.

  b) ADD DMARC RECORD (if not already present)
     Type:  TXT
     Name:  _dmarc
     Value: v=DMARC1; p=none; rua=mailto:dmarc@leadershipquarter.com; fo=1
     TTL:   3600

     Start with p=none (monitor only). After a few days of clean sending,
     tighten to p=quarantine, then eventually p=reject to enable BIMI.
`)

  // Step 6: Summary
  heading('Setup Complete')
  console.log(`
  Next steps:

  1. If verification is still pending, wait for DNS propagation and run:
     npm run email:domain:check

  2. Once verified, update these env vars in .env.local and Vercel:

     RESEND_FROM_EMAIL=notifications@${MAIL_SUBDOMAIN}
     RESEND_FROM_ASSESSMENTS=assessments@${MAIL_SUBDOMAIN}
     RESEND_FROM_REPORTS=reports@${MAIL_SUBDOMAIN}
     RESEND_REPLY_TO=support@${ROOT_DOMAIN}

  3. Send a test email from the dashboard and confirm it arrives (not in spam).

  4. After a few days of clean sending, tighten DMARC:
     Change p=none to p=quarantine, then eventually p=reject.
`)
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0]

  if (mode === '--check') {
    await runCheck()
  } else if (mode === '--setup') {
    await runSetup()
  } else {
    console.log('Usage:')
    console.log('  npx tsx scripts/setup-email-domain.ts --check   # read-only status check')
    console.log('  npx tsx scripts/setup-email-domain.ts --setup   # interactive setup')
    console.log('')
    console.log('Required env vars:')
    console.log('  RESEND_API_KEY       (already in .env.local)')
  }

  rl.close()
}

main().catch((e) => {
  console.error('Fatal error:', e)
  rl.close()
  process.exit(1)
})
