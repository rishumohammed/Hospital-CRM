# Hospital CRM - Database Backup & Disaster Recovery Guide

This guide details the complete data protection, automated backup, and disaster recovery strategy implemented for **Samad's Elements Hospital CRM** (`portal.samadselements.com`).

---

## 1. Architecture Overview

Hospital CRM uses a **multi-tiered data protection architecture** designed for zero data loss, rapid recovery, and strict audit compliance.

```
                           +--------------------------------------+
                           |   Live MySQL Database (Docker)       |
                           |   /var/lib/hospital-crm-data/mysql   |
                           +------------------+-------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
         [Tier 1: Scheduled & CLI]                             [Tier 2: In-App UI]
         Daily Cron @ 02:00 AM IST                             Admin Portal: /admin?tab=backups
         ./scripts/backup.sh                                   "Create Backup Now" button
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                                              v
                           +--------------------------------------+
                           |   Dedicated Backup Storage           |
                           |   /var/backups/hospital-crm          |
                           |   - .sql.gz (gzip level 9)           |
                           |   - .sql.gz.sha256 (checksums)       |
                           |   - 7-Day Auto Retention Purge       |
                           +------------------+-------------------+
                                              |
                                              v
                           +--------------------------------------+
                           |   Tier 3: Offsite / Local Safekeeping|
                           |   - Direct Download to Doctor's PC   |
                           |   - Optional AWS S3 / R2 / rsync     |
                           +--------------------------------------+
```

### Key Safeguards
- **Transactional Consistency**: Backups use `--single-transaction --quick --routines --triggers --events --hex-blob` to ensure consistent InnoDB snapshots with zero downtime and no database lockups during clinic operating hours.
- **Pre-Restore Rollback Guarantee**: Before any restore operation begins, the system **automatically takes a snapshot of the live database** (`hospital_crm_backup_rollback_*.sql.gz`). If an old backup is restored by mistake, the database can immediately be reverted.
- **Cryptographic Signatures**: Every backup archive is hashed with **SHA-256** and verified prior to restoration (`gzip -t` integrity check).
- **Automated 7-Day Retention**: To prevent disk exhaustion and preserve only recent full recovery points, daily backups older than 7 days are automatically purged while always retaining at least the 7 newest snapshots.
- **Strict Role-Based Access & Audit Logging**: Only users with the `owner` (Managing Director) or `admin` role can create, download, or restore backups. Every action is permanently recorded in `audit_logs`.

---

## 2. Web Portal (Self-Service UI)

Managing Directors and System Administrators can manage backups directly from their web browser:

1. Navigate to **Admin Settings** (`/admin?tab=backups`).
2. Click the **Database & Backups** tab in the navigation bar.

### Available Actions in UI
- **View Live Statistics**: Review total records across all clinical and commercial domains (patients, cases, leads, orders, interactions, products) and real-time database footprint.
- **Instant Snapshot**: Click **Create Backup Now** to generate an immediate transactional dump.
- **Download to Local PC**: Click **⬇️ Download** next to any archive to save a compressed `.sql.gz` file locally for offsite storage.
- **Safe In-App Restore**: Click **🔄 Restore** to trigger the restoration wizard. You must type `RESTORE` to confirm. An automatic rollback snapshot is saved before applying changes.
- **Delete Archive**: Remove outdated manual backups that are no longer needed.

---

## 3. Server-Level CLI Scripts

For server administrators and automation scripts on Ubuntu VPS:

### Manual On-Demand Backup
Run from the repository root:
```bash
./scripts/backup.sh [manual|pre-upgrade]
```
- Backups are stored in `/var/backups/hospital-crm/`.
- File naming convention: `hospital_crm_backup_<type>_<YYYYMMDD_HHMMSS>.sql.gz`.
- Corresponding SHA-256 signature is saved alongside: `<filename>.sql.gz.sha256`.

### Safe Database Restoration
To restore a specific backup archive:
```bash
./scripts/restore.sh /var/backups/hospital-crm/hospital_crm_backup_manual_20261109_165500.sql.gz
```
What happens automatically:
1. Tests archive gzip integrity (`gzip -t`).
2. Verifies SHA-256 checksum if present.
3. Prompts: `Type 'RESTORE' to proceed with the restoration: `.
4. **Automatically creates a rollback snapshot of the live database first**.
5. Restores the dump inside MySQL container with `SET FOREIGN_KEY_CHECKS = 0;`.
6. Re-enables foreign key constraints and verifies health.

### Automated Nightly Cron Setup
To configure automated daily backups at **02:00 AM IST**:
```bash
./scripts/setup-backup-cron.sh
```
This registers a daily cron job that writes execution logs to `/var/log/hospital-crm-backup.log`.

---

## 4. Offsite Cloud Synchronization (Recommended for Production)

To safeguard against catastrophic VPS hardware loss or datacenter outages, sync `/var/backups/hospital-crm` to an external cloud bucket (AWS S3, Cloudflare R2, Google Cloud Storage, or Backblaze B2).

### Option A: AWS S3 or Cloudflare R2 via AWS CLI
1. Install AWS CLI:
   ```bash
   sudo apt-get install -y awscli
   aws configure
   ```
2. Add a sync command to the daily backup cron:
   ```bash
   aws s3 sync /var/backups/hospital-crm s3://your-hospital-backup-bucket/hospital-crm/ --delete
   ```

### Option B: Remote Server Sync via Rsync
```bash
rsync -avz -e "ssh -p 22" /var/backups/hospital-crm/ backup-user@remote-storage.example.com:/data/hospital-crm-backups/
```

---

## 5. Bare-Metal Disaster Recovery Runbook

In the event of a catastrophic server hardware failure where a completely new VPS must be commissioned:

### Step 1: Provision Clean Server & Deploy Stack
1. Clone repository onto the new server:
   ```bash
   git clone <repo-url> /var/www/hospital-crm
   cd /var/www/hospital-crm
   ```
2. Run automated deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

### Step 2: Transfer Latest Backup Archive
Copy the latest `.sql.gz` backup from your offsite storage or doctor's PC into `/var/backups/hospital-crm/`:
```bash
scp hospital_crm_backup_automated_latest.sql.gz root@NEW_SERVER_IP:/var/backups/hospital-crm/
```

### Step 3: Execute Restoration
```bash
./scripts/restore.sh /var/backups/hospital-crm/hospital_crm_backup_automated_latest.sql.gz
```

### Step 4: Verify System Health
1. Access the web portal: `http://portal.samadselements.com/`
2. Log in with the Managing Director account (`md@samadelements.com`).
3. Check `/admin?tab=backups` to verify patient, lead, and case counts match expected totals.

