import type { ReactNode } from 'react'
import type { ScoringCoverageReport } from '@/utils/assessments/types'
import type {
  MatrixStatusFilter,
  Toast,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-types'

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function CheckList({
  checks,
}: {
  checks: Array<{ label: string; pass: boolean; message: string }>
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-3">
            <span
              className={[
                'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                check.pass
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
              ].join(' ')}
            >
              {check.pass ? 'OK' : '!'}
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{check.label}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{check.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IssueList({ coverage }: { coverage: ScoringCoverageReport }) {
  if (coverage.issues.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
        Coverage is complete. Manual rows: {coverage.manual_combinations}. Generated rows:{' '}
        {coverage.generated_combinations}.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Manual
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {coverage.manual_combinations}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Generated
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {coverage.generated_combinations}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Unresolved
          </p>
          <p className="mt-1 text-lg font-semibold text-amber-800 dark:text-amber-100">
            {coverage.unresolved_combinations}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Coverage issues</p>
        <ul className="mt-2 space-y-2 text-xs text-amber-700 dark:text-amber-300">
          {coverage.issues.map((issue, index) => (
            <li key={`${issue.type}-${index}`} className="rounded-md bg-white/70 px-3 py-2 dark:bg-zinc-950/40">
              <p>{issue.message}</p>
              {issue.combination ? (
                <p className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {Object.entries(issue.combination)
                    .map(([dimension, band]) => `${dimension}=${band}`)
                    .join(' · ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function MatrixSourceBadge({ source }: { source: MatrixStatusFilter }) {
  const className =
    source === 'manual'
      ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
      : source === 'generated'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>
      {source}
    </span>
  )
}
