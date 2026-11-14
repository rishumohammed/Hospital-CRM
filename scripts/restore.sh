#!/usr/bin/env bash
# ==============================================================================
# Hospital CRM - Production Database Restore Script
# Usage: ./scripts/restore.sh <path-to-backup.sql.gz> [--force]
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
FORCE_FLAG="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <path-to-backup.sql.gz> [--force]"
  echo "Available backups in /var/backups/hospital-crm:"
  ls -lh /var/backups/hospital-crm/*.sql.gz 2>/dev/null || ls -lh ./backups/*.sql.gz 2>/dev/null || echo "No backups found."
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file '${BACKUP_FILE}' does not exist."
  exit 1
fi

echo "=========================================================="
echo "  Hospital CRM - Database Restore Wizard"
echo "  Target File: ${BACKUP_FILE}"
echo "=========================================================="

# Test Gzip integrity first
echo "==> Testing backup file integrity..."
if ! gzip -t "${BACKUP_FILE}"; then
  echo "❌ Error: Backup archive is corrupted or invalid gzip!"
  exit 1
fi
echo "✓ Backup archive integrity confirmed."

# Verify checksum if present
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "==> Verifying SHA256 checksum..."
  if command -v sha256sum &> /dev/null; then
    sha256sum -c "${BACKUP_FILE}.sha256" || (echo "❌ Checksum mismatch!"; exit 1)
  fi
  echo "✓ Checksum matches."
fi

# Safety Confirmation
if [ "${FORCE_FLAG}" != "--force" ]; then
  echo ""
  echo "⚠️ WARNING: This operation will REPLACE the current hospital_crm database."
  echo "   All current operational data will be overwritten with the contents of this backup."
  echo ""
  read -r -p "Type 'RESTORE' to proceed with the restoration: " CONFIRMATION
  if [ "${CONFIRMATION}" != "RESTORE" ]; then
    echo "Restoration cancelled by user. No changes were made."
    exit 0
  fi
fi

# Step 1: Automatic Pre-Restore Safety Snapshot!
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ""
echo "==> STEP 1: Creating Safety Rollback Snapshot before restore..."
if [ -x "${SCRIPT_DIR}/backup.sh" ]; then
  "${SCRIPT_DIR}/backup.sh" rollback || echo "⚠️ Warning: Could not create rollback snapshot, continuing with restore..."
fi

# Step 2: Restore into Database
echo ""
echo "==> STEP 2: Restoring database from backup..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "hospital_crm_mysql"; then
  # Load DB password from .env
  if [ -f .env ]; then
    DB_ROOT_PASS=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "5@mads3LewenT%%")
    DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "hospital_crm")
  else
    DB_ROOT_PASS="5@mads3LewenT%%"
    DB_NAME="hospital_crm"
  fi

  # Pipe gunzipped stream into MySQL with foreign key checks temporarily disabled
  gzip -dc "${BACKUP_FILE}" | docker exec -i hospital_crm_mysql mysql \
    -u root -p"${DB_ROOT_PASS}" \
    --default-character-set=utf8mb4 \
    --init-command="SET FOREIGN_KEY_CHECKS=0;" \
    "${DB_NAME}"
else
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-root}"
  DB_NAME="${DB_NAME:-hospital_crm}"
  DB_PASSWORD="${DB_PASSWORD:-5@mads3LewenT%%}"

  gzip -dc "${BACKUP_FILE}" | mysql \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --default-character-set=utf8mb4 \
    --init-command="SET FOREIGN_KEY_CHECKS=0;" \
    "${DB_NAME}"
fi

echo ""
echo "=========================================================="
echo "  ✓ Database Restore Completed Successfully!"
echo "=========================================================="

