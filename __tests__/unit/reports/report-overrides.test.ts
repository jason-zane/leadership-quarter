import { describe, expect, it } from 'vitest'
import {
  getReportCompetencyDefinitions,
  normalizeCampaignAssessmentReportOverrides,
  resolveReportCompetencyOverride,
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
        },
      },
    })

    const resolved = resolveReportCompetencyOverride({
      dimensionKey: 'curiosity',
      assessmentOverrides: {
        curiosity: {
          label: 'Strategic curiosity',
          description: 'Assessment-level description.',
        },
      },
      campaignOverrides: campaignOverrides.competency_overrides,
    })

    expect(resolved).toEqual({
      label: 'Opportunity sensing',
      description: 'Assessment-level description.',
    })
  })
})
