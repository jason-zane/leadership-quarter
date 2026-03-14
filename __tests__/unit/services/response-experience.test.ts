import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/report-access', () => ({
  createReportAccessToken: vi.fn(),
}))

import {
  buildClassicItemResponses,
  buildDemographicEntries,
  buildV2ResponseCompleteness,
  buildV2ItemResponses,
  getSubmissionTraitAverageMap,
  listV2SubmissionReportOptions,
  normalizeClassicResponseReportOptions,
} from '@/utils/services/response-experience'
import { createReportAccessToken } from '@/utils/security/report-access'
import {
  AdminResponseDetail,
  type AdminResponseDetailData,
} from '@/components/dashboard/responses/admin-response-detail'

function createTraitAverageClient() {
  const sessionScoresQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        { id: 'session-new', submission_id: 'sub-1', computed_at: '2026-01-03T00:00:00Z' },
        { id: 'session-old', submission_id: 'sub-1', computed_at: '2026-01-02T00:00:00Z' },
        { id: 'session-two', submission_id: 'sub-2', computed_at: '2026-01-02T00:00:00Z' },
      ],
      error: null,
    }),
  }

  const traitScoresQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [
        { session_score_id: 'session-new', raw_score: 4 },
        { session_score_id: 'session-new', raw_score: 3 },
        { session_score_id: 'session-old', raw_score: 1 },
        { session_score_id: 'session-two', raw_score: 5 },
        { session_score_id: 'session-two', raw_score: 4 },
      ],
      error: null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'session_scores') return sessionScoresQuery
      if (table === 'trait_scores') return traitScoresQuery
      return {}
    }),
  }
}

function createClassicFallbackClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'question lookup failed' },
      }),
    })),
  }
}

function createV2ReportsClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'report-1',
            name: 'Executive summary',
            audience_role: 'executive_team',
            status: 'published',
            is_default: true,
            sort_order: 0,
          },
          {
            id: 'report-2',
            name: 'Manager view',
            audience_role: 'line_manager',
            status: 'published',
            is_default: false,
            sort_order: 1,
          },
        ],
        error: null,
      }),
    })),
  }
}

const detailFixture: AdminResponseDetailData = {
  participantName: 'Ada Lovelace',
  email: 'ada@example.com',
  contextLine: 'Analytical Engines · Lead',
  submittedLabel: 'Submitted 1 Jan 2026',
  statusLabel: 'Completed',
  demographics: [{ key: 'region', label: 'Region', value: 'AU' }],
  traitScores: [
    {
      key: 'curiosity',
      label: 'Curiosity',
      groupLabel: 'Mindset',
      value: 4.2,
      band: 'High',
      meaning: null,
    },
  ],
  itemResponses: [
    {
      key: 'q1',
      text: 'I enjoy trying new tools.',
      rawValue: 4,
      normalizedValue: 4,
      reverseCoded: false,
      mappedTraits: ['Curiosity'],
    },
  ],
  classificationLabel: 'Leader',
  classificationDescription: 'Shows strong readiness.',
  recommendations: ['Prioritise experimentation.'],
  interpretations: [
    {
      key: 'classification',
      label: 'Classification',
      description: 'Strong readiness.',
    },
  ],
  outcomeGroups: [
    {
      title: 'Dimension scores',
      emptyMessage: 'No dimensions.',
      items: [
        {
          key: 'mindset',
          label: 'Mindset',
          groupLabel: null,
          value: 4,
          band: 'High',
          meaning: null,
        },
      ],
    },
  ],
  reportOptions: [
    {
      key: 'current',
      label: 'Current report',
      description: 'Current report view.',
      currentDefault: true,
      accessToken: 'token-1',
      reportType: 'assessment',
      viewHref: '/assess/r/assessment?access=token-1',
      canExport: true,
      canEmail: true,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createReportAccessToken).mockImplementation(({ reportVariantId }) =>
    `token-${reportVariantId ?? 'current'}`
  )
})

