#!/bin/sh
set -e

# Apply pending database migrations before starting the API.
# Set RUN_MIGRATIONS=false to skip (e.g. when migrations are run by a
# separate release job).
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Applying database migrations…"
  # Prisma Migrate uses DIRECT_URL when set. Compose uses a direct database,
  # so fall back to DATABASE_URL when DIRECT_URL is not provided.
  export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"
  npx prisma migrate deploy --schema server/prisma/schema.prisma
fi

# Seed the database on first boot when requested. The seed script refuses to
# run in production unless ALLOW_PROD_SEED=true, which this flag sets.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database…"
  ALLOW_PROD_SEED=true npx tsx server/prisma/seed.ts
fi

exec "$@"
