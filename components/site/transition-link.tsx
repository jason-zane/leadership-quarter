'use client'

import Link, { type LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'

type Props = LinkProps & {
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

function shouldHandleTransition(href: string, event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (event.button !== 0) return false
  if (href.startsWith('#')) return false
  if (href.includes('#')) return false
  return true
}

export function TransitionLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter()
  const hrefString = typeof href === 'string' ? href : href.toString()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (!shouldHandleTransition(hrefString, event)) return
    if (typeof document === 'undefined') return
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => void
    }
    if (!doc.startViewTransition) return
    event.preventDefault()
    doc.startViewTransition(() => router.push(hrefString))
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  )
}
