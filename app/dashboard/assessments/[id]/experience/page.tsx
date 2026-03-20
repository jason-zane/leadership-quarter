import Link from 'next/link'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export default function AssessmentExperienceRedirectPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Experience settings moved"
        description="The participant experience is now configured per-campaign."
      />

      <FoundationSurface className="p-6">
        <p className="text-sm text-[var(--admin-text-muted)]">
          Experience settings — opening screens, question state, finalising, and completion — are now managed
          on each campaign. Open a campaign to configure the participant experience.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/campaigns"
            className="foundation-btn foundation-btn-primary foundation-btn-md"
          >
            Go to campaigns
          </Link>
        </div>
      </FoundationSurface>
    </DashboardPageShell>
  )
}
