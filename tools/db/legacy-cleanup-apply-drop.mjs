#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const args = {
    report: null,
    execute: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--report') args.report = argv[i + 1] || null
    if (arg === '--execute') args.execute = true
  }

  return args
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.report) {
    throw new Error('Missing --report path')
  }

  const absolute = path.resolve(args.report)
  const raw = await fs.readFile(absolute, 'utf8')
  const parsed = JSON.parse(raw)

  const expectedSignature = sha256(
    JSON.stringify(
      {
        generatedAt: parsed.generatedAt,
        environment: parsed.environment,
        observationDays: parsed.observationDays,
        legacyTables: parsed.legacyTables,
        legacySubmissionForms: parsed.legacySubmissionForms,
        legacySubmissionSources: parsed.legacySubmissionSources,
        recentLegacySubmissions: parsed.recentLegacySubmissions,
        pendingLegacyFieldReviews: parsed.pendingLegacyFieldReviews,
        legacyContactColumnCounts: parsed.legacyContactColumnCounts,
        missingLegacyContactColumns: parsed.missingLegacyContactColumns,
        dependencyChecksSql: parsed.dependencyChecksSql,
        usageChecksSql: parsed.usageChecksSql,
        status: parsed.status,
        failures: parsed.failures,
        metrics: parsed.metrics,
      },
      null,
      2
    )
  )

  if (parsed.signature !== expectedSignature) {
    throw new Error('Report signature mismatch; report may have been modified')
  }

  if (parsed.status !== 'PASS') {
    throw new Error('Preflight report status is not PASS')
  }

  const approval = process.env.LEGACY_CLEANUP_APPROVAL?.trim()
  if (approval !== 'I_UNDERSTAND_DROP') {
    throw new Error('Missing LEGACY_CLEANUP_APPROVAL=I_UNDERSTAND_DROP')
  }

  console.log('Pre-drop gate checks passed.')
  console.log(`Report: ${absolute}`)
  console.log('Target migration: 20260304133000_archive_and_drop_legacy_commerce_and_retreat_schema.sql')

  if (!args.execute) {
    console.log('Dry run only. Re-run with --execute to apply migrations via `npm run db:push`.')
    return
  }

  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'db:push'], { stdio: 'inherit', shell: true })
    child.on('exit', (code) => {
      if (code === 0) resolve(null)
      else reject(new Error(`db:push failed with exit code ${code}`))
    })
  })
}

main().catch((error) => {
  console.error(`legacy-cleanup-apply-drop failed: ${error.message}`)
  process.exit(1)
})
