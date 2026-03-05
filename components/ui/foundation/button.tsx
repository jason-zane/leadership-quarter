'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

type FoundationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'foundation-btn-primary',
  secondary: 'foundation-btn-secondary',
  ghost: 'foundation-btn-ghost',
  danger: 'foundation-btn-danger',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'foundation-btn-sm',
  md: 'foundation-btn-md',
}

export function FoundationButton({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}: FoundationButtonProps) {
  return (
    <button
      {...props}
      className={[
        'foundation-btn',
        variantClass[variant],
        sizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
