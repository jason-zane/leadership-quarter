import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { createEmailTemplate } from '@/app/dashboard/emails/actions'
import { NewTemplateForm } from '@/components/dashboard/emails/new-template-form'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'

type UsageOption = {
  usage_key: string
  usage_name: string
  description: string | null
}

export default async function NewEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const adminClient = createAdminClient()
  let usageOptions: UsageOption[] = []
  let loadError: string | null = null

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY. Cannot load usage options.'
  } else {
    const { data, error } = await adminClient
      .from('email_template_usages')
      .select('usage_key, usage_name, description')
      .order('usage_name', { ascending: true })
    if (error) {
      loadError = error.message
    } else {
      usageOptions = (data ?? []) as UsageOption[]
    }
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Email operations"
        title="Create Template"
        description="Start with content and subject, map it to a flow, then test before activation."
        actions={
          <Link href="/dashboard/emails" className="foundation-btn foundation-btn-secondary px-3 py-2 text-sm">
            Back to templates
          </Link>
        }
      />

      {typeof params.error === 'string' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error === 'missing_fields'
            ? 'Name, subject, and email body are required.'
            : 'Could not create template. Please try again.'}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load usage options: {loadError}
        </div>
      ) : null}

      <NewTemplateForm
        action={createEmailTemplate}
        usageOptions={usageOptions.map((usage) => ({
          usage_key: usage.usage_key,
          usage_name: usage.usage_name,
        }))}
      />
    </DashboardPageShell>
  )
}
