import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { getBands } from '@/utils/assessments/scoring-engine'
import { normalizeReportConfig, type ReportConfig } from '@/utils/assessments/experience-config'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SubmissionRow = {
  id: string
  assessment_id: string
  invitation_id: string | null
  created_at: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  scores: Record<string, number> | null
  bands: Record<string, string> | null
  classification: { key?: string; label?: string } | null
  recommendations: unknown[] | null
  assessments?:
    | { id?: string; key?: string; name?: string; report_config?: unknown; scoring_config?: unknown }
    | { id?: string; key?: string; name?: string; report_config?: unknown; scoring_config?: unknown }[]
    | null
  assessment_invitations?:
    | {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        organisation?: string | null
        role?: string | null
        status?: string | null
        completed_at?: string | null
      }
    | {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        organisation?: string | null
        role?: string | null
        status?: string | null
        completed_at?: string | null
      }[]
    | null
}

export type AssessmentReportData = {
  submissionId: string
  assessment: {
    id: string
    key: string
    name: string
  }
  participant: {
    firstName: string | null
    lastName: string | null
    email: string | null
    organisation: string | null
    role: string | null
    status: string | null
    completedAt: string | null
    createdAt: string
  }
  scores: Record<string, number>
  bands: Record<string, string>
  classification: {
    key: string | null
    label: string | null
    description: string | null
  }
  dimensions: Array<{
    key: string
    label: string
    descriptor: string
    meaning: string | null
    bandIndex: number
    bandCount: number
  }>
  recommendations: string[]
  reportConfig: ReportConfig
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatDimensionLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

function resolveReportDimensions(
  rawBands: Record<string, string>,
  scores: Record<string, number>,
  scoringConfig: unknown
) {
  const normalized = normalizeScoringConfig(scoringConfig)

  let effectiveBands = rawBands
  if (Object.keys(rawBands).length === 0 && Object.keys(scores).length > 0) {
    effectiveBands = getBands(scores, normalized)
  }

  const seen = new Set<string>()

  const configuredDimensions = normalized.dimensions
    .map((dimension) => {
      const descriptor = effectiveBands[dimension.key]
      if (typeof descriptor !== 'string' || !descriptor.trim()) {
        return null
      }

      const bandIdx = dimension.bands.findIndex(
        (b) => b.label.trim().toLowerCase() === descriptor.trim().toLowerCase()
      )
      const matchedBand = bandIdx >= 0 ? dimension.bands[bandIdx] : undefined

      seen.add(dimension.key)

      return {
        key: dimension.key,
        label: dimension.label || formatDimensionLabel(dimension.key),
        descriptor: matchedBand?.label ?? descriptor.trim(),
        meaning: matchedBand?.meaning ?? dimension.description ?? null,
        bandIndex: bandIdx >= 0 ? bandIdx : 0,
        bandCount: dimension.bands.length,
      }
    })
    .filter((dimension): dimension is NonNullable<typeof dimension> => dimension !== null)

  const fallbackDimensions = Object.entries(effectiveBands)
    .filter(([key, descriptor]) => !seen.has(key) && typeof descriptor === 'string' && descriptor.trim())
    .map(([key, descriptor]) => ({
      key,
      label: formatDimensionLabel(key),
      descriptor: descriptor.trim(),
      meaning: null,
      bandIndex: 0,
      bandCount: 1,
    }))

  return [...configuredDimensions, ...fallbackDimensions]
}

function resolveClassificationDescription(
  classification: { key?: string; label?: string } | null | undefined,
  scoringConfig: unknown
) {
  if (!classification?.key && !classification?.label) {
    return null
  }

  const normalized = normalizeScoringConfig(scoringConfig)
  const matched = normalized.classifications.find((item) => {
    if (classification.key && item.key === classification.key) {
      return true
    }

    if (classification.label && item.label.trim().toLowerCase() === classification.label.trim().toLowerCase()) {
      return true
    }

    return false
  })

  return matched?.description ?? null
}

export function getAssessmentReportParticipantName(report: AssessmentReportData) {
  const fullName = [report.participant.firstName, report.participant.lastName].filter(Boolean).join(' ').trim()
  return fullName || 'Participant'
}

export function getAssessmentReportRecipientEmail(report: AssessmentReportData) {
  return report.participant.email?.trim().toLowerCase() || null
}

export function getAssessmentReportFilename(report: AssessmentReportData) {
  const name = getAssessmentReportParticipantName(report)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const assessment = report.assessment.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${assessment || 'assessment'}-${name || 'participant'}-report.pdf`
}

export async function getAssessmentReportData(
  adminClient: AdminClient,
  submissionId: string
): Promise<AssessmentReportData | null> {
  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select(
      'id, assessment_id, invitation_id, created_at, first_name, last_name, email, organisation, role, scores, bands, classification, recommendations, assessments(id, key, name, report_config, scoring_config), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email, organisation, role, status, completed_at)'
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as SubmissionRow
  const assessment = pickRelation(row.assessments)
  if (!assessment?.id || !assessment.name || !assessment.key) {
    return null
  }

  const invitation = pickRelation(row.assessment_invitations)
  const resolvedBands = row.bands ?? {}

  return {
    submissionId: row.id,
    assessment: {
      id: assessment.id,
      key: assessment.key,
      name: assessment.name,
    },
    participant: {
      firstName: row.first_name ?? invitation?.first_name ?? null,
      lastName: row.last_name ?? invitation?.last_name ?? null,
      email: row.email ?? invitation?.email ?? null,
      organisation: row.organisation ?? invitation?.organisation ?? null,
      role: row.role ?? invitation?.role ?? null,
      status: invitation?.status ?? null,
      completedAt: invitation?.completed_at ?? null,
      createdAt: row.created_at,
    },
    scores: row.scores ?? {},
    bands: resolvedBands,
    classification: {
      key: row.classification?.key ?? null,
      label: row.classification?.label ?? null,
      description: resolveClassificationDescription(row.classification, assessment.scoring_config),
    },
    dimensions: resolveReportDimensions(resolvedBands, row.scores ?? {}, assessment.scoring_config),
    recommendations: Array.isArray(row.recommendations)
      ? row.recommendations.map((item) => String(item))
      : [],
    reportConfig: normalizeReportConfig(assessment.report_config),
  }
}
