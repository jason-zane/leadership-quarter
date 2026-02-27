import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { RelativeTime } from '@/components/ui/relative-time'

type ContactRow = {
  id: string
  first_name: string
  last_name: string
}

type ContactEmailRow = {
  id: string
  subject: string
  sent_to_email: string
  sent_at: string
  text_body: string | null
  html_body: string | null
  provider: string
  template_key: string | null
}

export default async function ContactEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string; emailId: string }>
}) {
  const { id, emailId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return (
      <section>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Email</h1>
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Missing SUPABASE_SERVICE_ROLE_KEY in environment.
        </p>
      </section>
    )
  }

  const [{ data: contactData }, { data: emailData }] = await Promise.all([
    adminClient
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('id', id)
      .maybeSingle(),
    adminClient
      .from('contact_emails')
      .select('id, subject, sent_to_email, sent_at, text_body, html_body, provider, template_key')
      .eq('id', emailId)
      .eq('contact_id', id)
      .maybeSingle(),
  ])

  const contact = (contactData as ContactRow | null) ?? null
  const email = (emailData as ContactEmailRow | null) ?? null
  if (!contact || !email) {
    notFound()
  }

  const fullName = `${contact.first_name} ${contact.last_name}`

  return (
    <section>
      <div className="mb-5 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/contacts" className="hover:text-zinc-900 dark:hover:text-zinc-200">
          Contacts
        </Link>
        <span>/</span>
        <Link href={`/dashboard/contacts/${contact.id}`} className="hover:text-zinc-900 dark:hover:text-zinc-200">
          {fullName}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">Email</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{email.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>To {email.sent_to_email}</span>
          <span>•</span>
          <span>
            <RelativeTime date={email.sent_at} />
          </span>
          <span>•</span>
          <span className="uppercase">{email.provider}</span>
          {email.template_key ? (
            <>
              <span>•</span>
              <span>Template: {email.template_key}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Text body
          </h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
            {email.text_body?.trim() || 'No text body stored.'}
          </pre>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            HTML source
          </h2>
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
            {email.html_body?.trim() || 'No HTML body stored.'}
          </pre>
        </div>
      </div>
    </section>
  )
}
