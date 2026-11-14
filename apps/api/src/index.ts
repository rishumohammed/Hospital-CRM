import { buildApp } from './app';
import { config } from './config/index';
import { logger } from './logger/index';

async function syncAuditorRole() {
  try {
    const { prisma } = await import('./database/client');
    const role = await prisma.role.findFirst({ where: { code: 'auditor' } });
    if (role) {
      if (role.name !== 'Managing Director (Read-Only)') {
        await prisma.role.update({
          where: { id: role.id },
          data: { name: 'Managing Director (Read-Only)', maskPhone: false },
        });
      }
      const hasExportApprove = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permission: 'export.approve' },
      });
      if (!hasExportApprove) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permission: 'export.approve',
            scope: 'all',
          },
        });
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not sync auditor role at startup');
  }
}

async function ensureManagingDirectorAccount() {
  try {
    const { prisma } = await import('./database/client');
    const { Roles } = await import('@hospital-crm/shared');
    const activeMd = await prisma.user.findFirst({
      where: {
        role: { code: Roles.OWNER },
        status: 'active',
        archivedAt: null,
      },
    });

    if (!activeMd) {
      const existingOwner = await prisma.user.findFirst({
        where: { role: { code: Roles.OWNER } },
      });

      if (existingOwner) {
        await prisma.user.update({
          where: { id: existingOwner.id },
          data: { status: 'active', archivedAt: null },
        });
        logger.info(`System Invariant: Restored primary Managing Director account (${existingOwner.email}) to active.`);
      } else {
        logger.warn('System Invariant Notice: No Managing Director account exists in database.');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not verify Managing Director condition at startup');
  }
}

async function startServer() {
  const app = await buildApp();

  try {
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(`Server listening at ${address}`);
    logger.info(`Swagger docs available at ${address}/docs`);
    await syncAuditorRole();
    await ensureManagingDirectorAccount();
    const { startScheduler } = await import('./cron/scheduler');
    startScheduler();
  } catch (err) {
    logger.error({ err }, 'Error starting server');
    process.exit(1);
  }
}

startServer();
