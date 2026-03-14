import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeReportConfig } from '@/utils/assessments/experience-config'
import { normalizeV2QuestionBank } from '@/utils/assessments/v2-question-bank'
import { createReportAccessToken } from '@/utils/security/report-access'
import type { SubmissionReportOptionWithAccess } from '@/utils/services/submission-report-options'

export type ResponseReportType = 'assessment' | 'assessment_v2'

export type ResponseReportOption = {
  key: string
  label: string
  description: string
  currentDefault: boolean
  accessToken: string | null
  reportType: ResponseReportType
  viewHref: string | null
  canExport: boolean
  canEmail: boolean
}

export type ResponseTraitScore = {
  key: string
  label: string
  groupLabel: string | null
  value: number
  band: string | null
  meaning: string | null
}

export type ResponseItemRow = {
  key: string
  text: string
  rawValue: number | null
  normalizedValue: number | null
  reverseCoded: boolean
  mappedTraits: string[]
}

export type ResponseDemographicEntry = {
  key: string
  label: string
  value: string
}

export type ResponseCompletionSummary = {
  answeredItems: number
  totalItems: number
  completionPercent: number
}

type SessionScoreRow = {
  id: string
  submission_id: string
  computed_at?: string | null
}

type TraitScoreRow = {
  session_score_id: string
  raw_score: number | null
}

type ClassicQuestionRow = {
  question_key: string
  text: string | null
  sort_order: number | null
  is_reverse_coded: boolean | null
  trait_question_mappings:
    | Array<{
        reverse_scored?: boolean | null
        assessment_traits?:
          | { code?: string | null; name?: string | null; external_name?: string | null }
          | Array<{ code?: string | null; name?: string | null; external_name?: string | null }>
          | null
      }>
    | {
        reverse_scored?: boolean | null
        assessment_traits?:
          | { code?: string | null; name?: string | null; external_name?: string | null }
          | Array<{ code?: string | null; name?: string | null; external_name?: string | null }>
          | null
      }
    | null
}

type V2ReportRow = {
  id: string
  name: string
  audience_role: string | null
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  sort_order: number
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

export function humanizeResponseKey(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function isV2AssessmentReportConfig(reportConfig: unknown) {
  return normalizeReportConfig(reportConfig).v2_runtime_enabled === true
}

export function buildDemographicEntries(
  demographics: Record<string, unknown> | null | undefined
): ResponseDemographicEntry[] {
  if (!demographics || typeof demographics !== 'object' || Array.isArray(demographics)) {
    return []
  }

  return Object.entries(demographics)
    .map(([key, rawValue]) => {
      if (rawValue == null) return null

      const value = Array.isArray(rawValue)
        ? rawValue.filter(Boolean).join(', ')
        : String(rawValue).trim()

      if (!value) return null

      return {
        key,
        label: humanizeResponseKey(key),
        value,
      } satisfies ResponseDemographicEntry
    })
    .filter((entry): entry is ResponseDemographicEntry => entry !== null)
}

export async function getSubmissionTraitAverageMap(
  adminClient: SupabaseClient,
  submissionIds: string[]
): Promise<Map<string, number>> {
  const ids = [...new Set(submissionIds.filter(Boolean))]
  if (ids.length === 0) {
    return new Map()
  }

  const { data: sessionRows, error: sessionError } = await adminClient
    .from('session_scores')
    .select('id, submission_id, computed_at')
    .in('submission_id', ids)
    .eq('status', 'ok')
    .order('computed_at', { ascending: false })

  if (sessionError || !sessionRows?.length) {
    return new Map()
  }

  const latestSessionBySubmission = new Map<string, string>()
  for (const row of sessionRows as SessionScoreRow[]) {
    if (!latestSessionBySubmission.has(row.submission_id)) {
      latestSessionBySubmission.set(row.submission_id, row.id)
    }
  }

  const sessionIds = [...latestSessionBySubmission.values()]
  if (sessionIds.length === 0) {
    return new Map()
  }

  const { data: traitRows, error: traitError } = await adminClient
    .from('trait_scores')
    .select('session_score_id, raw_score')
    .in('session_score_id', sessionIds)

  if (traitError || !traitRows?.length) {
    return new Map()
  }

  const valuesBySessionId = new Map<string, number[]>()
  for (const row of traitRows as TraitScoreRow[]) {
    if (typeof row.raw_score !== 'number' || !Number.isFinite(row.raw_score)) continue
    const current = valuesBySessionId.get(row.session_score_id) ?? []
    current.push(row.raw_score)
    valuesBySessionId.set(row.session_score_id, current)
  }

  const averageBySubmission = new Map<string, number>()
  for (const [submissionId, sessionId] of latestSessionBySubmission.entries()) {
    const values = valuesBySessionId.get(sessionId) ?? []
    if (values.length === 0) continue
    averageBySubmission.set(
      submissionId,
      roundToOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length)
    )
  }

  return averageBySubmission
}

export function normalizeClassicResponseReportOptions(
  options: SubmissionReportOptionWithAccess[]
): ResponseReportOption[] {
  return options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
    currentDefault: option.currentDefault,
    accessToken: option.accessToken,
    reportType: 'assessment',
    viewHref: option.accessToken
      ? `/assess/r/assessment?access=${encodeURIComponent(option.accessToken)}`
      : null,
    canExport: Boolean(option.accessToken),
    canEmail: Boolean(option.accessToken),
  }))
}

