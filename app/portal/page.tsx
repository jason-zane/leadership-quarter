import { requirePortalUser } from '@/utils/portal-auth'

export default async function PortalPage() {
  const auth = await requirePortalUser()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Client Portal</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Signed in as {auth.email ?? 'Unknown user'} with role <strong>{auth.role}</strong>.
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Access mode: <strong>{auth.isBypassAdmin ? 'Leadership Quarter admin bypass' : 'Organisation membership'}</strong>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Organisation: <strong>{auth.organisationSlug}</strong>
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Portal API foundation is active. UI pages for campaigns, invitations, responses, analytics,
        and exports can now be connected.
      </p>
    </section>
  )
}
