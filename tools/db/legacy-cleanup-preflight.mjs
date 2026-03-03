#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const raw = readFileSync(filePath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function getEnv(name) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : null
}

function toInt(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseArgs(argv) {
  const args = {
    env: 'staging',
    days: 7,
    outDir: 'tools/db/reports',
    failOnWrites: true,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--env') args.env = argv[i + 1] || args.env
    if (arg === '--days') args.days = Number(argv[i + 1] || args.days)
    if (arg === '--out-dir') args.outDir = argv[i + 1] || args.outDir
    if (arg === '--allow-writes') args.failOnWrites = false
  }

  return args
}

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

async function countRows(client, table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return { rowCount: null, missing: true }
    }
    throw new Error(`${table}: ${error.message}`)
  }
  return { rowCount: count ?? 0, missing: false }
}

async function countRecentRows(client, table, days) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const timestampColumn = table === 'contact_identities' ? 'created_at' : 'updated_at'

  let query = client.from(table).select('*', { count: 'exact', head: true })

  if (timestampColumn === 'updated_at') {
    query = query.gte('updated_at', sinceIso)
  } else {
    query = query.gte('created_at', sinceIso)
  }

  const { count, error } = await query
  if (error) {
    if (error.message.toLowerCase().includes('does not exist')) {
      return { writesLastNDays: null, missing: true }
    }
    throw new Error(`${table} recent rows: ${error.message}`)
  }
  return { writesLastNDays: count ?? 0, missing: false }
}

async function countLegacySubmissions(client, days) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const legacyFormKeys = [
    'register_interest',
    'retreat_registration_v1',
    'general_registration_v1',
    'retreat_profile_optional_v1',
  ]

  const { data, error } = await client
    .from('interest_submissions')
    .select('id, form_key, source, created_at')
    .in('form_key', legacyFormKeys)

  if (error) throw new Error(`legacy submissions: ${error.message}`)

  const rows = data ?? []
  const byFormKey = {}
  const bySource = {}
  const recentRows = []
  for (const key of legacyFormKeys) {
    byFormKey[key] = { total: 0, lastNDays: 0 }
  }

  for (const row of rows) {
    const key = row.form_key
    if (!byFormKey[key]) continue
    byFormKey[key].total += 1
    const sourceKey = row.source || '(null)'
    if (!bySource[sourceKey]) bySource[sourceKey] = { total: 0, lastNDays: 0 }
    bySource[sourceKey].total += 1
    if (new Date(row.created_at).toISOString() >= sinceIso) {
      byFormKey[key].lastNDays += 1
      bySource[sourceKey].lastNDays += 1
      recentRows.push({
        id: row.id,
        form_key: row.form_key,
        source: row.source,
        created_at: row.created_at,
      })
    }
  }

  recentRows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  return { byFormKey, bySource, recentRows: recentRows.slice(0, 25) }
}

async function countPendingLegacyFieldReviews(client) {
  const fields = [
    'weekly_distance_km',
    'long_run_km',
    'pace_group',
    'dietary_requirements',
    'injury_notes',
    'retreat_goals',
    'preferred_retreat_timing',
    'city',
    'phone',
  ]

  const { data, error } = await client
    .from('submission_field_reviews')
    .select('field_key, decision')
    .in('field_key', fields)

  if (error) throw new Error(`legacy field reviews: ${error.message}`)

  const rows = data ?? []
  const summary = {}
  for (const field of fields) summary[field] = { pending: 0, approved: 0, rejected: 0 }

  for (const row of rows) {
    if (!summary[row.field_key]) continue
    if (row.decision === 'pending') summary[row.field_key].pending += 1
    else if (row.decision === 'approved') summary[row.field_key].approved += 1
    else if (row.decision === 'rejected') summary[row.field_key].rejected += 1
  }

  return summary
}

