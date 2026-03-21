# Redirect Cleanup Checkpoint

## Summary
This document records the state of the redirect and alias cleanup after the non-auth internal alias deletion pass.

Current position:
- internal dashboard/campaign/CRM alias routes have been deleted
- auth-sensitive aliases have been retained intentionally
- old public assessment aliases have been retained intentionally for external-link compatibility
- auth fallback behavior was audited and one canonicalization fix was made before any deletion

Use this file as the restart point for the next cleanup session.

## What Has Been Completed

### Auth and security audit
Completed and documented in [auth-redirect-audit.md](./auth-redirect-audit.md).

Verified:
- canonical public login remains `/client-login`
- admin sign-in still hands off to the admin host and lands on `/dashboard`
- client sign-in still hands off to the portal host and lands on `/portal`
- auth handoff remains encrypted, short-lived, and path-restricted
- portal admin bypass remains signed and time-limited

Hardening completed:
- unauthenticated `/portal/admin/launch` fallback now redirects to the canonical public login URL using `getClientLoginUrl(...)` instead of relying on a host-relative `/client-login`

### Non-auth internal aliases deleted
These routes were removed because they were no longer emitted by live UI and had canonical replacements already in use:

- `/dashboard/organisations`
- `/dashboard/organisations/[id]`
- `/dashboard/assessments/[id]/analytics`
- `/dashboard/assessments/[id]/invitations`
- `/dashboard/assessments/[id]/report`
- `/dashboard/campaigns/[id]/assessments`
- `/dashboard/campaigns/[id]/flow`
- `/dashboard/campaigns/[id]/experience`

Result:
- canonical internal navigation now uses only `/dashboard/clients`
- canonical assessment navigation now uses only `psychometrics`, `campaigns`, and `reports`
- canonical campaign builder navigation now uses only `/dashboard/campaigns/[id]/journey`

### Verification already completed
Checks passed after the deletion wave:
- `npm run lint`
- `npm run build`

Auth-focused tests previously verified:
- `__tests__/unit/auth-actions.test.ts`
- `__tests__/unit/auth-handoff-route.test.ts`
- `__tests__/unit/api/admin-organisation-portal-launch.test.ts`
- `__tests__/unit/api/portal-admin-launch.test.ts`
- `__tests__/unit/utils/portal-bypass-session.test.ts`

## What Is Intentionally Still Retained

### Auth-sensitive aliases
These are still in place and should not be deleted casually:
- `/admin`
- `/login`
- `/portal/login`
- `/mfa/totp/enroll`
- `/mfa/totp/verify`

Reason:
- they are part of the auth-entry and auth-fallback review surface
- deleting them should happen only in a dedicated auth-sensitive deletion wave

### Public assessment compatibility aliases
These are still in place:
- `/(assess)/survey/[token]` -> `/assess/i/[token]`
- `/(assess)/c/[slug]` -> `/assess/c/[orgSlug]/[campaignSlug]`
- `/(assess)/c/[slug]/[campaignSlug]` -> `/assess/c/[orgSlug]/[campaignSlug]`

Reason:
- these carry real external-link and bookmark risk
- unlike the internal dashboard aliases, they may still be present in old emails, documents, or saved links
- they should be removed only when you explicitly accept dropping old public URL compatibility

## Remaining Work

### Wave 1: public non-auth compatibility deletion
If you decide to stop supporting old public assessment URLs, delete:
- `app/(assess)/survey/[token]/page.tsx`
- `app/(assess)/c/[slug]/page.tsx`
- `app/(assess)/c/[slug]/[campaignSlug]/page.tsx`

Before doing that:
- repo-search for any remaining internal emitters, email templates, docs, or operational runbooks that still mention those URLs
- confirm that dropping bookmark compatibility is acceptable
- keep canonical public routes unchanged:
  - `/assess/i/[token]`
  - `/assess/c/[slug]/[campaignSlug]`

### Wave 2: auth-sensitive alias deletion
Only do this after another explicit auth review.

Deletion candidates:
- `app/admin/page.tsx`
- `app/login/page.tsx`
- `app/portal/login/page.tsx`
- `app/mfa/totp/enroll/page.tsx`
- `app/mfa/totp/verify/page.tsx`

Before doing that:
- re-run the auth-focused test pack
- verify no route handlers or server actions still rely on those aliases as fallbacks
- manually confirm:
  - website login as admin reaches admin host `/dashboard`
  - website login as client reaches portal host `/portal`
  - unauthorized admin access still resolves to canonical public login
  - unauthorized portal-admin launch still resolves to canonical public login

## Recommended Next Checks When Resuming
1. Re-read [auth-redirect-audit.md](./auth-redirect-audit.md).
2. Re-read [redirect-inventory.md](./redirect-inventory.md).
3. Decide whether you still want public bookmark compatibility for old assessment URLs.
4. If yes, skip public alias deletion and keep only the auth-sensitive review pending.
5. If no, do the public alias deletion first, then reassess auth-sensitive alias removal separately.

## Default Recommendation
If restarting this later with no new information:
- keep auth-sensitive aliases in place
- keep old public assessment aliases in place unless there is a deliberate product decision to drop old links
- consider the redirect cleanup effectively complete for internal navigation
