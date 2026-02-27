const palette = [
  'bg-zinc-700 text-zinc-50',
  'bg-stone-600 text-stone-50',
  'bg-slate-600 text-slate-50',
  'bg-neutral-700 text-neutral-50',
  'bg-zinc-500 text-zinc-50',
  'bg-stone-500 text-stone-50',
]

function getColor(name: string): string {
  const code = (name.trim().charCodeAt(0) || 0) + (name.trim().charCodeAt(1) || 0)
  return palette[code % palette.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = getInitials(name)
  const color = getColor(name)
  const sizeClass = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${color}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
