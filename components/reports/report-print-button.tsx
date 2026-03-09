'use client'

type Props = {
  className?: string
  label?: string
}

export function ReportPrintButton({
  className = '',
  label = 'Print / Save as PDF',
}: Props) {
  function handleClick() {
    window.print()
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label}
    </button>
  )
}
