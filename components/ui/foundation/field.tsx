'use client'

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function fieldClassName(className?: string) {
  return ['foundation-field', className].filter(Boolean).join(' ')
}

export function FoundationInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return <input {...rest} className={fieldClassName(className)} />
}

export function FoundationSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return <select {...rest} className={fieldClassName(className)} />
}

export function FoundationTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return <textarea {...rest} className={fieldClassName(className)} />
}
