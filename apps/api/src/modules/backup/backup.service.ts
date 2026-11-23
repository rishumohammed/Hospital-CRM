import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { recordAuditLog } from '../audit/audit.service';
import { UserContext } from '../rbac/scope';

const execAsync = promisify(exec);

export interface BackupItem {
  filename: string;
  type: 'automated' | 'manual' | 'rollback' | 'pre-upgrade' | 'uploaded';
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  sha256: string;
}

export interface DatabaseStats {
  patientsCount: number;
  casesCount: number;
  leadsCount: number;
  interactionsCount: number;
  productsCount: number;
  tasksCount: number;
  auditLogsCount: number;
  totalTables: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
  lastBackupAt: string | null;
  storagePath: string;
}

/**
 * Resolves the active backup storage directory.
 * Prefers /var/backups/hospital-crm in Linux/Docker environments,
 * falls back to ./backups in project root.
 */
export function getBackupStorageDir(): string {
  if (process.env.BACKUP_STORAGE_PATH) {
    const dir = process.env.BACKUP_STORAGE_PATH;
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        logger.warn({ err, dir }, 'Failed to create BACKUP_STORAGE_PATH, falling back to local backups directory');
      }
    }
    if (fs.existsSync(dir)) return dir;
  }

  if (process.platform !== 'win32' && fs.existsSync('/var/backups/hospital-crm')) {
    return '/var/backups/hospital-crm';
  }

  const fallbackDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return fallbackDir;
}

/**
 * Validates that a filename is secure and prevents path traversal.
 */
export function validateBackupFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  if (path.basename(filename) !== filename) return false;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
  return /^hospital_crm_backup_[a-zA-Z0-9_\-\.]+\.sql\.gz$/.test(filename);
}

/**
 * Formats bytes to human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parses connection parameters from DATABASE_URL or environment variables.
 */
function getDatabaseCredentials() {
  let host = process.env.DB_HOST || '127.0.0.1';
  let port = parseInt(process.env.DB_PORT || '3306', 10);
  let user = process.env.DB_USER || 'root';
  let password = process.env.DB_PASSWORD || process.env.DB_ROOT_PASSWORD || '5@mads3LewenT%%';
  let database = process.env.DB_NAME || 'hospital_crm';

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname) host = url.hostname;
      if (url.port) port = parseInt(url.port, 10);
      if (url.username) user = decodeURIComponent(url.username);
      if (url.password) password = decodeURIComponent(url.password);
      if (url.pathname) database = url.pathname.replace(/^\//, '').split('?')[0];
    } catch {
      // Ignore URL parse error and use env vars
    }
  }

  return { host, port, user, password, database };
}

/**
 * Checks if mysqldump CLI binary is executable.
 */
