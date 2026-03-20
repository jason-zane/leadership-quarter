#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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

function parseArgs(argv) {
  const args = {
    env: 'staging',
    outDir: 'tools/db/reports',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--env') args.env = argv[i + 1] || args.env
    if (arg === '--out-dir') args.outDir = argv[i + 1] || args.outDir
  }

  return args
}

function getEnv(name) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : null
}

function hasStructuredContent(value) {
  if (!value) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return false
}

function normalizeCampaign(value) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function isAuditTarget(assessment, linkedCampaignCount) {
  if (assessment.is_public) return true
  if (linkedCampaignCount > 0) return true
  return ['active', 'published', 'live'].includes(String(assessment.status || '').toLowerCase())
}

function isActiveCampaignStatus(status) {
  return ['active', 'published', 'live'].includes(String(status || '').toLowerCase())
}

function shouldSkipCodeScan(relPath) {
  return (
    relPath.startsWith('__tests__/')
    || relPath.startsWith('tools/db/')
    || relPath === 'utils/services/assessment-definition.ts'
    || relPath === 'utils/services/admin-assessment-question-bank.ts'
    || relPath === 'utils/services/admin-assessment-scoring.ts'
    || relPath === 'utils/services/admin-assessment-psychometrics.ts'
    || relPath === 'utils/services/admin-assessment-reports.ts'
    || relPath === 'utils/services/admin-assessment-report-template.ts'
  )
}

async function walkFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    const relPath = path.relative(rootDir, fullPath)

    if (entry.isDirectory()) {
      if (
        relPath.startsWith('node_modules')
        || relPath.startsWith('.next')
        || relPath.startsWith('supabase/migrations')
        || relPath.startsWith('tools/db/reports')
        || relPath.startsWith('app/dashboard/assessments-v2')
        || relPath.startsWith('app/api/admin/assessments/[id]/v2')
      ) {
        continue
      }
      files.push(...await walkFiles(rootDir, fullPath))
      continue
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(entry.name)) continue
    files.push(relPath)
  }

  return files
}

