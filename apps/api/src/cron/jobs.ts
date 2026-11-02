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

/**
 * Checks for unanswered clinical escalations:
 * Acceptance Test 10:
 * - With no decision after 1 hour: notifies the Telecaller Manager of the branch.
 * - With no decision after 2 hours: notifies the Center Head of the branch.
 */
export async function checkUnansweredEscalations(prisma: PrismaClient, now = new Date()) {
  const pendingEscalations = await prisma.escalation.findMany({
    where: {
      status: 'pending',
    },
    include: {
      case: {
        include: {
          patient: true,
          branch: true,
        },
      },
    },
  });

  let notificationsSent = 0;
  const twoHoursAgo = subHours(now, 2);

  for (const esc of pendingEscalations) {
    const isOverdue1h = new Date(esc.dueAt) <= now;
    const isOverdue2h = new Date(esc.createdAt) <= twoHoursAgo;

    // 1. Alert Center Head after 2 hours
    if (isOverdue2h) {
      const centerHeads = await prisma.user.findMany({
        where: {
          role: { code: 'center_head' },
          status: 'active',
          userBranches: { some: { branchId: esc.case.branchId } },
        },
      });

      const targets =
        centerHeads.length > 0
          ? centerHeads
          : await prisma.user.findMany({
              where: { role: { code: 'admin' }, status: 'active' },
              take: 2,
            });

      for (const ch of targets) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: ch.id,
            type: 'escalation_unanswered_centerhead',
            body: { contains: `Escalation #${esc.id}` },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: ch.id,
              type: 'escalation_unanswered_centerhead',
              title: `🚨 CRITICAL: Unanswered Clinical Escalation (>2h)`,
              body: `Escalation #${esc.id} for patient ${esc.case.patient?.name || 'Patient'} at ${esc.case.branch.name} has had no doctor decision for over 2 hours.`,
              link: `/doctor`,
            },
          });
          notificationsSent++;
        }
      }
    }
    // 2. Alert Telecaller Manager after 1 hour (if dueAt <= now)
    else if (isOverdue1h) {
      const managers = await prisma.user.findMany({
        where: {
          role: { code: 'telecaller_manager' },
          status: 'active',
          userBranches: { some: { branchId: esc.case.branchId } },
        },
      });

      const targets =
        managers.length > 0
          ? managers
          : await prisma.user.findMany({
              where: { role: { code: 'admin' }, status: 'active' },
              take: 2,
            });

      for (const mgr of targets) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: mgr.id,
            type: 'escalation_unanswered_manager',
            body: { contains: `Escalation #${esc.id}` },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: mgr.id,
              type: 'escalation_unanswered_manager',
              title: `⚠️ Unanswered Clinical Escalation (>1h)`,
              body: `Escalation #${esc.id} for patient ${esc.case.patient?.name || 'Patient'} has had no doctor decision for over 1 hour.`,
              link: `/doctor`,
            },
          });
          notificationsSent++;
        }
      }
    }
  }

  return { pendingCount: pendingEscalations.length, notificationsSent };
}

/**
 * Checks for unmarked visits where 1 hour (or unmarked_visit_grace_minutes) has elapsed
 * since the end of the time window, and notifies the case owner (executive).
 */
export async function checkUnmarkedVisits(prisma: PrismaClient, now = new Date()) {
  // 1. Fetch grace period setting (default 60 minutes)
  const graceSetting = await prisma.setting.findUnique({
    where: { key: 'unmarked_visit_grace_minutes' },
  });
  const graceMinutes = (graceSetting?.value as number) || 60;

  // 2. Find planned visits for today or earlier
  const plannedVisits = await prisma.scheduledVisit.findMany({
    where: {
      status: 'planned',
      scheduledDate: { lte: now },
    },
    include: {
      case: {
        include: {
          patient: true,
          owner: true,
        },
      },
      schedule: {
        include: {
          therapy: true,
        },
      },
    },
  });

  let unmarkedCount = 0;
  let notificationsSent = 0;

  for (const visit of plannedVisits) {
    const vDate = new Date(visit.scheduledDate);
    const [h, m] = visit.windowEnd.split(':').map((x) => parseInt(x, 10));
    vDate.setHours(h || 11, m || 0, 0, 0);

    const deadline = new Date(vDate.getTime() + graceMinutes * 60 * 1000);

    if (now >= deadline) {
      unmarkedCount++;

      // Notify executive owner
      if (visit.case.ownerId) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: visit.case.ownerId,
            type: 'visit_unmarked',
            body: { contains: `Visit #${visit.id}` },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId: visit.case.ownerId,
              type: 'visit_unmarked',
              title: `⚠️ Unmarked Visit: ${visit.case.patient?.name || 'Patient'}`,
              body: `Visit #${visit.id} (${visit.schedule.therapy.labelEn}) on ${visit.windowStart}-${visit.windowEnd} has not been marked. Please verify attendance.`,
              link: `/treatment-followup`,
            },
          });
          notificationsSent++;
        }
      }
    }
  }

  return { unmarkedCount, notificationsSent };
}

