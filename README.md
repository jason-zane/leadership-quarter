# Leadership Quarter

Marketing website for Leadership Quarter, built with Next.js.

## Site Scope

The public site includes:
- Home
- Services and service detail pages
- About Leadership Quarter
- Contact / Get in touch

Legacy retreat-focused public routes are redirected to the new service pages.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Environment Variables

Only this variable is required for normal frontend operation:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Backend-related variables (Supabase, Resend, Cron, Admin) are optional unless using those systems.

Temporary site password protection can be enabled in any environment with:

```bash
SITE_PROTECT_ENABLED=true
SITE_USERNAME=preview
SITE_PASSWORD=your-strong-password
```

When enabled, all non-API routes require HTTP Basic Auth.

## Deploy

Deploy to Vercel as a standard Next.js app.

For deployment notes, see:
- `docs/production-checklist.md`
