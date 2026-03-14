type V2PageShellProps = {
  title: string
  description: string
}

export function V2PageShell({ title, description }: V2PageShellProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </section>
  )
}
