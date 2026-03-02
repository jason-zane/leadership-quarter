import Link from 'next/link'
import { Suspense } from 'react'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { createAdminClient } from '@/utils/supabase/admin'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { uploadLq8Report } from '@/app/dashboard/reports/actions'
import { RelativeTime } from '@/components/ui/relative-time'

const REPORT_BUCKET = process.env.LQ8_REPORT_BUCKET?.trim() || 'reports'
const REPORT_PATH = process.env.LQ8_REPORT_PATH?.trim() || 'lq8/lq8-framework-report.pdf'

const feedbackMessages: Record<string, string> = {
  uploaded: 'Report uploaded successfully.',
}

const errorFeedbackMessages: Record<string, string> = {
  missing_service_role: 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.',
  missing_file: 'Choose a PDF file before uploading.',
  invalid_file_type: 'Only PDF files are allowed.',
  bucket_missing: 'Supabase Storage bucket was not found. Create the bucket first.',
  upload_failed: 'Upload failed. Check bucket policy and try again.',
}

function splitStoragePath(path: string) {
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash === -1) {
    return { folder: '', fileName: trimmed }
  }
  return {
    folder: trimmed.slice(0, lastSlash),
    fileName: trimmed.slice(lastSlash + 1),
  }
}

type StorageObject = {
  name: string
  metadata?: {
    size?: number | string
    mimetype?: string
  } | null
  updated_at?: string | null
}

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
          Ask an admin to upload or replace report files.
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

  const adminClient = createAdminClient()
  let loadError: string | null = null
  let reportFile: StorageObject | null = null

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.'
  } else {
    const { folder, fileName } = splitStoragePath(REPORT_PATH)
    const { data, error } = await adminClient.storage.from(REPORT_BUCKET).list(folder, {
      limit: 100,
      search: fileName,
    })

    if (error) {
      loadError = error.message
    } else {
      reportFile = ((data ?? []) as StorageObject[]).find((item) => item.name === fileName) ?? null
    }
  }

  const reportSize = Number(reportFile?.metadata?.size ?? 0)
  const reportMimeType = reportFile?.metadata?.mimetype ?? null

  return (
    <section>
      <Suspense>
        <ActionFeedback messages={feedbackMessages} errorMessages={errorFeedbackMessages} />
      </Suspense>

      <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Upload and replace PDF assets used by the public site.
      </p>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">LQ8 report source</p>
        <p className="mt-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {REPORT_BUCKET}/{REPORT_PATH}
        </p>
        {loadError ? (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            Could not load current file status: {loadError}
          </p>
        ) : reportFile ? (
          <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Status:</span> Available
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Type:</span>{' '}
              {reportMimeType || 'application/pdf'}
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Size:</span>{' '}
              {reportSize > 0 ? `${(reportSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Last updated:</span>{' '}
              {reportFile.updated_at ? <RelativeTime date={reportFile.updated_at} /> : 'Unknown'}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            No file found at this path yet. Upload a PDF below.
          </p>
        )}
      </div>

      <form
        action={uploadLq8Report}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label
          htmlFor="report_file"
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Upload replacement PDF
        </label>
        <input
          id="report_file"
          name="report_file"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:file:bg-zinc-50 dark:file:text-zinc-900 dark:hover:file:bg-zinc-200"
        />
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          This will replace the existing file at the configured storage path.
        </p>
        <button
          type="submit"
          className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Upload PDF
        </button>
      </form>
    </section>
  )
}
