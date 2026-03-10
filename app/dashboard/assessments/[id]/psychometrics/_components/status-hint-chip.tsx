import { Badge } from '@/components/ui/badge'

type Props = {
  label: string
  description: string
  variant?: string
  /** @deprecated use variant instead */
  className?: string
}

export function StatusHintChip({ label, description, variant = 'signal-grey' }: Props) {
  return (
    <span title={description} aria-label={`${label}. ${description}`}>
      <Badge variant={variant}>{label}</Badge>
    </span>
  )
}
