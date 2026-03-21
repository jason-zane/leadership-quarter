import {
  createAssessmentDefinition,
  validateAssessmentDefinition,
  type AssessmentDefinition,
  type DefinitionValidation,
  type DefinitionValidationIssue,
} from '@/utils/assessments/assessment-definition-model'
import type { RuntimeReadiness, RuntimeReadinessCheck } from '@/utils/assessments/assessment-runtime-model'
import { normalizeAssessmentReportRecord } from '@/utils/reports/assessment-report-records'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type AssessmentDefinitionRow = {
  id: string
  key: string
  name: string
  description: string | null
  status: string
  version: number
  runner_config?: unknown
  report_config?: unknown
  v2_question_bank?: unknown
  v2_scoring_config?: unknown
  v2_psychometrics_config?: unknown
}

type AssessmentSelector = {
  assessmentId?: string
  assessmentKey?: string
}

export type AssessmentDefinitionBundle = {
  definition: AssessmentDefinition
  validation: DefinitionValidation
}

export type AssessmentReadiness = RuntimeReadiness & {
  issues: DefinitionValidationIssue[]
  linkedCampaignCount: number
  submissionCount: number
  publishedReportCount: number
}

function isMissingColumn(
  error: { message?: string; details?: string | null; hint?: string | null } | null | undefined,
  column: string
) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes(column) && (text.includes('column') || text.includes('schema'))
}

function getSelector(input: AssessmentSelector) {
  if (input.assessmentId) return { column: 'id', value: input.assessmentId }
  if (input.assessmentKey) return { column: 'key', value: input.assessmentKey }
  return null
}

function countIssues(
  issues: DefinitionValidationIssue[],
  predicate: (issue: DefinitionValidationIssue) => boolean
) {
  return issues.filter(predicate).length
}

function buildCheckDetail(input: {
  ready: boolean
  readyDetail: string
  blockedDetail: string
  warningCount?: number
}) {
  if (input.ready) {
    return input.warningCount && input.warningCount > 0
      ? `${input.readyDetail} (${input.warningCount} warnings)`
      : input.readyDetail
  }
  return input.blockedDetail
}

function buildReadinessChecks(input: {
  definition: AssessmentDefinition
  validation: DefinitionValidation
  linkedCampaignCount: number
  submissionCount: number
}): AssessmentReadiness {
  const { definition, validation } = input
  const questionErrors = countIssues(
    validation.issues,
    (issue) => issue.severity === 'error' && (issue.key.startsWith('question_bank_') || issue.key.startsWith('unknown_trait_'))
  )
  const scoringErrors = countIssues(
    validation.issues,
    (issue) => issue.severity === 'error' && issue.key.startsWith('scoring_')
  )
  const psychometricWarnings = countIssues(
    validation.issues,
    (issue) => issue.key.startsWith('psychometrics_')
  )
  const reportErrors = countIssues(
    validation.issues,
    (issue) => issue.severity === 'error' && issue.key.startsWith('published_report_')
  )
  const experienceWarnings = countIssues(
    validation.issues,
    (issue) => issue.key === 'runtime_disabled'
  )
  const publishedReportCount = definition.reports.filter(
    (report) => report.reportKind === 'audience' && report.status === 'published'
  ).length

  const checks: RuntimeReadinessCheck[] = [
    {
      key: 'questions',
      label: 'Questions',
      ready: questionErrors === 0 && definition.questionBank.scoredItems.length > 0,
      detail: buildCheckDetail({
        ready: questionErrors === 0 && definition.questionBank.scoredItems.length > 0,
        readyDetail: `${definition.questionBank.scoredItems.length} scored items across ${definition.questionBank.traits.length} traits`,
        blockedDetail: 'Question bank structure is incomplete or references missing traits.',
      }),
    },
    {
      key: 'scoring',
      label: 'Scoring',
      ready: scoringErrors === 0 && definition.scoringConfig.bandings.length > 0,
      detail: buildCheckDetail({
        ready: scoringErrors === 0 && definition.scoringConfig.bandings.length > 0,
        readyDetail: `${definition.scoringConfig.bandings.length} band sets configured`,
        blockedDetail: 'Scoring banding is incomplete for the V2 engine.',
      }),
    },
    {
      key: 'psychometrics',
      label: 'Psychometrics',
      ready:
        definition.psychometricsConfig.referenceGroups.length > 0
        || definition.psychometricsConfig.validationRuns.length > 0,
      detail: buildCheckDetail({
        ready:
          definition.psychometricsConfig.referenceGroups.length > 0
          || definition.psychometricsConfig.validationRuns.length > 0,
        readyDetail:
          definition.psychometricsConfig.referenceGroups.length > 0
            ? `${definition.psychometricsConfig.referenceGroups.length} reference groups configured`
            : `${definition.psychometricsConfig.validationRuns.length} validation runs saved`,
        blockedDetail: 'Reference groups or validation runs still need to be configured.',
        warningCount: psychometricWarnings,
      }),
    },
    {
      key: 'reports',
      label: 'Reports',
      ready: reportErrors === 0 && publishedReportCount > 0,
      detail: buildCheckDetail({
        ready: reportErrors === 0 && publishedReportCount > 0,
        readyDetail: `${publishedReportCount} published reports`,
        blockedDetail: 'Publish at least one V2 report before preview and cutover.',
      }),
    },
    {
      key: 'experience',
      label: 'Experience',
      ready: definition.assessment.reportConfig.v2_runtime_enabled,
      detail: buildCheckDetail({
        ready: definition.assessment.reportConfig.v2_runtime_enabled,
        readyDetail: 'V2 runtime is enabled for preview and validation',
        blockedDetail: 'Enable V2 runtime in the experience settings.',
        warningCount: experienceWarnings,
      }),
    },
    {
      key: 'campaigns',
      label: 'Campaigns',
      ready: input.linkedCampaignCount > 0,
      detail:
        input.linkedCampaignCount > 0
          ? `${input.linkedCampaignCount} campaigns linked`
          : 'No campaigns linked yet',
    },
    {
      key: 'responses',
      label: 'Responses',
      ready: input.submissionCount > 0,
      detail:
        input.submissionCount > 0
          ? `${input.submissionCount} submissions recorded`
          : 'No V2 submissions recorded yet',
    },
  ]

  return {
    checks,
    readyCount: checks.filter((check) => check.ready).length,
    totalCount: checks.length,
    canPreview: validation.previewValid,
    canCutover: validation.cutoverValid,
    issues: validation.issues,
    linkedCampaignCount: input.linkedCampaignCount,
    submissionCount: input.submissionCount,
    publishedReportCount,
  }
}

