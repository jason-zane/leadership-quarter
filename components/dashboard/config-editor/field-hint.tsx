type Props = {
  where: string
  helper?: string
}

export function FieldHint({ where, helper }: Props) {
  return (
    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
      <span className="font-medium text-zinc-600 dark:text-zinc-300">Appears:</span> {where}
      {helper ? <span className="ml-1">{helper}</span> : null}
    </p>
  )
}