async function scanCodebase(rootDir) {
  const forbiddenPatterns = [
    { label: 'legacy report token', pattern: /assessment_v2/g },
    { label: 'legacy report route', pattern: /assessment-v2/g },
    { label: 'legacy engine toggle', pattern: /engine=v2/g },
  ]

  const files = await walkFiles(rootDir)
  const findings = []

  for (const relPath of files) {
    if (shouldSkipCodeScan(relPath)) continue
    const fullPath = path.join(rootDir, relPath)
    const content = await fs.readFile(fullPath, 'utf8')
    for (const rule of forbiddenPatterns) {
      if (!rule.pattern.test(content)) continue
      findings.push({ file: relPath, issue: rule.label })
      rule.pattern.lastIndex = 0
    }
  }

  return findings
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = process.cwd()

  loadEnvFile(path.join(repoRoot, '.env.local'))
  loadEnvFile(path.join(repoRoot, '.env'))

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required for the assessment cutover audit.')
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const [{ data: assessments, error: assessmentsError }, { data: links, error: linksError }, { data: reports, error: reportsError }] =
    await Promise.all([
      client
        .from('assessments')
        .select('id, key, name, external_name, status, is_public, v2_question_bank, v2_scoring_config, v2_psychometrics_config'),
      client
        .from('campaign_assessments')
        .select('assessment_id, campaign_id, campaigns(name, slug, status)'),
      client
        .from('v2_assessment_reports')
        .select('assessment_id, report_kind, status'),
    ])

  if (assessmentsError) throw new Error(`assessments: ${assessmentsError.message}`)
  if (linksError) throw new Error(`campaign_assessments: ${linksError.message}`)
  if (reportsError) throw new Error(`v2_assessment_reports: ${reportsError.message}`)

  const linkedCampaignsByAssessment = new Map()
  for (const row of links ?? []) {
    const items = linkedCampaignsByAssessment.get(row.assessment_id) ?? []
    const campaign = normalizeCampaign(row.campaigns)
    items.push({
      campaignId: row.campaign_id,
      name: campaign?.name ?? 'Unknown campaign',
      slug: campaign?.slug ?? null,
      status: campaign?.status ?? null,
    })
    linkedCampaignsByAssessment.set(row.assessment_id, items)
  }

  const publishedAudienceCountByAssessment = new Map()
  for (const row of reports ?? []) {
    if (row.report_kind !== 'audience' || row.status !== 'published') continue
    publishedAudienceCountByAssessment.set(
      row.assessment_id,
      (publishedAudienceCountByAssessment.get(row.assessment_id) ?? 0) + 1
    )
  }

  const targets = (assessments ?? []).filter((assessment) =>
    isAuditTarget(assessment, (linkedCampaignsByAssessment.get(assessment.id) ?? []).length)
  )
  const targetIds = targets.map((assessment) => assessment.id)

  const { data: submissions, error: submissionsError } = targetIds.length
    ? await client
      .from('assessment_submissions')
      .select('id, assessment_id, v2_runtime_metadata, v2_submission_result, v2_report_context')
      .in('assessment_id', targetIds)
    : { data: [], error: null }

  if (submissionsError) throw new Error(`assessment_submissions: ${submissionsError.message}`)

  const submissionArtifactIssues = []
  for (const row of submissions ?? []) {
    const missing = []
    if (!row.v2_runtime_metadata) missing.push('v2_runtime_metadata')
    if (!row.v2_submission_result) missing.push('v2_submission_result')
    if (!row.v2_report_context) missing.push('v2_report_context')
    if (missing.length === 0) continue
    submissionArtifactIssues.push({
      assessmentId: row.assessment_id,
      submissionId: row.id,
      missing,
    })
  }

  const readinessIssues = targets
    .map((assessment) => {
      const issues = []
      if (!hasStructuredContent(assessment.v2_question_bank)) issues.push('missing_question_bank')
      if (!hasStructuredContent(assessment.v2_scoring_config)) issues.push('missing_scoring_config')
      if ((publishedAudienceCountByAssessment.get(assessment.id) ?? 0) < 1) issues.push('missing_published_audience_report')
      if (issues.length === 0) return null
      return {
        assessmentId: assessment.id,
        key: assessment.key,
        name: assessment.external_name || assessment.name,
        status: assessment.status,
        isPublic: assessment.is_public,
        issues,
      }
    })
    .filter(Boolean)

  const blockedAssessmentIds = new Set(readinessIssues.map((item) => item.assessmentId))
  const linkedCampaignIssues = targets
    .filter((assessment) => blockedAssessmentIds.has(assessment.id))
    .flatMap((assessment) =>
      (linkedCampaignsByAssessment.get(assessment.id) ?? [])
        .filter((campaign) => isActiveCampaignStatus(campaign.status))
        .map((campaign) => ({
        assessmentId: assessment.id,
        assessmentKey: assessment.key,
        campaignId: campaign.campaignId,
        campaignName: campaign.name,
        campaignSlug: campaign.slug,
        campaignStatus: campaign.status,
      }))
    )

  const codeScanIssues = await scanCodebase(repoRoot)

  const report = {
    env: args.env,
    generatedAt: new Date().toISOString(),
    summary: {
      auditedAssessments: targets.length,
      readinessIssueCount: readinessIssues.length,
      linkedCampaignIssueCount: linkedCampaignIssues.length,
      submissionArtifactIssueCount: submissionArtifactIssues.length,
      codeScanIssueCount: codeScanIssues.length,
      pass:
        readinessIssues.length === 0
        && linkedCampaignIssues.length === 0
        && submissionArtifactIssues.length === 0
        && codeScanIssues.length === 0,
    },
    readinessIssues,
    linkedCampaignIssues,
    submissionArtifactIssues,
    codeScanIssues,
  }

  await fs.mkdir(path.join(repoRoot, args.outDir), { recursive: true })
  const reportPath = path.join(
    repoRoot,
    args.outDir,
    `assessment-cutover-audit-${args.env}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  )
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ ...report.summary, reportPath: path.relative(repoRoot, reportPath) }, null, 2))

  if (!report.summary.pass) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
