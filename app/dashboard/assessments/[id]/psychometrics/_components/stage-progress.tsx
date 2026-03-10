type StageProgressProps = {
  stages: Array<{
    number: number
    label: string
    status: 'complete' | 'active' | 'locked'
    detail?: string
  }>
}

export function StageProgress({ stages }: StageProgressProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {stages.map((stage, i) => (
        <div key={stage.number} className="flex items-center gap-1 shrink-0">
          {i > 0 && (
            <span className="text-[var(--admin-text-muted)] mx-1 text-xs">&#8594;</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={[
              'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold border',
              stage.status === 'complete'
                ? 'bg-[rgba(36,129,99,0.15)] border-[#216c56] text-[#216c56]'
                : stage.status === 'active'
                  ? 'bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white'
                  : 'bg-transparent border-[var(--admin-border)] text-[var(--admin-text-muted)]',
            ].join(' ')}>
              {stage.status === 'complete' ? '\u2713' : stage.number}
            </span>
            <div className="flex flex-col">
              <span className={[
                'text-xs font-medium leading-none',
                stage.status === 'active'
                  ? 'text-[var(--admin-text)]'
                  : 'text-[var(--admin-text-muted)]',
              ].join(' ')}>
                {stage.label}
              </span>
              {stage.detail && (
                <span className="text-[10px] text-[var(--admin-text-muted)] leading-none mt-0.5">{stage.detail}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