async function collectLegacyContactColumnCounts(client) {
  const cols = [
    'weekly_distance_km',
    'long_run_km',
    'pace_group',
    'dietary_requirements',
    'injury_notes',
    'retreat_goals',
    'preferred_retreat_timing',
    'location_city',
    'phone',
    'age_range',
    'gender',
    'gender_self_describe',
    'runner_type',
    'location_label',
    'retreat_slug',
    'retreat_name',
    'budget_range',
    'retreat_style_preference',
    'duration_preference',
    'travel_radius',
    'accommodation_preference',
    'community_vs_performance',
    'preferred_season',
    'gender_optional',
    'life_stage_optional',
    'what_would_make_it_great',
    'profile_v2_updated_at',
  ]

  const summary = {}
  const missingColumns = []
  for (const col of cols) summary[col] = 0

  const { data: sampleRow, error: sampleError } = await client.from('contacts').select('*').limit(1).maybeSingle()
  if (sampleError && !sampleError.message.toLowerCase().includes('results contain 0 rows')) {
    throw new Error(`legacy contacts columns: ${sampleError.message}`)
  }

  const existingCols = new Set(Object.keys(sampleRow ?? {}))
  for (const col of cols) {
    if (!existingCols.has(col)) {
      missingColumns.push(col)
    }
  }

  const selectableCols = cols.filter((col) => existingCols.has(col))
  if (selectableCols.length === 0) {
    return { summary, missingColumns }
  }

  const { data, error } = await client.from('contacts').select(selectableCols.join(','))
  if (error) throw new Error(`legacy contacts columns: ${error.message}`)

  for (const row of data ?? []) {
    for (const col of selectableCols) {
      const value = row[col]
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        summary[col] += 1
      }
    }
  }

  return { summary, missingColumns }
}

function evaluateReport(report, failOnWrites) {
  const recentWrites = report.legacyTables.reduce((acc, table) => acc + table.writesLastNDays, 0)
  const legacySubmissionWrites = Object.values(report.legacySubmissionForms).reduce(
    (acc, item) => acc + toInt(item.lastNDays),
    0
  )
  const pendingFieldReviews = Object.values(report.pendingLegacyFieldReviews).reduce(
    (acc, item) => acc + toInt(item.pending),
    0
  )
  const missingLegacyTables = report.legacyTables.filter((table) => table.missing).length

  const failures = []
  if (failOnWrites && recentWrites > 0) failures.push(`legacy table writes detected (${recentWrites})`)
  if (failOnWrites && legacySubmissionWrites > 0) {
    failures.push(`legacy form submissions detected in window (${legacySubmissionWrites})`)
  }
  if (pendingFieldReviews > 0) failures.push(`pending legacy field reviews detected (${pendingFieldReviews})`)

  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
    metrics: {
      recentWrites,
      legacySubmissionWrites,
      pendingFieldReviews,
      missingLegacyTables,
    },
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvFile(path.resolve('.env.local'))
  loadEnvFile(path.resolve('.env'))

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const client = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const legacyTableNames = ['offerings', 'offering_variants', 'bookings', 'payments', 'contact_identities']
  const legacyTables = []
  for (const tableName of legacyTableNames) {
    const rowResult = await countRows(client, tableName)
    const writeResult = await countRecentRows(client, tableName, args.days)
    legacyTables.push({
      tableName,
      rowCount: rowResult.rowCount,
      writesLastNDays: writeResult.writesLastNDays,
      missing: rowResult.missing || writeResult.missing,
    })
  }

  const legacySubmission = await countLegacySubmissions(client, args.days)
  const pendingLegacyFieldReviews = await countPendingLegacyFieldReviews(client)
  const legacyContact = await collectLegacyContactColumnCounts(client)

  const baseReport = {
    generatedAt: new Date().toISOString(),
    environment: args.env,
    observationDays: args.days,
    legacyTables,
    legacySubmissionForms: legacySubmission.byFormKey,
    legacySubmissionSources: legacySubmission.bySource,
    recentLegacySubmissions: legacySubmission.recentRows,
    pendingLegacyFieldReviews,
    legacyContactColumnCounts: legacyContact.summary,
    missingLegacyContactColumns: legacyContact.missingColumns,
    dependencyChecksSql: 'tools/db/sql/legacy-cleanup-dependency-check.sql',
    usageChecksSql: 'tools/db/sql/legacy-cleanup-usage-check.sql',
  }

  const evaluation = evaluateReport(baseReport, args.failOnWrites)
  const report = {
    ...baseReport,
    ...evaluation,
  }

  const canonical = JSON.stringify(report, null, 2)
  const signature = sha256(canonical)

  const finalized = {
    ...report,
    signature,
  }

  await fs.mkdir(args.outDir, { recursive: true })
  const fileName = `legacy-cleanup-preflight-${args.env}-${finalized.generatedAt.replace(/[:.]/g, '-')}.json`
  const outputPath = path.resolve(args.outDir, fileName)
  await fs.writeFile(outputPath, JSON.stringify(finalized, null, 2), 'utf8')

  console.log(`Preflight status: ${finalized.status}`)
  console.log(`Report: ${outputPath}`)
  console.log(`Signature: ${finalized.signature}`)

  if (finalized.status !== 'PASS') {
    console.log('Failures:')
    for (const failure of finalized.failures) {
      console.log(`- ${failure}`)
    }
    process.exitCode = 2
  }
}

main().catch((error) => {
  console.error(`legacy-cleanup-preflight failed: ${error.message}`)
  process.exit(1)
})
