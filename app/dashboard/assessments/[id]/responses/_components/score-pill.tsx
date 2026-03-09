export function ScorePill({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return <span className="text-zinc-400">-</span>

  return (
    <span className="font-mono text-xs">
      <span className="text-zinc-400">{label[0]}</span>
      {value.toFixed(1)}
    </span>
  )
}