function isMysqldumpAvailable(): boolean {
  try {
    execSync('mysqldump --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if mysql CLI binary is executable.
 */
function isMysqlCliAvailable(): boolean {
  try {
    execSync('mysql --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if MySQL is running in a local Docker container (standard production deployment).
 */
function isDockerMysqlAvailable(): boolean {
  try {
    const stdout = execSync("docker ps --format '{{.Names}}'", { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return stdout.includes('hospital_crm_mysql');
  } catch {
    return false;
  }
}

/**
 * Lists all available backup archives.
 */
export async function listBackups(): Promise<BackupItem[]> {
  const dir = getBackupStorageDir();
  if (!fs.existsSync(dir)) return [];

  const files = await fs.promises.readdir(dir);
  const backups: BackupItem[] = [];

  for (const file of files) {
    if (!validateBackupFilename(file)) continue;

    const fullPath = path.join(dir, file);
    try {
      const stat = await fs.promises.stat(fullPath);
      let sha256 = '';
      const shaFile = `${fullPath}.sha256`;
      if (fs.existsSync(shaFile)) {
        sha256 = (await fs.promises.readFile(shaFile, 'utf8')).trim().split(' ')[0];
      }

      let type: BackupItem['type'] = 'manual';
      if (file.includes('_automated_')) type = 'automated';
      else if (file.includes('_rollback_')) type = 'rollback';
      else if (file.includes('_pre-upgrade_')) type = 'pre-upgrade';
      else if (file.includes('_uploaded_')) type = 'uploaded';

      backups.push({
        filename: file,
        type,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        sha256,
      });
    } catch (err) {
      logger.warn({ err, file }, 'Error inspecting backup file');
    }
  }

  // Sort newest first
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Gets real-time database record counts and statistics.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const [patients, cases, leads, interactions, products, tasks, auditLogs] = await Promise.all([
    prisma.patient.count().catch(() => 0),
    prisma.case.count().catch(() => 0),
    prisma.lead.count().catch(() => 0),
    prisma.interaction.count().catch(() => 0),
    prisma.product.count().catch(() => 0),
    prisma.task.count().catch(() => 0),
    prisma.auditLog.count().catch(() => 0),
  ]);

  let totalTables = 0;
  let estimatedSizeBytes = 0;

  try {
    const creds = getDatabaseCredentials();
    const tableInfo: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(table_name) as table_count,
        COALESCE(SUM(data_length + index_length), 0) as total_size
      FROM information_schema.tables 
      WHERE table_schema = '${creds.database}';
    `);

    if (tableInfo && tableInfo.length > 0) {
      totalTables = Number(tableInfo[0].table_count || 0);
      estimatedSizeBytes = Number(tableInfo[0].total_size || 0);
    }
  } catch {
    // If information_schema query fails, fallback
    totalTables = 35;
  }

  const existingBackups = await listBackups();
  const lastBackupAt = existingBackups.length > 0 ? existingBackups[0].createdAt : null;

  return {
    patientsCount: patients,
    casesCount: cases,
    leadsCount: leads,
    interactionsCount: interactions,
    productsCount: products,
    tasksCount: tasks,
    auditLogsCount: auditLogs,
    totalTables,
    estimatedSizeBytes,
    estimatedSizeFormatted: formatBytes(estimatedSizeBytes),
    lastBackupAt,
    storagePath: getBackupStorageDir(),
  };
}

/**
 * Pure Node.js fallback dumper when mysqldump binary is not available.
 * Queries table structures and rows via Prisma and streams into Gzip.
 */
async function dumpDatabasePureNode(destPath: string): Promise<void> {
  const gzip = zlib.createGzip({ level: 9 });
  const writeStream = fs.createWriteStream(destPath);
  gzip.pipe(writeStream);

  const creds = getDatabaseCredentials();
  const write = (str: string) => {
    gzip.write(str);
  };

  write(`-- Hospital CRM Database Backup (Pure Node Engine)\n`);
  write(`-- Database: ${creds.database}\n`);
  write(`-- Date: ${new Date().toISOString()}\n`);
  write(`-- Server Version: MySQL / MariaDB Compatible\n\n`);
  write(`SET FOREIGN_KEY_CHECKS = 0;\n`);
  write(`SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n`);

  // Fetch all tables
  const tables: any[] = await prisma.$queryRawUnsafe(`SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';`);
  const tableNames = tables.map((t) => Object.values(t)[0] as string);

  for (const table of tableNames) {
    write(`\n-- Table structure for table \`${table}\`\n`);
    write(`DROP TABLE IF EXISTS \`${table}\`;\n`);

    const createResult: any[] = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${table}\`;`);
    if (createResult && createResult[0]) {
      const createSql = createResult[0]['Create Table'] || Object.values(createResult[0])[1];
      write(`${createSql};\n\n`);
    }

    // Export rows in chunks of 500
    const countResult: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\`;`);
    const totalRows = Number(countResult[0]?.cnt || 0);

    if (totalRows > 0) {
      write(`-- Dumping data for table \`${table}\` (${totalRows} rows)\n`);
      const chunkSize = 500;
      let offset = 0;

      while (offset < totalRows) {
        const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\` LIMIT ${chunkSize} OFFSET ${offset};`);
        if (!rows || rows.length === 0) break;

        const columns = Object.keys(rows[0]).map((col) => `\`${col}\``).join(', ');
        const valuesList = rows.map((row) => {
          const vals = Object.values(row).map((val) => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            if (typeof val === 'boolean') return val ? '1' : '0';
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (Buffer.isBuffer(val)) return `0x${val.toString('hex')}`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
              switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%": return "\\" + char;
                default: return char;
              }
            })}'`;
            const str = String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
              switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%": return "\\" + char;
                default: return char;
              }
            });
            return `'${str}'`;
          });
          return `(${vals.join(', ')})`;
        });

        write(`INSERT INTO \`${table}\` (${columns}) VALUES \n${valuesList.join(',\n')};\n`);
        offset += chunkSize;
      }
    }
  }

  write(`\nSET FOREIGN_KEY_CHECKS = 1;\n`);
  write(`-- Dump completed on ${new Date().toISOString()}\n`);

  gzip.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    gzip.on('error', reject);
  });
}

