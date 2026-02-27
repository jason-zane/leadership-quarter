This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Register Interest + Resend Setup

Add these values to `.env.local`:

```bash
# Replace re_xxxxxxxxx with your real Resend API key
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=jason@milesbetween.com
RESEND_NOTIFICATION_TO=jason@milesbetween.com
RESEND_REPLY_TO=jason@milesbetween.com

# Needed for database writes from server route
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Comma-separated admin users allowed to view /dashboard submissions
ADMIN_DASHBOARD_EMAILS=jason@milesbetween.com
```

Notes:
- `RESEND_FROM_EMAIL` must be a verified sender/domain in Resend.
- If your domain is not verified yet, use `onboarding@resend.dev` temporarily as `RESEND_FROM_EMAIL`.
- Run `npm run db:push` so both interest + email template migrations are applied before testing.

## Supabase CLI Workflow (One Command)

Use this once to set up migrations from your machine:

1. Install Supabase CLI (if needed):
```bash
brew install supabase/tap/supabase
```
2. Authenticate:
```bash
supabase login
```
3. Set your project ref and link once:
```bash
export SUPABASE_PROJECT_REF=your_project_ref
npm run db:link
```

After that, push all local migrations with one command:

```bash
npm run db:push
```

For this project, migration files live in:
- `supabase/migrations/`

## Setup Health Check

Verify environment + table access in one call:

```bash
curl -s http://localhost:3000/api/health/register-interest | jq
```

Or open in browser:

- `http://localhost:3000/api/health/register-interest`

`ok: true` means required env vars are set and both `interest_submissions` + `email_templates` are reachable.

## Email Templates Admin

After logging in as an admin user (`ADMIN_DASHBOARD_EMAILS`), edit email copy at:

- `http://localhost:3000/dashboard/emails`

Available template variables:

- `{{first_name}}`
- `{{last_name}}`
- `{{email}}`
- `{{source}}`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Launch

For the full production setup under `milesbetween.com`, follow:

- `docs/production-checklist.md`
