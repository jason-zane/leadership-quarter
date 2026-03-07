import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  children: ReactNode
}

export function ConfigSection({ title, description, children }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}
