# Launch Readiness Audit

Date: 2026-03-12

## Executive Summary

The application is not yet configured for the launch profile you described.

The biggest current gap is not the Supabase database plan. It is the runtime architecture around background work:

- email jobs are only drained once per day via Vercel cron
- report export jobs are only drained once per day via Vercel cron
- psychometric analysis has a cron endpoint but no active schedule in `vercel.json`
- report generation is queue-based, not live/event-driven

For a growth launch with frequent assessments, report rendering, and email delivery that feels live, the current stack needs:

- `Vercel Pro` at minimum
- `Supabase Pro` organization at minimum
- a production Supabase compute size above the default floor
- `Resend Pro` at minimum
- a paid, production-grade path for Redis/rate limiting
- a paid sidecar service if the sidecar remains part of production report or psychometric workloads

Security posture is mixed:

- public-table RLS posture is mostly good after the recent fixes
- admin and portal access are clearly separated by host/path routing
- tenant segregation for client organizations is enforced mostly in app logic with the service-role client, not by tenant-scoped database RLS
- sensitive PII is stored in plaintext fields and JSONB in Postgres
- MFA is currently disabled
- leaked-password protection is a dashboard setting and still needs confirmation in Supabase
- rate limiting fails open if Upstash is missing or unavailable

Bottom line:

- For a serious launch, `Vercel Hobby` is not enough.
- `Supabase Pro` is likely enough as a plan, but you should expect to run the production project on at least `Small`, and `Medium` is the safer default if report exports and psychometric jobs will be active.
- The bigger readiness work is scheduling, queue draining, monitoring, secrets, and tenant-isolation hardening.

## What The Repo Shows Today

### Request handling and auth surfaces

- Public login is centralized at `/client-login`.
- Admin and portal are then routed by entitlement and host-aware middleware in [`proxy.ts`](../proxy.ts).
- Unauthenticated admin and portal traffic is redirected away from protected paths.
- Admin access is resolved from `profiles.role` plus an optional bootstrap path via `ADMIN_DASHBOARD_EMAILS` and `ALLOW_ADMIN_EMAIL_BOOTSTRAP`.
- Portal access is resolved from `organisation_memberships`, with an explicit admin bypass mode that lets internal admins switch organization context inside the portal.

### Background work

- Vercel cron is configured only for:
  - `/api/cron/email-jobs`
  - `/api/cron/report-export-jobs`
- Both are scheduled daily in [`vercel.json`](../vercel.json).
- Psychometric analysis also has a cron endpoint at `app/api/cron/psychometric-analysis-jobs/route.ts`, but it is not scheduled in `vercel.json`.
- Email job processing batches from the `email_jobs` table.
- Report export processing batches from the `report_export_jobs` table and uploads PDFs to Supabase Storage.

### Data storage and PII

- Contacts, submissions, survey responses, invitations, memberships, campaigns, and audit records are all stored in Supabase Postgres.
- Sensitive fields are stored directly in table columns or JSONB, including examples such as:
  - phone number
  - demographics
  - dietary requirements
  - injury or medical notes
  - survey/assessment responses
- Generated report PDFs are stored in Supabase Storage.

### Tenant segregation model

- Most direct table access from client-facing authenticated users is blocked with deny-all RLS policies.
- The application then uses the Supabase service-role key server-side for admin and portal operations.
- Portal data access is narrowed in service code with `organisation_id` filters and portal-context checks.
- That means isolation currently depends heavily on correct application logic, not on tenant-scoped database enforcement.

## Findings

### 1. Critical: Current background processing is not compatible with “live” operations

Evidence:

- [`vercel.json`](../vercel.json) schedules email and report jobs once per day.
- [`docs/deployment-flow.md`](../docs/deployment-flow.md) explicitly says the daily schedule exists for Hobby-plan compatibility.
- `processPendingReportExportJobs` and `runPendingEmailJobs` are queue drains, not immediate dispatch.

Impact:

- emails can sit in queue for hours
- report export jobs can sit in queue for hours
- “unlimited and live” behavior is not realistic in the current configuration

Assessment:

- This is the main launch blocker.
- Upgrading Supabase alone will not solve it.

### 2. High: Tenant segregation is strong in app code, but not strong enough for a strict isolation story

Evidence:

- Portal context is resolved from `organisation_memberships` in [`utils/portal-context.ts`](../utils/portal-context.ts).
- Portal APIs depend on `requirePortalApiAuth()` and `organisation_id` filtering.
- Most protected business tables use deny-all RLS for `anon` and `authenticated`, then rely on service-role access from the app.

