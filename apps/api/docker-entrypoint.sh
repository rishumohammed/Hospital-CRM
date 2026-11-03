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
npx prisma db push --skip-generate

echo "==> Checking if initial seed data is required..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('==> No users found. Seeding initial demo users and hospital departments...');
      require('child_process').execSync('npx tsx src/database/seed.ts', { stdio: 'inherit' });
    } else {
      console.log('==> Database already initialized (' + userCount + ' users present). Skipping seed.');
    }
  } catch (err) {
    console.error('Seed verification error:', err.message);
  } finally {
    await prisma.\$disconnect();
  }
}
check();
"

echo "==> Starting production Fastify server..."
exec "$@"