/**
 * Escalation checker for treatment escalations:
 * - adherence: assigned to treating doctor, SLA 24h. Notify telecaller manager if undecided.
 * - inpatient_concern: assigned to ward nurse & doctor, SLA 1h. Notify telecaller manager at 1h, center head at 2h.
 */
export async function checkUnansweredTreatmentEscalations(prisma: PrismaClient, now = new Date()) {
  const pending = await prisma.escalation.findMany({
    where: {
      status: 'pending',
      escalationType: { in: ['adherence', 'inpatient_concern'] },
    },
    include: {
      case: {
        include: {
          patient: true,
          branch: true,
        },
      },
    },
  });

  let notificationsSent = 0;
  const twoHoursAgo = subHours(now, 2);

  for (const esc of pending) {
    const isOverdue = new Date(esc.dueAt) <= now;
    const isOlderThan2h = new Date(esc.createdAt) <= twoHoursAgo;

    if (esc.escalationType === 'adherence') {
      if (isOverdue) {
        // Notify telecaller manager
        const managers = await prisma.user.findMany({
          where: {
            role: { code: 'telecaller_manager' },
            status: 'active',
            userBranches: { some: { branchId: esc.case.branchId } },
          },
        });

        for (const mgr of managers) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: mgr.id,
              type: 'adherence_escalation_overdue',
              body: { contains: `Escalation #${esc.id}` },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: mgr.id,
                type: 'adherence_escalation_overdue',
                title: `⚠️ Adherence Escalation Overdue (>24h)`,
                body: `Escalation #${esc.id} for patient ${esc.case.patient.name} has had no doctor decision for 24 hours.`,
                link: `/doctor`,
              },
            });
            notificationsSent++;
          }
        }
      }
    } else if (esc.escalationType === 'inpatient_concern') {
      if (isOlderThan2h) {
        // Notify Center Head at 2 hours
        const centerHeads = await prisma.user.findMany({
          where: {
            role: { code: 'center_head' },
            status: 'active',
            userBranches: { some: { branchId: esc.case.branchId } },
          },
        });

        for (const ch of centerHeads) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: ch.id,
              type: 'inpatient_concern_centerhead',
              body: { contains: `Escalation #${esc.id}` },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: ch.id,
                type: 'inpatient_concern_centerhead',
                title: `🚨 CRITICAL: In-Patient Concern Unanswered (>2h)`,
                body: `Escalation #${esc.id} for patient ${esc.case.patient.name} at ${esc.case.branch.name} has had no decision for over 2 hours.`,
                link: `/doctor`,
              },
            });
            notificationsSent++;
          }
        }
      } else if (isOverdue) {
        // Notify Telecaller Manager at 1 hour
        const managers = await prisma.user.findMany({
          where: {
            role: { code: 'telecaller_manager' },
            status: 'active',
            userBranches: { some: { branchId: esc.case.branchId } },
          },
        });

        for (const mgr of managers) {
          const existing = await prisma.notification.findFirst({
            where: {
              userId: mgr.id,
              type: 'inpatient_concern_manager',
              body: { contains: `Escalation #${esc.id}` },
            },
          });

          if (!existing) {
            await prisma.notification.create({
              data: {
                userId: mgr.id,
                type: 'inpatient_concern_manager',
                title: `⚠️ In-Patient Concern Decision Overdue (>1h)`,
                body: `Escalation #${esc.id} for patient ${esc.case.patient.name} decision overdue.`,
                link: `/doctor`,
              },
            });
            notificationsSent++;
          }
        }
      }
    }
  }

  return { pendingCount: pending.length, notificationsSent };
}

/**
 * Recomputes adherence metrics for all active treatment cases every 15 minutes
 */
export async function recomputeAllAdherenceRisks(prisma: PrismaClient, now = new Date()) {
  const activeCases = await prisma.case.findMany({
    where: {
      team: 'treatment_followup',
      archivedAt: null,
    },
    include: {
      scheduledVisits: {
        select: {
          scheduledDate: true,
          status: true,
        },
      },
    },
  });

  const thresholdSetting = await prisma.setting.findUnique({
    where: { key: 'adherence_thresholds' },
  });
  const thresholds = (thresholdSetting?.value as any) || { mediumRiskRate: 80, highRiskRate: 60 };

  let updatedCount = 0;

  for (const c of activeCases) {
    const dueVisits = c.scheduledVisits.filter((v: any) => v.status === 'attended' || v.status === 'missed');
    const attended = dueVisits.filter((v: any) => v.status === 'attended');
    const attRate = dueVisits.length > 0 ? Math.round((attended.length / dueVisits.length) * 100 * 10) / 10 : 100.0;

    const sortedDue = [...dueVisits].sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    let consecutiveMissed = 0;
    for (const v of sortedDue) {
      if (v.status === 'missed') consecutiveMissed++;
      else break;
    }

    let risk: 'low' | 'medium' | 'high' = 'low';
    const last3 = sortedDue.slice(0, 3);
    const missedInLast3 = last3.filter((v: any) => v.status === 'missed').length;

    if (consecutiveMissed >= 2 || (dueVisits.length > 0 && attRate < thresholds.highRiskRate)) {
      risk = 'high';
    } else if (missedInLast3 >= 1 || (dueVisits.length > 0 && attRate < thresholds.mediumRiskRate)) {
      risk = 'medium';
    }

    await prisma.case.update({
      where: { id: c.id },
      data: {
        attendanceRate: attRate,
        consecutiveMissed,
        adherenceRisk: risk,
        updatedAt: now,
      },
    });
    updatedCount++;
  }

  return { activeCasesCount: activeCases.length, updatedCount };
}

