#!/usr/bin/env bash
# ==============================================================================
# Hospital CRM - Production Database Backup Script
# Usage: ./scripts/backup.sh [manual|automated|pre-upgrade|rollback]
# ==============================================================================
set -euo pipefail

TYPE="${1:-manual}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_STORAGE_PATH:-/var/backups/hospital-crm}"

# Fallback to local directory if /var/backups/hospital-crm is not writable or absent
if ! mkdir -p "$BACKUP_DIR" 2>/dev/null; then
  BACKUP_DIR="./backups"
  mkdir -p "$BACKUP_DIR"
fi

FILENAME="hospital_crm_backup_${TYPE}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

echo "=========================================================="
echo "  Hospital CRM - Database Backup Initiated"
echo "  Type:      ${TYPE}"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Target:    ${BACKUP_PATH}"
echo "=========================================================="

# Check if running with Docker Compose (production server)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "hospital_crm_mysql"; then
  echo "==> Dumping from Docker container 'hospital_crm_mysql'..."
  # Load DB password from .env if present
  if [ -f .env ]; then
    DB_ROOT_PASS=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "5@mads3LewenT%%")
    DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "hospital_crm")
  else
    DB_ROOT_PASS="5@mads3LewenT%%"
    DB_NAME="hospital_crm"
  fi

  docker exec hospital_crm_mysql mysqldump \
    -u root -p"${DB_ROOT_PASS}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" | gzip -9 > "${BACKUP_PATH}"
else
  # Native mysqldump fallback
  echo "==> Docker container not found. Attempting native mysqldump..."
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-3306}"
  DB_USER="${DB_USER:-root}"
  DB_NAME="${DB_NAME:-hospital_crm}"
  DB_PASSWORD="${DB_PASSWORD:-5@mads3LewenT%%}"

  mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" | gzip -9 > "${BACKUP_PATH}"
fi

# Verify backup was created and is non-empty
if [ ! -s "${BACKUP_PATH}" ]; then
  echo "❌ Error: Backup file is empty or was not created!"
  rm -f "${BACKUP_PATH}"
  exit 1
fi

# Verify gzip integrity
gzip -t "${BACKUP_PATH}"
echo "✓ Gzip integrity verified"

# Calculate SHA256 checksum
if command -v sha256sum &> /dev/null; then
  sha256sum "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"
elif command -v shasum &> /dev/null; then
  shasum -a 256 "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"
fi

FILE_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "✓ Backup created successfully! Size: ${FILE_SIZE}"
echo "✓ Location: ${BACKUP_PATH}"

# Retention Policy: keep last 7 days of backups, purge older ones
echo "==> Applying 7-day retention cleanup..."
find "${BACKUP_DIR}" -name "hospital_crm_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "hospital_crm_backup_*.sql.gz.sha256" -mtime +7 -delete 2>/dev/null || true
echo "✓ Retention check complete."

