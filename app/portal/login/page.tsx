import { portalLogin, requestPasswordReset } from '@/app/auth/actions'

const errorMessages: Record<string, string> = {
  invalid_origin: 'Request origin was invalid. Please try again.',
  unauthorized: 'Sign-in failed. Please try again.',
  forbidden: 'Your account does not have access to the client portal.',
  missing_service_role: 'Portal auth is not configured. Contact support.',
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reset_error?: string }>
}) {
  const { error, message, reset_error } = await searchParams

  const mappedError = error ? errorMessages[error] ?? error : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Portal login</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to manage campaigns, invitations, responses, and exports.
        </p>

        {mappedError && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {mappedError}
          </p>
        )}

        {reset_error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {reset_error === 'site_url_not_configured'
              ? 'Password reset is not configured for this environment. Contact support.'
              : 'Invalid email format.'}
          </p>
        )}

        {message && (
          <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {message}
          </p>
        )}

        <form action={portalLogin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Log in
          </button>
        </form>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            Forgot your password?
          </summary>
          <form action={requestPasswordReset} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="audience" value="portal" />
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
            />
            <button
              type="submit"
              className="rounded-full border border-zinc-300 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Send reset link
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
