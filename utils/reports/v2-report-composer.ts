import {
  createEmptyV2ReportTemplate,
  type V2BlockDataSource,
  type V2BlockDisplayFormat,
  type V2ReportBlockDefinition,
  type V2ReportCompositionDefinition,
  type V2ReportSectionDefinition,
  type V2ReportSectionKind,
  type V2ReportSectionLayer,
  type V2ReportTemplateDefinition,
} from '@/utils/assessments/v2-report-template'
import { createV2ReportBlockId } from '@/utils/reports/v2-report-builder-defaults'

function createSectionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `v2_report_section_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function sectionLayerToSource(layer: V2ReportSectionLayer): Extract<V2BlockDataSource, 'dimension_scores' | 'competency_scores' | 'trait_scores'> {
  if (layer === 'competency') return 'competency_scores'
  if (layer === 'trait') return 'trait_scores'
  return 'dimension_scores'
}

function sourceToSectionLayer(source: V2BlockDataSource): V2ReportSectionLayer {
  if (source === 'competency_scores') return 'competency'
  if (source === 'trait_scores') return 'trait'
  return 'dimension'
}

function withOptional<T extends object>(value: T, key: keyof T, nextValue: unknown) {
  if (nextValue === undefined || nextValue === null || nextValue === '') {
    return value
  }

  return {
    ...value,
    [key]: nextValue,
  }
}

export function createV2ComposerSectionPreset(kind: V2ReportSectionKind): V2ReportSectionDefinition {
  const base = {
    id: createSectionId(),
    kind,
    enabled: true,
  } as const

  switch (kind) {
    case 'overall_profile':
      return {
        ...base,
        title: 'Your overall profile',
        description: 'Lead with the main profile narrative and overall classification.',
        layout: 'hero_card',
      }
    case 'score_summary':
      return {
        ...base,
        title: 'Core capability summary',
        description: 'Show high-level scores for the selected scoring layer.',
        layer: 'dimension',
        layout: 'score_cards',
        max_items: 6,
      }
    case 'narrative_insights':
      return {
        ...base,
        title: 'Narrative insights',
        description: 'Surface the most important interpretation content in plain language.',
        layout: 'insight_list',
        max_items: 6,
      }
    case 'recommendations':
      return {
        ...base,
        title: 'Development recommendations',
        description: 'End with practical next steps and development actions.',
        layout: 'bullet_list',
        max_items: 6,
      }
    case 'editorial':
      return {
        ...base,
        title: 'Editorial section',
        description: 'Add static framing, context, methodology, or next-step content.',
        layout: 'rich_text',
        body_markdown: 'Add custom report copy here.',
      }
  }
}

export function createDefaultV2ReportComposition(): V2ReportCompositionDefinition {
  return {
    version: 1,
    sections: [
      createV2ComposerSectionPreset('overall_profile'),
      createV2ComposerSectionPreset('score_summary'),
      createV2ComposerSectionPreset('narrative_insights'),
      createV2ComposerSectionPreset('recommendations'),
      createV2ComposerSectionPreset('editorial'),
    ],
  }
}

export function inferV2ReportCompositionFromBlocks(blocks: V2ReportBlockDefinition[]): V2ReportCompositionDefinition {
  const sections = blocks.map((block): V2ReportSectionDefinition | null => {
    const common = {
      id: block.id || createSectionId(),
      title: block.content?.title || 'Untitled section',
      description: block.content?.description,
      enabled: block.enabled,
      include_keys: block.filter?.include_keys,
      exclude_keys: block.filter?.exclude_keys,
      max_items: block.filter?.max_items,
      pdf_break_before: block.style?.pdf_break_before,
      pdf_hidden: block.style?.pdf_hidden,
    }

    if (block.source === 'overall_classification' || block.source === 'derived_outcome') {
      return {
        ...common,
        kind: 'overall_profile',
        layout: block.format,
      }
    }

    if (
      block.source === 'dimension_scores'
      || block.source === 'competency_scores'
      || block.source === 'trait_scores'
    ) {
      return {
        ...common,
        kind: 'score_summary',
        layer: sourceToSectionLayer(block.source),
        layout: block.format,
      }
    }

    if (block.source === 'interpretations') {
      return {
        ...common,
        kind: 'narrative_insights',
        layout: block.format,
      }
    }

    if (block.source === 'recommendations') {
      return {
        ...common,
        kind: 'recommendations',
        layout: block.format,
      }
    }

    if (block.source === 'static_content') {
      return {
        ...common,
        kind: 'editorial',
        layout: block.format,
        body_markdown: block.content?.body_markdown,
      }
    }

    return null
  }).filter((section): section is V2ReportSectionDefinition => section !== null)

  return {
    version: 1,
    sections,
  }
}

export function compileV2ReportBlocksFromComposition(composition: V2ReportCompositionDefinition): V2ReportBlockDefinition[] {
  return composition.sections.map((section) => {
    const base: V2ReportBlockDefinition = {
      id: section.id || createV2ReportBlockId(),
      source: 'static_content',
      format: 'rich_text',
      content: {
        title: section.title,
        description: section.description,
      },
      enabled: section.enabled,
      filter: undefined,
      style: undefined,
    }

    const next = withOptional(
      withOptional(
        withOptional(base, 'filter', {
          include_keys: section.include_keys,
          exclude_keys: section.exclude_keys,
          max_items: section.max_items,
        }),
        'style',
        {
          pdf_break_before: section.pdf_break_before,
          pdf_hidden: section.pdf_hidden,
        }
      ),
      'content',
      {
        title: section.title,
        description: section.description,
        body_markdown: section.body_markdown,
      }
    )

    if (section.kind === 'overall_profile') {
      return {
        ...next,
        source: 'derived_outcome',
        format: (section.layout as V2BlockDisplayFormat | undefined) ?? 'hero_card',
        content: {
          ...next.content,
          eyebrow: next.content?.eyebrow ?? 'Overall profile',
        },
      }
    }

    if (section.kind === 'score_summary') {
      return {
        ...next,
        source: sectionLayerToSource(section.layer ?? 'dimension'),
        format: (section.layout as V2BlockDisplayFormat | undefined) ?? 'score_cards',
      }
    }

    if (section.kind === 'narrative_insights') {
      return {
        ...next,
        source: 'interpretations',
        format: (section.layout as V2BlockDisplayFormat | undefined) ?? 'insight_list',
      }
    }

    if (section.kind === 'recommendations') {
      return {
        ...next,
        source: 'recommendations',
        format: (section.layout as V2BlockDisplayFormat | undefined) ?? 'bullet_list',
      }
    }

    return {
      ...next,
      source: 'static_content',
      format: 'rich_text',
    }
  })
}

export function ensureV2TemplateHasComposition(template: V2ReportTemplateDefinition): V2ReportTemplateDefinition {
  const composition = template.composition?.sections.length
    ? template.composition
    : inferV2ReportCompositionFromBlocks(template.blocks)

  return {
    ...createEmptyV2ReportTemplate(),
    ...template,
    composition,
    blocks: template.blocks,
  }
}

export function syncV2TemplateBlocksFromComposition(template: V2ReportTemplateDefinition): V2ReportTemplateDefinition {
  const normalized = ensureV2TemplateHasComposition(template)
  const composition = normalized.composition ?? createDefaultV2ReportComposition()

  return {
    ...normalized,
    composition,
    blocks: composition.sections.length > 0
      ? compileV2ReportBlocksFromComposition(composition)
      : normalized.blocks,
  }
}
