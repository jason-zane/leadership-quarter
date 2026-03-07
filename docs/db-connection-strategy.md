# DB Connection Strategy

## How Next.js connects to Supabase

`@supabase/supabase-js` communicates with Supabase exclusively over **HTTP via PostgREST**. There are no raw Postgres connections opened from Next.js serverless functions. This means:

- `NEXT_PUBLIC_SUPABASE_URL` is the project REST base URL (e.g. `https://<ref>.supabase.co`), not a Postgres DSN.
- `SUPABASE_SERVICE_ROLE_KEY` is a service-role JWT — server-only, never included in client bundles (no `NEXT_PUBLIC_` prefix).

## Connection pooling

Connection pooling is owned by Supabase's internal PostgREST layer. The application does not manage a Postgres connection pool. Max concurrency is governed by the Supabase plan's PostgREST worker count, not by application code.

## Admin client singleton

`utils/supabase/admin.ts` uses a **lazy module-level singleton**: the `SupabaseClient` is created once on the first call and reused on subsequent calls within the same serverless function instance (warm invocations). This eliminates redundant client initialisation overhead at high concurrency.

The singleton is safe because the service-role client carries no user session state (`persistSession: false`, `autoRefreshToken: false`).

## Security

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser. Verify no client component imports `utils/supabase/admin.ts` by running:
  ```sh
  grep -r "supabase/admin" app --include="*.tsx" | grep -v "use server"
  ```
- All admin API routes are protected by `requireDashboardApiAuth` in `utils/assessments/api-auth.ts`.
