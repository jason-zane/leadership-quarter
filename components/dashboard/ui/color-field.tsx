'use client'

import type { ReactNode } from 'react'

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--admin-text-primary)]">{label}</span>
      {children}
      {helper ? <p className="text-xs text-[var(--admin-text-muted)]">{helper}</p> : null}
    </label>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  helper,
  fallback,
  invalid,
  adjustedTo,
  disabled,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  placeholder: string
  helper: string
  fallback: string
  invalid: boolean
  adjustedTo?: string | null
  disabled?: boolean
}) {
  return (
    <Field
      label={label}
      helper={invalid ? `Use a valid hex value like ${placeholder}.` : helper}
    >
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={!invalid && value.trim() ? value : fallback}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={[
            'h-12 w-14 rounded-xl border border-[rgba(103,127,159,0.16)] bg-white p-1',
            disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
          ].join(' ')}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          readOnly={disabled}
          placeholder={placeholder}
          className={[
            'foundation-field w-full font-mono',
            invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : '',
            disabled ? 'bg-[rgba(247,248,252,0.9)] opacity-60' : '',
          ].join(' ')}
        />
      </div>
      {adjustedTo ? (
        <p className="mt-1 text-xs text-amber-600">Adjusted to {adjustedTo} for readability</p>
      ) : null}
    </Field>
  )
}
