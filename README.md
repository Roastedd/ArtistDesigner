# ArtistDesigner

A multi-tenant SaaS for building a single fictional AI artist persona (Gorillaz-style solo character) with a locked sonic + visual identity, then generating Suno/Udio prompts and lyrics with consistent voice — and shipping releases through a guided distribution checklist.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Neon Postgres** (serverless driver)
- **Drizzle ORM** + drizzle-kit
- **Auth.js v5** (Drizzle adapter, magic-link email)
- **OpenRouter** for all LLM calls (free + paid models, prompt-export only)

## Setup

1. Copy `.env.example` → `.env.local` and fill in:
   - `DATABASE_URL` (already set to your Neon project)
   - `AUTH_SECRET` — generate with `openssl rand -base64 32` (or `npx auth secret`)
   - `OPENROUTER_API_KEY` — https://openrouter.ai/keys
   - For email sign-in: `EMAIL_SERVER` + `EMAIL_FROM` (Resend / Mailtrap / etc.)

2. Push the schema to Neon:
   ```pwsh
   pnpm drizzle-kit push
   ```

3. Run dev:
   ```pwsh
   pnpm dev
   ```

## What's built (MVP slice)

- Multi-tenant schema (every domain row scoped by `userId`)
- Auth.js magic-link sign-in
- Persona Studio: Identity, Sonic DNA, Visual DNA, Voice & Language, Persona Core override
- Prompt Forge with persona auto-injection (Suno + lyrics modes, free/paid model picker)

## Next milestones

- Album Workshop (tracks, ordering, status pipeline)
- Lyric structure editor with version history
- Asset Locker (cover art uploads to R2/S3)
- Release Planner with distribution checklist
- Public portfolio microsite per persona
