import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPORT_CONFIG,
  normalizeReportConfig,
  normalizeReportCompetencyOverrides,
  normalizeReportTraitOverrides,
} from '@/utils/assessments/experience-config'
import {
  getAssessmentV2ExperienceConfig,
  normalizeAssessmentV2ExperienceConfig,
  withAssessmentV2ExperienceConfig,
} from '@/utils/assessments/assessment-experience-config'

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
        pdf_hidden_sections: ['competency_cards', 'invalid-section'],
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
      pdf_hidden_sections: ['competency_cards'],
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

  it('provides a stable default V2 experience config', () => {
    const config = normalizeAssessmentV2ExperienceConfig(null)

    expect(config.openingBlocks).toHaveLength(3)
    expect(config.openingBlocks[0]).toMatchObject({
      type: 'essentials',
      title: 'Assessment essentials',
    })
    expect(config.finalisingStatusLabel).toBe('Generating results')
  })

  it('reads and writes nested V2 experience config alongside the runner config', () => {
    const runnerConfig = withAssessmentV2ExperienceConfig(
      { theme_variant: 'minimal' },
      {
        intro: 'A guided assessment experience',
        title: 'Assessment',
        subtitle: 'Answer each question based on your current experience.',
        estimated_minutes: 8,
        start_cta_label: 'Start assessment',
        completion_cta_label: 'Submit responses',
        progress_style: 'bar',
        question_presentation: 'single',
        show_dimension_badges: true,
        confirmation_copy: 'Thanks. Your responses have been recorded.',
        completion_screen_title: 'Assessment complete',
        completion_screen_body: 'Thank you. Your responses have been submitted successfully.',
        completion_screen_cta_label: 'Return to Leadership Quarter',
        completion_screen_cta_href: '/assess',
        support_contact_email: '',
        theme_variant: 'minimal',
        data_collection_only: false,
      },
      {
        ...normalizeAssessmentV2ExperienceConfig(null),
        finalisingTitle: 'Preparing your profile',
      }
    )

    expect(getAssessmentV2ExperienceConfig(runnerConfig).finalisingTitle).toBe('Preparing your profile')
    expect(runnerConfig).toMatchObject({
      theme_variant: 'minimal',
      v2_experience: {
        finalisingTitle: 'Preparing your profile',
      },
    })
  })
})
