# Legacy Schema Cleanup Runbook

This runbook validates that legacy commerce and retreat profile schema is no longer in use before applying the destructive cleanup migration.

## Scope validated

- Tables: `offerings`, `offering_variants`, `bookings`, `payments`, `contact_identities`
- Legacy contact columns (retreat/dietary/profile)
- Legacy form keys: `register_interest`, `retreat_registration_v1`, `general_registration_v1`, `retreat_profile_optional_v1`

## Required env

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 1) Generate preflight report (staging first)

```bash
npm run db:legacy:preflight -- --env staging --days 7
```

Output: JSON report under `tools/db/reports/` with:
- status (`PASS`/`FAIL`)
- metrics
- failure reasons
- integrity signature

## 2) Run SQL dependency + usage checks manually

Run these in Supabase SQL editor for staging, then production:

- `tools/db/sql/legacy-cleanup-usage-check.sql`
- `tools/db/sql/legacy-cleanup-dependency-check.sql`

These are mandatory sign-off artifacts for destructive cleanup.

## 3) Repeat preflight on production after observation window

```bash
npm run db:legacy:preflight -- --env production --days 7
```

## 4) Guarded drop gate

Set explicit approval token:

```bash
export LEGACY_CLEANUP_APPROVAL=I_UNDERSTAND_DROP
```

Dry-run gate validation (no migration applied):

```bash
npm run db:legacy:gate-drop -- --report tools/db/reports/<production-report>.json
```

Apply migration only after approved gate:

```bash
npm run db:legacy:gate-drop -- --report tools/db/reports/<production-report>.json --execute
```

This calls `npm run db:push` and applies pending migrations (including the legacy drop migration).

## Safety notes

- Do not run `--execute` until dependency SQL checks are clean and preflight report status is `PASS`.
- Keep `legacy_row_archive` and `schema_cleanup_log` for auditability.
- If report signature mismatch occurs, regenerate report and do not proceed.
