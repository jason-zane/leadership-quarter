# Production Checklist (Mini Admin + Lead Capture)

## 1) Vercel Project Settings

Required environment variables:
- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_NOTIFICATION_TO`
- `CRON_SECRET`
- `LQ8_REPORT_BUCKET=reports`
- `LQ8_REPORT_PATH=lq8/lq8-framework-report.pdf`

Optional (only if backend mode is re-enabled later):
- `RESEND_REPLY_TO`
- `ADMIN_DASHBOARD_EMAILS`
- `ALLOW_ADMIN_EMAIL_BOOTSTRAP`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `HEALTHCHECK_TOKEN`

Redeploy after env updates.

## 2) Admin/Auth Routes

These routes should be active:
- `/login`
- `/dashboard`
- `/dashboard/submissions`
- `/dashboard/contacts`
- `/dashboard/users`
- `/dashboard/emails`
- `/dashboard/reports`

Auth mode: password-only sign-in (MFA/TOTP disabled).

## 3) Public + API Smoke Test

1. Visit `/`, `/capabilities`, `/framework/lq8`, `/about`, `/work-with-us`, and `/contact`.
2. Submit Work With Us inquiry and verify record appears in `/dashboard/submissions`.
3. Request LQ8 report download and verify signed URL download works.
4. Confirm contact records are created/updated in `/dashboard/contacts`.
5. In `/dashboard/reports`, upload the production PDF and confirm status shows Available.
6. Hit `/api/cron/email-jobs` with `Authorization: Bearer <CRON_SECRET>` and confirm email jobs process.
