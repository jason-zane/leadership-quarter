import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { DEFAULT_REPORT_CONFIG } from '@/utils/assessments/experience-config'
import type { AiOrientationSurveyReportData } from '@/utils/reports/report-document-types'

vi.mock('@/components/site/transition-link', () => ({
  TransitionLink: ({
    href,
    className,
    children,
  }: {
    href: string
    className?: string
    children: ReactNode
  }) => createElement('a', { href, className }, children),
}))

function makeReport(
  overrides: Partial<AiOrientationSurveyReportData> = {}
): AiOrientationSurveyReportData {
  return {
    submissionId: 'submission-1',
    firstName: 'Jason',
    lastName: 'Hunt',
    email: 'jason@example.com',
    completedAt: '2026-03-12T10:00:00.000Z',
    classification: 'Developing',
    opennessBand: 'Conditional Adopter',
    riskBand: 'Calibrated & Risk-Aware',
    capabilityBand: 'Developing',
    profileNarrative: 'Your profile is in a developing middle zone.',
    traitScores: [
      {
        traitId: 'trait-1',
        traitCode: 'openness',
        traitName: 'Curiosity',
        traitExternalName: null,
        dimensionId: 'dimension-1',
        dimensionCode: 'openness',
        dimensionName: 'Openness to AI',
        dimensionExternalName: null,
        dimensionPosition: 0,
        rawScore: 3.8,
        rawN: 4,
        scoreMethod: 'mean',
        description: null,
        zScore: 0.4,
        percentile: 66,
        band: 'Mid',
        alpha: 0.82,
        normSd: 0.7,
      },
    ],
    competencies: [
      {
        key: 'curiosity',
        label: 'Openness to AI',
        internalLabel: 'Openness to AI',
        description: 'Willingness and energy to engage with AI in practical work.',
        band: 'Conditional Adopter',
        bandMeaning: 'Open to AI when the use case feels practical, relevant, and low-risk.',
        commentary: 'Commentary',
      },
    ],
    narrativeInsights: [
      {
        title: 'Early Adopter',
        body: 'You embrace AI with enthusiasm and curiosity.',
      },
    ],
    recommendations: ['Start with one team workflow.'],
    reportConfig: {
      ...DEFAULT_REPORT_CONFIG,
      pdf_hidden_sections: [],
    },
    sectionAvailability: {
      overall_profile: true,
      competency_cards: true,
      percentile_benchmark: true,
      narrative_insights: true,
      development_recommendations: true,
    },
    ...overrides,
  }
}

describe('AiOrientationSurveyReportContent', () => {
  it('omits next steps and respects pdf-only hidden sections in document mode', () => {
    const html = renderToStaticMarkup(
      createElement(AiOrientationSurveyReportContent, {
        report: makeReport({
          reportConfig: {
            ...DEFAULT_REPORT_CONFIG,
            pdf_hidden_sections: ['narrative_insights'],
          },
        }),
        documentMode: true,
      })
    )

    expect(html).toContain('assessment-web-report-document')
    expect(html).not.toContain('Next steps')
    expect(html).not.toContain('Dive deeper on AI readiness')
    expect(html).not.toContain('Narrative insights')
  })

  it('keeps next steps and ignores pdf-only hidden sections on the web report', () => {
    const html = renderToStaticMarkup(
      createElement(AiOrientationSurveyReportContent, {
        report: makeReport({
          reportConfig: {
            ...DEFAULT_REPORT_CONFIG,
            pdf_hidden_sections: ['narrative_insights'],
          },
        }),
      })
    )

    expect(html).toContain('Next steps')
    expect(html).toContain('Dive deeper on AI readiness')
    expect(html).toContain('Narrative insights')
  })
})
