import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPORT_CONFIG,
  normalizeReportConfig,
  normalizeReportCompetencyOverrides,
  normalizeReportTraitOverrides,
} from '@/utils/assessments/experience-config'
import {
  getAssessmentExperienceConfig,
  normalizeAssessmentExperienceConfig,
  withAssessmentExperienceConfig,
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

  it('provides a stable default V2 experience config with new block types', () => {
    const config = normalizeAssessmentExperienceConfig(null)

    expect(config.openingBlocks).toHaveLength(3)
    expect(config.openingBlocks[0]).toMatchObject({
      type: 'card_grid_block',
      eyebrow: 'Essentials',
      title: 'Assessment essentials',
    })
    expect(config.openingBlocks[1]).toMatchObject({
      type: 'card_grid_block',
      eyebrow: 'What to expect',
    })
    expect(config.openingBlocks[2]).toMatchObject({
      type: 'feature_card',
      eyebrow: 'Before you begin',
    })
    expect(config.finalisingStatusLabel).toBe('Generating results')
  })

  it('reads and writes nested V2 experience config alongside the runner config', () => {
    const runnerConfig = withAssessmentExperienceConfig(
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
        ...normalizeAssessmentExperienceConfig(null),
        finalisingTitle: 'Preparing your profile',
      }
    )

    expect(getAssessmentExperienceConfig(runnerConfig).finalisingTitle).toBe('Preparing your profile')
    expect(runnerConfig).toMatchObject({
      theme_variant: 'minimal',
      v2_experience: {
        finalisingTitle: 'Preparing your profile',
      },
    })
  })
})

describe('block migration', () => {
  it('migrates old essentials data to card_grid_block with correct sub-card mapping', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'old-essentials',
          type: 'essentials',
          title: 'My essentials',
          items: [
            { id: 'item-1', kind: 'time', label: 'Time', value: '10 minutes' },
            { id: 'item-2', kind: 'format', label: 'Format', value: 'Likert scale' },
          ],
        },
      ],
    })

    expect(config.openingBlocks).toHaveLength(1)
    const block = config.openingBlocks[0]
    expect(block.type).toBe('card_grid_block')
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.eyebrow).toBe('Essentials')
    expect(block.title).toBe('My essentials')
    expect(block.cards).toHaveLength(2)
    expect(block.cards[0]).toMatchObject({ eyebrow: 'Time', title: '', body: '10 minutes' })
    expect(block.cards[1]).toMatchObject({ eyebrow: 'Format', title: '', body: 'Likert scale' })
  })

  it('migrates old expectation_flow data to card_grid_block with numbered eyebrows', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'old-expectations',
          type: 'expectation_flow',
          title: 'What to expect',
          items: [
            { id: 'exp-1', title: 'Step one', body: 'Do something first.' },
            { id: 'exp-2', title: 'Step two', body: 'Do something second.' },
            { id: 'exp-3', title: 'Step three', body: 'Do something third.' },
          ],
        },
      ],
    })

    expect(config.openingBlocks).toHaveLength(1)
    const block = config.openingBlocks[0]
    expect(block.type).toBe('card_grid_block')
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.eyebrow).toBe('What to expect')
    expect(block.cards).toHaveLength(3)
    expect(block.cards[0]).toMatchObject({ eyebrow: '01', title: 'Step one', body: 'Do something first.' })
    expect(block.cards[1]).toMatchObject({ eyebrow: '02', title: 'Step two', body: 'Do something second.' })
    expect(block.cards[2]).toMatchObject({ eyebrow: '03', title: 'Step three', body: 'Do something third.' })
  })

  it('migrates old trust_note data to feature_card', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'old-trust',
          type: 'trust_note',
          eyebrow: 'Before you begin',
          title: 'Honest answers',
          body: 'Answer directly.',
        },
      ],
    })

    expect(config.openingBlocks).toHaveLength(1)
    const block = config.openingBlocks[0]
    expect(block.type).toBe('feature_card')
    if (block.type !== 'feature_card') throw new Error('wrong type')
    expect(block.eyebrow).toBe('Before you begin')
    expect(block.title).toBe('Honest answers')
    expect(block.body).toBe('Answer directly.')
    expect(block.cta_label).toBe('')
    expect(block.cta_href).toBe('')
  })

  it('normalizes new card_grid_block correctly', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'grid-1',
          type: 'card_grid_block',
          eyebrow: ' Essentials ',
          title: ' Title ',
          description: ' Desc ',
          cards: [
            { id: 'c1', eyebrow: ' E1 ', title: ' T1 ', body: ' B1 ' },
            { id: 'c2', eyebrow: 'E2', title: 'T2', body: '' },
          ],
        },
      ],
    })

    const block = config.openingBlocks[0]
    expect(block.type).toBe('card_grid_block')
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.eyebrow).toBe('Essentials')
    expect(block.title).toBe('Title')
    expect(block.description).toBe('Desc')
    expect(block.cards).toHaveLength(2)
    expect(block.cards[0]).toMatchObject({ eyebrow: 'E1', title: 'T1', body: 'B1' })
  })

  it('normalizes new feature_card correctly', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'fc-1',
          type: 'feature_card',
          eyebrow: ' Note ',
          title: ' Title ',
          body: ' Body text ',
          cta_label: ' Click here ',
          cta_href: ' /somewhere ',
        },
      ],
    })

    const block = config.openingBlocks[0]
    expect(block.type).toBe('feature_card')
    if (block.type !== 'feature_card') throw new Error('wrong type')
    expect(block.eyebrow).toBe('Note')
    expect(block.title).toBe('Title')
    expect(block.body).toBe('Body text')
    expect(block.cta_label).toBe('Click here')
    expect(block.cta_href).toBe('/somewhere')
  })

  it('clamps sub-card count to 1-3', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'grid-many',
          type: 'card_grid_block',
          eyebrow: 'Test',
          title: '',
          description: '',
          cards: [
            { id: 'c1', eyebrow: 'A', title: 'A', body: '' },
            { id: 'c2', eyebrow: 'B', title: 'B', body: '' },
            { id: 'c3', eyebrow: 'C', title: 'C', body: '' },
            { id: 'c4', eyebrow: 'D', title: 'D', body: '' },
          ],
        },
      ],
    })

    const block = config.openingBlocks[0]
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.cards).toHaveLength(3)
  })

  it('provides at least 1 sub-card when cards array is empty', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'grid-empty',
          type: 'card_grid_block',
          eyebrow: 'Test',
          title: '',
          description: '',
          cards: [],
        },
      ],
    })

    const block = config.openingBlocks[0]
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.cards).toHaveLength(1)
  })

  it('provides empty string defaults for missing sub-card fields', () => {
    const config = normalizeAssessmentExperienceConfig({
      openingBlocks: [
        {
          id: 'grid-sparse',
          type: 'card_grid_block',
          eyebrow: '',
          title: '',
          description: '',
          cards: [{ id: 'c1' }],
        },
      ],
    })

    const block = config.openingBlocks[0]
    if (block.type !== 'card_grid_block') throw new Error('wrong type')
    expect(block.cards[0]).toMatchObject({ eyebrow: '', title: '', body: '' })
  })
})
