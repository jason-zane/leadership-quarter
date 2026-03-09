import Link from 'next/link'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

export function CampaignStatsGrid({
  campaignId,
  activeAssessments,
  organisationName,
  registrationPosition,
  responseCount,
}: {
  campaignId: string
  activeAssessments: number
  organisationName: string
  registrationPosition: string
  responseCount: number | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard label="Assessments" value={activeAssessments} />
      <StatCard label="Organisation" value={organisationName} />
      <StatCard label="Registration" value={registrationPosition} />
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Responses</p>
        <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">
          {responseCount ?? '-'}
        </p>
        <Link
          href={`/dashboard/campaigns/${campaignId}/responses`}
          className="mt-1 block text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          View responses
        </Link>
      </div>
    </div>
  )
}
