# Production Checklist (Frontend-Only Mode)

## 1) Vercel Project Settings

Required environment variables:
- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

Optional (only if backend mode is re-enabled later):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_NOTIFICATION_TO`
- `RESEND_REPLY_TO`
- `ADMIN_DASHBOARD_EMAILS`
- `CRON_SECRET`
- `ALLOW_ADMIN_EMAIL_BOOTSTRAP`
- `ENFORCE_ADMIN_TOTP`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `HEALTHCHECK_TOKEN`

Redeploy after env updates.

## 2) Route Behavior

In frontend-only mode, these routes redirect to `/`:
- `/login`
- `/signup`
- `/set-password`
- `/reset-password`
- `/admin`
- `/dashboard`
- `/mfa/totp/enroll`
- `/mfa/totp/verify`

## 3) Public Smoke Test

1. Visit `/`, `/retreats`, `/experience`, `/about`, `/faq`, and `/terms-and-conditions`.
2. Confirm all primary CTAs use contact email links.
3. Confirm no registration forms are visible.
4. Confirm auth/admin routes redirect to home.
