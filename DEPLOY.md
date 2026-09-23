# Deploying VantaOrigin

Four accounts, all free to start: **Neon** (database), **Render** (API),
**Cloudflare R2** (images), **Resend** (email). The front end stays on Vercel.

Work through it in this order — each step produces a value the next one needs.

---

## 1. Database — any managed Postgres (free)

All the API needs is a connection string, so the provider is interchangeable.

**Supabase** (used only as a database — no SDK, no lock-in):
1. [supabase.com](https://supabase.com) → **New project**, name it `vantaorigin`,
   set a database password and keep it.
2. **Project Settings → Database → Connection string → URI**.
3. Pick the **Session pooler** string (port 5432). Replace `[YOUR-PASSWORD]`
   with the password from step 1.

Other options that work identically: **Neon** (neon.com — unreachable from some
networks), **Render Postgres** (same dashboard as the API, but the free database
is deleted after 30 days), **Railway**, **Aiven**.

Keep the string for `DATABASE_URL`. The API creates its own tables on first
boot, so there is nothing to run by hand.

---

## 2. Images — Cloudflare R2 (free up to 10GB)

1. In the Cloudflare dashboard: **R2 → Create bucket**, name it `vantaorigin`.
2. **Settings → Public access → Allow**, and copy the public URL
   (`https://pub-xxxxx.r2.dev`). This is `S3_PUBLIC_URL`.
3. **Manage R2 API Tokens → Create token**, Object Read & Write. Copy the
   access key and secret.
4. Your endpoint is `https://<account-id>.r2.cloudflarestorage.com`.

| Variable | Value |
| --- | --- |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `vantaorigin` |
| `S3_ACCESS_KEY_ID` | from the token |
| `S3_SECRET_ACCESS_KEY` | from the token |
| `S3_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` |

Skipping this leaves `STORAGE_DRIVER=memory`, and every upload disappears when
the API restarts. Don't skip it.

---

## 3. Email — Resend (free, 3,000 a month)

1. Sign up at [resend.com](https://resend.com) and create an API key →
   `RESEND_API_KEY`.
2. Until a domain is verified, only `onboarding@resend.dev` can send, and only
   to your own address. So set `EMAIL_FROM=VantaOrigin <onboarding@resend.dev>`
   to begin with, and verify `vantaorigin.com` when you're ready for real users.

---

## 4. API — Render (free)

1. [render.com](https://render.com) → **New → Blueprint**, connect the GitHub
   repo. Render reads `render.yaml` and sets the service up.
2. Fill in the variables it asks for: `DATABASE_URL`, the five `S3_*` values,
   `RESEND_API_KEY`, `EMAIL_FROM`.
3. For `APP_ORIGIN`, put your Vercel address (e.g.
   `https://vantaorigin.vercel.app`). For `API_PUBLIC_URL`, put the address
   Render gives this service (e.g. `https://vantaorigin-api.onrender.com`) —
   you'll know it once the service is created, so save and redeploy after.
4. Deploy, then check it: `https://vantaorigin-api.onrender.com/health` should
   answer `{"ok":true,"storage":"s3","email":"resend"}`.

**Free plan note:** Render sleeps a free service after 15 minutes idle, so the
first request afterwards takes ~50 seconds. Fine for testing; $7/month removes
it when you have real users.

---

## 5. Front end — Vercel

1. Vercel → your project → **Settings → Environment Variables**.
2. Add `VITE_API_URL` = `https://vantaorigin-api.onrender.com`, for Production,
   Preview and Development.
3. Redeploy. Vite reads this at build time, so a redeploy is required — an
   existing build will not pick it up.

---

## 6. Check it end to end

On the live site: sign up → the code arrives by email → verify → create a
category and a character with a cover → publish it → open it in a private
window. The character page should load and the image should appear.

If sign-in seems to work but you're signed out on the next page, the cookie is
being blocked: `COOKIE_SAMESITE` must be `none` and both sides must be https.

---

## Later: moving to a VPS

Nothing in the app changes.

1. Install Docker on the VPS, copy `docker-compose.yml` over.
2. `pg_dump` from Neon, `pg_restore` into the VPS's Postgres container.
3. Point `DATABASE_URL` at the local container.
4. Put Caddy or nginx in front for TLS, and point DNS at the VPS.
5. Update `API_PUBLIC_URL` and `APP_ORIGIN`.

R2 can stay where it is — images keep working and there is nothing to move.
