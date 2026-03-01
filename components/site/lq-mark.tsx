type LQMarkProps = {
  className?: string
  tone?: 'dark' | 'light'
}

export function LQMark({ className = '', tone = 'dark' }: LQMarkProps) {
  const toneClass = tone === 'light' ? 'text-[var(--site-on-dark-primary)]' : 'text-[var(--site-text-primary)]'

  return (
    <span aria-label="Leadership Quarter" className={`inline-block select-none ${toneClass} ${className}`}>
      <span className="block font-serif text-[2.05rem] font-semibold leading-[1] tracking-[-0.06em]">
        <span className="block">L</span>
        <span className="block -mt-[0.56em] pl-[0.08em]">Q</span>
      </span>
    </span>
  )
}
