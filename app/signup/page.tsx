export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign up</h1>
        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}
        <p className="mb-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Account creation is invite-only. Ask an admin to invite you.
        </p>
        <a
          href="/login"
          className="block w-full rounded-full bg-zinc-900 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}
