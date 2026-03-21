# Production Checklist

## 1) Vercel Project Settings

Required environment variables:
- `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_NOTIFICATION_TO`
- `CRON_SECRET`
- `REPORT_ACCESS_TOKEN_SECRET`
- `AUTH_HANDOFF_SECRET`
- `PORTAL_ADMIN_BYPASS_SECRET`

Optional (only if backend mode is re-enabled later):
- `GENERATED_REPORTS_BUCKET` (defaults to `generated-reports`)
- `REPORT_PDF_RENDERER` (recommended value: `sidecar`; if omitted, the app will prefer sidecar whenever `SIDECAR_URL` and `SIDECAR_API_KEY` are set)
- `SIDECAR_URL`
- `SIDECAR_API_KEY`
- `RESEND_REPLY_TO`
- `ADMIN_DASHBOARD_EMAILS`
- `ALLOW_ADMIN_EMAIL_BOOTSTRAP`
- `AUTH_SHARED_COOKIE_DOMAIN` (required when public/admin/portal run on separate production hosts)
- `HEALTHCHECK_TOKEN`

Redeploy after env updates.

## 2) Render Sidecar Service

- Create a new Render Web Service from this repo.
- Set the root directory to `sidecar`.
- Let Render use the checked-in `sidecar/Dockerfile`.
- Add `SIDECAR_API_KEY` to the Render service environment and match the Vercel value.
- Confirm Render health checks pass against `GET /health`.
- Set `REPORT_PDF_RENDERER=sidecar` in Vercel for production to make the render path explicit.

## 3) Admin/Auth Routes

These routes should be active:
- `/login`
- `/dashboard`
- `/dashboard/submissions`
- `/dashboard/contacts`
- `/dashboard/users`
- `/dashboard/emails`
- `/dashboard/reports`

Auth mode: password-only sign-in (MFA/TOTP disabled).

Surface ownership:
- Public host owns `/`, `/framework/*`, and all `/assess/*` participant routes.
- Admin host owns `/dashboard` and `/api/admin/*`.
- Portal host owns `/portal` and `/api/portal/*`.

Portal admin launch/context switching requires `PORTAL_ADMIN_BYPASS_SECRET` in production.

## 4) Public + API Smoke Test

1. Visit `/`, `/capabilities`, `/framework/lq8`, `/about`, `/work-with-us`, and `/contact`.
2. Submit Work With Us inquiry and verify record appears in `/dashboard/submissions`.
3. Request LQ8 and AI Readiness report access and verify the gated page opens.
4. Confirm form submit redirects to:
   - `/framework/lq8/report?access=...`
   - `/framework/lq-ai-readiness/report?access=...`
5. Confirm expired/invalid `access` token shows the access-expired state.
6. Confirm contact records are created/updated in `/dashboard/contacts`.
7. From each gated report page, trigger `Print / Save as PDF` and confirm the output is clean.
8. From each gated report page, trigger `Generate PDF download` and confirm the configured export renderer completes successfully.
9. Ensure the generated reports bucket exists in Supabase Storage:
   - `generated-reports`, or the bucket named by `GENERATED_REPORTS_BUCKET`
10. Hit `/api/cron/email-jobs` with `Authorization: Bearer <CRON_SECRET>` and confirm email jobs process.
11. Hit `/api/cron/psychometric-analysis-jobs` with `Authorization: Bearer <CRON_SECRET>` only if psychometric analysis is live in production.
12. Review deployment logs after first traffic and confirm there is no `rate_limit_degraded` operational alert.
13. Trigger a controlled burst against a public page or public API in preview and confirm structured `rate_limit` log entries appear with `bucket`, `route`, and `identifierHash`.
