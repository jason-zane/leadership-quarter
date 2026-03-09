import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import type { AssessmentReportSectionAvailability } from '@/utils/reports/assessment-report-sections'
import type { ReportConfig } from '@/utils/assessments/experience-config'
import type { AiReadinessBands, AiReadinessClassification } from '@/utils/services/ai-readiness-scoring'
import type { Lq8Application, Lq8Competency, Lq8Quadrant } from '@/utils/brand/lq8-content'

export type ReportDocumentType = 'assessment' | 'lq8' | 'ai' | 'ai_survey'

export type AiCapabilityCompetencyChapter = {
  title: string
  label: string
  definition: string
  contextualisation: string
  behaviouralIndicators: string[]
  riskIfWeak: string
  impactWhenStrong: string
  drives: string
}

export type AiCapabilityCard = {
  title: string
  body: string
}

export type AiOrientationSurveyReportData = {
  submissionId: string
  firstName: string
  lastName: string
  email: string | null
  completedAt: string | null
  classification: AiReadinessClassification
  opennessBand: AiReadinessBands['openness']
  riskBand: AiReadinessBands['riskPosture']
  capabilityBand: AiReadinessBands['capability']
  profileNarrative: string
  traitScores: AssessmentReportData['traitScores']
  competencies: Array<{
    key: 'curiosity' | 'judgement' | 'skill'
    label: string
    band: string
    commentary: string
  }>
  narrativeInsights: Array<{
    title: string
    body: string
  }>
  recommendations: string[]
  reportConfig: ReportConfig
  sectionAvailability: AssessmentReportSectionAvailability
}

export type AssessmentReportDocument = {
  kind: 'assessment'
  templateVersion: 'v1'
  filename: string
  report: AssessmentReportData
}

export type Lq8ReportDocument = {
  kind: 'lq8'
  templateVersion: 'v1'
  filename: string
  quadrants: Lq8Quadrant[]
  competencies: Lq8Competency[]
  applications: Lq8Application[]
}

export type AiCapabilityReportDocument = {
  kind: 'ai'
  templateVersion: 'v1'
  filename: string
  competencyChapters: AiCapabilityCompetencyChapter[]
  structuralModel: AiCapabilityCard[]
  interdependencePatterns: string[]
  deploymentLevels: AiCapabilityCard[]
}

export type AiOrientationSurveyReportDocument = {
  kind: 'ai_survey'
  templateVersion: 'v1'
  filename: string
  report: AiOrientationSurveyReportData
}

export type ReportDocument =
  | AssessmentReportDocument
  | Lq8ReportDocument
  | AiCapabilityReportDocument
  | AiOrientationSurveyReportDocument