Impact:

- a bug in server-side query filtering could expose one company’s data to another
- security depends on every portal/admin service correctly scoping by `organisation_id`

Assessment:

- This is acceptable for an early production baseline if code review discipline is strong.
- It is not the strongest possible multi-tenant isolation model for highly sensitive data.

Recommended next step:

- Add a second layer of tenant enforcement for portal data, such as security-definer accessors, tenant-scoped views, or RLS-compatible API tables/functions for organization-bound reads.

### 3. High: MFA is disabled and password-only auth is still the live mode

Evidence:

- [`README.md`](../README.md) states: `Current auth mode is simple email/password sign-in (MFA disabled).`
- [`docs/production-checklist.md`](../docs/production-checklist.md) also states password-only sign-in with MFA/TOTP disabled.

Impact:

- increased account takeover risk for admins and client users
- weaker defense for a system holding sensitive participant and company data

Assessment:

- For your stated data sensitivity, admin MFA should be mandatory before launch.
- Portal MFA is strongly recommended, especially for organization owners and admins.

### 4. High: Leaked-password protection is not represented in code and still requires dashboard confirmation

Evidence:

- The repo does not manage Supabase Auth configuration in code.
- Password reset/set flows are client-side validations plus `supabase.auth.updateUser({ password })`.

Impact:

- compromised passwords may still be accepted if the dashboard setting is off

Assessment:

- This must be verified directly in Supabase.

### 5. High: Rate limiting fails open when Redis is missing or unavailable

Evidence:

- [`utils/security/request-rate-limit.ts`](../utils/security/request-rate-limit.ts) returns `allowed: true` if Upstash env vars are missing or Redis is unreachable.
- The code logs degradation, but traffic is still allowed through.

Impact:

- under outage or misconfiguration, the public site and public APIs lose their main abuse control
- a burst or attack can become an availability and cost problem

Assessment:

- Fail-open may be acceptable for developer ergonomics.
- It is not a strong production posture for a public assessment platform.

### 6. Medium: Sensitive PII is stored in plaintext application fields

Evidence:

- [`supabase/migrations/20260225170000_submission_intake_v2.sql`](../supabase/migrations/20260225170000_submission_intake_v2.sql) stores sensitive form data and marks some fields as `sensitive`, but does not encrypt them.
- [`supabase/migrations/20260310150000_add_invitation_demographics.sql`](../supabase/migrations/20260310150000_add_invitation_demographics.sql) adds demographics as JSONB.
- [`supabase/migrations/20260304090000_create_survey_engine.sql`](../supabase/migrations/20260304090000_create_survey_engine.sql) stores survey responses, classifications, and recommendations in JSONB.

Impact:

- anyone with service-role access, dashboard SQL access, or raw backup access can read the data directly
- “sensitive” is a metadata marker, not an encryption control

Assessment:

- This can still be within a strong PII baseline if provider access is tightly controlled and accounts are well secured.
- It is not a field-encrypted design.

Recommended next step:

- Decide whether the highest-sensitivity fields should remain directly readable in Postgres.
- If not, introduce field-level encryption or tokenization for a subset of columns.

### 7. Medium: Admin bootstrap must not remain enabled in production

Evidence:

- [`utils/dashboard-auth.ts`](../utils/dashboard-auth.ts) and [`utils/auth-entitlements.ts`](../utils/auth-entitlements.ts) allow an initial admin bootstrap path based on environment configuration.

Impact:

- if left enabled too long, admin access policy becomes weaker than intended

Assessment:

- Safe for initial provisioning only.
- Should be disabled immediately after the first real admin is established.

### 8. Medium: Sidecar and report generation create additional operational and security surface

Evidence:

- The app can render reports with Playwright directly or route through a Render sidecar.
- Psychometric validation uses a sidecar path as well.

Impact:

- another service to secure, monitor, and scale
- more secrets to manage
- more risk of latency spikes or queue backlog

Assessment:

- Fine if it is actively used and maintained.
- If it is not central to production traffic, simplify and remove it from the hot path where possible.

## Admin Login Paths and Access Model

Current model:

- `/client-login` is the canonical public login surface.
- `/dashboard` is the admin surface.
- `/portal` is the client portal surface.
- Middleware redirects users to the correct host/surface.
- `/login` and `/portal/login` are effectively routing aliases rather than the true central login model.

Security interpretation:

- This is a reasonable pattern.
- It is only as strong as:
  - the correctness of entitlement resolution
  - the safety of the service-role usage
  - the protection of provider accounts and environment secrets

## How Data Is Stored Today

