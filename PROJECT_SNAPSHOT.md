# ArtistDesigner — Project Snapshot

A Next.js 16 web app for designing and managing **AI music artist personas** end-to-end: identity, sonic/visual DNA, eras, albums, tracks, prompts (Suno/Udio/etc.), lyric versions, releases, and a public portfolio page per artist.

Live: `https://artist-designer.vercel.app` · Repo: `Roastedd/ArtistDesigner` · Branch: `main` (Vercel auto-deploys on push)

---

## Stack

- **Next.js 16.2.4** (App Router + Turbopack). ⚠️ Middleware lives in `src/proxy.ts` (non-standard — see `AGENTS.md`).
- **Auth.js 5.0.0-beta.31** with `DrizzleAdapter`, magic-link email via **Resend** SMTP.
- **Drizzle ORM** + **Neon Postgres** serverless. Schema in `src/db/schema.ts`. Push with `pnpm db:push`.
- **OpenRouter** for AI generation (`src/lib/openrouter.ts`). Free models like `deepseek/deepseek-chat-v3.1:free`.
- **pnpm** + **TailwindCSS 4** (CSS variables for theming).
- Hosted on **Vercel** (project `edwards-projects-41ebafa6/artist-designer`).

---

## Data Model (`src/db/schema.ts`)

```
users / accounts / sessions / verificationTokens   ← Auth.js tables
personas                                            ← identity + sonic/visual DNA + voice/language
  ├── eras            (chapters with optional dnaOverrides)
  ├── albums          (eraId optional, concept, coverUrl, releaseDate)
  │     └── tracks    (status enum: idea→prompt→lyrics→demo→master→released,
  │                    audioUrl, bpm, keySignature, durationSec)
  │           ├── promptVersions   (target: suno|udio|riffusion|other, body, model)
  │           └── lyricVersions    (body, structure jsonb [{section,text}], model)
  └── releases        (distributor, upc, releaseDate, checklist jsonb)
```

Cascade deletes set up so deleting a persona cleans up everything.

---

## Routes (18)

App (auth-gated, `(app)` group):
- `/dashboard` — persona cards + aggregate stats (personas / albums / tracks / releases + status breakdown).
- `/personas` · `/personas/new`
- `/personas/[id]` — Studio (full identity + DNA editing, persona-core auto-build, Duplicate, Export JSON, Delete).
- `/personas/[id]/eras` — CRUD + ↑↓ reorder.
- `/personas/[id]/albums` · `/personas/[id]/albums/[albumId]` — album CRUD, track list w/ drag-style reorder.
- `/personas/[id]/tracks` — flat list across all albums + standalone tracks.
- `/personas/[id]/tracks/[trackId]` — track edit (title/status/notes/BPM/key/audio URL + inline `<audio>`), Prompt Forge (Suno/Udio/lyrics targets), prompt + lyric version history.
- `/personas/[id]/releases` · `/personas/[id]/releases/[releaseId]` — release planner with phase checklist.

Public:
- `/p/[slug]` — portfolio page (palette gradient header, bio, sound/influences, **discography grouped by era**, tracks with inline audio, "Build your own AI artist" CTA).

API:
- `POST /api/ai/generate` — generates Suno/lyrics/persona-core text; rate-limited 20/min/user; can save as a `promptVersion`.
- `POST /api/lyrics/save`
- `GET  /api/personas/[id]/export` — full persona JSON download.
- `/api/auth/[...nextauth]`

---

## Key Libraries / Helpers

- `src/lib/persona-prompt.ts` — `buildPersonaCore`, `sunoPromptTemplate`, `lyricsPromptTemplate`, `promptTemplateFor(target, core, brief)`, `buildCorePromptTemplate(p)`.
- `src/lib/rate-limit.ts` — in-memory `checkRateLimit(key, limit, windowMs)`.
- `src/lib/openrouter.ts` — `generate({messages, temperature, max_tokens, model})`.
- `src/lib/require-auth.ts` — `requireUserId()` for server pages.
- `src/components/{delete-button,submit-button,breadcrumbs}.tsx` — reusable UI primitives.

---

## Server-Action Pattern

