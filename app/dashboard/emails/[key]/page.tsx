import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendTestEmailTemplate, updateEmailTemplate } from '@/app/dashboard/emails/actions'
import { TemplateEditorForm } from '@/components/dashboard/emails/template-editor-form'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type EmailTemplateRow = {
  key: string
  name: string
  description: string | null
  subject: string
  html_body: string
  text_body: string | null
  status: 'draft' | 'active'
  updated_at: string
}

type UsageOption = {
  usage_key: string
  usage_name: string
  description: string | null
  route_hint: string | null
  template_key: string | null
}

type VersionRow = {
  version: number
  created_at: string
  change_note: string | null
}

export default async function EmailTemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { key } = await params
  const qs = await searchParams

  const auth = await requireDashboardUser()
  if (!auth.authorized) return null

  const adminClient = createAdminClient()
  if (!adminClient) {
    return (
      <section>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Missing SUPABASE_SERVICE_ROLE_KEY. Cannot load template editor.
        </p>
      </section>
    )
  }

  const [
    { data: templateData, error: templateError },
    { data: usageData },
    { data: versionData, error: versionError },
  ] = await Promise.all([
    adminClient
      .from('email_templates')
      .select('key, name, description, subject, html_body, text_body, status, updated_at')
      .eq('key', key)
      .maybeSingle(),
    adminClient
      .from('email_template_usages')
      .select('usage_key, usage_name, description, route_hint, template_key')
      .order('usage_name', { ascending: true }),
    adminClient
      .from('email_template_versions')
      .select('version, created_at, change_note')
      .eq('template_key', key)
      .order('version', { ascending: false })
      .limit(8),
  ])

  if (templateError) {
    return (
      <section>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Could not load template: {templateError.message}</p>
      </section>
    )
  }

  if (!templateData) notFound()

  const template = templateData as EmailTemplateRow
  const usageOptions = ((usageData ?? []) as UsageOption[]).map((usage) => ({
    usage_key: usage.usage_key,
    usage_name: usage.usage_name,
  }))
  const attachedUsages = ((usageData ?? []) as UsageOption[]).filter((usage) => usage.template_key === template.key)
  const selectedUsageKey = attachedUsages[0]?.usage_key ?? ''
  const versions = (versionData ?? []) as VersionRow[]

  const saveSucceeded = typeof qs.saved === 'string'
  const hasSaveError = typeof qs.error === 'string'

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Email operations"
        title={template.name}
        description={template.description ?? 'No description added yet.'}
        actions={
          <>
            <span
              className={[
                'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                template.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]',
              ].join(' ')}
            >
              {template.status}
            </span>
            <Link href="/dashboard/emails" className="foundation-btn foundation-btn-secondary px-3 py-2 text-xs">
              Back
            </Link>
          </>
        }
      />

      <p className="text-xs text-[var(--admin-text-muted)]">Last updated: {new Date(template.updated_at).toLocaleString()}</p>

      {saveSucceeded ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {qs.saved === 'test_sent' ? 'Test email sent.' : qs.saved === 'created' ? 'Template created.' : 'Template saved.'}
        </div>
      ) : null}

      {hasSaveError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {qs.error === 'invalid_test_email'
            ? 'Enter a valid test email address.'
            : qs.error === 'test_email_not_configured'
              ? 'Test email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.'
              : qs.error === 'test_send_failed'
                ? 'Could not send test email. Check sender/domain configuration.'
                : 'Could not save template. Please try again.'}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <FoundationSurface className="p-4 lg:col-span-2">
          <TemplateEditorForm
            templateKey={template.key}
            defaultSubject={template.subject}
            defaultHtmlBody={template.html_body}
            defaultTextBody={template.text_body ?? ''}
            defaultStatus={template.status ?? 'draft'}
            selectedUsageKey={selectedUsageKey}
            usageOptions={usageOptions}
            saveAction={updateEmailTemplate}
            testAction={sendTestEmailTemplate}
            defaultTestTo={auth.user.email ?? ''}
          />
        </FoundationSurface>

        <div className="space-y-4">
          <FoundationSurface className="p-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Attached flows</h2>
            {attachedUsages.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {attachedUsages.map((usage) => (
                  <li key={usage.usage_key} className="rounded-lg bg-[var(--admin-surface-alt)] p-2.5 text-xs">
                    <p className="font-semibold text-[var(--admin-text-primary)]">{usage.usage_name}</p>
                    <p className="mt-1 font-mono text-[var(--admin-text-muted)]">{usage.usage_key}</p>
                    {usage.route_hint ? <p className="mt-1 text-[var(--admin-text-muted)]">Route: {usage.route_hint}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--admin-text-muted)]">No attached flows yet.</p>
            )}
          </FoundationSurface>

          <FoundationSurface className="p-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Recent versions</h2>
            {versionError ? (
              <p className="mt-2 text-sm text-red-600">Could not load versions: {versionError.message}</p>
            ) : versions.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--admin-text-muted)]">No versions saved yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {versions.map((version) => (
                  <li key={version.version} className="rounded-lg bg-[var(--admin-surface-alt)] p-2.5 text-xs">
                    <p className="font-semibold text-[var(--admin-text-primary)]">v{version.version}</p>
                    <p className="mt-1 text-[var(--admin-text-muted)]">{new Date(version.created_at).toLocaleString()}</p>
                    {version.change_note ? (
                      <p className="mt-1 text-[var(--admin-text-muted)]">{version.change_note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </FoundationSurface>
        </div>
      </div>
    </DashboardPageShell>
  )
}
