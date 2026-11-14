import { FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import { Permissions, Roles } from '@hospital-crm/shared';
import { authenticate } from '../auth/auth.middleware';
import {
  listBackups,
  getDatabaseStats,
  createBackup,
  restoreBackup,
  deleteBackup,
  getBackupDownloadPath,
  saveUploadedBackup,
} from './backup.service';

export const backupRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // Middleware to ensure user is Managing Director (Owner) or Admin
  const requireAdminOrOwner = async (request: any, reply: any) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' } });
    }

    const roleCode = String(user.roleCode || user.role?.code || user.role || '').toLowerCase();
    const isOwnerOrAdmin =
      roleCode === Roles.OWNER ||
      roleCode === Roles.ADMIN ||
      roleCode === 'super_admin' ||
      roleCode === 'owner' ||
      roleCode === 'admin';

    const hasPermission = Boolean(
      (user.permissions && (user.permissions[Permissions.SETTINGS_MANAGE] || user.permissions['backup.manage'] || user.permissions['settings.manage'])) ||
      (Array.isArray(user.permissions) && (user.permissions.includes(Permissions.SETTINGS_MANAGE) || user.permissions.includes('backup.manage') || user.permissions.includes('settings.manage')))
    );

    if (!isOwnerOrAdmin && !hasPermission) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Database backup and disaster recovery operations are restricted to Managing Directors and System Administrators.',
        },
      });
    }
  };

  // 1. Get Database Statistics & List Backups
  fastify.get(
    '/admin/backups',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Get database stats and list all available database backup archives',
        tags: ['Backups'],
      },
    },
    async (request, reply) => {
      const [stats, backups] = await Promise.all([getDatabaseStats(), listBackups()]);
      return reply.send({
        stats,
        backups,
      });
    }
  );

  // 2. Trigger Instant Manual Backup
  fastify.post(
    '/admin/backups',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Create an instant transactional snapshot of the database',
        tags: ['Backups'],
      },
    },
    async (request, reply) => {
      const backup = await createBackup('manual', request.user!.email);
      return reply.status(201).send({
        success: true,
        message: 'Backup created successfully',
        backup,
      });
    }
  );

  // 3. Download Backup Archive
  fastify.get(
    '/admin/backups/:filename/download',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Download a compressed database backup archive (.sql.gz)',
        tags: ['Backups'],
        params: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
          },
          required: ['filename'],
        },
      },
    },
    async (request, reply) => {
      const { filename } = request.params as { filename: string };
      try {
        const filePath = getBackupDownloadPath(filename);
        const stat = await fs.promises.stat(filePath);

        reply.header('Content-Type', 'application/gzip');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        reply.header('Content-Length', stat.size);

        const stream = fs.createReadStream(filePath);
        return reply.send(stream);
      } catch (err: any) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: err.message || 'Backup file not found',
          },
        });
      }
    }
  );

  // 4. Restore Database from a Specific Backup
  fastify.post(
    '/admin/backups/:filename/restore',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Restore database from an existing backup archive with automatic rollback snapshot',
        tags: ['Backups'],
        params: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
          },
          required: ['filename'],
        },
        body: {
          type: 'object',
          properties: {
            confirm: { type: 'string' },
          },
          required: ['confirm'],
        },
      },
    },
    async (request, reply) => {
      const { filename } = request.params as { filename: string };
      const body = request.body as { confirm: string };

      if (body.confirm !== 'RESTORE') {
        return reply.status(400).send({
          error: {
            code: 'CONFIRMATION_REQUIRED',
            message: "Explicit confirmation required: You must send { confirm: 'RESTORE' } to execute a database restoration.",
          },
        });
      }

      try {
        const result = await restoreBackup(filename, request.user!);
        return reply.send({
          success: true,
          message: 'Database restored successfully.',
          rollbackSnapshot: result.rollbackSnapshot,
        });
      } catch (err: any) {
        return reply.status(500).send({
          error: {
            code: 'RESTORE_FAILED',
            message: err.message || 'Failed to restore database from backup.',
          },
        });
      }
    }
  );

  // 5. Delete a Backup Archive
  fastify.delete(
    '/admin/backups/:filename',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Permanently remove an old backup archive',
        tags: ['Backups'],
        params: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
          },
          required: ['filename'],
        },
      },
    },
    async (request, reply) => {
      const { filename } = request.params as { filename: string };
      try {
        await deleteBackup(filename, request.user!);
        return reply.send({
          success: true,
          message: `Backup '${filename}' deleted successfully.`,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: {
            code: 'DELETE_FAILED',
            message: err.message || 'Failed to delete backup file.',
          },
        });
      }
    }
  );

  // 6. Upload Backup Archive from Local Computer
  fastify.post(
    '/admin/backups/upload',
    {
      preHandler: [requireAdminOrOwner],
      schema: {
        description: 'Upload an existing database backup archive (.sql.gz) from local computer',
        tags: ['Backups'],
      },
    },
    async (request, reply) => {
      let data: any;
      try {
        data = await (request as any).file();
      } catch (err: any) {
        return reply.status(400).send({
          error: {
            code: 'UPLOAD_PARSE_ERROR',
            message: err.message || 'Failed to parse file upload stream.',
          },
        });
      }

      if (!data) {
        return reply.status(400).send({
          error: {
            code: 'NO_FILE',
            message: 'No file was received. Please select a .sql.gz backup file to upload.',
          },
        });
      }

      try {
        const backupItem = await saveUploadedBackup(data.file, data.filename, request.user!);
        return reply.status(201).send({
          success: true,
          message: `Backup archive '${backupItem.filename}' uploaded and verified successfully.`,
          backup: backupItem,
        });
      } catch (err: any) {
        return reply.status(400).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: err.message || 'Failed to process uploaded backup archive.',
          },
        });
      }
    }
  );
};

