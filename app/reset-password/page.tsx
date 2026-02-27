'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let canceled = false

    async function prepareSession() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')
      const hasLinkCredentials = Boolean(
        code || (tokenHash && type) || (hashAccessToken && hashRefreshToken)
      )

      // Only clear existing session when this request carries one-time link credentials.
      if (hasLinkCredentials) {
        await supabase.auth.signOut()
      }

      let established = false

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        })
        if (!verifyError) {
          established = true
        }
      }

      if (!established && hashAccessToken && hashRefreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        })
        if (!setSessionError) {
          established = true
        }
      }

      if (!established && code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
          established = true
        }
      }

      const { data } = await supabase.auth.getSession()
      if (canceled) return

      const sessionEmail = data.session?.user?.email?.toLowerCase() ?? null
      if (!sessionEmail) {
        setError('Reset link is invalid or expired. Request a new password reset email.')
      } else {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (canceled) return
        const needsStepUp = aalData?.currentLevel !== 'aal2' && aalData?.nextLevel === 'aal2'
        if (needsStepUp) {
          const { data: factorsData } = await supabase.auth.mfa.listFactors()
          if (canceled) return
          const hasVerifiedTotp =
            factorsData?.totp?.some((factor) => factor.status === 'verified') ?? false
          const destination = hasVerifiedTotp ? '/mfa/totp/verify' : '/mfa/totp/enroll'
          router.replace(`${destination}?next=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        setReady(true)
      }
    }

    prepareSession()
    return () => {
      canceled = true
    }
  }, [router, supabase])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!ready) {
      setError('Auth session is not ready. Open the reset email link again.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      const lowerMessage = updateError.message.toLowerCase()
      if (lowerMessage.includes('aal2')) {
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        const hasVerifiedTotp = factorsData?.totp?.some((factor) => factor.status === 'verified') ?? false
        const destination = hasVerifiedTotp ? '/mfa/totp/verify' : '/mfa/totp/enroll'
        const next = window.location.pathname
        router.replace(`${destination}?next=${encodeURIComponent(next)}`)
        return
      }
      if (updateError.message.toLowerCase().includes('auth session missing')) {
        setError('Reset link is invalid or expired. Request a new password reset email.')
      } else {
        setError(updateError.message)
      }
      return
    }

    setSaved(true)
    await supabase.auth.signOut()
    setTimeout(() => {
      router.push('/login?message=' + encodeURIComponent('Password updated. Please log in.'))
    }, 1200)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Set Your Password
        </h1>

        {saved ? (
          <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Password updated. Redirecting to login...
          </p>
        ) : null}

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !ready}
            className="mt-2 rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? 'Saving...' : !ready ? 'Preparing...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
