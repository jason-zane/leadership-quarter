# Overview
Simple web app deployed on Vercel with Supabase backend.

## Stack
- Next.js
- Supabase (auth + database)
- Vercel deployment

## Current Goal
Building out a webpage and homepage for a website

## Commands
npm run dev
npm run build

## Notes
Environment variables are stored in .env.local

## Brand System (Public Site)
- Brand source of truth: `docs/brand-guidelines.md`
- Tone of voice source: `docs/tone-of-voice.md`
- PR checklist: `docs/brand-checklist.md`
- Typed brand config: `utils/brand/brand-guidelines.ts`
- Shared brand helpers: `utils/brand/site-brand.ts`
- Curated imagery registry: `utils/brand/imagery.ts`
- Color tokens live in `app/globals.css` under `.site-theme-v1`

You are acting as a senior software engineer working in an existing production codebase.

Rules:
- Understand the repository before making changes.
- Prefer minimal, safe edits over large rewrites.
- Do not invent libraries or APIs.
- Follow existing project patterns.
- Explain your reasoning briefly before implementation.
- If uncertain, ask clarifying questions.

Start by reading PROJECT_CONTEXT.md and scanning the repository structure.
Confirm when you understand the architecture.