Primary storage locations:

- Supabase Postgres for operational data, user-linked records, invitations, results, jobs, memberships, and audit logs
- Supabase Storage for generated report files
- Vercel environment variables for application secrets
- Render environment variables if the sidecar is used
- Upstash Redis for rate limiting, when configured

Storage security interpretation:

- The repo uses good deny-all RLS patterns for many internal tables.
- The application still depends on service-role access for most serious work.
- The design is workable, but it is not “database-enforced tenant isolation.”

## Can One Company See Another Company’s Data?

Current answer:

- In normal operation, portal users should not see another company’s data because the portal layer resolves one organization context and service queries filter by `organisation_id`.
- Internal admins can intentionally switch organization context in the portal.
- The system logs admin organization switches into `admin_audit_logs`.

Risk caveat:

- Because this segregation mostly lives in application logic, a filtering bug or missing `organisation_id` condition is the most realistic cross-company exposure path.

Practical conclusion:

- For a growth launch, this is usable if you put strict code review around all portal/admin queries.
- For a stronger isolation guarantee, move more of that enforcement into database-native controls or constrained server accessors.

## Plan and Cost Recommendation

### Minimum serious production recommendation

- Vercel: `Pro`
- Supabase: `Pro`
- Supabase production project compute: start at `Small`, plan for `Medium`
- Resend: `Pro`
- Upstash Redis: paid usage path, not free-only
- Render sidecar: paid instance if it remains in production use

### Why Vercel Pro is required

Official Vercel docs say Hobby cron jobs are limited to once per day with hourly precision, while Pro supports once-per-minute cron with per-minute precision.

That means:

- Hobby cannot support near-live queue draining
- Pro is the minimum plan that lets you move email/report processing toward live behavior

### Why Supabase Pro is required

Supabase Free is not appropriate for this launch profile because you need:

- a paid production organization
- no paused production project behavior
- higher quotas
- spend-cap controls
- room to scale compute, storage, egress, and backups/add-ons

Important nuance:

- The database plan itself is not the main blocker.
- `Supabase Pro` is likely enough as the plan.
- The main Supabase question is project compute size.

### Recommended Supabase compute starting point

Inference from the current design:

- `Micro` is too small for a serious launch if admin traffic, queue drains, report exports, and psychometric workloads all hit the same production database.
- `Small` is the minimum sensible production starting point if you are cost-sensitive.
- `Medium` is the safer default for a growth launch because it gives more headroom for concurrent interactive traffic and background jobs.

Recommended production posture:

- Start on `Small` only if you expect low simultaneous demand in the first weeks and you are watching DB metrics daily.
- Otherwise start on `Medium`.
- Pre-approve a fast upgrade path to `Large` if psychometric analysis volume or concurrent exports rise sharply.

### Monthly cost scenarios

These are rough baseline estimates, not invoice guarantees. They exclude major overages and assume one production app, one production Supabase project, one email provider account, one Redis instance, and one sidecar service if used.

| Scenario | Vercel | Supabase | Resend | Upstash | Render | Estimated baseline |
| --- | --- | --- | --- | --- | --- | --- |
| Light | Pro $20 | Pro $25 + Micro $10 - $10 compute credit = about $25 total | Pro $20 | Fixed 250MB $10 or PAYG near-zero | Starter $7 if used | about $72 to $82/mo |
| Growth | Pro $20 | Pro $25 + Small $15 - $10 compute credit = about $30 total, or Medium $60 - $10 = about $75 total | Pro $20 | Fixed 250MB $10 to 1GB $20 | Starter $7 to Standard $25 if used | about $87 to $140/mo |
| Heavy | Pro $20 plus usage | Pro $25 + Large $110 - $10 = about $125 total or higher | Scale $90 | 1GB+ fixed or higher | Standard $25 to Pro $85 if used | about $270 to $340+/mo |

Interpretation:

- If you want “real production” with live queue draining and no daily email cap, the floor is roughly the growth-launch row, not the light row.
- Your real monthly number is more likely to land in the `about $100 to $150/mo` range before overages if the sidecar remains light and the database starts at `Small` or `Medium`.
- If psychometric jobs and report exports become frequent, Supabase compute and Render sidecar cost will rise faster than Vercel base cost.

### Email scale interpretation

Resend pricing currently makes the answer straightforward:

- Free is not viable for launch because it allows only 100 emails per day.
- Pro is the minimum serious plan because it removes the daily limit and includes 50,000 emails per month.
- Scale becomes relevant only once you materially exceed that monthly volume or need stronger support/posture.

## Security Standard Assessment

