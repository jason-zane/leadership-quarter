import { describe, expect, it } from 'vitest'
import { createEmptyReportTemplate } from '@/utils/assessments/assessment-report-template'
import {
  createDefaultReportComposition,
  createComposerSectionPreset,
  ensureTemplateHasComposition,
  inferReportCompositionFromBlocks,
  syncTemplateBlocksFromComposition,
} from '@/utils/reports/assessment-report-composer'

describe('assessment report composer', () => {
  it('creates a sensible default composition', () => {
    const composition = createDefaultReportComposition()

    expect(composition.sections.map((section) => section.kind)).toEqual([
      'overall_profile',
      'score_summary',
      'narrative_insights',
      'recommendations',
      'editorial',
    ])
  })

  it('compiles composition sections into renderable blocks', () => {
    const template = syncTemplateBlocksFromComposition({
      ...createEmptyReportTemplate(),
      name: 'Candidate report',
      composition: {
        version: 1,
        sections: [
          createComposerSectionPreset('overall_profile'),
          {
            ...createComposerSectionPreset('score_summary'),
            layer: 'trait',
            layout: 'bar_chart',
          },
        ],
      },
    })

    expect(template.blocks.map((block) => block.source)).toEqual([
      'derived_outcome',
      'layer_profile',
    ])
    expect(template.blocks[1]?.format).toBe('bar_chart')
  })

  it('infers composition sections from legacy block templates', () => {
    const composition = inferReportCompositionFromBlocks([
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