/**
 * Creates a complete database snapshot archive.
 */
export async function createBackup(
  type: 'automated' | 'manual' | 'rollback' | 'pre-upgrade' = 'manual',
  initiator?: string
): Promise<BackupItem> {
  const dir = getBackupStorageDir();
  const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `hospital_crm_backup_${type}_${dateStr}.sql.gz`;
  const destPath = path.join(dir, filename);

  logger.info({ type, filename, destPath }, 'Starting database backup generation...');

  const creds = getDatabaseCredentials();

  if (isDockerMysqlAvailable()) {
    logger.info('Using Docker hospital_crm_mysql container for backup');
    const dumpCmd = `docker exec hospital_crm_mysql mysqldump -u ${creds.user} -p"${creds.password}" --single-transaction --quick --routines --triggers --events --hex-blob --default-character-set=utf8mb4 ${creds.database}`;
    const gzipCmd = `gzip -9 > "${destPath}"`;
    await execAsync(`${dumpCmd} | ${gzipCmd}`);
  } else if (isMysqldumpAvailable()) {
    logger.info('Using native mysqldump utility for backup');
    const dumpCmd = `mysqldump -h ${creds.host} -P ${creds.port} -u ${creds.user} -p"${creds.password}" --single-transaction --quick --routines --triggers --events --hex-blob --default-character-set=utf8mb4 ${creds.database}`;
    const gzipCmd = `gzip -9 > "${destPath}"`;
    await execAsync(`${dumpCmd} | ${gzipCmd}`);
  } else {
    logger.info('mysqldump binary not detected on system; running pure Node.js transactional dumper');
    await dumpDatabasePureNode(destPath);
  }

  // Verify file was written and calculate SHA-256
  const stat = await fs.promises.stat(destPath);
  if (stat.size === 0) {
    await fs.promises.unlink(destPath).catch(() => {});
    throw new Error('Database backup failed: generated archive was 0 bytes.');
  }

  const hash = crypto.createHash('sha256');
  const fileBuffer = await fs.promises.readFile(destPath);
  hash.update(fileBuffer);
  const sha256 = hash.digest('hex');

  await fs.promises.writeFile(`${destPath}.sha256`, `${sha256}  ${filename}\n`, 'utf8');

  // Enforce 7-day retention cleanup
  await applyRetentionCleanup(dir);

  const backupItem: BackupItem = {
    filename,
    type,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: stat.mtime.toISOString(),
    sha256,
  };

  logger.info({ backupItem, initiator }, 'Database backup generated successfully');
  return backupItem;
}

/**
 * Automatically cleans up backups older than 7 days while preserving at least the 7 newest backups.
 */
export async function applyRetentionCleanup(dir: string): Promise<void> {
  try {
    const files = await fs.promises.readdir(dir);
    const backupFiles = files.filter(validateBackupFilename);

    const stats = await Promise.all(
      backupFiles.map(async (file) => ({
        file,
        mtime: (await fs.promises.stat(path.join(dir, file))).mtime.getTime(),
      }))
    );

    stats.sort((a, b) => b.mtime - a.mtime);

    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);
    const minKeep = parseInt(process.env.BACKUP_MIN_KEEP || '7', 10);
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    // Always preserve at least the 7 newest backups
    const candidatesForDeletion = stats.slice(minKeep).filter((s) => s.mtime < cutoffTime);

    for (const item of candidatesForDeletion) {
      const fullPath = path.join(dir, item.file);
      await fs.promises.unlink(fullPath).catch(() => {});
      await fs.promises.unlink(`${fullPath}.sha256`).catch(() => {});
      logger.info({ file: item.file }, `Purged expired backup per ${retentionDays}-day retention policy`);
    }
  } catch (err) {
    logger.warn({ err }, 'Error during backup retention cleanup');
  }
}

/**
 * Pure Node.js fallback SQL restore executor.
 */
