'use client'

export type StepperItem = {
  id: string
  label: string
}

type Props = {
  items: readonly StepperItem[]
  activeId: string
  onChange: (id: string) => void
  expandAll: boolean
  onToggleExpandAll: () => void
  className?: string
}

export function SectionStepper({
  items,
  activeId,
  onChange,
  expandAll,
  onToggleExpandAll,
  className,
}: Props) {
  const activeIndex = items.findIndex((item) => item.id === activeId)

  return (
    <div className={['sticky top-2 z-10 rounded-lg border border-zinc-200 bg-white/95 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95', className].filter(Boolean).join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Step {activeIndex >= 0 ? activeIndex + 1 : 1} of {items.length}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={[
                'rounded-md border px-2.5 py-1.5 text-xs font-medium',
                item.id === activeId
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleExpandAll}
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {expandAll ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (activeIndex > 0) onChange(items[activeIndex - 1].id)
          }}
          disabled={activeIndex <= 0}
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeIndex >= 0 && activeIndex < items.length - 1) onChange(items[activeIndex + 1].id)
          }}
          disabled={activeIndex < 0 || activeIndex >= items.length - 1}
          className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Next
        </button>
      </div>
    </div>
  )
}
