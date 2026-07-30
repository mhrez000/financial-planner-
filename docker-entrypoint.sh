#!/bin/sh
set -e

# Apply the Postgres schema before serving. `db push` is idempotent and
# keeps first-boot simple; swap to `prisma migrate deploy` once you adopt
# the migrations-postgres history for zero-downtime upgrades.
node node_modules/prisma/build/index.js db push \
  --schema prisma/schema.postgres.prisma \
  --skip-generate

exec node server.js
