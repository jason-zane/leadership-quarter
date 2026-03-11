import { describe, expect, it } from 'vitest'
import {
  getReportCompetencyDefinitions,
  getReportTraitDefinitions,
  normalizeCampaignAssessmentReportOverrides,
  resolveReportCompetencyOverride,
  resolveReportTraitOverride,
} from '@/utils/reports/report-overrides'

describe('report overrides helpers', () => {
  it('extracts report competency definitions from scoring config dimensions', () => {
    const definitions = getReportCompetencyDefinitions({
      dimensions: [
        {
          key: 'curiosity',
          label: 'Curiosity',
          description: 'Explores practical AI opportunities.',
          bands: [],
        },
      ],
      classifications: [],
    })

    expect(definitions).toEqual([
      {
        key: 'curiosity',
        internalLabel: 'Curiosity',
        defaultDescription: 'Explores practical AI opportunities.',
      },
    ])
  })

  it('prefers campaign overrides over assessment-level report overrides', () => {
    const campaignOverrides = normalizeCampaignAssessmentReportOverrides({
      competency_overrides: {
        curiosity: {
          label: 'Opportunity sensing',
          low_anchor: 'Reactive and inconsistent',
        },
      },
    })

    const resolved = resolveReportCompetencyOverride({
      dimensionKey: 'curiosity',
      assessmentOverrides: {
        curiosity: {
          label: 'Strategic curiosity',
          description: 'Assessment-level description.',
          high_anchor: 'Forward-looking and applied',
        },
      },
      campaignOverrides: campaignOverrides.competency_overrides,
    })

    expect(resolved).toEqual({
      label: 'Opportunity sensing',
      description: 'Assessment-level description.',
      low_anchor: 'Reactive and inconsistent',
      high_anchor: 'Forward-looking and applied',
    })
  })

  it('builds trait definitions and resolves trait-level overrides', () => {
    expect(getReportTraitDefinitions([
      {
        code: 'verification',
        external_name: 'Verification discipline',
        name: 'Verification',
        description: 'Checks outputs carefully.',
      },
    ])).toEqual([
      {
        key: 'verification',
        internalLabel: 'Verification discipline',
        defaultDescription: 'Checks outputs carefully.',
      },
    ])

    expect(
      resolveReportTraitOverride({
        traitKey: 'verification',
        assessmentOverrides: {
          verification: {
            low_anchor: 'Misses weak outputs under pressure.',
            high_anchor: 'Checks, tests, and calibrates consistently.',
          },
        },
      })
    ).toEqual({
      low_anchor: 'Misses weak outputs under pressure.',
      high_anchor: 'Checks, tests, and calibrates consistently.',
    })
  })
})
