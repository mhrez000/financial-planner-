# Sage — Deployment

## Environments

| | Database | Schema file | How it runs |
| --- | --- | --- | --- |
| Local dev | SQLite (`prisma/dev.db`) | `prisma/schema.prisma` | `npm run dev` |
| Production | PostgreSQL | `prisma/schema.postgres.prisma` | Docker / PaaS |

The two schema files are identical except the datasource provider (Prisma can't switch providers via env). CI runs `npm run check:schemas` and fails on drift; after any model change, edit both and regenerate the init migration with `npm run db:migration:postgres`.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (SSL in production) |
| `SESSION_SECRET` | Signs session cookies. Long random string (`openssl rand -hex 32`). The app refuses to boot in production without it. |

## Option A — Docker (any host: Fly.io, Railway, AWS, self-hosted)

```bash
# Local production-parity stack (app + Postgres)
SESSION_SECRET=$(openssl rand -hex 32) docker compose up --build
```

The image is a multi-stage build producing Next.js standalone output running as a non-root user. The entrypoint applies the Postgres schema (`prisma db push`, idempotent) then starts the server; move to `prisma migrate deploy` with the `prisma/migrations-postgres/` history when you need zero-downtime upgrades.

- Health check: `GET /api/health` → `{status:"ok",db:"up"}` (503 when the DB is unreachable).
- Receipts persist in the `receipts` volume (`/app/var/receipts`); point `src/lib/storage.ts` at S3/R2 to go stateless.

Fly.io sketch: `fly launch --no-deploy` → `fly postgres create && fly postgres attach` → `fly secrets set SESSION_SECRET=...` → `fly deploy`. Railway/Render: point at the repo, add a Postgres plugin, set the two env vars — the Dockerfile does the rest.

## Option B — Vercel + managed Postgres

1. Import the repo in Vercel; add `DATABASE_URL` (Neon/Supabase/RDS) and `SESSION_SECRET`.
2. Override the build command:
   `npx prisma generate --schema prisma/schema.postgres.prisma && npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate && next build`
3. Receipts require S3/R2 (Vercel's filesystem is ephemeral) — implement the `FileStorage` interface in `src/lib/storage.ts`.

## Seeding a demo environment

`npx tsx prisma/seed.ts` against the target `DATABASE_URL` loads the Alex + Sam demo dataset. Never run it against real user data — it deletes all users first.

## Production checklist

- [ ] `SESSION_SECRET` set (unique per environment, rotated on compromise)
- [ ] Postgres with SSL + automated backups
- [ ] `/api/health` wired into the platform's health checks
- [ ] Receipts on S3/R2 (or a persistent volume with backups)
- [ ] Error tracking (Sentry) and uptime monitoring
- [ ] Row-level security + Auth.js/passkeys before public multi-tenant launch (docs/SECURITY.md)
