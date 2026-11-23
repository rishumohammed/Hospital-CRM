#!/bin/sh
set -e

echo "========================================================="
echo "  Hospital CRM Backend API - Starting up"
echo "========================================================="

DB_HOST=${DB_HOST:-mysql}
DB_PORT=${DB_PORT:-3306}

echo "==> Waiting for MySQL database at $DB_HOST:$DB_PORT..."
until nc -z -v -w30 "$DB_HOST" "$DB_PORT" > /dev/null 2>&1; do
  echo "    Database is unavailable - sleeping 2s..."
  sleep 2
done
echo "==> Database connection established!"

# Ensure DATABASE_URL has properly URL-encoded credentials (handles special characters like @, %, etc.)
if [ -n "$DB_PASSWORD" ]; then
  ENCODED_PW=$(node -e "console.log(encodeURIComponent(process.env.DB_PASSWORD))")
  ENCODED_USER=$(node -e "console.log(encodeURIComponent(process.env.DB_USER || 'crm_user'))")
  export DATABASE_URL="mysql://${ENCODED_USER}:${ENCODED_PW}@${DB_HOST:-mysql}:${DB_PORT:-3306}/${DB_NAME:-hospital_crm}?charset=utf8mb4"
fi

echo "==> Synchronizing Prisma schema with MySQL database..."
MAX_RETRIES=20
RETRY_COUNT=0
until npx prisma db push --skip-generate; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Failed to connect to MySQL and push schema after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "    MySQL is initializing tables or user permissions - retrying in 3s ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 3
done
echo "✓ Database schema synchronized successfully!"

echo "==> Seeding initial demo users and hospital data..."
pnpm seed || true

echo "==> Sanitizing legacy date formats in database..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clean() {
  try {
    await prisma.\$executeRawUnsafe(\"UPDATE cases SET created_at = consultation_completed_at, updated_at = consultation_completed_at WHERE CAST(created_at AS CHAR) LIKE '0000-00-00%' AND consultation_completed_at IS NOT NULL\");
    await prisma.\$executeRawUnsafe(\"UPDATE cases SET created_at = '2026-11-10 10:00:00', updated_at = '2026-11-10 10:00:00' WHERE CAST(created_at AS CHAR) LIKE '0000-00-00%'\");
    await prisma.\$executeRawUnsafe(\"UPDATE leads SET created_at = updated_at WHERE CAST(created_at AS CHAR) LIKE '0000-00-00%' AND CAST(updated_at AS CHAR) NOT LIKE '0000-00-00%'\");
    await prisma.\$executeRawUnsafe(\"UPDATE leads SET created_at = '2026-11-01 10:00:00', updated_at = '2026-11-01 10:00:00' WHERE CAST(created_at AS CHAR) LIKE '0000-00-00%' OR CAST(updated_at AS CHAR) LIKE '0000-00-00%'\");
  } catch(e) {} finally { await prisma.\$disconnect(); }
}
clean();
" || true

echo "==> Starting production Fastify server..."
exec "$@"
