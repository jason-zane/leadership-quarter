import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { V2AssessmentCampaignsWorkspace } from '../_components/v2-assessment-campaigns-workspace'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentCampaignsPage({ params }: Props) {
  const { id } = await params

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Campaign attachments"
        description="See where this assessment is used, separate Leadership Quarter work from client delivery, and manage campaign actions without leaving the workspace."
      />

      <V2AssessmentCampaignsWorkspace assessmentId={id} />
    </DashboardPageShell>
  )
}
