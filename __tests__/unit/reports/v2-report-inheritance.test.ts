import { describe, expect, it } from 'vitest'
import { createEmptyReportTemplate } from '@/utils/assessments/assessment-report-template'
import { createDefaultAssessmentReport } from '@/utils/reports/assessment-report-records'
import {
  createReportOverrideDefinition,
  getBaseReportFor,
  hasReportOverrides,
  resolveReportTemplate,
} from '@/utils/reports/assessment-report-inheritance'

describe('assessment report inheritance', () => {
  it('resolves audience reports from the shared base when no overrides exist', () => {
    const baseReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
      templateDefinition: {
        ...createEmptyReportTemplate(),
        blocks: [{
          id: 'base_1',
          source: 'derived_outcome',
          format: 'hero_card',
          enabled: true,
        }],
      },
    })
    const audienceReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'audience',
      audienceRole: 'candidate',
      baseReportId: 'base_1',
      templateDefinition: createEmptyReportTemplate(),
    })

    const template = resolveReportTemplate({
      report: audienceReport,
      baseReport,
    })

    expect(template.blocks[0]?.source).toBe('report_header')
  })

  it('prefers a local override template when one exists', () => {
    const baseReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
      templateDefinition: createEmptyReportTemplate(),
    })
    const audienceReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'audience',
      audienceRole: 'candidate',
      baseReportId: 'base_1',
      overrideDefinition: createReportOverrideDefinition({
        ...createEmptyReportTemplate(),
        blocks: [{
          id: 'override_1',
          source: 'recommendations',
          format: 'bullet_list',
          enabled: true,
        }],
      }),
    })

    expect(hasReportOverrides(audienceReport)).toBe(true)

    const template = resolveReportTemplate({
      report: audienceReport,
      baseReport,
    })

    expect(template.blocks[0]?.source).toBe('report_header')
  })

  it('finds the base report from the report collection', () => {
    const baseReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
    })
    const audienceReport = createDefaultAssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'audience',
      audienceRole: 'client',
      baseReportId: baseReport.id,
    })

    const found = getBaseReportFor({
      report: audienceReport,
      reports: [audienceReport, baseReport],
    })

    expect(found?.reportKind).toBe('base')
  })
})
