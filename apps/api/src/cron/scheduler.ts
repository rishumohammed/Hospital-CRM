import cron from 'node-cron';
import { prisma } from '../database/client';
import { logger } from '../logger';
import {
  checkSlaBreaches,
  checkOverdueTasks,
  updateLeadPriorities,
  checkUnansweredEscalations,
  checkUnmarkedVisits,
  checkUnansweredTreatmentEscalations,
  recomputeAllAdherenceRisks,
  runNightlyTreatmentMaintenance,
} from './jobs';

let scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Starts all cron background jobs.
 */
export function startScheduler() {
  stopScheduler();

  logger.info('Starting CRM Scheduled Jobs...');

  // 1. SLA Breach & Escalations Check: Every minute
  const slaTask = cron.schedule('* * * * *', async () => {
    try {
      const res = await checkSlaBreaches(prisma);
      if (res.breachedCount > 0) {
        logger.warn({ count: res.breachedCount }, 'SLA breaches detected and notifications dispatched');
      }
      await checkUnansweredEscalations(prisma);
      await checkUnansweredTreatmentEscalations(prisma);
    } catch (err) {
      logger.error({ err }, 'Error running 1-minute cron jobs');
    }
  });
  scheduledTasks.push(slaTask);

  // 2. Overdue Tasks & Unmarked Visits Check: Every 5 minutes
  const overdueTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkOverdueTasks(prisma);
      const unmarkedRes = await checkUnmarkedVisits(prisma);
      if (unmarkedRes.unmarkedCount > 0) {
        logger.info({ count: unmarkedRes.unmarkedCount }, 'Unmarked visits identified and executives alerted');
      }
    } catch (err) {
      logger.error({ err }, 'Error running 5-minute cron jobs');
    }
  });
  scheduledTasks.push(overdueTask);

  // 3. Lead Priority Updates & Treatment Adherence Risk Recomputation: Every 15 minutes
  const priorityTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await updateLeadPriorities(prisma);
      await recomputeAllAdherenceRisks(prisma);
    } catch (err) {
      logger.error({ err }, 'Error running 15-minute cron jobs');
    }
  });
  scheduledTasks.push(priorityTask);

  // 4. Nightly Treatment Maintenance at 00:30
  const nightlyTask = cron.schedule('30 0 * * *', async () => {
    try {
      const res = await runNightlyTreatmentMaintenance(prisma);
      logger.info(res, 'Nightly treatment maintenance completed');
    } catch (err) {
      logger.error({ err }, 'Error running nightly treatment maintenance');
    }
  });
  scheduledTasks.push(nightlyTask);

  logger.info('✓ Scheduled jobs active (SLA/Escalations 1m, Overdue/Unmarked 5m, Priorities/Adherence 15m, Nightly 00:30)');
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
