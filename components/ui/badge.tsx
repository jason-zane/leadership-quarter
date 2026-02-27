const variants: Record<string, string> = {
  // Roles
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-700/20 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-500/30',
  staff: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600/30',
  // MFA
  enrolled: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30',
  // Submission statuses
  new: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30',
  reviewed: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30',
  qualified: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30',
  closed: 'bg-zinc-100 text-zinc-500 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-600/30',
  // Contact statuses
  contacted: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30',
  nurture: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-500/30',
  closed_won: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/30',
  closed_lost: 'bg-zinc-100 text-zinc-500 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-600/30',
}

const defaultVariant = 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600/30'

export function Badge({ variant, children }: { variant?: string; children: React.ReactNode }) {
  const classes = (variant && variants[variant]) ?? defaultVariant
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {children}
    </span>
  )
}

// Convenience: auto-pick variant from a status string
export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ')
  return <Badge variant={status}>{label}</Badge>
}
