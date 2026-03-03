# Leadership Quarter

Marketing website for Leadership Quarter, built with Next.js.

## Site Scope

The public site includes:
- Home
- Capabilities and capability detail pages
- LQ8 framework page with report download flow
- Work with us inquiry page
- About Leadership Quarter
- Contact

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
LQ8_REPORT_BUCKET=reports
LQ8_REPORT_PATH=lq8/lq8-framework-report.pdf
AI_READINESS_REPORT_BUCKET=reports
AI_READINESS_REPORT_PATH=ai/ai-readiness-enablement-framework.pdf
REPORT_ACCESS_TOKEN_SECRET=...
```

Optional first-admin bootstrap (initial setup only):

```bash
ADMIN_DASHBOARD_EMAILS=you@yourdomain.com
ALLOW_ADMIN_EMAIL_BOOTSTRAP=true
```

Current auth mode is simple email/password sign-in (MFA disabled).

## Deploy

Deploy to Vercel as a standard Next.js app.

For deployment notes, see:
- `docs/production-checklist.md`
- `docs/deployment-flow.md`
- `docs/brand-system-v2.md`

## PDF Creator

Generate full-page branded PDFs locally:

```bash
npm run pdf:template -- --output tools/pdf/reports/my-report.json
npm run pdf:create -- --input tools/pdf/reports/my-report.json --output public/reports/my-report.pdf
npm run pdf:from-route -- --url http://localhost:3001/print/reports/ai-capability-model --output public/reports/ai-capability-model.pdf
npm run pdf:from-route -- --url http://localhost:3001/print/reports/lq8-framework --output public/reports/lq8-framework.pdf
```

Detailed workflow:
- `docs/pdf-creator.md`
