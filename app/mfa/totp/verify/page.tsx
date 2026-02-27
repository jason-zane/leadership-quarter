'use client'

import { Suspense, FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function TotpVerifyPage() {
  return (
    <Suspense>
      <TotpVerifyPageContent />
    </Suspense>
  )
}

function TotpVerifyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)

  const nextPath = useMemo(() => {
    const next = searchParams.get('next')
    return next && next.startsWith('/') ? next : '/dashboard'
  }, [searchParams])

  useEffect(() => {
    let canceled = false

    async function initialize() {
      const { data: sessionData } = await supabase.auth.getSession()
      if (canceled) return
      if (!sessionData.session) {
        router.replace('/login?error=' + encodeURIComponent('Please log in first.'))
        return
      }

      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (canceled) return
      if (aalError) {
        setError(aalError.message)
        return
      }
      if (aalData?.currentLevel === 'aal2') {
        router.replace(nextPath)
        return
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (canceled) return
      if (factorsError) {
        setError(factorsError.message)
        return
      }

      const verifiedTotp = factorsData?.totp?.find((factor) => factor.status === 'verified')
      if (!verifiedTotp) {
        router.replace(`/mfa/totp/enroll?next=${encodeURIComponent(nextPath)}`)
        return
      }

      setFactorId(verifiedTotp.id)
      setReady(true)
    }

    initialize()
    return () => {
      canceled = true
    }
  }, [nextPath, router, supabase])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!factorId) {
      setError('No MFA factor found. Reload and try again.')
      return
    }
    if (!code.trim()) {
      setError('Enter the 6-digit authenticator code.')
      return
    }

    setSaving(true)
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })
    if (challengeError || !challengeData) {
      setSaving(false)
      setError(challengeError?.message ?? 'Could not start MFA challenge.')
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.trim(),
    })
    setSaving(false)

    if (verifyError) {
      setError(verifyError.message)
      return
    }

    router.replace(nextPath)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Verify Authenticator Code
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
          Enter the current 6-digit code from your authenticator app.
        </p>

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        ) : null}

        {!ready ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Preparing challenge...</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="totp-code"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Authenticator Code
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {saving ? 'Verifying...' : 'Verify and Continue'}
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Lost access to your authenticator? Ask an admin to reset your MFA.
        </p>
        <Link
          href="/login"
          className="mt-2 inline-block text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}
