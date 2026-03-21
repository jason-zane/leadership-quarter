import { describe, expect, it } from 'vitest'
import {
  normalizeV2ReportTemplate,
  createEmptyV2ReportTemplate,
  type V2ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'

describe('createEmptyV2ReportTemplate', () => {
  it('returns a valid empty template', () => {
    const t = createEmptyV2ReportTemplate()
    expect(t.version).toBe(1)
    expect(t.name).toBe('')
    expect(t.global.pdf_enabled).toBe(true)
    expect(t.global.presentation?.style_preset).toBe('classic')
    expect(t.blocks).toEqual([])
  })
})

describe('normalizeV2ReportTemplate', () => {
  it('returns empty template for null/undefined input', () => {
    const t = normalizeV2ReportTemplate(null)
    expect(t.version).toBe(1)
    // Injected defaults: report_header + report_cta
    expect(t.blocks).toHaveLength(2)
    expect(t.blocks[0].source).toBe('report_header')
    expect(t.blocks[1].source).toBe('report_cta')

    const t2 = normalizeV2ReportTemplate(undefined)
    expect(t2.version).toBe(1)
  })

  it('normalizes a well-formed template', () => {
    const input: V2ReportTemplateDefinition = {
      version: 1,
      name: 'Test Template',
      description: 'Test desc',
      global: { pdf_enabled: false },
      blocks: [
        {
          id: 'b1',
          source: 'overall_classification',
          format: 'hero_card',
          content: { title: 'Your Profile', eyebrow: 'Result' },
          enabled: true,
        },
        {
          id: 'b2',
          source: 'trait_scores',
          format: 'bar_chart',
          score: { score_mode: 'sten', show_sem_bands: true },
          enabled: true,
        },
      ],
    }

    const t = normalizeV2ReportTemplate(input)
    expect(t.name).toBe('Test Template')
    expect(t.description).toBe('Test desc')
    expect(t.global.pdf_enabled).toBe(false)
    // 2 user blocks + injected report_header + report_cta
    expect(t.blocks).toHaveLength(4)
    const b0 = t.blocks.find((b) => b.source === 'overall_classification')!
    expect(b0.source).toBe('overall_classification')
    expect(b0.format).toBe('hero_card')
    expect(b0.content?.title).toBe('Your Profile')
    const b1 = t.blocks.find((b) => b.source === 'trait_scores')!
    expect(b1.score?.score_mode).toBe('sten')
    expect(b1.score?.show_sem_bands).toBe(true)
  })

  it('drops blocks with invalid source or format', () => {
    const input = {
      name: 'Bad Blocks',
      blocks: [
        { id: 'ok', source: 'trait_scores', format: 'score_cards', enabled: true },
        { id: 'bad-source', source: 'not_real', format: 'hero_card', enabled: true },
        { id: 'bad-format', source: 'trait_scores', format: 'not_real', enabled: true },
      ],
    }
    const t = normalizeV2ReportTemplate(input)
    // 1 valid user block + injected report_header + report_cta
    expect(t.blocks).toHaveLength(3)
    expect(t.blocks.find((b) => b.id === 'ok')).toBeTruthy()
  })

  it('defaults enabled to true when missing', () => {
    const input = {
      blocks: [{ id: 'b1', source: 'static_content', format: 'rich_text' }],
    }
    const t = normalizeV2ReportTemplate(input)
    expect(t.blocks.find((b) => b.id === 'b1')!.enabled).toBe(true)
  })

  it('generates UUIDs for blocks missing an id', () => {
    const input = {
      blocks: [{ source: 'recommendations', format: 'bullet_list', enabled: true }],
    }
    const t = normalizeV2ReportTemplate(input)
    const rec = t.blocks.find((b) => b.source === 'recommendations')!
    expect(rec.id).toBeTruthy()
    expect(rec.id.length).toBeGreaterThan(0)
  })

  it('normalizes filter config', () => {
    const input = {
      blocks: [{
        id: 'f1',
        source: 'derived_outcome',
        format: 'band_cards',
        filter: { include_keys: ['a', 'b'], max_items: 5, outcome_set_key: 'profile_logic' },
        enabled: true,
      }],
    }
    const t = normalizeV2ReportTemplate(input)
    const b = t.blocks.find((b) => b.id === 'f1')!
    expect(b.filter?.include_keys).toEqual(['a', 'b'])
    expect(b.filter?.max_items).toBe(5)
    expect(b.filter?.outcome_set_key).toBe('profile_logic')
  })

  it('normalizes style config', () => {
    const input = {
      blocks: [{
        id: 's1',
        source: 'dimension_scores',
        format: 'score_cards',
        style: { columns: 3, pdf_break_before: true, pdf_hidden: false },
        enabled: true,
      }],
    }
    const t = normalizeV2ReportTemplate(input)
    const b = t.blocks.find((b) => b.id === 's1')!
    expect(b.style?.columns).toBe(3)
    expect(b.style?.pdf_break_before).toBe(true)
    expect(b.style?.pdf_hidden).toBe(false)
  })

  it('strips empty config objects', () => {
    const input = {
      blocks: [{
        id: 'e1',
        source: 'static_content',
        format: 'rich_text',
        content: {},
        score: {},
        filter: {},
        style: {},
        enabled: true,
      }],
    }
    const t = normalizeV2ReportTemplate(input)
    const b = t.blocks.find((b) => b.id === 'e1')!
    expect(b.content).toBeUndefined()
    expect(b.score).toBeUndefined()
    expect(b.filter).toBeUndefined()
    expect(b.style).toBeUndefined()
  })

  it('normalizes global layer_labels', () => {
    const input = {
      global: {
        pdf_enabled: true,
        layer_labels: { dimensions: 'Domains', traits: 'Facets' },
      },
      blocks: [],
    }
    const t = normalizeV2ReportTemplate(input)
    expect(t.global.layer_labels?.dimensions).toBe('Domains')
    expect(t.global.layer_labels?.traits).toBe('Facets')
    expect(t.global.layer_labels?.competencies).toBeUndefined()
  })

  it('normalizes the optional presentation config', () => {
    const input = {
      global: {
        pdf_enabled: true,
        presentation: { style_preset: 'editorial' },
      },
      blocks: [],
    }

    const t = normalizeV2ReportTemplate(input)
    expect(t.global.presentation?.style_preset).toBe('editorial')

    const fallback = normalizeV2ReportTemplate({
      global: {
        presentation: { style_preset: 'not_real' },
      },
      blocks: [],
    })
    expect(fallback.global.presentation?.style_preset).toBe('classic')
  })

  it('normalizes the optional composition model', () => {
    const input = {
      name: 'Composed report',
      composition: {
        sections: [
          {
            id: 'section_1',
            kind: 'overall_profile',
            title: 'Your profile',
            enabled: true,
            layout: 'hero_card',
          },
          {
            id: 'section_2',
            kind: 'editorial',
            title: 'About this report',
            enabled: true,
            layout: 'rich_text',
            body_markdown: 'Body copy',
          },
        ],
      },
      blocks: [],
    }

    const t = normalizeV2ReportTemplate(input)
    expect(t.composition?.sections).toHaveLength(2)
    expect(t.composition?.sections[0]?.kind).toBe('overall_profile')
    expect(t.composition?.sections[1]?.body_markdown).toBe('Body copy')
  })

  it('drops invalid column values from style config', () => {
    const input = {
      blocks: [{
        id: 'c1',
        source: 'trait_scores',
        format: 'score_cards',
        style: { columns: 5 },
        enabled: true,
      }],
    }
    const t = normalizeV2ReportTemplate(input)
    // columns: 5 is not valid (only 1, 2, 3), so style should be undefined
    expect(t.blocks.find((b) => b.id === 'c1')!.style).toBeUndefined()
  })
})
