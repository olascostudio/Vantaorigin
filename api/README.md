# VantaOrigin API

Fastify + PostgreSQL + Drizzle, in Docker. Built so the whole thing can move to
a VPS later by deploying the same container and restoring the same database.

## Run it locally (free, no accounts needed)

Install Docker Desktop, then from the repo root:

```bash
docker compose up
```

That starts PostgreSQL and the API on <http://localhost:8080>, applies the
migrations, and reloads when you edit a file. Check it with:

```bash
curl http://localhost:8080/health
```

Locally, uploads stay in the API's memory and emails print to the terminal, so
no Cloudflare or Resend account is needed while building.

Without Docker: run any PostgreSQL, copy `.env.example` to `.env`, point
`DATABASE_URL` at it, then `npm install && npm run migrate && npm run dev`.

## Layout

| Path | What it is |
| --- | --- |
| `src/config.js` | Every environment value, validated on boot. The only place that reads `process.env` |
| `src/db/schema.js` | Tables, in plain PostgreSQL |
| `migrations/*.sql` | Applied in order, tracked in `schema_migrations`. Plain SQL, so any PostgreSQL can be rebuilt from them |
| `src/auth/auth.js` | Argon2id passwords, session tokens (hashed at rest), one-time email links |
| `src/adapters/storage.js` | `memory` locally, `s3` for Cloudflare R2 or MinIO |
| `src/adapters/email.js` | `console` locally, `resend` in production |
| `src/routes/` | The HTTP API |

## Endpoints

```
POST   /auth/signup            email, password, username
POST   /auth/signin
POST   /auth/signout
GET    /auth/me
POST   /auth/verify-email      token
POST   /auth/forgot-password   email
POST   /auth/reset-password    token, password
PATCH  /me                     profile settings

GET    /categories             POST /categories        DELETE /categories/:id
GET    /characters             POST /characters
PATCH  /characters/:id         DELETE /characters/:id
POST   /characters/:id/assets  DELETE /assets/:id
POST   /uploads?folder=covers  multipart image, returns { url }

GET    /public/characters      public characters for Discover
GET    /public/characters/:id
```

Sessions are an httpOnly cookie. The browser never sees the database.

## Going live (when you're ready)

1. Create a PostgreSQL database (Render, Neon, anywhere) and set `DATABASE_URL`.
2. Deploy `api/` as a Docker service (Render reads the `Dockerfile`).
3. Create a Cloudflare R2 bucket, set `STORAGE_DRIVER=s3` plus the `S3_*` values.
4. Add a Resend key and set `EMAIL_DRIVER=resend`.
5. Point `APP_ORIGIN` at the deployed front end.

## Moving to a VPS

1. Install Docker on the VPS and copy `docker-compose.yml` across.
2. `pg_dump` the managed database, `pg_restore` into the VPS container.
3. Change `DATABASE_URL` to the local container.
4. Point DNS at the VPS; put Caddy or nginx in front for TLS.
5. R2 can stay exactly as it is — or sync it into MinIO and change `S3_ENDPOINT`.

No application code changes at any step: the image, the schema and the
adapters are the same in all three places.
