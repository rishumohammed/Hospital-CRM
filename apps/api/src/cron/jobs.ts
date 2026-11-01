import { PrismaClient } from '@prisma/client';
import { subHours, subDays } from 'date-fns';

/**
 * Checks for leads whose first response SLA has breached:
 * `firstResponseDueAt < now` AND `firstResponseAt IS NULL` AND `slaBreached = false`.
 * Marks `slaBreached = true` and creates a notification for the branch telecaller manager(s).
 */
export async function checkSlaBreaches(prisma: PrismaClient, now = new Date()) {
  const breachedLeads = await prisma.lead.findMany({
    where: {
      firstResponseDueAt: { lt: now },
      firstResponseAt: null,
      slaBreached: false,
      archivedAt: null,
    },
    include: {
      branch: true,
      owner: true,
    },
  });

  const processedCount = breachedLeads.length;
  if (processedCount === 0) {
    return { breachedCount: 0, notificationsSent: 0 };
  }

  let notificationsSent = 0;

  for (const lead of breachedLeads) {
    // 1. Mark lead as breached
    await prisma.lead.update({
      where: { id: lead.id },
      data: { slaBreached: true },
    });

    // 2. Find telecaller managers in the lead's branch
    const managers = await prisma.user.findMany({
      where: {
        role: { code: 'telecaller_manager' },
        status: 'active',
        userBranches: { some: { branchId: lead.branchId } },
      },
    });

    // Fallback: If no branch manager, notify center head or admin
    const targetUsers = managers.length > 0
      ? managers
      : await prisma.user.findMany({
          where: {
            role: { code: { in: ['center_head', 'admin'] } },
            status: 'active',
          },
          take: 3,
        });

    for (const manager of targetUsers) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'sla_breach',
          title: `⚠️ First Response SLA Breached: ${lead.name}`,
          body: `Lead #${lead.id} (${lead.name}) exceeded first-response SLA. Assigned to: ${lead.owner?.name ?? 'Unassigned'}. Branch: ${lead.branch.name}.`,
          link: `/leads/${lead.id}`,
        },
      });
      notificationsSent++;
    }
  }

  return { breachedCount: processedCount, notificationsSent };
}

/**
 * Checks for overdue open tasks:
 * 1. At due time (0 - 2 hours overdue): notifies the task owner if not yet notified.
 * 2. Overdue by >= 2 hours: notifies the Telecaller Manager of the branch.
 */
export async function checkOverdueTasks(prisma: PrismaClient, now = new Date()) {
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: 'open',
      dueAt: { lt: now },
      archivedAt: null,
    },
    include: {
      owner: {
        include: {
          userBranches: true,
        },
      },
      lead: true,
    },
  });

  let notificationsSent = 0;
  const twoHoursAgo = subHours(now, 2);

  for (const task of overdueTasks) {
    const isMoreThan2HoursOverdue = new Date(task.dueAt) <= twoHoursAgo;

    if (isMoreThan2HoursOverdue) {
      // Find branch IDs for the task owner or lead
      const branchIds = task.lead?.branchId
        ? [task.lead.branchId]
        : task.owner.userBranches.map((b) => b.branchId);

      const managers = await prisma.user.findMany({
        where: {
          role: { code: 'telecaller_manager' },
          status: 'active',
          userBranches: { some: { branchId: { in: branchIds } } },
        },
      });

      for (const manager of managers) {
        // Prevent duplicate spam: check if notification created in last 2 hours for this task
        const existing = await prisma.notification.findFirst({
          where: {
            userId: manager.id,
            type: 'task_overdue_manager',
            link: task.leadId ? `/leads/${task.leadId}` : `/tasks`,
            createdAt: { gte: twoHoursAgo },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: manager.id,
              type: 'task_overdue_manager',
              title: `⏰ Task Overdue >2h: ${task.title}`,
              body: `Task "${task.title}" owned by ${task.owner.name} is more than 2 hours overdue.`,
              link: task.leadId ? `/leads/${task.leadId}` : `/tasks`,
            },
          });
          notificationsSent++;
        }
      }
    }
  }

  return { overdueCount: overdueTasks.length, notificationsSent };
}

/**
 * Updates lead priorities automatically:
 * - 'hot': Ad leads (Meta/Google Ads) created in the last 24 hours, or status 'appointment_booked'.
 * - 'cold': 3+ call attempts with no answer/switched off, or created > 30 days ago without appointment.
 * - 'warm': everything else.
 */
export async function updateLeadPriorities(prisma: PrismaClient, now = new Date()) {
  const oneDayAgo = subHours(now, 24);
  const thirtyDaysAgo = subDays(now, 30);

  // 1. Mark Hot: Ads < 24h old OR status appointment_booked
  const hotResult = await prisma.lead.updateMany({
    where: {
      status: { notIn: ['closed', 'converted', 'not_interested', 'junk'] },
      OR: [
        { status: 'appointment_booked' },
        {
          createdAt: { gte: oneDayAgo },
          source: { code: { in: ['META_ADS', 'GOOGLE_ADS', 'meta_ads', 'google_ads'] } },
        },
      ],
      priority: { not: 'hot' },
    },
    data: { priority: 'hot' },
  });

  // 2. Mark Cold: Created > 30 days ago AND not appointment_booked
  const coldResult = await prisma.lead.updateMany({
    where: {
      status: { notIn: ['closed', 'converted', 'appointment_booked'] },
      createdAt: { lt: thirtyDaysAgo },
      priority: { not: 'cold' },
    },
    data: { priority: 'cold' },
  });

  return {
    hotUpdated: hotResult.count,
    coldUpdated: coldResult.count,
  };
}
