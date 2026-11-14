import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { buildApp } from '../../app';
import { getBackupStorageDir } from './backup.service';

describe('Backup API Authentication & RBAC Protection', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let telecallerToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Login as Managing Director (Owner)
    const ownerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'owner@hospital.test',
        password: 'HospitalCRM@2026',
      },
    });
    if (ownerRes.statusCode === 200) {
      ownerToken = JSON.parse(ownerRes.payload).accessToken;
    }

    // 2. Login as Support Telecaller
    const telecallerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        identifier: 'support1@hospital.test',
        password: 'HospitalCRM@2026',
      },
    });
    if (telecallerRes.statusCode === 200) {
      telecallerToken = JSON.parse(telecallerRes.payload).accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests to GET /api/v1/admin/backups with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/backups',
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects unauthenticated requests to POST /api/v1/admin/backups with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/backups',
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects unauthorized telecaller requests with 403 Forbidden', async () => {
    if (!telecallerToken) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/backups',
      headers: {
        authorization: `Bearer ${telecallerToken}`,
      },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error?.code).toBe('FORBIDDEN');
  });

  it('allows Managing Director / Owner to fetch database stats and backups list', async () => {
    if (!ownerToken) return;
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/backups',
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stats).toBeDefined();
    expect(Array.isArray(body.backups)).toBe(true);
  });

  it('supports uploading a valid database backup file (.sql.gz)', async () => {
    if (!ownerToken) return;

    const testSql = 'CREATE TABLE test_api_upload (id INT);';
    const compressed = zlib.gzipSync(Buffer.from(testSql));
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_backup.sql.gz"\r\nContent-Type: application/gzip\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([header, compressed, footer]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/backups/upload',
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.backup?.filename).toMatch(/^hospital_crm_backup_uploaded_\d+_sample_backup\.sql\.gz$/);

    // Clean up uploaded file
    const targetPath = path.join(getBackupStorageDir(), body.backup.filename);
    await fs.promises.unlink(targetPath).catch(() => {});
    await fs.promises.unlink(`${targetPath}.sha256`).catch(() => {});
  });
});

