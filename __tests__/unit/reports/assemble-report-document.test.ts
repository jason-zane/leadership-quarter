import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/utils/security/report-access', () => ({
  verifyReportAccessToken: vi.fn(),
}))

vi.mock('@/utils/services/v2-submission-report', () => ({
  getV2SubmissionReport: vi.fn(),
}))

import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'
import { getV2SubmissionReport } from '@/utils/services/v2-submission-report'

describe('assembleReportDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn() } as never)
    vi.mocked(verifyReportAccessToken).mockReturnValue({
      submissionId: 'submission-1',
      selectionMode: null,
      reportVariantId: null,
    } as never)
  })

  it('returns the canonical V2 assessment document payload', async () => {
    vi.mocked(getV2SubmissionReport).mockResolvedValue({
      ok: true,
      data: {
        participantName: 'Jason Hunt',
        template: { id: 'tpl-1', version: 1, sections: [], blocks: [], composition: { sections: [] } },
        context: {
          assessmentId: 'assessment-1',
          submissionId: 'submission-1',
          scoringConfig: { bandings: [] },
          v2Report: {
            personName: 'Jason Hunt',
            role: 'Director',
            organisation: 'Leadership Quarter',
            classification: null,
            dimension_scores: [],
            competency_scores: [],
            trait_scores: [],
            interpretations: [],
            recommendations: [],
            static_content: '',
          },
        },
      },
    } as never)

    const result = await assembleReportDocument({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.kind).toBe('assessment')
    if (result.data.kind !== 'assessment') return

    expect(result.data.templateVersion).toBe('v2')
    expect(result.data.filename).toBe('jason-hunt-report.pdf')
    expect(result.data.context.submissionId).toBe('submission-1')
  })

  it('passes the requested report variant id through to the V2 report resolver', async () => {
    vi.mocked(verifyReportAccessToken).mockReturnValue({
      submissionId: 'submission-1',
      selectionMode: null,
      reportVariantId: 'report-99',
    } as never)
    vi.mocked(getV2SubmissionReport).mockResolvedValue({
      ok: true,
      data: {
        participantName: 'Assessment Report',
        template: { id: 'tpl-1', version: 1, sections: [], blocks: [], composition: { sections: [] } },
        context: {
          assessmentId: 'assessment-1',
          submissionId: 'submission-1',
          scoringConfig: { bandings: [] },
          v2Report: {
            personName: 'Assessment Report',
            role: '',
            organisation: '',
            classification: null,
            dimension_scores: [],
            competency_scores: [],
            trait_scores: [],
            interpretations: [],
            recommendations: [],
            static_content: '',
          },
        },
      },
    } as never)

    await assembleReportDocument({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(getV2SubmissionReport).toHaveBeenCalledWith({
      adminClient: expect.any(Object),
      submissionId: 'submission-1',
      reportId: 'report-99',
    })
  })

  it('returns report_not_found when the V2 report resolver cannot assemble the document', async () => {
    vi.mocked(getV2SubmissionReport).mockResolvedValue({
      ok: false,
      error: 'report_not_found',
    } as never)

    const result = await assembleReportDocument({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result).toEqual({
      ok: false,
      error: 'report_not_found',
    })
  })
})
