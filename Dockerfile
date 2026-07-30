# Sage production image — Next.js standalone + Prisma (PostgreSQL).
# Build:  docker build -t sage .
# Run:    see docker-compose.yml (needs DATABASE_URL + SESSION_SECRET)

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall runs `prisma generate` against the default (SQLite) schema;
# regenerate for Postgres right after.
RUN npm ci && npx prisma generate --schema prisma/schema.postgres.prisma

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time env placeholders; real values come from the runtime environment.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV SESSION_SECRET="build-placeholder"
RUN npx prisma generate --schema prisma/schema.postgres.prisma && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S sage && adduser -S sage -G sage

COPY --from=build --chown=sage:sage /app/.next/standalone ./
COPY --from=build --chown=sage:sage /app/.next/static ./.next/static
COPY --from=build --chown=sage:sage /app/public ./public
COPY --from=build --chown=sage:sage /app/prisma ./prisma
COPY --from=deps --chown=sage:sage /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=sage:sage /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=sage:sage docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p var/receipts && chown sage:sage var/receipts

USER sage
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
