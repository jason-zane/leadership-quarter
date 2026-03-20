import { describe, expect, it } from 'vitest'
import { resolveCampaignJourney } from '@/utils/assessments/campaign-journey'
import { normalizeCampaignConfig } from '@/utils/assessments/campaign-types'

describe('resolveCampaignJourney', () => {
  it('models registration and demographics as separate pages before the assessment', () => {
    const result = resolveCampaignJourney({
      campaignName: 'Executive Readiness',
      campaignConfig: normalizeCampaignConfig({
        registration_position: 'before',
        report_access: 'immediate',
        demographics_enabled: true,
        demographics_position: 'before',
        demographics_fields: ['job_level'],
      }),
      runnerOverrides: {
        title: 'Executive Readiness',
        subtitle: 'A focused intro page.',
        start_cta_label: 'Continue',
      },
      flowSteps: [
        {
          id: 'step-1',
          campaign_id: 'camp-1',
          step_type: 'assessment',
          sort_order: 0,
          is_active: true,
          campaign_assessment_id: 'ca-1',
          screen_config: {},
          created_at: '',
          updated_at: '',
        },
      ],
      campaignAssessments: [
        {
          id: 'ca-1',
          campaign_assessment_id: 'ca-1',
          sort_order: 0,
          is_active: true,
          assessments: {
            id: 'assessment-1',
            name: 'Leadership Quotient',
            externalName: 'Leadership Quotient',
            description: 'Answer one question at a time.',
            status: 'active',
          },
        },
      ],
    })

    expect(result.pages.map((page) => page.type)).toEqual([
      'intro',
      'registration',
      'demographics',
      'assessment',
      'finalising',
      'completion',
    ])
    expect(result.pages[1]?.position).toBe('before')
    expect(result.pages[2]?.position).toBe('before')
  })

  it('preserves flow screens and inserts after-assessment pages after the assessment sequence', () => {
    const result = resolveCampaignJourney({
      campaignName: 'Capability Journey',
      campaignConfig: normalizeCampaignConfig({
        registration_position: 'after',
        report_access: 'none',
        demographics_enabled: true,
        demographics_position: 'after',
        demographics_fields: ['region'],
      }),
      runnerOverrides: {
        title: 'Capability Journey',
      },
      flowSteps: [
        {
          id: 'step-1',
          campaign_id: 'camp-1',
          step_type: 'assessment',
          sort_order: 0,
          is_active: true,
          campaign_assessment_id: 'ca-1',
          screen_config: {},
          created_at: '',
          updated_at: '',
        },
        {
          id: 'screen-1',
          campaign_id: 'camp-1',
          step_type: 'screen',
          sort_order: 1,
          is_active: true,
          campaign_assessment_id: null,
          screen_config: {
            title: 'Take a breath',
            body_markdown: 'A short reset between assessments.',
            cta_label: 'Continue',
            visual_style: 'transition',
          },
          created_at: '',
          updated_at: '',
        },
      ],
      campaignAssessments: [
        {
          id: 'ca-1',
          campaign_assessment_id: 'ca-1',
          sort_order: 0,
          is_active: true,
          assessments: {
            id: 'assessment-1',
            name: 'Assessment One',
            externalName: null,
            description: null,
            status: 'active',
          },
        },
      ],
    })

    expect(result.pages.map((page) => page.type)).toEqual([
      'intro',
      'assessment',
      'screen',
      'registration',
      'demographics',
      'finalising',
      'completion',
    ])
    expect(result.pages[3]?.position).toBe('after')
    expect(result.pages[4]?.position).toBe('after')
    expect(result.pages[2]?.title).toBe('Take a breath')
  })

  it('forces registration before the assessment sequence when multiple assessments are present', () => {
    const result = resolveCampaignJourney({
      campaignName: 'Capability Journey',
      campaignConfig: normalizeCampaignConfig({
        registration_position: 'after',
        report_access: 'immediate',
        demographics_enabled: false,
        demographics_fields: [],
      }),
      flowSteps: [
        {
          id: 'step-1',
          campaign_id: 'camp-1',
          step_type: 'assessment',
          sort_order: 0,
          is_active: true,
          campaign_assessment_id: 'ca-1',
          screen_config: {},
          created_at: '',
          updated_at: '',
        },
        {
          id: 'step-2',
          campaign_id: 'camp-1',
          step_type: 'assessment',
          sort_order: 1,
          is_active: true,
          campaign_assessment_id: 'ca-2',
          screen_config: {},
          created_at: '',
          updated_at: '',
        },
      ],
      campaignAssessments: [
        {
          id: 'ca-1',
          campaign_assessment_id: 'ca-1',
          sort_order: 0,
          is_active: true,
          assessments: {
            id: 'assessment-1',
            name: 'Assessment One',
            externalName: null,
            description: null,
            status: 'active',
          },
        },
        {
          id: 'ca-2',
          campaign_assessment_id: 'ca-2',
          sort_order: 1,
          is_active: true,
          assessments: {
            id: 'assessment-2',
            name: 'Assessment Two',
            externalName: null,
            description: null,
            status: 'active',
          },
        },
      ],
    })

    expect(result.pages.map((page) => page.type)).toEqual([
      'intro',
      'registration',
      'assessment',
      'assessment',
      'finalising',
      'completion',
    ])
  })
})
