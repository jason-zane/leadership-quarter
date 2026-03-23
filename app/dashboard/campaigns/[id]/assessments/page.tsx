'use client'

import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { CampaignAssessmentDeliveryPanel } from '../_components/campaign-assessment-delivery-panel'

export default function CampaignAssessmentsPage() {
  const params = useParams<{ id: string }>()
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign"
        title="Assessments"
        description="Attach assessments, configure report delivery, and review org quota usage for this campaign."
      />
      <CampaignAssessmentDeliveryPanel campaignId={params.id} />
    </DashboardPageShell>
  )
}