Every mutating action follows:
```ts
const session = await auth();
if (!session?.user?.id) throw new Error("Unauthorized");
// assertOwns{Persona,Album,Track,Release} via SELECT scoped to userId
await db.update(...).where(and(eq(table.id, id), eq(personas.userId, session.user.id)));
revalidatePath(...); // and optionally redirect()
```

---

## What We Shipped (this build cycle)

### Batch 1 — Polish & gaps
- DeleteButton component + delete actions for personas / albums / tracks / releases / prompt+lyric versions
- Track reorder (↑↓) within an album (`reorderTracks`)
- Standalone `/personas/[id]/tracks` listing
- "Build your own AI artist" CTA on public page
- Empty-state messages everywhere

### Batch 2 — Workflow
- Eras CRUD (`/personas/[id]/eras`) + persona-tabs entry
- Breadcrumbs component (initial wiring on track page)
- `regeneratePersonaCore` server action + button on Studio
- Prompt target selector (`suno | udio | riffusion | other`) wired through `/api/ai/generate`
- In-memory rate limiting on AI route (20/min, returns 429 + Retry-After)
- BPM min/max validation

### Batch 3 — Audio + ops + UX (just shipped)
- **Track audio fields**: `audio_url`, `bpm`, `key_signature`, `duration_sec` columns added via direct Neon SQL; surfaced in track edit form with inline `<audio>` preview; played on public page per track.
- **Persona clone** (`clonePersona`) — duplicates persona + all eras + albums + tracks + prompt/lyric versions + releases with new IDs and a fresh slug; sets `isPublic=false`.
- **Persona export** — `GET /api/personas/[id]/export` returns full JSON with proper filename.
- **Eras reorder** — `reorderEras` action + ↑↓ buttons on each row.
- **Dashboard stats** — Personas / Albums / Tracks / Releases tiles + track-status breakdown.
- **Public page eras grouping** — discography sectioned under era headings (description shown), "Other" bucket for unassigned albums.
- **Breadcrumbs sweep** — applied to studio, albums list, album detail, tracks list, eras, releases list, release detail.

---

## Build / Deploy

```powershell
pnpm build          # validates types + builds (Turbopack)
pnpm db:push        # interactive (TTY required) — for non-TTY use direct SQL via @neondatabase/serverless
git push            # auto-deploys to Vercel
```

`.env.local` requires:
- `DATABASE_URL` (Neon, `?sslmode=require`)
- `AUTH_SECRET`, `AUTH_URL`
- `EMAIL_SERVER` (Resend SMTP) + `EMAIL_FROM`
- `OPENROUTER_API_KEY`

---

## Known Gaps / Next Candidates

1. **AI cover-art generation** for albums (image model via OpenRouter or alt provider).
2. **Lyric structure editor** improvements (drag sections, per-section regen).
3. **Track quick-status edit** from list views.
4. **Persona import** (counterpart to export — paste/upload JSON).
5. **Album reorder** within an era.
6. **OG image** for `/p/[slug]` (dynamic, palette-aware).
7. **Search / filter** across tracks (status, era, BPM range).
8. **Soft delete + undo** for personas.
9. **Per-user theming preferences** (dark/light, accent color).
10. **GitHub Action** for CI (typecheck + build).

---

## Files Worth Knowing

| Concern | Path |
|---|---|
| DB schema | `src/db/schema.ts` |
| Auth | `src/auth.ts`, `src/proxy.ts` |
| Persona actions | `src/app/(app)/personas/actions.ts` |
| Album/track actions | `src/app/(app)/personas/[id]/albums/actions.ts` |
| Track detail actions | `src/app/(app)/personas/[id]/tracks/actions.ts` |
| Eras actions | `src/app/(app)/personas/[id]/eras/actions.ts` |
| Releases actions | `src/app/(app)/personas/[id]/releases/actions.ts` |
| AI route | `src/app/api/ai/generate/route.ts` |
| Export route | `src/app/api/personas/[id]/export/route.ts` |
| Public page | `src/app/p/[slug]/page.tsx` |
| Prompt templates | `src/lib/persona-prompt.ts` |
