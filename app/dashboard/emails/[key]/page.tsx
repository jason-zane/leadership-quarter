import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendTestEmailTemplate, updateEmailTemplate } from '@/app/dashboard/emails/actions'
import { TemplateEditorForm } from '@/components/dashboard/emails/template-editor-form'
import { requireDashboardUser } from '@/utils/dashboard-auth'

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
  if (!auth.authorized) {
    return null
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return (
      <section>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
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
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load template: {templateError.message}
        </p>
      </section>
    )
  }

  if (!templateData) {
    notFound()
  }

  const template = templateData as EmailTemplateRow
  const usageOptions = ((usageData ?? []) as UsageOption[]).map((usage) => ({
    usage_key: usage.usage_key,
    usage_name: usage.usage_name,
  }))
  const attachedUsages = ((usageData ?? []) as UsageOption[]).filter(
    (usage) => usage.template_key === template.key
  )
  const selectedUsageKey = attachedUsages[0]?.usage_key ?? ''
  const versions = (versionData ?? []) as VersionRow[]

  const saveSucceeded = typeof qs.saved === 'string'
  const hasSaveError = typeof qs.error === 'string'

  return (
    <section>
      <div className="mb-6">
        <Link
          href="/dashboard/emails"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Back to templates
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{template.name}</h1>
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
        {template.description ?? 'No description added yet.'}
      </p>
      <p className="mb-6 text-xs text-zinc-400 dark:text-zinc-500">
        Last updated: {new Date(template.updated_at).toLocaleString()}
      </p>

      {saveSucceeded ? (
        <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          {qs.saved === 'test_sent'
            ? 'Test email sent.'
            : qs.saved === 'created'
              ? 'Template created.'
              : 'Email template saved.'}
        </p>
      ) : null}

      {hasSaveError ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {qs.error === 'invalid_test_email'
            ? 'Enter a valid test email address.'
            : qs.error === 'test_email_not_configured'
              ? 'Test email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.'
              : qs.error === 'test_send_failed'
                ? 'Could not send test email. Check your sender/domain configuration.'
                : 'Could not save template. Please try again.'}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Attached To</h2>
          {attachedUsages.length > 0 ? (
            <ul className="space-y-2">
              {attachedUsages.map((usage) => (
                <li key={usage.usage_key} className="rounded bg-zinc-50 p-2 text-sm dark:bg-zinc-800">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">{usage.usage_name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{usage.usage_key}</p>
                  {usage.route_hint ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Route: {usage.route_hint}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Not attached to a website flow yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent Versions</h2>
          {versionError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Could not load versions: {versionError.message}
            </p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No versions saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map((version) => (
                <li key={version.version} className="rounded bg-zinc-50 p-2 text-sm dark:bg-zinc-800">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">v{version.version}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                  {version.change_note ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{version.change_note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
    </section>
  )
}
