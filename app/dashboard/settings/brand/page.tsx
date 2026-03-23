import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { PlatformBrandEditor } from '@/components/dashboard/settings/platform-brand-editor'

export default function PlatformBrandPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="System"
        title="Platform Brand"
        description="Define the default Leadership Quarter brand. These seeds control every candidate-facing surface when no client brand is active. Changes are persisted to the database and take effect immediately."
      />

      <PlatformBrandEditor />
    </DashboardPageShell>
  )
}