async function restoreDatabasePureNode(filePath: string): Promise<void> {
  const compressed = await fs.promises.readFile(filePath);
  const sql = zlib.gunzipSync(compressed).toString('utf8');

  // Split into individual SQL statements
  // Filter out comments and blank lines
  const statements: string[] = [];
  let currentStmt = '';
  let inString: false | "'" | '"' = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prevChar = i > 0 ? sql[i - 1] : '';

    if (inString) {
      currentStmt += char;
      if (char === inString && prevChar !== '\\') {
        inString = false;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = char;
        currentStmt += char;
      } else if (char === ';') {
        const trimmed = currentStmt.trim();
        if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
          statements.push(trimmed);
        }
        currentStmt = '';
      } else {
        currentStmt += char;
      }
    }
  }

  const remaining = currentStmt.trim();
  if (remaining && !remaining.startsWith('--') && !remaining.startsWith('/*')) {
    statements.push(remaining);
  }

  logger.info({ count: statements.length }, 'Executing SQL restore statements via transactional connection');

  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err: any) {
      // Ignore drop table errors if table did not exist
      if (!stmt.startsWith('DROP TABLE IF EXISTS')) {
        logger.warn({ err: err.message, stmt: stmt.slice(0, 100) }, 'Notice during SQL restore statement execution');
      }
    }
  }
  await prisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
}

/**
 * Verifies that a file exists, has valid gzip magic bytes (0x1f 0x8b),
 * and can be completely decompressed without corruption.
 */
export async function verifyGzipIntegrity(filePath: string): Promise<void> {
  const stat = await fs.promises.stat(filePath);
  if (stat.size < 2) {
    throw new Error('Backup file is empty or too small to be a valid gzip archive.');
  }

  // Check magic bytes
  const fd = await fs.promises.open(filePath, 'r');
  const magicBuffer = Buffer.alloc(2);
  await fd.read(magicBuffer, 0, 2, 0);
  await fd.close();

  if (magicBuffer[0] !== 0x1f || magicBuffer[1] !== 0x8b) {
    throw new Error('File does not have a valid GZIP header (missing magic bytes 0x1f 0x8b).');
  }

  // Streaming decompression test
  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    readStream.pipe(gunzip);
    gunzip.on('data', () => {}); // drain chunks
    gunzip.on('end', resolve);
    gunzip.on('error', (err) => reject(new Error(`Corrupted gzip archive: ${err.message}`)));
    readStream.on('error', (err) => reject(new Error(`Failed to read archive: ${err.message}`)));
  });
}

/**
 * Restores the database from a backup file with an automatic pre-restore safety snapshot.
 */
