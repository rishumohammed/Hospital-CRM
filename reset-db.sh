#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Hospital CRM - Clean Production Reset"
echo "  Target: Clear all data, keep only Managing Director"
echo "=========================================================="

sudo docker compose -f docker-compose.prod.yml exec api pnpm db:reset-production

echo ""
echo "=========================================================="
echo "  ✓ Database reset complete! Only MD account is active."
echo "=========================================================="
