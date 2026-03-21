# Launch Cutover Checklist

Use this after the codebase and environment are otherwise ready. The goal is that launch-day changes are limited to plan upgrades, schedule changes, and smoke tests.

## 1. Upgrade plans

- Vercel: move the production project to `Pro`
- Supabase: confirm the org is on `Pro`
- Supabase production compute: set to `Small` if you are cost-sensitive and monitoring closely, otherwise `Medium`
- Resend: move to `Pro`
- Upstash: confirm a paid usage path is active for production rate limiting
- Render: confirm the sidecar service is on a paid instance if it remains in production use

## 2. Apply the post-upgrade cron schedule

Replace the current daily schedule with:

```json
{
  "crons": [
    {
      "path": "/api/cron/email-jobs",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/psychometric-analysis-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

If psychometric analysis is not part of production launch traffic, leave the third cron disabled until that workflow is actively used.

## 3. Confirm security settings

- Supabase Auth:
  - leaked-password protection enabled
  - admin MFA enabled
  - end-user MFA decision recorded
  - allowed redirect URLs reviewed for the public `/set-password` and `/reset-password` pages
- Production env:
  - `ALLOW_ADMIN_EMAIL_BOOTSTRAP=false`
  - `ADMIN_DASHBOARD_EMAILS` removed or minimized
  - `CRON_SECRET` rotated to a strong value
  - `REPORT_ACCESS_TOKEN_SECRET` rotated to a strong value
  - `AUTH_HANDOFF_SECRET` rotated to a strong value
  - `AUTH_SHARED_COOKIE_DOMAIN` set to the shared production parent domain when using separate public/admin/portal hosts
  - `ASSESSMENT_GATE_TOKEN_SECRET` rotated to a strong value
  - `SIDECAR_API_KEY` rotated if the sidecar is used
- Provider accounts:
  - MFA enabled on GitHub, Vercel, Supabase, Resend, and Render

## 4. Smoke tests

### Auth and access

- Admin user can sign in and reach `/dashboard`
- Non-admin user cannot reach `/dashboard`
- Portal user lands in the correct organization context
- Admin bootstrap path is no longer required

### Background work

- Hit `/api/cron/email-jobs` with `Authorization: Bearer <CRON_SECRET>` and confirm jobs process
- Hit `/api/cron/psychometric-analysis-jobs` with `Authorization: Bearer <CRON_SECRET>` if psychometric runs are enabled
- Confirm the logs emit `background_job_run` entries with:
  - `fetched`
  - `processed`
  - `failed`
  - `skipped`
  - `pendingCount`
  - `oldestPendingAgeSeconds`

### Reports and storage

- Queue a report export and confirm it reaches `ready`
- Confirm the generated PDF opens from the signed URL
- Confirm the generated report is written to the expected storage bucket

### Public traffic controls

- Confirm Upstash-backed rate limiting is active
- Confirm no `rate_limit_degraded` alert appears after deployment

## 5. Watch the first 24 hours

- oldest pending email job age
- oldest pending report export job age
- oldest pending psychometric run age
- failed email jobs
- failed report exports
- failed psychometric runs
- Vercel function errors and duration
- Supabase compute and connection metrics
- Resend delivery failures or suppressions
