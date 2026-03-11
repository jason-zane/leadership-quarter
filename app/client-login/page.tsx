import { login, requestPasswordReset } from '@/app/auth/actions'

const errorMessages: Record<string, string> = {
  invalid_origin: 'Request origin was invalid. Please try again.',
  unauthorized: 'Sign-in failed. Please check your email and password.',
  forbidden: 'Your account does not have access yet. Contact Leadership Quarter support.',
  missing_service_role: 'Sign-in is not configured for this environment. Contact support.',
  handoff_unavailable: 'Cross-domain sign-in is not configured for this environment. Contact support.',
  session_transfer_failed: 'We could not complete sign-in on the destination host. Please try again.',
}

const resetErrorMessages: Record<string, string> = {
  invalid_origin: 'Request origin was invalid. Please try again.',
  invalid_email: 'Invalid email format.',
  site_url_not_configured: 'Password reset is not configured for this environment. Contact support.',
  redirect_not_allowed: 'Reset redirect URL is not allowed in Supabase. Update Auth URL settings.',
  email_provider_failed: 'Email provider is not configured or failed. Check Supabase Auth email settings.',
  rate_limited: 'Too many reset requests. Please wait a few minutes and try again.',
  send_failed: 'Could not send reset email. Please try again.',
}

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reset_error?: string }>
}) {
  const { error, message, reset_error } = await searchParams
  const mappedError = error ? errorMessages[error] ?? error : null

  return (
    <div className="site-theme-v1 min-h-screen bg-[var(--site-bg)] px-6 pb-14 pt-36 text-[var(--site-text-primary)] md:px-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="site-glass-card-strong rounded-[var(--radius-card)] p-8 md:p-10">
          <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">Client access</p>
          <h1 className="font-serif text-4xl leading-[1.05] text-[var(--site-text-primary)]">Client login</h1>
          <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
            Sign in to access the Leadership Quarter client portal. LQ admin and staff can also sign in here.
          </p>

          {mappedError && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {mappedError}
            </p>
          )}

          {reset_error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {resetErrorMessages[reset_error] ?? 'Password reset failed. Please try again.'}
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </p>
          )}

          <form action={login} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="surface" value="client" />
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--site-text-body)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[var(--site-border-soft)] bg-white/80 px-3 py-2.5 text-sm text-[var(--site-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent-soft)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--site-text-body)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--site-border-soft)] bg-white/80 px-3 py-2.5 text-sm text-[var(--site-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent-soft)]"
              />
            </div>
            <button
              type="submit"
              className="font-cta mt-2 rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-6 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Log in
            </button>
          </form>

          <details className="mt-6 border-t border-[var(--site-border-soft)] pt-5">
            <summary className="cursor-pointer text-sm text-[var(--site-text-muted)] hover:text-[var(--site-text-primary)]">
              Forgot your password?
            </summary>
            <form action={requestPasswordReset} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="audience" value="portal" />
              <input type="hidden" name="surface" value="client" />
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                required
                className="w-full rounded-xl border border-[var(--site-border-soft)] bg-white/80 px-3 py-2.5 text-sm text-[var(--site-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent-soft)]"
              />
              <button
                type="submit"
                className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-glass-bg)]"
              >
                Send reset link
              </button>
            </form>
          </details>
        </div>
      </div>
    </div>
  )
}