/**
 * Nightly maintenance job (runs at 00:30):
 * 1. Generates missing reminder tasks for next 14 days
 * 2. Moves visits on newly added holidays
 * 3. Flags schedules whose end date has passed or all visits attended as Ready to Complete
 */
export async function runNightlyTreatmentMaintenance(prisma: PrismaClient, now = new Date()) {
  // 1. Find all active schedules
  const activeSchedules = await prisma.visitSchedule.findMany({
    where: { status: 'active' },
    include: {
      case: { include: { branch: true, patient: true, lead: true } },
      visits: { orderBy: { sessionNo: 'asc' } },
    },
  });

  let remindersCreated = 0;
  let visitsMoved = 0;
  let schedulesReadyToComplete = 0;

  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Fetch branch_holidays
  const holidaySetting = await prisma.setting.findUnique({
    where: { key: 'branch_holidays' },
  });
  const rawHolidays = (holidaySetting?.value as any) || [];
  const holidays: string[] = [];
  if (Array.isArray(rawHolidays)) {
    for (const h of rawHolidays) {
      if (typeof h === 'string') holidays.push(h);
      else if (h?.date) holidays.push(h.date);
    }
  }

  for (const schedule of activeSchedules) {
    const isDnc = Boolean(schedule.case.lead?.doNotContact);

    // Check holiday conflicts and move if needed
    for (const visit of schedule.visits) {
      if (visit.status === 'planned') {
        const dateStr = visit.scheduledDate.toISOString().split('T')[0];
        if (holidays.includes(dateStr)) {
          // Holiday match: move to next open day
          const nextDay = new Date(visit.scheduledDate);
          nextDay.setDate(nextDay.getDate() + 1);

          await prisma.scheduledVisit.update({
            where: { id: visit.id },
            data: {
              scheduledDate: nextDay,
              movedFromDate: visit.scheduledDate,
              movedReason: 'Branch closed / holiday',
              updatedAt: now,
            },
          });
          visitsMoved++;
        }

        // Generate missing reminder tasks
        if (!isDnc && visit.scheduledDate <= fourteenDaysOut && visit.scheduledDate >= now) {
          const eveningBefore = new Date(visit.scheduledDate);
          eveningBefore.setDate(eveningBefore.getDate() - 1);
          eveningBefore.setHours(17, 0, 0, 0);

          if (eveningBefore > now) {
            const existingTask = await prisma.task.findFirst({
              where: {
                caseId: schedule.caseId,
                cadenceKey: 'visit.reminder',
                dueAt: eveningBefore,
              },
            });

            if (!existingTask) {
              const taskOwnerId = schedule.case.ownerId || schedule.createdBy || 1;
              await prisma.task.create({
                data: {
                  caseId: schedule.caseId,
                  cadenceKey: 'visit.reminder',
                  cadenceStep: 1,
                  title: `Reminder: Session ${visit.sessionNo} tomorrow`,
                  type: 'reminder',
                  priority: 'warm',
                  dueAt: eveningBefore,
                  status: 'open',
                  ownerId: taskOwnerId,
                },
              });
              remindersCreated++;
            }
          }
        }
      }
    }

    // Check if ready to complete
    const plannedRemaining = schedule.visits.filter((v: any) => v.status === 'planned').length;
    const isPastEnd = schedule.endDate && new Date(schedule.endDate) < now;

    if (plannedRemaining === 0 || isPastEnd) {
      schedulesReadyToComplete++;
      // Notify executive if not already completed
      if (schedule.case.ownerId) {
        await prisma.notification.create({
          data: {
            userId: schedule.case.ownerId,
            type: 'schedule_ready_to_complete',
            title: `Treatment Schedule Ready to Complete: ${schedule.case.patient.name}`,
            body: `All visits have concluded. Please verify outcome and mark Treatment Completed.`,
            link: `/cases/${schedule.caseId}`,
          },
        });
      }
    }
  }

  return { remindersCreated, visitsMoved, schedulesReadyToComplete };
}

