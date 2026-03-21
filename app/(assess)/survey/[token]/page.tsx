import { redirect } from 'next/navigation'

// Compatibility alias for old invitation links. Canonical invitation route is /assess/i/[token].
export default async function LegacyInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/assess/i/${encodeURIComponent(token)}`)
}
