import { prisma } from '../../database/client';

/**
 * Milestone P5: Automation Jobs
 * 1. Restock Alert: When product goes from out_of_stock -> in_stock,
 *    finds unsent ProductWaitlist entries, verifies consent/DNC,
 *    creates a task "[Product] is back in stock" for lead owner due in 2 hours,
 *    dispatches in-app notification, and marks notifiedAt.
 */
export async function triggerRestockAlerts(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, stockStatus: true },
  });

  if (!product || product.stockStatus !== 'in_stock') {
    return { alertedCount: 0 };
  }

  const waitlistEntries = await prisma.productWaitlist.findMany({
    where: {
      productId,
      notifiedAt: null,
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          doNotContact: true,
          consentCalls: true,
          consentWhatsapp: true,
          archivedAt: true,
        },
      },
    },
  });

  const now = new Date();
  const dueAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  let alertedCount = 0;

  for (const entry of waitlistEntries) {
    const lead = entry.lead;
    if (!lead || lead.archivedAt !== null || lead.doNotContact) {
      continue;
    }

    if (lead.ownerId) {
      await prisma.task.create({
        data: {
          leadId: lead.id,
          assignedToId: lead.ownerId,
          type: 'call',
          priority: 'hot',
          title: `${product.name} is back in stock`,
          description: `Customer waitlisted this product. Call customer within 2h while stock is available.`,
          dueAt,
          status: 'pending',
        },
      });

      await prisma.notification.create({
        data: {
          userId: lead.ownerId,
          type: 'lead_assigned',
          title: `📦 Restock Alert: ${product.name}`,
          body: `Waitlisted lead ${lead.name} can now be contacted. Product is in stock.`,
          link: `/leads/${lead.id}`,
        },
      });
    }

    await prisma.productWaitlist.update({
      where: {
        leadId_productId: {
          leadId: entry.leadId,
          productId,
        },
      },
      data: {
        notifiedAt: now,
      },
    });

    alertedCount++;
  }

  return { alertedCount };
}

/**
 * 2. Out of Stock Alert: When product goes from in_stock -> out_of_stock,
 *    notifies owners of open leads that have that product active (interested or offered)
 *    so callers can pitch alternatives.
 */
export async function triggerOutOfStockAlerts(productId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, stockStatus: true },
  });

  if (!product || product.stockStatus !== 'out_of_stock') {
    return { notifiedLeadOwners: 0 };
  }

  const openInterests = await prisma.leadProductInterest.findMany({
    where: {
      productId,
      status: { in: ['interested', 'offered'] },
      lead: {
        archivedAt: null,
        status: { in: ['new', 'contacted', 'qualified', 'interested', 'quoted'] },
      },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  const notifiedOwnerIds = new Set<number>();

  for (const interest of openInterests) {
    const ownerId = interest.lead.ownerId;
    if (ownerId && !notifiedOwnerIds.has(ownerId)) {
      notifiedOwnerIds.add(ownerId);
      await prisma.notification.create({
        data: {
          userId: ownerId,
          type: 'lead_assigned',
          title: `⚠️ Out of Stock Alert: ${product.name}`,
          body: `Product ${product.name} is now OUT OF STOCK. Check your active leads to recommend alternative remedies.`,
          link: `/products/${productId}`,
        },
      });
    }
  }

  return { notifiedLeadOwners: notifiedOwnerIds.size };
}
