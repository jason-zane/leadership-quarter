type LQMarkProps = {
  className?: string
  tone?: 'dark' | 'light'
}

export function LQMark({ className = '', tone = 'dark' }: LQMarkProps) {
  const toneClass = tone === 'light' ? 'text-[var(--site-on-dark-primary)]' : 'text-[var(--site-text-primary)]'

  return (
    <span aria-label="Leadership Quarter" className={`inline-block select-none ${toneClass} ${className}`}>
      <span className="inline-flex items-end font-serif text-[2.1rem] font-semibold leading-[0.88]">
        <span className="relative z-10">L</span>
        <span className="-ml-[0.26em] relative z-20">Q</span>
      </span>
    </span>
  )
}
