# Deploying ArtistDesigner

A free, end-to-end open-source stack: **Next.js + Auth.js + Drizzle + Neon Postgres + Vercel**.

## 1. Rotate / create your secrets

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | https://neon.tech (free 0.5 GB tier) — copy the pooled connection string |
| `AUTH_SECRET` | Run `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_URL` | Your production URL, e.g. `https://artistdesigner.vercel.app` |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys (free models exist, e.g. `deepseek/deepseek-chat-v3.1:free`) |
| `OPENROUTER_SITE_URL` | Same as `AUTH_URL` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` *(optional)* | https://github.com/settings/developers → **New OAuth App** |
| SMTP vars *(optional)* | Any provider — Resend, SendGrid, Postmark, Gmail SMTP, etc. Without these, magic links print to the server log. |

## 2. Push the repo to GitHub

```powershell
git add -A
git commit -m "feat: deployable build with GitHub OAuth + asset locker + lyric structure"
# Create empty repo at https://github.com/new (e.g. ArtistDesigner)
git remote add origin https://github.com/<you>/ArtistDesigner.git
git branch -M main
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to https://vercel.com/new and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command and output directory: leave defaults.
3. **Environment Variables** — paste each value from step 1. At minimum:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` *(set after first deploy to the assigned `*.vercel.app` URL, then redeploy)*
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_SITE_URL`
4. Click **Deploy**.

## 4. Initialize the database

The app uses Drizzle's push workflow. Run once locally with the **production** `DATABASE_URL` set:

```powershell
$env:DATABASE_URL="postgresql://...neon..."
pnpm db:push
```

(Or pull `vercel env pull .env.production.local` and use that.)

## 5. (Optional) Add GitHub OAuth

1. https://github.com/settings/developers → **New OAuth App**
   - **Homepage URL:** `https://YOUR-APP.vercel.app`
   - **Authorization callback URL:** `https://YOUR-APP.vercel.app/api/auth/callback/github`
2. Copy Client ID → `AUTH_GITHUB_ID`. Generate a client secret → `AUTH_GITHUB_SECRET`.
3. Paste into Vercel env vars and redeploy. The "Continue with GitHub" button appears automatically.

## 6. (Optional) Real email sending

Set `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM` in Vercel env vars. The dev-mode "magic link printed to console" hint will disappear and Auth.js will send real emails via Nodemailer.

## Stack license summary

| Layer | License | Notes |
|---|---|---|
| Next.js | MIT | Free; Vercel Hobby tier allows personal projects |
| Auth.js | ISC | Free |
| Drizzle ORM | Apache 2.0 | Free |
| React 19 / Tailwind 4 | MIT | Free |
| Neon Postgres | Apache 2.0 (engine) | Free 0.5 GB tier |
| Vercel hosting | proprietary platform | Free Hobby tier, no credit card |
| OpenRouter | proprietary gateway | Pay-per-use; free model variants exist |
| Nodemailer | MIT | Free |

Everything in your *code* is permissively licensed. The only proprietary pieces are the **hosting platforms** (Vercel, Neon, OpenRouter) — and each has a free tier. If you ever want to leave Vercel, you can self-host with `pnpm build && pnpm start` on any Node host (Fly.io, Railway, your own VPS, etc.).