describe('response-experience helpers', () => {
  it('uses the latest trait score session per submission', async () => {
    const result = await getSubmissionTraitAverageMap(
      createTraitAverageClient() as never,
      ['sub-1', 'sub-2']
    )

    expect(result.get('sub-1')).toBe(3.5)
    expect(result.get('sub-2')).toBe(4.5)
  })

  it('normalizes demographic entries and removes empty values', () => {
    expect(
      buildDemographicEntries({
        region: 'AU',
        business_unit: ['Strategy', 'Operations'],
        blank_value: '   ',
        empty_list: [],
        skipped: null,
      })
    ).toEqual([
      { key: 'region', label: 'Region', value: 'AU' },
      {
        key: 'business_unit',
        label: 'Business Unit',
        value: 'Strategy, Operations',
      },
    ])
  })

  it('falls back to stored responses when classic question metadata is unavailable', async () => {
    const result = await buildClassicItemResponses({
      adminClient: createClassicFallbackClient() as never,
      assessmentId: 'assess-1',
      rawResponses: { q_1: 2 },
      normalizedResponses: { q_1: 4 },
    })

    expect(result).toEqual([
      {
        key: 'q_1',
        text: 'Q 1',
        rawValue: 2,
        normalizedValue: 4,
        reverseCoded: false,
        mappedTraits: [],
      },
    ])
  })

  it('maps V2 items with trait labels and reverse coding', () => {
    const result = buildV2ItemResponses({
      questionBank: {
        traits: [
          {
            id: 'trait-1',
            key: 'curiosity',
            internalName: 'Curiosity',
            externalName: 'Curiosity',
            definition: '',
            competencyKeys: [],
          },
        ],
        scoredItems: [
          {
            id: 'item-1',
            key: 'q1',
            text: 'I enjoy trying new tools.',
            traitKey: 'curiosity',
            isReverseCoded: false,
            weight: 1,
          },
        ],
        socialItems: [
          {
            id: 'social-1',
            key: 's1',
            text: 'I always make the perfect choice.',
            isReverseCoded: true,
          },
        ],
      },
      rawResponses: { q1: 4, s1: 2 },
      normalizedResponses: { q1: 4, s1: 4 },
    })

    expect(result).toEqual([
      {
        key: 'q1',
        text: 'I enjoy trying new tools.',
        rawValue: 4,
        normalizedValue: 4,
        reverseCoded: false,
        mappedTraits: ['Curiosity'],
      },
      {
        key: 's1',
        text: 'I always make the perfect choice.',
        rawValue: 2,
        normalizedValue: 4,
        reverseCoded: true,
        mappedTraits: ['Social desirability'],
      },
    ])
  })

  it('calculates V2 response completeness from scored and social items', () => {
    const result = buildV2ResponseCompleteness({
      questionBank: {
        traits: [],
        scoredItems: [
          { id: 'item-1', key: 'q1', text: 'One', traitKey: 'trait_1', isReverseCoded: false, weight: 1 },
          { id: 'item-2', key: 'q2', text: 'Two', traitKey: 'trait_1', isReverseCoded: false, weight: 1 },
        ],
        socialItems: [
          { id: 'social-1', key: 's1', text: 'Social', isReverseCoded: false },
        ],
      },
      rawResponses: { q1: 4, s1: 2 },
    })

    expect(result).toEqual({
      answeredItems: 2,
      totalItems: 3,
      completionPercent: 67,
    })
  })

  it('normalizes classic and V2 report options', async () => {
    const classic = normalizeClassicResponseReportOptions([
      {
        key: 'frozen_default',
        label: 'Default at completion',
        description: 'Snapshot report.',
        selectionMode: 'frozen_default',
        reportVariantId: 'variant-1',
        currentDefault: true,
        accessToken: 'classic-token',
      },
    ])

    const v2 = await listV2SubmissionReportOptions({
      adminClient: createV2ReportsClient() as never,
      assessmentId: 'assess-1',
      submissionId: 'sub-1',
    })

    expect(classic).toEqual([
      expect.objectContaining({
        key: 'frozen_default',
        reportType: 'assessment',
        viewHref: '/assess/r/assessment?access=classic-token',
        canExport: true,
        canEmail: true,
      }),
    ])
    expect(v2).toEqual([
      expect.objectContaining({
        key: 'report-1',
        reportType: 'assessment_v2',
        currentDefault: true,
        viewHref: '/assess/r/assessment-v2?access=token-report-1',
        canExport: false,
        canEmail: false,
      }),
      expect.objectContaining({
        key: 'report-2',
        currentDefault: false,
        viewHref: '/assess/r/assessment-v2?access=token-report-2',
      }),
    ])
  })
})

describe('AdminResponseDetail render', () => {
  it('renders the overview tab by default', () => {
    const html = renderToStaticMarkup(
      createElement(AdminResponseDetail, {
        data: detailFixture,
      })
    )

    expect(html).toContain('Respondent')
    expect(html).toContain('Demographics')
    expect(html).not.toContain('Current report view.')
  })

  it('renders reports content when opened on the reports tab', () => {
    const html = renderToStaticMarkup(
      createElement(AdminResponseDetail, {
        data: detailFixture,
        initialTab: 'reports',
      })
    )

    expect(html).toContain('Reports')
    expect(html).toContain('Current report view.')
    expect(html).toContain('View report')
  })

  it('renders compact item response content when opened on responses', () => {
    const html = renderToStaticMarkup(
      createElement(AdminResponseDetail, {
        data: detailFixture,
        initialTab: 'responses',
      })
    )

    expect(html).toContain('Item responses')
    expect(html).toContain('Stored value')
    expect(html).toContain('Normalized value')
    expect(html).toContain('q1')
  })
})
