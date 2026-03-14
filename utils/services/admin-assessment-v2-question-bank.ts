import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  buildV2QuestionBankCsvTemplate,
  buildV2QuestionBankFromCsvRows,
  normalizeV2QuestionBank,
  parseV2QuestionBankCsv,
  serializeV2QuestionBankToCsv,
  type V2QuestionBank,
} from '@/utils/assessments/v2-question-bank'

type AdminClient = RouteAuthSuccess['adminClient']

function isMissingV2QuestionBankColumn(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('v2_question_bank') && (text.includes('column') || text.includes('schema cache'))
}

async function loadAssessmentRecord(adminClient: AdminClient, assessmentId: string) {
  const primary = await adminClient
    .from('assessments')
    .select('id, v2_question_bank, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!primary.error || !isMissingV2QuestionBankColumn(primary.error)) {
    return primary
  }

  const fallback = await adminClient
    .from('assessments')
    .select('id, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return fallback
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    data: {
      id: fallback.data.id,
      report_config: fallback.data.report_config,
      v2_question_bank: reportConfig.v2_question_bank ?? null,
    },
    error: null,
  }
}

function getQuestionBankValue(record: unknown) {
  if (!record || typeof record !== 'object') return null
  return 'v2_question_bank' in record ? (record as { v2_question_bank?: unknown }).v2_question_bank ?? null : null
}

export async function getAdminAssessmentV2QuestionBank(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await loadAssessmentRecord(input.adminClient, input.assessmentId)
  if (error || !data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  return {
    ok: true as const,
    data: {
      questionBank: normalizeV2QuestionBank(getQuestionBankValue(data)),
    },
  }
}

export async function saveAdminAssessmentV2QuestionBank(input: {
  adminClient: AdminClient
  assessmentId: string
  questionBank: unknown
}) {
  const normalized = normalizeV2QuestionBank(input.questionBank)

  const primary = await input.adminClient
    .from('assessments')
    .update({
      v2_question_bank: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id, v2_question_bank, report_config')
    .maybeSingle()

  if (!primary.error && primary.data) {
    return {
      ok: true as const,
      data: {
        questionBank: normalizeV2QuestionBank(primary.data.v2_question_bank),
      },
    }
  }

  if (!isMissingV2QuestionBankColumn(primary.error)) {
    return { ok: false as const, error: 'question_bank_save_failed' as const, message: primary.error?.message }
  }

  const current = await input.adminClient
    .from('assessments')
    .select('id, report_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (current.error || !current.data) {
    return { ok: false as const, error: 'question_bank_save_failed' as const, message: current.error?.message }
  }

  const currentReportConfig = (current.data.report_config ?? {}) as Record<string, unknown>
  const fallback = await input.adminClient
    .from('assessments')
    .update({
      report_config: {
        ...currentReportConfig,
        v2_question_bank: normalized,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id, report_config')
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return { ok: false as const, error: 'question_bank_save_failed' as const, message: fallback.error?.message }
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    ok: true as const,
    data: {
      questionBank: normalizeV2QuestionBank(reportConfig.v2_question_bank),
    },
  }
}

export async function importAdminAssessmentV2QuestionBankCsv(input: {
  adminClient: AdminClient
  assessmentId: string
  csvText: string
}) {
  const rows = parseV2QuestionBankCsv(input.csvText)
  const nextBank = buildV2QuestionBankFromCsvRows(rows)
  return saveAdminAssessmentV2QuestionBank({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    questionBank: nextBank,
  })
}

export async function exportAdminAssessmentV2QuestionBankCsv(input: {
  adminClient: AdminClient
  assessmentId: string
  template?: boolean
}) {
  if (input.template) {
    return {
      ok: true as const,
      data: {
        csv: buildV2QuestionBankCsvTemplate(),
      },
    }
  }

  const result = await getAdminAssessmentV2QuestionBank({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!result.ok) return result

  const bank = result.data.questionBank as V2QuestionBank

  return {
    ok: true as const,
    data: {
      csv: bank.scoredItems.length === 0 && bank.socialItems.length === 0
        ? buildV2QuestionBankCsvTemplate()
        : serializeV2QuestionBankToCsv(bank),
    },
  }
}