For a strong PII baseline, the application is not yet at the target state.

It is closest to:

- structurally promising
- not yet hardened enough for sensitive production operations

Before launch, the minimum recommended control set is:

- admin MFA enabled
- leaked-password protection enabled
- `ALLOW_ADMIN_EMAIL_BOOTSTRAP=false` in production after first admin setup
- provider-account MFA on GitHub, Vercel, Supabase, Render, and Resend
- production-only secrets rotated and separated from preview/dev
- rate limiting configured and no longer operationally fail-open without an explicit decision
- queue drains increased from daily to minute-level or replaced with a more immediate job mechanism
- explicit psychometric job scheduling
- external backup/PITR/logging settings reviewed in Supabase

## External Checks You Must Perform Outside The Repo

### Vercel

- confirm current plan is `Pro` or above before launch
- confirm cron schedules are no longer daily-only
- confirm environment variables are scoped correctly across production, preview, and development
- confirm spend alerts and billing visibility
- review who has project access
- confirm production branch protection and deployment rules match GitHub

### Supabase

- confirm organization plan is `Pro` or above
- confirm production project compute size
- confirm leaked-password protection is enabled
- confirm MFA options and dashboard-account MFA
- confirm PITR and backup settings for production
- confirm storage buckets and signed URL behavior
- confirm no stale SQL editor access or extra owners
- confirm spend cap behavior and cost controls

### GitHub

- confirm branch protection on `main`
- confirm required CI checks are enforced
- confirm secret scanning and Dependabot are enabled
- confirm all admins have MFA enabled
- review who has admin rights on the repo and organization

### Render

- confirm whether the sidecar is actually in production use
- confirm the service plan and health checks
- confirm secrets and access controls
- confirm who can redeploy or shell into the service
- confirm whether the workspace needs the paid team/compliance tier

### Local machine / operator hygiene

- confirm full-disk encryption
- confirm a password manager is used for provider credentials
- confirm MFA is enabled on the operator accounts tied to Vercel, Supabase, GitHub, Render, and Resend
- confirm local `.env` files are not synced into insecure cloud drives or shell history
- confirm browser sessions for production consoles are limited to trusted devices

## Recommended Next Actions

### Before launch

1. Upgrade Vercel to `Pro` if not already done.
2. Move cron-driven queue drains from daily to at least minute-level.
3. Add the psychometric-analysis cron schedule if that workflow is part of production.
4. Upgrade Supabase to `Pro` and set production compute to `Small` or `Medium`.
5. Upgrade Resend to `Pro`.
6. Enable admin MFA and leaked-password protection.
7. Disable admin bootstrap in production after the real admin account exists.
8. Verify Upstash is configured in production and decide whether fail-open remains acceptable.

### Next hardening wave

1. Reduce dependence on service-role plus app-only tenant filtering for portal reads.
2. Add stronger monitoring and alerting for:
   - failed queue drains
   - report backlog age
   - psychometric run backlog age
   - rate-limit degradation
   - email delivery failures
3. Decide whether the most sensitive participant fields need field-level encryption or tokenization.
4. Review sidecar necessity and simplify the runtime if possible.

## Prioritized Remediation Backlog

### P0: Must do before launch

These are launch blockers for the operating model you described.

1. Move the app off `Vercel Hobby` and onto `Vercel Pro`.
   Outcome:
   minute-level cron becomes available, and the platform is no longer capped at once-daily scheduled processing.

2. Change queue processing from daily to near-live.
   Scope:
   - reschedule `/api/cron/email-jobs` from daily to minute-level
   - reschedule `/api/cron/report-export-jobs` from daily to minute-level
   - decide whether psychometric validation is production-critical; if yes, add `/api/cron/psychometric-analysis-jobs` to the live schedule
   Outcome:
   email sends and report exports stop sitting in queue for hours.

3. Confirm and harden Supabase Auth settings.
   Scope:
   - enable leaked-password protection
   - enable MFA for admins at minimum
   - review password reset/invite redirect URLs
   Outcome:
   the current password-only baseline is replaced with a more defensible production auth posture.

4. Lock down bootstrap admin access.
   Scope:
   - verify a real admin user exists in `profiles`
   - set `ALLOW_ADMIN_EMAIL_BOOTSTRAP=false` in production
   - keep `ADMIN_DASHBOARD_EMAILS` limited and deliberate
   Outcome:
   admin access depends on the database role model, not emergency bootstrap config.

