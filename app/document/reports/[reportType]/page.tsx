import type { Metadata } from 'next'
import { AssessmentReportView } from '@/components/reports/assessment-report-view'
import { AiCapabilityReportContent } from '@/components/reports/report-pages/ai-capability-report-content'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { Lq8ReportContent } from '@/components/reports/report-pages/lq8-report-content'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import type { ReportDocument, ReportDocumentType } from '@/utils/reports/report-document-types'

type Props = {
  params: Promise<{ reportType: string }>
  searchParams: Promise<{ access?: string }>
}

const documentMetadataBase = {
  robots: {
    index: false,
    follow: false,
  },
} satisfies Pick<Metadata, 'robots'>

function getDocumentTitle(document: ReportDocument) {
  if (document.kind === 'assessment') {
    const title = document.report.reportConfig.title.trim() || document.report.assessment.name
    return `${title} | Leadership Quarter`
  }

  if (document.kind === 'lq8') {
    return 'LQ8 Leadership Report | Leadership Quarter'
  }

  if (document.kind === 'ai') {
    return 'AI Capability Model Report | Leadership Quarter'
  }

  return 'AI Orientation Survey Report | Leadership Quarter'
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { reportType } = await params
  const { access } = await searchParams

  const supported = ['assessment', 'lq8', 'ai', 'ai_survey'] as const
  if (!access || !supported.includes(reportType as (typeof supported)[number])) {
    return {
      ...documentMetadataBase,
      title: 'Report Document | Leadership Quarter',
    }
  }

  const result = await assembleReportDocument({
    reportType: reportType as ReportDocumentType,
    accessToken: access,
  })

  if (!result.ok) {
    return {
      ...documentMetadataBase,
      title: 'Report Document | Leadership Quarter',
    }
  }

  return {
    ...documentMetadataBase,
    title: getDocumentTitle(result.data),
  }
}

function InvalidDocument() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[var(--site-text-primary)] md:px-12">
      <section className="site-card-strong p-8 md:p-10">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Document
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">Document unavailable</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          This document could not be generated from the provided report access.
        </p>
      </section>
    </main>
  )
}

export default async function ReportDocumentPage({ params, searchParams }: Props) {
  const { reportType } = await params
  const { access } = await searchParams

  if (!access) {
    return <InvalidDocument />
  }

  const supported = ['assessment', 'lq8', 'ai', 'ai_survey'] as const
  if (!supported.includes(reportType as (typeof supported)[number])) {
    return <InvalidDocument />
  }

  const result = await assembleReportDocument({
    reportType: reportType as ReportDocumentType,
    accessToken: access,
  })

  if (!result.ok) {
    return <InvalidDocument />
  }

  const document = result.data

  if (document.kind === 'assessment') {
    return (
      <main className="assess-report-route report-document-shell">
        <AssessmentReportView report={document.report} documentMode />
      </main>
    )
  }

  if (document.kind === 'lq8') {
    return (
      <main className="report-document-shell site-framework-report mx-auto max-w-5xl px-6 py-12 text-[var(--site-text-primary)] md:px-12">
        <Lq8ReportContent />
      </main>
    )
  }

  if (document.kind === 'ai') {
    return (
      <main className="report-document-shell site-framework-report mx-auto max-w-6xl px-6 py-12 text-[var(--site-text-primary)] md:px-12">
        <AiCapabilityReportContent />
      </main>
    )
  }

  return (
    <main className="report-document-shell site-framework-report mx-auto max-w-5xl px-6 py-12 text-[var(--site-text-primary)] md:px-12">
      <AiOrientationSurveyReportContent report={document.report} />
    </main>
  )
}
