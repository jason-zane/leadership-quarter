# Production Checklist (milesbetween.com)

## 1) Vercel Project Settings

Set these environment variables in Vercel for the Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (verified sender, e.g. `auth@milesbetween.com`)
- `RESEND_NOTIFICATION_TO` (ops inbox)
- `RESEND_REPLY_TO` (optional)
- `ADMIN_DASHBOARD_EMAILS` (comma-separated admin emails)
- `CRON_SECRET` (shared secret for email job processor)
- `NEXT_PUBLIC_SITE_URL=https://milesbetween.com`
- `ALLOW_ADMIN_EMAIL_BOOTSTRAP=false` (set `true` only during first-admin bootstrap)
- `ENFORCE_ADMIN_TOTP=true`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `HEALTHCHECK_TOKEN`

Redeploy after setting/updating env vars.

## 2) Supabase Authentication Settings

- `Authentication -> URL Configuration`
  - Site URL: `https://milesbetween.com`
  - Redirect URLs:
    - `https://milesbetween.com/login`
    - `https://milesbetween.com/set-password`
    - `https://milesbetween.com/reset-password`
- `Authentication -> Providers -> Email`
  - Enabled
  - Custom SMTP configured with Resend

## 2.5) Cookiebot + Consent Mode v2

- Create a Cookiebot Domain Group and add the production domain.
- Enable Consent Mode v2 in Cookiebot.
- Add the Domain Group ID to the site (already wired in `app/layout.tsx`).
- Verify the consent banner appears and that analytics only fires after consent.

## 3) Supabase Email Templates

Use token-hash links (not plain site links) so reset/invite links always carry auth credentials.

- Invite template link:
  - `{{ .SiteURL }}/set-password?token_hash={{ .TokenHash }}&type=invite`
- Recovery template link:
  - `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`

## 4) Database

From local repo with linked Supabase project:

```bash
npm run db:push
```

## 5) DNS

- Point apex/root domain to Vercel as instructed in Vercel Domains.
- Add `www` redirect to apex (or vice versa, choose one canonical).
- Confirm HTTPS cert is issued.

## 6) Production Smoke Test

1. Visit `https://milesbetween.com/login`
2. Invite a new user from `/dashboard/users`
3. Open invite email, set password, complete MFA
4. Confirm login works and `/dashboard` loads
5. Run a password reset from login page and confirm flow works
6. Submit the public interest form and confirm both emails send
7. Verify CSP is present and no CSP violations are logged in the browser console
8. Confirm GTM loads and consent gates tracking until opt-in

## 7) Email Queue Cron

Create a Vercel Cron job to run every 5 minutes:

- URL: `https://milesbetween.com/api/cron/email-jobs`
- Method: `GET`
- Header: `Authorization: Bearer $CRON_SECRET`
