import { describe, expect, it } from 'vitest'
import {
  buildV2QuestionBankCsvTemplate,
  buildV2QuestionBankFromCsvRows,
  normalizeV2QuestionBank,
  parseV2QuestionBankCsv,
  serializeV2QuestionBankToCsv,
} from '@/utils/assessments/assessment-question-bank'

describe('v2 question bank', () => {
  it('normalizes an empty config', () => {
    const bank = normalizeV2QuestionBank(null)
    expect(bank.version).toBe(1)
    expect(bank.traits).toEqual([])
    expect(bank.scoredItems).toEqual([])
  })

  it('parses and builds from csv rows with optional layers', () => {
    const csv = [
      'item_type,item_key,item_text,reverse_coded,item_weight,trait_key,trait_internal_name,trait_external_name,trait_definition,competency_keys,competency_internal_names,competency_external_names,competency_definitions,dimension_keys,dimension_internal_names,dimension_external_names,dimension_definitions',
      'scored,judgement_1,"I test outputs before use",false,1.5,judgement,Judgement,Judgement,Quality of judgement,decision_quality,Decision Quality,Decision Quality,Decision quality definition,thinking,Thinking,Thinking,Thinking definition',
      'social,social_1,"I never make mistakes at work",true,1,,,,,,,,,,,,',
    ].join('\n')

    const rows = parseV2QuestionBankCsv(csv)
    const bank = buildV2QuestionBankFromCsvRows(rows)

    expect(bank.dimensions).toHaveLength(1)
    expect(bank.competencies).toHaveLength(1)
    expect(bank.traits).toHaveLength(1)
    expect(bank.scoredItems).toHaveLength(1)
    expect(bank.socialItems).toHaveLength(1)
    expect(bank.traits[0]?.competencyKeys).toEqual(['decision_quality'])
    expect(bank.competencies[0]?.dimensionKeys).toEqual(['thinking'])
    expect(bank.scoredItems[0]?.weight).toBe(1.5)
  })

  it('serializes a template-shaped csv export', () => {
    const template = buildV2QuestionBankCsvTemplate()
    expect(template).toContain('item_type,item_key,item_text')

    const bank = normalizeV2QuestionBank({
      traits: [{ id: 't1', key: 'judgement', internalName: 'Judgement', externalName: 'Judgement', definition: '', competencyKeys: [] }],
      scoredItems: [{ id: 'i1', key: 'judgement_1', text: 'Test text', traitKey: 'judgement', isReverseCoded: false, weight: 1.2 }],
      socialItems: [],
    })

    const csv = serializeV2QuestionBankToCsv(bank)
    expect(csv).toContain('judgement_1')
    expect(csv).toContain('Test text')
    expect(csv).toContain('1.2')
  })

  it('parses legacy csv rows without the item weight column', () => {
    const csv = [
      'item_type,item_key,item_text,reverse_coded,trait_key,trait_internal_name,trait_external_name,trait_definition,competency_keys,competency_internal_names,competency_external_names,competency_definitions,dimension_keys,dimension_internal_names,dimension_external_names,dimension_definitions',
      'scored,judgement_1,"I test outputs before use",false,judgement,Judgement,Judgement,Quality of judgement,decision_quality,Decision Quality,Decision Quality,Decision quality definition,thinking,Thinking,Thinking,Thinking definition',
    ].join('\n')

    const rows = parseV2QuestionBankCsv(csv)
    expect(rows[0]?.trait_key).toBe('judgement')
    expect(rows[0]?.item_weight).toBe(1)
  })

  it('preserves blank draft rows when requested by the editor', () => {
    const bank = normalizeV2QuestionBank({
      traits: [{ id: 't1', key: 'judgement', internalName: 'Judgement', externalName: 'Judgement', definition: '', competencyKeys: [] }],
      scoredItems: [{ id: 'i1', key: 'judgement_1', text: '', traitKey: 'judgement', isReverseCoded: false, weight: 1 }],
      socialItems: [{ id: 's1', key: 'social_1', text: '', isReverseCoded: false }],
    }, { preserveDrafts: true })

    expect(bank.scoredItems).toHaveLength(1)
    expect(bank.socialItems).toHaveLength(1)
  })

  it('normalizes linked competency and dimension keys to the same slug format as their parent entities', () => {
    const bank = normalizeV2QuestionBank({
      dimensions: [
        { id: 'd1', key: 'riskPosture', internalName: 'Risk Posture', externalName: 'Risk Posture', definition: '' },
      ],
      competencies: [
        { id: 'c1', key: 'riskPosture', internalName: 'Risk Posture', externalName: 'Risk Posture', definition: '', dimensionKeys: ['riskPosture'] },
      ],
      traits: [
        { id: 't1', key: 'riskPosture', internalName: 'Risk Posture', externalName: 'Risk Posture', definition: '', competencyKeys: ['riskPosture'] },
      ],
      scoredItems: [
        { id: 'i1', key: 'q10', text: 'Question', traitKey: 'riskPosture', isReverseCoded: false, weight: 1 },
      ],
    })

    expect(bank.dimensions[0]?.key).toBe('riskposture')
    expect(bank.competencies[0]?.dimensionKeys).toEqual(['riskposture'])
    expect(bank.traits[0]?.competencyKeys).toEqual(['riskposture'])
    expect(bank.scoredItems[0]?.traitKey).toBe('riskposture')
  })
})
