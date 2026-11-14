import { describe, it, expect } from 'vitest';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import stream from 'stream';
import {
  validateBackupFilename,
  formatBytes,
  getBackupStorageDir,
  verifyGzipIntegrity,
  saveUploadedBackup,
  applyRetentionCleanup,
} from './backup.service';

describe('Database Backup & Restore Security and Utilities', () => {
  it('validates legitimate backup filenames properly', () => {
    expect(validateBackupFilename('hospital_crm_backup_manual_20261109_120000.sql.gz')).toBe(true);
    expect(validateBackupFilename('hospital_crm_backup_automated_20261109_020000.sql.gz')).toBe(true);
    expect(validateBackupFilename('hospital_crm_backup_rollback_20261109_153012.sql.gz')).toBe(true);
    expect(validateBackupFilename('hospital_crm_backup_pre-upgrade_20261109_000000.sql.gz')).toBe(true);
    expect(validateBackupFilename('hospital_crm_backup_uploaded_20261110_190000_sample.sql.gz')).toBe(true);
  });

  it('strictly blocks path traversal and malicious file names', () => {
    expect(validateBackupFilename('../../etc/passwd')).toBe(false);
    expect(validateBackupFilename('..\\..\\windows\\system32')).toBe(false);
    expect(validateBackupFilename('hospital_crm_backup_manual_20261109.sql')).toBe(false); // must be .sql.gz
    expect(validateBackupFilename('hospital_crm_backup_test.sh')).toBe(false);
    expect(validateBackupFilename('malicious_file.sql.gz')).toBe(false);
    expect(validateBackupFilename('/var/backups/hospital_crm_backup_manual_123.sql.gz')).toBe(false); // no path separators
    expect(validateBackupFilename('')).toBe(false);
    expect(validateBackupFilename(null as any)).toBe(false);
  });

  it('formats byte sizes into readable metrics correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('resolves a secure backup storage directory', () => {
    const dir = getBackupStorageDir();
    expect(typeof dir).toBe('string');
    expect(dir.length).toBeGreaterThan(0);
  });

  it('verifies valid and detects corrupted gzip archives', async () => {
    const tempDir = getBackupStorageDir();
    const validGzipPath = path.join(tempDir, 'test_valid.gz');
    const corruptedGzipPath = path.join(tempDir, 'test_corrupted.gz');

    const content = Buffer.from('SELECT 1 FROM `users`;\n');
    const compressed = zlib.gzipSync(content);
    await fs.promises.writeFile(validGzipPath, compressed);

    // Corrupted file
    const corrupted = Buffer.from(compressed);
    corrupted[10] = 0xff;
    corrupted[11] = 0xee;
    await fs.promises.writeFile(corruptedGzipPath, corrupted);

    try {
      await expect(verifyGzipIntegrity(validGzipPath)).resolves.not.toThrow();
      await expect(verifyGzipIntegrity(corruptedGzipPath)).rejects.toThrow();
    } finally {
      await fs.promises.unlink(validGzipPath).catch(() => {});
      await fs.promises.unlink(corruptedGzipPath).catch(() => {});
    }
  });

  it('saves and registers an uploaded backup archive', async () => {
    const testSql = 'CREATE TABLE test_upload (id INT); INSERT INTO test_upload VALUES (1);';
    const compressed = zlib.gzipSync(Buffer.from(testSql));
    const readable = stream.Readable.from(compressed);

    const mockUser: any = {
      id: 1,
      email: 'owner@hospital.test',
      role: 'owner',
      permissions: {},
    };

    const result = await saveUploadedBackup(readable, 'my_hospital_export.sql.gz', mockUser);
    expect(result.type).toBe('uploaded');
    expect(result.filename).toMatch(/^hospital_crm_backup_uploaded_\d+_my_hospital_export\.sql\.gz$/);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.sha256).toBeDefined();

    // Verify file exists on disk
    const targetFile = path.join(getBackupStorageDir(), result.filename);
    expect(fs.existsSync(targetFile)).toBe(true);

    // Clean up
    await fs.promises.unlink(targetFile).catch(() => {});
    await fs.promises.unlink(`${targetFile}.sha256`).catch(() => {});
  });

  it('enforces 7-day retention cleanup preserving at least the 7 newest backups', async () => {
    const tempDir = path.join(getBackupStorageDir(), 'test_retention_sandbox');
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }

    try {
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

      // Create 8 files from 10 days ago (older than 7 days)
      const createdFiles: string[] = [];
      for (let i = 1; i <= 8; i++) {
        const fname = `hospital_crm_backup_manual_2026110${i}_000000.sql.gz`;
        const fpath = path.join(tempDir, fname);
        await fs.promises.writeFile(fpath, 'dummy');
        await fs.promises.utimes(fpath, tenDaysAgo, tenDaysAgo);
        createdFiles.push(fname);
      }

      // Run retention cleanup on test directory
      await applyRetentionCleanup(tempDir);

      const remainingFiles = await fs.promises.readdir(tempDir);
      // Because minKeep is 7, exactly 7 newest backups must be preserved, and the 8th (oldest) must be deleted!
      expect(remainingFiles.length).toBe(7);
    } finally {
      const files = await fs.promises.readdir(tempDir).catch(() => []);
      for (const f of files) {
        await fs.promises.unlink(path.join(tempDir, f)).catch(() => {});
      }
      await fs.promises.rmdir(tempDir).catch(() => {});
    }
  });
});

