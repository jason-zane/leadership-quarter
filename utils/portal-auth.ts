import { redirect } from 'next/navigation'
import { getClientLoginUrl } from '@/utils/auth-urls'
import { resolvePortalContext } from '@/utils/portal-context'
import type { PortalAuthContext, PortalRole } from '@/utils/portal/types'

export async function requirePortalUser(): Promise<PortalAuthContext> {
  const { context } = await resolvePortalContext()
  if (!context) {
    redirect(getClientLoginUrl({ error: 'unauthorized' }))
  }

  return context
}

export async function requirePortalRole(allowed: PortalRole[]): Promise<PortalAuthContext> {
  const context = await requirePortalUser()

  if (!context.isBypassAdmin && !allowed.includes(context.role)) {
    redirect('/portal?error=forbidden')
  }

  return context
}
