import { describe, expect, it } from 'vitest'
import { createEmptyV2ReportTemplate } from '@/utils/assessments/assessment-report-template'
import {
  createDefaultV2ReportComposition,
  createV2ComposerSectionPreset,
  ensureV2TemplateHasComposition,
  inferV2ReportCompositionFromBlocks,
  syncV2TemplateBlocksFromComposition,
} from '@/utils/reports/assessment-report-composer'

describe('v2 report composer', () => {
  it('creates a sensible default composition', () => {
    const composition = createDefaultV2ReportComposition()

    expect(composition.sections.map((section) => section.kind)).toEqual([
      'overall_profile',
      'score_summary',
      'narrative_insights',
      'recommendations',
      'editorial',
    ])
  })

  it('compiles composition sections into renderable blocks', () => {
    const template = syncV2TemplateBlocksFromComposition({
      ...createEmptyV2ReportTemplate(),
      name: 'Candidate report',
      composition: {
        version: 1,
        sections: [
          createV2ComposerSectionPreset('overall_profile'),
          {
            ...createV2ComposerSectionPreset('score_summary'),
            layer: 'trait',
            layout: 'bar_chart',
          },
        ],
      },
    })

    expect(template.blocks.map((block) => block.source)).toEqual([
      'derived_outcome',
      'trait_scores',
    ])
    expect(template.blocks[1]?.format).toBe('bar_chart')
  })

  it('infers composition sections from legacy block templates', () => {
    const composition = inferV2ReportCompositionFromBlocks([
      {
        id: 'block_1',
        source: 'derived_outcome',
        format: 'hero_card',
        enabled: true,
        content: { title: 'Your overall profile' },
      },
      {
        id: 'block_2',
        source: 'recommendations',
        format: 'bullet_list',
        enabled: true,
        content: { title: 'Next steps' },
      },
    ])

    expect(composition.sections.map((section) => section.kind)).toEqual([
      'overall_profile',
      'recommendations',
    ])
    expect(composition.sections[1]?.title).toBe('Next steps')
  })
})
