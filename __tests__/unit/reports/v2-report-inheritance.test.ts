import { describe, expect, it } from 'vitest'
import { createEmptyV2ReportTemplate } from '@/utils/assessments/v2-report-template'
import { createDefaultV2AssessmentReport } from '@/utils/reports/v2-assessment-reports'
import {
  createV2ReportOverrideDefinition,
  getBaseReportFor,
  hasV2ReportOverrides,
  resolveV2ReportTemplate,
} from '@/utils/reports/v2-report-inheritance'

describe('v2 report inheritance', () => {
  it('resolves audience reports from the shared base when no overrides exist', () => {
    const baseReport = createDefaultV2AssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
      templateDefinition: {
        ...createEmptyV2ReportTemplate(),
        blocks: [{
          id: 'base_1',
          source: 'derived_outcome',
          format: 'hero_card',
          enabled: true,
        }],
      },
    })
    const audienceReport = createDefaultV2AssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'audience',
      audienceRole: 'candidate',
      baseReportId: 'base_1',
      templateDefinition: createEmptyV2ReportTemplate(),
    })

    const template = resolveV2ReportTemplate({
      report: audienceReport,
      baseReport,
    })

    expect(template.blocks[0]?.source).toBe('derived_outcome')
  })

  it('prefers a local override template when one exists', () => {
    const baseReport = createDefaultV2AssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
      templateDefinition: createEmptyV2ReportTemplate(),
    })
    const audienceReport = createDefaultV2AssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'audience',
      audienceRole: 'candidate',
      baseReportId: 'base_1',
      overrideDefinition: createV2ReportOverrideDefinition({
        ...createEmptyV2ReportTemplate(),
        blocks: [{
          id: 'override_1',
          source: 'recommendations',
          format: 'bullet_list',
          enabled: true,
        }],
      }),
    })

    expect(hasV2ReportOverrides(audienceReport)).toBe(true)

    const template = resolveV2ReportTemplate({
      report: audienceReport,
      baseReport,
    })

    expect(template.blocks[0]?.source).toBe('recommendations')
  })

  it('finds the base report from the report collection', () => {
    const baseReport = createDefaultV2AssessmentReport({
      assessmentId: 'assessment_1',
      reportKind: 'base',
      audienceRole: 'base',
    })
    const audienceReport = createDefaultV2AssessmentReport({
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
