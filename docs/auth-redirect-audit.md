# Auth Redirect Audit

This audit was completed before deleting any remaining compatibility routes.

## Verified login model

- Canonical public login surface is `/client-login`.
- `app/auth/actions.ts` performs credential sign-in from the public login page.
- Entitlements are resolved in `utils/auth-entitlements.ts`.
- Admin users are handed off to the admin surface through:
  - encrypted `lq_auth_handoff` cookie
  - `/auth/handoff`
  - admin destination `/dashboard`
- Portal users are handed off the same way to `/portal`.
- Portal admin bypass is separate from auth handoff and uses:
  - signed `lq_portal_bypass`
  - `lq_portal_org_id`
  - one-hour TTL

## Hardening completed

- `GET /portal/admin/launch` now redirects unauthenticated users to the canonical public login URL via `getClientLoginUrl(...)` instead of using a host-relative `/client-login` path.
- This removes reliance on compatibility login aliases during portal-admin launch failure handling.

## Auth-sensitive compatibility routes to keep for now

- `/admin`
- `/login`
- `/portal/login`
- `/mfa/totp/enroll`
- `/mfa/totp/verify`

These should not be deleted until auth fallback behavior is fully canonicalized and re-verified.

## Verified tests

- `__tests__/unit/auth-actions.test.ts`
- `__tests__/unit/auth-handoff-route.test.ts`
- `__tests__/unit/api/admin-organisation-portal-launch.test.ts`
- `__tests__/unit/api/portal-admin-launch.test.ts`
- `__tests__/unit/utils/portal-bypass-session.test.ts`

## Current deletion guidance

- Safe to keep deleting non-auth navigation aliases only after repo search confirms no live emitters remain.
- Do not delete auth-sensitive aliases yet.
