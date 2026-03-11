import { AssessmentExperienceConfigEditor } from '@/components/dashboard/assessments/experience-config-editor'
import { ReportVariantsManager } from '@/components/dashboard/assessments/report-variants-manager'
import { getReportCompetencyDefinitions, getReportTraitDefinitions } from '@/utils/reports/report-overrides'
import { listAdminReportVariants } from '@/utils/services/admin-report-variants'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAdminAssessment } from '@/utils/services/admin-assessments'

type Props = {
  params: Promise<{ id: string }>
}

type AssessmentRecord = {
  runner_config?: unknown
  report_config?: unknown
  scoring_config?: unknown
}

type AssessmentTraitRow = {
  code?: string | null
  external_name?: string | null
  name?: string | null
  description?: string | null
}

export default async function AssessmentReportConfigPage({ params }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const result = await getAdminAssessment({
    adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return <p className="text-sm text-red-600">Assessment not found.</p>
  }

  const assessment = result.data.assessment as AssessmentRecord
  const competencies = getReportCompetencyDefinitions(assessment.scoring_config)
  const [traitsResult, dimensionNormsResult, traitNormsResult, variantsResult] = await Promise.all([
    adminClient
      .from('assessment_traits')
      .select('code, external_name, name, description')
      .eq('assessment_id', id)
      .order('code'),
    adminClient
      .from('dimension_norm_stats')
      .select('id, assessment_dimensions!inner(assessment_id)')
      .eq('assessment_dimensions.assessment_id', id)
      .limit(1),
    adminClient
      .from('norm_stats')
      .select('id, assessment_traits!inner(assessment_id)')
      .eq('assessment_traits.assessment_id', id)
      .limit(1),
    listAdminReportVariants({
      adminClient,
      assessmentId: id,
    }),
  ])

  const traitRows = (traitsResult.data ?? []) as AssessmentTraitRow[]
  const reportVariants = variantsResult.ok ? variantsResult.data.variants : []
  const defaultVariant = reportVariants.find((variant) => variant.is_default) ?? null
  const publishedVariantCount = reportVariants.filter((variant) => variant.status === 'published').length

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Start with the shared assessment report settings, then publish the report variants campaigns and internal users will actually use.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Published variants</p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{publishedVariantCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Assessment default</p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{defaultVariant?.name ?? 'Not set'}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Best workflow</p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Shared defaults first, delivery variants second</p>
          </div>
        </div>
      </section>

      <AssessmentExperienceConfigEditor
        assessmentId={id}
        initialRunnerConfig={assessment.runner_config ?? {}}
        initialReportConfig={assessment.report_config ?? {}}
        competencies={competencies}
        traits={getReportTraitDefinitions(traitRows)}
        readiness={{
          hasCompetencies: competencies.length > 0,
          hasTraits: traitRows.length > 0,
          hasDimensionNorms: Boolean(dimensionNormsResult.data?.length),
          hasTraitNorms: Boolean(traitNormsResult.data?.length),
        }}
        mode="report"
      />
      <ReportVariantsManager assessmentId={id} />
    </div>
  )
}
