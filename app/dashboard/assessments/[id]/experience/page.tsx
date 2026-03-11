import { AssessmentExperienceConfigEditor } from '@/components/dashboard/assessments/experience-config-editor'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAdminAssessment } from '@/utils/services/admin-assessments'

type Props = {
  params: Promise<{ id: string }>
}

type AssessmentRecord = {
  runner_config?: unknown
  report_config?: unknown
}

export default async function AssessmentExperiencePage({ params }: Props) {
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Assessment experience</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          This tab controls the participant journey only. Use Questions, Scoring, and Reports for content and interpretation changes.
        </p>
      </section>

      <AssessmentExperienceConfigEditor
        assessmentId={id}
        initialRunnerConfig={assessment.runner_config ?? {}}
        initialReportConfig={assessment.report_config ?? {}}
        mode="experience"
      />
    </div>
  )
}
