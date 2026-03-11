import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPORT_CONFIG,
  normalizeReportConfig,
  normalizeReportCompetencyOverrides,
  normalizeReportTraitOverrides,
} from '@/utils/assessments/experience-config'

describe('report config normalization', () => {
  it('fills default STEN fields into legacy report configs', () => {
    expect(normalizeReportConfig({ title: 'Legacy report' })).toEqual({
      ...DEFAULT_REPORT_CONFIG,
      title: 'Legacy report',
    })
  })

  it('normalizes STEN report settings and trims profile anchors', () => {
    expect(
      normalizeReportConfig({
        report_template: 'sten_profile',
        sten_fallback_mode: 'hide_until_norms',
        profile_card_scope: 'trait',
        competency_overrides: {
          curiosity: {
            label: ' Strategic curiosity ',
            low_anchor: ' hesitant and inconsistent ',
            high_anchor: ' calibrated and proactive ',
          },
        },
        trait_overrides: {
          verification: {
            description: ' Checks outputs carefully ',
            high_anchor: ' reliable under pressure ',
          },
        },
      })
    ).toMatchObject({
      report_template: 'sten_profile',
      sten_fallback_mode: 'hide_until_norms',
      profile_card_scope: 'trait',
      competency_overrides: {
        curiosity: {
          label: 'Strategic curiosity',
          low_anchor: 'hesitant and inconsistent',
          high_anchor: 'calibrated and proactive',
        },
      },
      trait_overrides: {
        verification: {
          description: 'Checks outputs carefully',
          high_anchor: 'reliable under pressure',
        },
      },
    })
  })

  it('normalizes profile override maps consistently across competency and trait helpers', () => {
    expect(
      normalizeReportCompetencyOverrides({
        curiosity: {
          low_anchor: ' lower ',
          high_anchor: ' higher ',
        },
      })
    ).toEqual({
      curiosity: {
        low_anchor: 'lower',
        high_anchor: 'higher',
      },
    })

    expect(
      normalizeReportTraitOverrides({
        verification: {
          label: ' Verification ',
          description: ' Careful checking ',
        },
      })
    ).toEqual({
      verification: {
        label: 'Verification',
        description: 'Careful checking',
      },
    })
  })
})
