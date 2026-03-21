# Leadership Quarter

Leadership Quarter is a multi-surface Next.js application that combines:
- the public site
- assessment delivery
- an internal admin dashboard
- a client portal
- report rendering and PDF generation
- Supabase-backed operations and migrations

## Repository Shape
- `app/`: routes for site, assessments, dashboard, portal, auth, API, and document/report pages
- `components/`: shared UI and feature components grouped by owning surface
- `utils/`: domain logic, orchestration, auth/security helpers, reporting, and services
- `supabase/`: schema migrations
- `tools/`: local operational scripts
- `sidecar/`: Python sidecar for rendering and analysis workloads
- `docs/`: active architecture and operations docs
- `docs/archive/`: completed audits and historical planning material

Architecture guidance:
- `docs/architecture.md`
- `docs/assessment-cutover-recovery-plan.md`
- `docs/repo-hygiene.md`

## Getting Started
Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Validation
Expected local checks before merging:

```bash
npm run lint
npm run build
npm run test
npm run test:e2e:smoke
npm run audit:repo
```

## Environment
Minimum for public-only rendering:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Typical server-side configuration:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
CRON_SECRET=...
REPORT_ACCESS_TOKEN_SECRET=...
AUTH_HANDOFF_SECRET=...
```

Optional runtime configuration:

```bash
GENERATED_REPORTS_BUCKET=generated-reports
REPORT_PDF_RENDERER=sidecar
SIDECAR_URL=http://localhost:10000
SIDECAR_API_KEY=...
AUTH_SHARED_COOKIE_DOMAIN=leadershipquarter.com
```

## Report Delivery
Report delivery is currently based on gated web pages plus on-demand PDF rendering.

Current canonical path:
- unlock a gated report page through the relevant form or completion flow
- render the HTML report page at `/document/reports/[reportType]`
- generate a PDF on demand through `/api/reports/[reportType]/pdf`

The repository does not currently include a live report-export cron route. Documentation and operations should assume direct rendering unless a queued export path is intentionally restored.

Local sidecar smoke test:

```bash
cd sidecar
docker build -t sidecar .
docker run -p 10000:10000 -e SIDECAR_API_KEY=test-key sidecar
curl http://localhost:10000/health
```

## Deployment And Operations
- `docs/production-checklist.md`
- `docs/deployment-flow.md`
- `docs/queue-operations-runbook.md`

## Historical Material
Completed audits, checkpoints, and old planning documents live under `docs/archive/`.