export async function listV2SubmissionReportOptions(input: {
  adminClient: SupabaseClient
  assessmentId: string
  submissionId: string
  expiresInSeconds?: number
}): Promise<ResponseReportOption[]> {
  const { data, error } = await input.adminClient
    .from('v2_assessment_reports')
    .select('id, name, report_kind, audience_role, status, is_default, sort_order')
    .eq('assessment_id', input.assessmentId)
    .eq('report_kind', 'audience')
    .eq('status', 'published')
    .order('sort_order')

  if (error) {
    return []
  }

  return ((data ?? []) as V2ReportRow[]).map((report, index) => {
    const accessToken = createReportAccessToken({
      report: 'assessment_v2',
      submissionId: input.submissionId,
      reportVariantId: report.id,
      expiresInSeconds: input.expiresInSeconds,
    })

    return {
      key: report.id,
      label: report.name,
      description:
        report.audience_role?.trim()
          ? `Published V2 report for ${humanizeResponseKey(report.audience_role)}.`
          : 'Published V2 report.',
      currentDefault: report.is_default || index === 0,
      accessToken,
      reportType: 'assessment_v2',
      viewHref: accessToken
        ? `/assess/r/assessment-v2?access=${encodeURIComponent(accessToken)}`
        : null,
      canExport: false,
      canEmail: false,
    } satisfies ResponseReportOption
  })
}

export async function buildClassicItemResponses(input: {
  adminClient: SupabaseClient
  assessmentId: string
  rawResponses: Record<string, number> | null | undefined
  normalizedResponses: Record<string, number> | null | undefined
}): Promise<ResponseItemRow[]> {
  const { data, error } = await input.adminClient
    .from('assessment_questions')
    .select(
      'question_key, text, sort_order, is_reverse_coded, trait_question_mappings(reverse_scored, assessment_traits(code, name, external_name))'
    )
    .eq('assessment_id', input.assessmentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return Object.entries(input.normalizedResponses ?? input.rawResponses ?? {}).map(([key, value]) => ({
      key,
      text: humanizeResponseKey(key),
      rawValue: (input.rawResponses ?? {})[key] ?? null,
      normalizedValue: typeof value === 'number' ? value : null,
      reverseCoded: false,
      mappedTraits: [],
    }))
  }

  return ((data ?? []) as ClassicQuestionRow[]).map((question) => {
    const mappings = Array.isArray(question.trait_question_mappings)
      ? question.trait_question_mappings
      : question.trait_question_mappings
        ? [question.trait_question_mappings]
        : []

    const mappedTraits = mappings
      .map((mapping) => pickRelation(mapping.assessment_traits))
      .map((trait) => trait?.external_name?.trim() || trait?.name?.trim() || trait?.code?.trim() || '')
      .filter(Boolean)

    return {
      key: question.question_key,
      text: question.text?.trim() || question.question_key,
      rawValue: (input.rawResponses ?? {})[question.question_key] ?? null,
      normalizedValue: (input.normalizedResponses ?? input.rawResponses ?? {})[question.question_key] ?? null,
      reverseCoded:
        question.is_reverse_coded === true
        || mappings.some((mapping) => mapping.reverse_scored === true),
      mappedTraits,
    } satisfies ResponseItemRow
  })
}

export function buildV2ItemResponses(input: {
  questionBank: unknown
  rawResponses: Record<string, number> | null | undefined
  normalizedResponses: Record<string, number> | null | undefined
}): ResponseItemRow[] {
  const bank = normalizeV2QuestionBank(input.questionBank)
  const traitLabelByKey = new Map(
    bank.traits.map((trait) => [
      trait.key,
      trait.externalName.trim() || trait.internalName.trim() || trait.key,
    ])
  )

  const scoredItems = bank.scoredItems.map((item) => ({
    key: item.key,
    text: item.text,
    rawValue: (input.rawResponses ?? {})[item.key] ?? null,
    normalizedValue: (input.normalizedResponses ?? input.rawResponses ?? {})[item.key] ?? null,
    reverseCoded: item.isReverseCoded,
    mappedTraits: [traitLabelByKey.get(item.traitKey) ?? item.traitKey],
  }))

  const socialItems = bank.socialItems.map((item) => ({
    key: item.key,
    text: item.text,
    rawValue: (input.rawResponses ?? {})[item.key] ?? null,
    normalizedValue: (input.normalizedResponses ?? input.rawResponses ?? {})[item.key] ?? null,
    reverseCoded: item.isReverseCoded,
    mappedTraits: ['Social desirability'],
  }))

  return [...scoredItems, ...socialItems]
}

export function buildV2ResponseCompleteness(input: {
  questionBank: unknown
  rawResponses: Record<string, number> | null | undefined
}): ResponseCompletionSummary {
  const bank = normalizeV2QuestionBank(input.questionBank)
  const itemKeys = [
    ...bank.scoredItems.map((item) => item.key),
    ...bank.socialItems.map((item) => item.key),
  ]
  const totalItems = itemKeys.length
  const answers = input.rawResponses ?? {}
  const answeredItems = itemKeys.filter((key) => typeof answers[key] === 'number').length

  return {
    answeredItems,
    totalItems,
    completionPercent: totalItems === 0 ? 0 : Math.round((answeredItems / totalItems) * 100),
  }
}
