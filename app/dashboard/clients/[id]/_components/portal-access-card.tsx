'use client'

import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type PortalLaunchReason = 'available' | 'viewer_lacks_access' | 'organisation_unavailable'

function getReasonCopy(reason: PortalLaunchReason) {
  switch (reason) {
    case 'organisation_unavailable':
      return 'This client is not in an active state, so the portal cannot be launched right now.'
    case 'viewer_lacks_access':
      return 'This backend admin account currently has client portal launch turned off. Re-enable it from Users if needed.'
    default:
      return 'Open this client portal in the same view the client would see, using internal admin bypass access.'
  }
}

export function PortalAccessCard({
  organisationId,
  canLaunchPortal,
  portalLaunchReason,
}: {
  organisationId: string
  canLaunchPortal: boolean
  portalLaunchReason: PortalLaunchReason
}) {
  return (
    <FoundationSurface className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Portal access</h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          {getReasonCopy(portalLaunchReason)}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[rgba(255,255,255,0.58)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
              Launch state
            </p>
            <p className="text-sm font-medium text-[var(--admin-text-primary)]">
              {canLaunchPortal ? 'Available now' : 'Unavailable'}
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Portal bypass keeps the back action inside the portal pointed at the admin dashboard.
            </p>
          </div>

          {canLaunchPortal ? (
            <form
              action={`/api/admin/organisations/${organisationId}/portal-launch`}
              method="post"
              target="_blank"
            >
              <FoundationButton type="submit" variant="primary">
                View client portal
              </FoundationButton>
            </form>
          ) : (
            <FoundationButton type="button" variant="secondary" disabled>
              View client portal
            </FoundationButton>
          )}
        </div>
      </div>
    </FoundationSurface>
  )
}
