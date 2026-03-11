import { describe, expect, it } from 'vitest'
import { DEFAULT_REPORT_CONFIG } from '@/utils/assessments/experience-config'
import {
  getAssessmentReportSectionAvailability,
  getAssessmentReportSectionLabels,
  getAssessmentReportSections,
} from '@/utils/reports/assessment-report-sections'

describe('assessment report sections', () => {
  it('maps report config to the standard section labels', () => {
    const labels = getAssessmentReportSectionLabels(
      {
        ...DEFAULT_REPORT_CONFIG,
        show_trait_scores: false,
        show_recommendations: false,
      },
      {
        overall_profile: true,
        competency_cards: true,
        percentile_benchmark: true,
        narrative_insights: true,
        development_recommendations: true,
      }
    )

    expect(labels).toEqual([
      'Overall profile',
      'Competency cards',
      'Narrative insights',
    ])
  })

  it('uses STEN-specific section labels when the STEN template is enabled', () => {
    const labels = getAssessmentReportSectionLabels(
      {
        ...DEFAULT_REPORT_CONFIG,
        report_template: 'sten_profile',
      },
      {
        overall_profile: true,
        competency_cards: true,
        percentile_benchmark: true,
        narrative_insights: false,
        development_recommendations: false,
      }
    )

    expect(labels).toEqual([
      'Overall profile',
      'Competency profiles',
      'Trait profiles',
    ])
  })

  it('marks unavailable sections as hidden even when enabled', () => {
    const sections = getAssessmentReportSections(DEFAULT_REPORT_CONFIG, {
      overall_profile: true,
      competency_cards: true,
      percentile_benchmark: false,
      narrative_insights: false,
      development_recommendations: true,
    })

    expect(sections.find((section) => section.id === 'percentile_benchmark')).toMatchObject({
      enabled: true,
      available: false,
      visible: false,
    })
    expect(sections.find((section) => section.id === 'narrative_insights')).toMatchObject({
      enabled: true,
      available: false,
      visible: false,
    })
  })

  it('derives section availability from generic assessment report data', () => {
    const availability = getAssessmentReportSectionAvailability({
      classification: {
        key: 'profile',
        label: 'Ready Operator',
        description: null,
      },
      dimensions: [{
        key: 'curiosity',
        label: 'Curiosity',
        internalLabel: 'Curiosity',
        descriptor: 'Strong',
        description: null,
        bandMeaning: null,
        bandIndex: 0,
          bandCount: 3,
      }],
      dimensionProfiles: [],
      traitProfiles: [],
      profileStatus: {
        dimension: 'unavailable',
        trait: 'unavailable',
      },
      traitScores: [
        {
          traitId: 'trait-1',
          traitCode: 'curiosity',
          traitName: 'Curiosity',
          traitExternalName: null,
          dimensionId: 'dimension-1',
          dimensionCode: 'curiosity',
          dimensionName: 'Curiosity',
          dimensionExternalName: null,
          dimensionPosition: 0,
          rawScore: 75,
          rawN: 4,
          scoreMethod: 'mean',
          description: null,
          zScore: 0.88,
          percentile: 81,
          band: 'High',
          alpha: null,
          normSd: null,
        },
      ],
      interpretations: [{ targetType: 'trait', ruleType: 'band_text', title: 'Curiosity', body: 'Insight body', priority: 1 }],
      hasPsychometricData: true,
      recommendations: ['Focus on guided practice.'],
      reportConfig: DEFAULT_REPORT_CONFIG,
    })

    expect(availability).toEqual({
      overall_profile: true,
      competency_cards: true,
      percentile_benchmark: true,
      narrative_insights: true,
      development_recommendations: true,
    })
  })

  it('hides percentile benchmark availability when the report uses raw scores', () => {
    const availability = getAssessmentReportSectionAvailability({
      classification: {
        key: 'profile',
        label: 'Ready Operator',
        description: null,
      },
      dimensions: [{
        key: 'curiosity',
        label: 'Curiosity',
        internalLabel: 'Curiosity',
        descriptor: 'Strong',
        description: null,
        bandMeaning: null,
        bandIndex: 0,
          bandCount: 3,
      }],
      dimensionProfiles: [],
      traitProfiles: [],
      profileStatus: {
        dimension: 'unavailable',
        trait: 'unavailable',
      },
      traitScores: [
        {
          traitId: 'trait-1',
          traitCode: 'curiosity',
          traitName: 'Curiosity',
          traitExternalName: null,
          dimensionId: 'dimension-1',
          dimensionCode: 'curiosity',
          dimensionName: 'Curiosity',
          dimensionExternalName: null,
          dimensionPosition: 0,
          rawScore: 75,
          rawN: 4,
          scoreMethod: 'mean',
          description: null,
          zScore: 0.88,
          percentile: 81,
          band: 'High',
          alpha: null,
          normSd: null,
        },
      ],
      interpretations: [{ targetType: 'trait', ruleType: 'band_text', title: 'Curiosity', body: 'Insight body', priority: 1 }],
      hasPsychometricData: true,
      recommendations: ['Focus on guided practice.'],
      reportConfig: {
        ...DEFAULT_REPORT_CONFIG,
        scoring_display_mode: 'raw',
      },
    })

    expect(availability.percentile_benchmark).toBe(false)
  })

  it('treats hidden-until-norms STEN sections as available placeholders', () => {
    const availability = getAssessmentReportSectionAvailability({
      classification: {
        key: 'profile',
        label: 'Ready Operator',
        description: null,
      },
      dimensions: [],
      dimensionProfiles: [],
      traitProfiles: [],
      profileStatus: {
        dimension: 'hidden_until_norms',
        trait: 'hidden_until_norms',
      },
      traitScores: [],
      interpretations: [],
      hasPsychometricData: false,
      recommendations: [],
      reportConfig: {
        ...DEFAULT_REPORT_CONFIG,
        report_template: 'sten_profile',
      },
    })

    expect(availability).toEqual({
      overall_profile: true,
      competency_cards: true,
      percentile_benchmark: true,
      narrative_insights: false,
      development_recommendations: false,
    })
  })
})