5. Put rate limiting into a production-ready state.
   Scope:
   - verify Upstash is configured in production
   - verify alerts are wired for `rate_limit_degraded`
   - decide whether fail-open remains acceptable; if not, change the production behavior
   Outcome:
   public traffic protection is real rather than best-effort.

6. Set the minimum provider plan baseline.
   Scope:
   - Supabase `Pro`
   - production compute at `Small` or `Medium`
   - Resend `Pro`
   - paid Redis usage path
   - paid Render service if the sidecar is live
   Outcome:
   the stack is on plans that match the launch expectations rather than development constraints.

7. Review provider-account access and MFA.
   Scope:
   - GitHub
   - Vercel
   - Supabase
   - Resend
   - Render
   Outcome:
   console compromise becomes materially harder.

### P1: Should do in the first 30 days

These are not necessarily blockers for day one, but they should happen early if sensitive client data is involved.

1. Add monitoring for backlog age and failed job processing.
   Scope:
   - email queue oldest pending job age
   - report export queue oldest pending job age
   - psychometric queue oldest pending job age
   - failed job counts
   Outcome:
   you can see degradation before users feel it.

2. Produce an explicit capacity runbook.
   Scope:
   - what metrics trigger a move from `Small` to `Medium`
   - what metrics trigger a move from `Medium` to `Large`
   - who owns those decisions
   Outcome:
   scale-up becomes planned instead of reactive.

3. Harden tenant isolation beyond app-layer filtering.
   Scope:
   - identify the highest-risk portal reads/writes
   - move them behind safer accessors, views, or more constrained DB interfaces
   Outcome:
   one missing `organisation_id` filter is less likely to become a cross-company exposure.

4. Audit storage and report URL exposure.
   Scope:
   - review generated report bucket settings
   - review signed URL TTLs
   - review report access token TTLs and invalidation story
   Outcome:
   report documents remain shareable only within intended bounds.

5. Review whether the sidecar belongs in the production critical path.
   Scope:
   - determine whether Playwright-only rendering is sufficient
   - determine whether psychometric sidecar use needs dedicated capacity
   Outcome:
   fewer services to secure and operate if the sidecar is not necessary.

6. Create an incident-response minimum.
   Scope:
   - who responds to auth failure, queue failure, exposure, or provider compromise
   - how secrets are rotated
   - how provider access is revoked
   Outcome:
   there is a defined response when something goes wrong.

### P2: Later hardening

These improve the longer-term security story and are especially relevant if customer expectations rise or formal assurance becomes necessary.

1. Add field-level protection for the most sensitive PII.
   Candidates:
   - injury or medical notes
   - certain demographics fields
   - potentially phone and other personal identifiers
   Outcome:
   raw database access exposes less directly readable data.

2. Reduce broad service-role dependency.
   Scope:
   - identify where service-role is being used for convenience rather than necessity
   - replace with narrower patterns where possible
   Outcome:
   authorization errors become less catastrophic.

3. Add stronger auditability around privileged actions.
   Scope:
   - more structured admin action logs
   - provider-account access review cadence
   - deployment and config change logging
   Outcome:
   you can reconstruct who changed what and when.

4. Prepare for stricter customer security reviews.
   Scope:
   - documented data retention rules
   - documented backup and restore process
   - documented access review cadence
   - documented vendor/security baseline
   Outcome:
   the system is easier to defend in diligence conversations.

## Suggested Execution Order

Week 1:

- Vercel Pro upgrade
- Supabase Pro confirmation and production compute decision
- Resend Pro upgrade
- live cron rescheduling
- leaked-password protection enablement
- admin MFA enablement
- bootstrap admin shutdown

Week 2:

- Upstash production verification and alerting
- psychometric scheduler decision
- backlog and failure monitoring
- provider-access review across GitHub, Vercel, Supabase, Resend, and Render

Weeks 3-4:

- tenant-isolation hardening design
- storage/report-access review
- sidecar production-path review
- incident-response and secret-rotation runbook

## Sources

Official pricing and limits used in this audit:

- Vercel cron limits and pricing: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel pricing: https://vercel.com/pricing
- Supabase billing overview: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase compute pricing: https://supabase.com/docs/guides/platform/compute-add-ons
- Supabase spend cap: https://supabase.com/docs/guides/platform/spend-cap
- Supabase storage pricing: https://supabase.com/docs/guides/storage/management/pricing
- Supabase realtime limits: https://supabase.com/docs/guides/realtime/rate-limits
- Resend pricing: https://resend.com/pricing
- Upstash Redis pricing: https://upstash.com/docs/redis/overall/pricing
- Render pricing: https://render.com/pricing
- Render free-service warning: https://render.com/docs/free
