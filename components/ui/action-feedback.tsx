'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

// Place this inside a <Suspense> boundary in each page.
// It reads ?saved=... and ?error=... from the URL, fires the appropriate toast,
// then clears those params from the URL so they don't linger.
export function ActionFeedback({
  messages,
  errorMessages = {},
}: {
  messages: Record<string, string>
  errorMessages?: Record<string, string>
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const saved = searchParams.get('saved')
    const error = searchParams.get('error')

    if (!saved && !error) return

    if (saved) {
      toast.success(messages[saved] ?? 'Saved.')
    }
    if (error) {
      toast.error(errorMessages[error] ?? 'Could not complete that action.')
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('saved')
    params.delete('error')
    const newUrl = pathname + (params.size > 0 ? `?${params}` : '')
    router.replace(newUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
