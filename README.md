# Leadership Quarter

Leadership Quarter is a multi-surface Next.js application that combines the public site with
assessment delivery, client portal workflows, admin tooling, report generation, and Supabase-backed
operations.

## System Scope

The repo currently contains:
- Public marketing site and framework/report landing flows
- Assessment runtime for public, campaign, and invitation-based assessments
- Admin backend for assessments, campaigns, contacts, reports, and email templates
- Client portal for campaign visibility and participant workflows
- PDF/report generation tools and operational scripts
- Supabase schema migrations and environment-specific database tooling

## Architecture Notes

Core areas:
- `app/`: route surfaces for site, assessments, dashboard, portal, auth, API, and print/report pages
- `components/`: shared UI plus feature components grouped by product area
- `utils/`: domain logic and platform helpers, including assessment engines, auth, security, reports, and services
- `supabase/`: schema migrations
- `tools/`: local operational and PDF/database scripts

Placement rules:
- Keep route handlers and pages thin; move workflow logic into reusable domain modules.
- Put feature-specific UI close to the owning surface, using local `_components/` folders when a page grows large.
- Reserve generic shared folders for code that is genuinely cross-surface.

Additional architecture guidance:
- `docs/architecture.md`
- `docs/backend-roadmap.md`

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Environment Variables

Minimum for public-only rendering:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Required for the mini admin + lead capture stack:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
RESEND_NOTIFICATION_TO=...
CRON_SECRET=...
REPORT_ACCESS_TOKEN_SECRET=...
AUTH_HANDOFF_SECRET=...
```

Optional additional config:

```bash
GENERATED_REPORTS_BUCKET=generated-reports
REPORT_PDF_RENDERER=sidecar
SIDECAR_URL=http://localhost:10000
SIDECAR_API_KEY=generate-a-random-64-char-string-here
AUTH_SHARED_COOKIE_DOMAIN=leadershipquarter.com
```

Report downloads should use `sidecar` in deployed environments.
If `SIDECAR_URL` and `SIDECAR_API_KEY` are present, the app now prefers the sidecar automatically unless you explicitly set `REPORT_PDF_RENDERER=playwright`.
Keep `playwright` for local or non-production workflows only.

Optional first-admin bootstrap (initial setup only):

```bash
ADMIN_DASHBOARD_EMAILS=you@yourdomain.com
ALLOW_ADMIN_EMAIL_BOOTSTRAP=true
```

Current auth mode is simple email/password sign-in (MFA disabled).

## Deploy

Deploy the Next.js app to Vercel and the Python sidecar to Render.

For deployment notes, see:
- `docs/production-checklist.md`
- `docs/deployment-flow.md`
- `docs/brand-system-v2.md`

## Report Delivery

Framework and assessment reports are delivered as gated web pages first. Users unlock the report via the relevant form or completion flow, then either:
- use `Print / Save as PDF` in the browser for an immediate local copy
- use `Generate PDF download` to queue a rendered export and open the finished PDF when ready

Queued/generated exports are stored in Supabase Storage under `GENERATED_REPORTS_BUCKET` or the default `generated-reports` bucket.

Local sidecar smoke test:

```bash
cd sidecar
docker build -t sidecar .
docker run -p 10000:10000 -e SIDECAR_API_KEY=test-key sidecar
curl http://localhost:10000/health
curl -X POST http://localhost:10000/render-pdf \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Hello</h1>"}' \
  --output test.pdf
```

Repo-level smoke test script:

```bash
npm run pdf:test:docker
npm run pdf:test:docker -- --url http://localhost:3001/document/reports/lq8?access=YOUR_TOKEN --base-url http://host.docker.internal:3001/ --output sidecar-report.pdf
```

If the sidecar runs in Docker locally and styled PDFs are missing assets, point `NEXT_PUBLIC_SITE_URL`
at a host the container can reach, such as `http://host.docker.internal:3001`.

The JSON-driven branded-document tooling still exists separately:
- `docs/pdf-creator.md`

## Legacy Schema Cleanup

Preflight and guarded cleanup scripts:

```bash
npm run db:legacy:preflight -- --env staging --days 7
npm run db:legacy:preflight -- --env production --days 7
npm run db:legacy:gate-drop -- --report tools/db/reports/<production-report>.json
LEGACY_CLEANUP_APPROVAL=I_UNDERSTAND_DROP npm run db:legacy:gate-drop -- --report tools/db/reports/<production-report>.json --execute
```

Manual SQL validation packs:
- `tools/db/sql/legacy-cleanup-usage-check.sql`
- `tools/db/sql/legacy-cleanup-dependency-check.sql`

Runbook:
- `docs/legacy-schema-cleanup.md`
