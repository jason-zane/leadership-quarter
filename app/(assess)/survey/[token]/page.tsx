import { redirect } from 'next/navigation'

export default async function LegacyInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/assess/i/${encodeURIComponent(token)}`)
}
