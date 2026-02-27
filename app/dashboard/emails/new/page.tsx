import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { createEmailTemplate } from '@/app/dashboard/emails/actions'
import { NewTemplateForm } from '@/components/dashboard/emails/new-template-form'

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
    <section>
      <div className="mb-6">
        <Link
          href="/dashboard/emails"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Back to templates
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Create Email Template</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Start with a name and subject, then use the visual editor to write your content.
      </p>

      {typeof params.error === 'string' ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {params.error === 'missing_fields'
            ? 'Name, subject, and email body are required.'
            : 'Could not create template. Please try again.'}
        </p>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load usage options: {loadError}
        </p>
      ) : null}

      <NewTemplateForm
        action={createEmailTemplate}
        usageOptions={usageOptions.map((usage) => ({
          usage_key: usage.usage_key,
          usage_name: usage.usage_name,
        }))}
      />
    </section>
  )
}
