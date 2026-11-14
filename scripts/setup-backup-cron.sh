#!/usr/bin/env bash
# ==============================================================================
# Hospital CRM - Install Automated Daily Backup Cron Job
# ==============================================================================
set -euo pipefail

CRON_SCHEDULE="0 2 * * *" # Daily at 02:00 AM
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/backup.sh"
LOG_FILE="/var/log/hospital-crm-backup.log"

echo "==> Setting up executable permissions..."
chmod +x "${BACKUP_SCRIPT}"
chmod +x "${PROJECT_DIR}/scripts/restore.sh"

echo "==> Preparing backup storage directory on host (/var/backups/hospital-crm)..."
sudo mkdir -p /var/backups/hospital-crm 2>/dev/null || mkdir -p "${PROJECT_DIR}/backups"
sudo chmod 777 /var/backups/hospital-crm 2>/dev/null || true

# Create log file
sudo touch "${LOG_FILE}" 2>/dev/null || touch "${LOG_FILE}"
sudo chmod 666 "${LOG_FILE}" 2>/dev/null || true

# Add to crontab if not already present
CRON_JOB="${CRON_SCHEDULE} cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} automated >> ${LOG_FILE} 2>&1"

(crontab -l 2>/dev/null | grep -v "hospital.*backup.sh" || true; echo "${CRON_JOB}") | crontab -

echo "=========================================================="
echo "  ✓ Daily Backup Cron Job Installed Successfully!"
echo "  Schedule: 02:00 AM IST every day"
echo "  Target:   ${BACKUP_SCRIPT} automated"
echo "  Log File: ${LOG_FILE}"
echo "=========================================================="

