import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { CampaignTabBar } from './_components/campaign-tab-bar'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export default async function CampaignLayout({ params, children }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  let campaignName = 'Campaign'
  if (adminClient) {
    const { data } = await adminClient
      .from('campaigns')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (data?.name) campaignName = data.name
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/campaigns" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{campaignName}</span>
      </nav>

      <CampaignTabBar campaignId={id} />

      <div>{children}</div>
    </div>
  )
}
