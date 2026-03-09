import Link from 'next/link'
import { requireDashboardUser } from '@/utils/dashboard-auth'

export default async function ReportsPage() {
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    return null
  }

  if (auth.role !== 'admin') {
    return (
      <section>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Report management is restricted to admin accounts.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          Ask an admin to review report delivery settings and email flows.
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back to Overview
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Framework reports are now delivered as gated web pages instead of stored PDF assets.
      </p>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Delivery model</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          LQ8, AI Capability, and assessment reports are delivered through token-gated web pages.
          Users unlock access from the relevant signup or completion flow, then print or save the
          page as a PDF from the browser.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          There is no longer a stored framework PDF to upload or replace in Supabase Storage from
          this screen.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Where to verify</p>
        <div className="mt-3 grid gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <p>Use the public framework pages to confirm the gated report forms redirect into the hidden report pages.</p>
          <p>Use an assessment completion flow or participant detail page to verify assessment reports still open in the gated web report and can be printed or saved.</p>
          <p>Use the Email Config screen to validate internal notifications and assessment report email-link delivery.</p>
        </div>
      </div>
    </section>
  )
}