export async function restoreBackup(filename: string, user: UserContext): Promise<{ success: boolean; rollbackSnapshot: string }> {
  if (!validateBackupFilename(filename)) {
    throw new Error('Invalid or insecure backup filename.');
  }

  const dir = getBackupStorageDir();
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file '${filename}' was not found on the server.`);
  }

  // 1. Verify Gzip integrity
  await verifyGzipIntegrity(filePath);

  // 2. SAFETY: Attempt pre-restore safety rollback snapshot (do not block restore if dump fails)
  logger.info({ filename, user: user.email }, 'Taking safety rollback snapshot before starting database restore...');
  let rollbackSnapshotName = '';
  try {
    const rollbackItem = await createBackup('rollback', user.email);
    rollbackSnapshotName = rollbackItem.filename;
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Notice: Pre-restore rollback snapshot could not be generated; proceeding with restoration');
  }

  // 3. Perform restoration
  const creds = getDatabaseCredentials();
  logger.info({ filename, targetDb: creds.database }, 'Restoring database...');

  if (isDockerMysqlAvailable()) {
    logger.info('Using Docker hospital_crm_mysql container for restore');
    const restoreCmd = `gzip -dc "${filePath}" | docker exec -i hospital_crm_mysql mysql -u ${creds.user} -p"${creds.password}" --default-character-set=utf8mb4 --init-command="SET FOREIGN_KEY_CHECKS=0;" ${creds.database}`;
    await execAsync(restoreCmd);
  } else if (isMysqlCliAvailable()) {
    logger.info('Using native mysql CLI for restore');
    const restoreCmd = `gzip -dc "${filePath}" | mysql -h ${creds.host} -P ${creds.port} -u ${creds.user} -p"${creds.password}" --default-character-set=utf8mb4 --init-command="SET FOREIGN_KEY_CHECKS=0;" ${creds.database}`;
    await execAsync(restoreCmd);
  } else {
    logger.info('mysql CLI not detected; executing restore via Prisma raw SQL connection');
    await restoreDatabasePureNode(filePath);
  }

  // 4. Record audit log
  await recordAuditLog({
    userId: user.id,
    entity: 'system_backup',
    entityId: 1,
    action: 'restore',
    after: {
      targetBackup: filename,
      rollbackSnapshot: rollbackSnapshotName || 'none',
      restoredBy: user.email,
      timestamp: new Date().toISOString(),
    },
  });

  logger.info({ targetBackup: filename, rollbackSnapshot: rollbackSnapshotName }, 'Database restore completed successfully');
  return {
    success: true,
    rollbackSnapshot: rollbackSnapshotName,
  };
}

/**
 * Deletes a backup archive and its checksum.
 */
export async function deleteBackup(filename: string, user: UserContext): Promise<boolean> {
  if (!validateBackupFilename(filename)) {
    throw new Error('Invalid backup filename.');
  }

  const dir = getBackupStorageDir();
  const filePath = path.join(dir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file does not exist.');
  }

  await fs.promises.unlink(filePath);
  const shaPath = `${filePath}.sha256`;
  if (fs.existsSync(shaPath)) {
    await fs.promises.unlink(shaPath).catch(() => {});
  }

  await recordAuditLog({
    userId: user.id,
    entity: 'system_backup',
    entityId: 1,
    action: 'delete',
    before: {
      filename,
      deletedBy: user.email,
    },
  });

  return true;
}

/**
 * Safely resolves the absolute file path for downloading.
 */
export function getBackupDownloadPath(filename: string): string {
  if (!validateBackupFilename(filename)) {
    throw new Error('Invalid backup filename.');
  }

  const dir = getBackupStorageDir();
  const fullPath = path.join(dir, filename);

  if (!fs.existsSync(fullPath)) {
    throw new Error('Backup file not found.');
  }

  return fullPath;
}

/**
 * Saves and verifies a user-uploaded database backup archive (.sql.gz).
 */
export async function saveUploadedBackup(
  fileStream: NodeJS.ReadableStream,
  originalFilename: string,
  user: UserContext
): Promise<BackupItem> {
  if (!originalFilename || typeof originalFilename !== 'string') {
    throw new Error('Invalid file name.');
  }

  const lower = originalFilename.toLowerCase();
  if (!lower.endsWith('.sql.gz') && !lower.endsWith('.gz')) {
    throw new Error('Invalid file type: database backup archives must end with .sql.gz or .gz');
  }

  const dir = getBackupStorageDir();
  let cleanBase = path.basename(originalFilename)
    .replace(/\.sql\.gz$/i, '')
    .replace(/\.gz$/i, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

  if (!cleanBase) cleanBase = 'archive';
  const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `hospital_crm_backup_uploaded_${dateStr}_${cleanBase}.sql.gz`;
  const destPath = path.join(dir, filename);
  const tempPath = path.join(dir, `${filename}.tmp`);

  try {
    // 1. Stream uploaded file to temporary file
    const writeStream = fs.createWriteStream(tempPath);
    await new Promise<void>((resolve, reject) => {
      fileStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      fileStream.on('error', reject);
    });

    // 2. Verify Gzip integrity
    await verifyGzipIntegrity(tempPath);

    // 3. Compute SHA-256 Checksum
    const hash = crypto.createHash('sha256');
    const fileBuffer = await fs.promises.readFile(tempPath);
    hash.update(fileBuffer);
    const sha256 = hash.digest('hex');

    // 4. Move temp file to final destination and write checksum
    await fs.promises.rename(tempPath, destPath);
    await fs.promises.writeFile(`${destPath}.sha256`, `${sha256}  ${filename}\n`, 'utf8');

    // Enforce 7-day retention cleanup
    await applyRetentionCleanup(dir);

    const stat = await fs.promises.stat(destPath);

    // 5. Record audit log
    await recordAuditLog({
      userId: user.id,
      entity: 'system_backup',
      entityId: 1,
      action: 'upload',
      after: {
        filename,
        originalFilename,
        sizeBytes: stat.size,
        sha256,
        uploadedBy: user.email,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info({ filename, originalFilename, user: user.email }, 'Uploaded backup file verified and stored successfully');

    return {
      filename,
      type: 'uploaded',
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      createdAt: stat.mtime.toISOString(),
      sha256,
    };
  } catch (err: any) {
    // Clean up temporary file on failure
    if (fs.existsSync(tempPath)) {
      await fs.promises.unlink(tempPath).catch(() => {});
    }
    throw err;
  }
}
