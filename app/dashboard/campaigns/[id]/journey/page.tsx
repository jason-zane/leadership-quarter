'use client'

import { useParams } from 'next/navigation'
import { CampaignJourneyForm } from '../_components/campaign-journey-form'

export default function CampaignJourneyPage() {
  const params = useParams<{ id: string }>()
  return <CampaignJourneyForm campaignId={params.id} />
}