async function loadAssessmentDefinitionRow(
  adminClient: AdminClient,
  input: AssessmentSelector
): Promise<
  | {
      assessment: AssessmentDefinitionRow
      questionBank: unknown
      scoringConfig: unknown
      psychometricsConfig: unknown
    }
  | null
> {
  const selector = getSelector(input)
  if (!selector) return null

  const primary = await adminClient
    .from('assessments')
    .select(
      'id, key, name:external_name, description, status, version, runner_config, report_config, v2_question_bank, v2_scoring_config, v2_psychometrics_config'
    )
    .eq(selector.column, selector.value)
    .maybeSingle()

  if (!primary.error && primary.data) {
    const row = primary.data as AssessmentDefinitionRow
    return {
      assessment: row,
      questionBank: row.v2_question_bank ?? null,
      scoringConfig: row.v2_scoring_config ?? null,
      psychometricsConfig: row.v2_psychometrics_config ?? null,
    }
  }

  const missingColumns =
    isMissingColumn(primary.error, 'v2_question_bank')
    || isMissingColumn(primary.error, 'v2_scoring_config')
    || isMissingColumn(primary.error, 'v2_psychometrics_config')

  if (!missingColumns) {
    return null
  }

  const fallback = await adminClient
    .from('assessments')
    .select('id, key, name:external_name, description, status, version, runner_config, report_config')
    .eq(selector.column, selector.value)
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return null
  }

  const row = fallback.data as AssessmentDefinitionRow
  const reportConfig =
    row.report_config && typeof row.report_config === 'object'
      ? row.report_config as Record<string, unknown>
      : {}

  return {
    assessment: row,
    questionBank: reportConfig.v2_question_bank ?? null,
    scoringConfig: reportConfig.v2_scoring_config ?? null,
    psychometricsConfig: reportConfig.v2_psychometrics_config ?? null,
  }
}

async function loadAssessmentV2Reports(adminClient: AdminClient, assessmentId: string) {
  const { data } = await adminClient
    .from('v2_assessment_reports')
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .eq('assessment_id', assessmentId)
    .order('sort_order')

  return (data ?? []).map((report) => normalizeAssessmentReportRecord(report))
}

export async function getAssessmentDefinitionBundle(input: {
  adminClient: AdminClient
  assessmentId?: string
  assessmentKey?: string
}): Promise<{ ok: true; data: AssessmentDefinitionBundle } | { ok: false; error: 'assessment_not_found' }> {
  const record = await loadAssessmentDefinitionRow(input.adminClient, input)
  if (!record) {
    return { ok: false, error: 'assessment_not_found' }
  }

  const reports = await loadAssessmentV2Reports(input.adminClient, record.assessment.id)
  const definition = createAssessmentDefinition({
    assessment: record.assessment,
    questionBank: record.questionBank,
    scoringConfig: record.scoringConfig,
    psychometricsConfig: record.psychometricsConfig,
    reports,
  })

  return {
    ok: true,
    data: {
      definition,
      validation: validateAssessmentDefinition(definition),
    },
  }
}

export async function getAssessmentReadinessData(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<AssessmentReadiness | null> {
  const bundle = await getAssessmentDefinitionBundle({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!bundle.ok) {
    return null
  }

  const [{ count: linkedCampaignCount }, { count: submissionCount }] = await Promise.all([
    input.adminClient
      .from('campaign_assessments')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', input.assessmentId),
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', input.assessmentId),
  ])

  return buildReadinessChecks({
    definition: bundle.data.definition,
    validation: bundle.data.validation,
    linkedCampaignCount: linkedCampaignCount ?? 0,
    submissionCount: submissionCount ?? 0,
  })
}
