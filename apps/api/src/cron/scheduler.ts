import cron from 'node-cron';
import { prisma } from '../database/client';
import { logger } from '../logger';
import { checkSlaBreaches, checkOverdueTasks, updateLeadPriorities } from './jobs';

let scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Starts all cron background jobs.
 */
export function startScheduler() {
  stopScheduler();

  logger.info('Starting CRM Scheduled Jobs...');

  // 1. SLA Breach Check: Every minute
  const slaTask = cron.schedule('* * * * *', async () => {
    try {
      const res = await checkSlaBreaches(prisma);
      if (res.breachedCount > 0) {
        logger.warn({ count: res.breachedCount }, 'SLA breaches detected and notifications dispatched');
      }
    } catch (err) {
      logger.error({ err }, 'Error running checkSlaBreaches job');
    }
  });
  scheduledTasks.push(slaTask);

  // 2. Overdue Tasks Check: Every 5 minutes
  const overdueTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkOverdueTasks(prisma);
    } catch (err) {
      logger.error({ err }, 'Error running checkOverdueTasks job');
    }
  });
  scheduledTasks.push(overdueTask);

  // 3. Lead Priority Updates: Every 15 minutes
  const priorityTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await updateLeadPriorities(prisma);
    } catch (err) {
      logger.error({ err }, 'Error running updateLeadPriorities job');
    }
  });
  scheduledTasks.push(priorityTask);

  logger.info('✓ Scheduled jobs active (SLA every 1m, Overdue every 5m, Priorities every 15m)');
}

/**
 * Stops all running cron tasks (useful during test teardown).
 */
export function stopScheduler() {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
}
