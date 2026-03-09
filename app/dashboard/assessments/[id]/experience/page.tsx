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
    <AssessmentExperienceConfigEditor
      assessmentId={id}
      initialRunnerConfig={assessment.runner_config ?? {}}
      initialReportConfig={assessment.report_config ?? {}}
      mode="experience"
    />
  )
}
