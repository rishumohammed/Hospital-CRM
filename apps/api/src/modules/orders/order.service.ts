import { prisma } from '../../database/client';
import { logger } from '../../logger';
import { recordAuditLog } from '../audit/audit.service';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, OrderStatuses, OrderStatus } from '@hospital-crm/shared';

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Generates human-readable sequential order number: ORD-YYYYMM-XXXX
 */
export async function generateOrderNumber(tx?: any): Promise<string> {
  const db = tx || prisma;
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `ORD-${yearMonth}-`;

  const lastOrder = await db.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { id: 'desc' },
    select: { orderNumber: true },
  });

  let seq = 1;
  if (lastOrder?.orderNumber) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

export interface CreateOrderInput {
  leadId?: number;
  customerId?: number;
  recipientName: string;
  phoneNumber: string;
  secondaryPhone?: string;
  shippingAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
  customerNotes?: string;
  paymentMethod?: string; // cod | prepaid | upi
  paymentStatus?: string; // pending | paid | cod_pending | failed
  shippingCharge?: number;
  discount?: number;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice?: number;
  }>;
}

export async function createOrder(input: CreateOrderInput, user: UserContext, ip?: string, userAgent?: string) {
  if (!input.items || input.items.length === 0) {
    throw new Error('Order must contain at least one product item.');
  }

  const phoneNorm = normalizePhoneNumber(input.phoneNumber);
  const secondaryPhoneNorm = input.secondaryPhone ? normalizePhoneNumber(input.secondaryPhone) : null;

  return await prisma.$transaction(async (tx) => {
    // 1. Resolve or Create ProductCustomer
    let customerId = input.customerId;

    if (!customerId) {
      // Find existing customer by normalized phone
      const existingCustomer = await tx.productCustomer.findFirst({
        where: {
          OR: [
            { phoneNorm },
            ...(secondaryPhoneNorm ? [{ secondaryPhoneNorm }] : []),
          ],
        },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update contact details if new ones provided
        await tx.productCustomer.update({
          where: { id: existingCustomer.id },
          data: {
            name: input.recipientName || existingCustomer.name,
            address: input.shippingAddress || existingCustomer.address,
            city: input.city || existingCustomer.city,
            state: input.state || existingCustomer.state,
            pincode: input.pincode || existingCustomer.pincode,
          },
        });
      } else {
        const newCustomer = await tx.productCustomer.create({
          data: {
            name: input.recipientName,
            phone: input.phoneNumber,
            phoneNorm,
            secondaryPhone: input.secondaryPhone,
            secondaryPhoneNorm,
            address: input.shippingAddress,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            segment: 'buyer',
          },
        });
        customerId = newCustomer.id;
      }
    }

    // 2. Fetch and Validate Products
    const productIds = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItemsData = input.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} was not found.`);
      }
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.price);
      const quantity = Math.max(1, item.quantity);
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;

      return {
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
        refillDays: product.refillDays,
      };
    });

    const shippingCharge = input.shippingCharge ? Number(input.shippingCharge) : 0;
    const discount = input.discount ? Number(input.discount) : 0;
    const totalAmount = Math.max(0, subtotal + shippingCharge - discount);

    // 3. Generate sequential order number
    const orderNumber = await generateOrderNumber(tx);

    // 4. Create Order
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: customerId!,
        leadId: input.leadId,
        status: OrderStatuses.ORDER_RECEIVED,
        paymentMethod: input.paymentMethod || 'cod',
        paymentStatus: input.paymentStatus || 'pending',
        subtotal,
        shippingCharge,
        discount,
        totalAmount,
        recipientName: input.recipientName,
        phoneNumber: input.phoneNumber,
        secondaryPhone: input.secondaryPhone,
        shippingAddress: input.shippingAddress,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        customerNotes: input.customerNotes,
        createdById: user.id,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
    });

    // 5. If linked to lead, update lead status & attach customer
    if (input.leadId) {
      await tx.lead.update({
        where: { id: input.leadId },
        data: {
          customerId,
          saleConfirmedAt: new Date(),
          saleAmount: totalAmount,
          orderReference: orderNumber,
          status: 'converted',
        },
      });

      // Log interaction
      const itemNames = order.items.map((i) => `${i.product.name} (x${i.quantity})`).join(', ');
      await tx.interaction.create({
        data: {
          leadId: input.leadId,
          userId: user.id,
          type: 'call',
          direction: 'outbound',
          note: `Order Approved: ${orderNumber}. Total: ₹${totalAmount.toFixed(2)}. Items: ${itemNames}`,
          occurredAt: new Date(),
        },
      });
    }

    // 6. Record Audit Log
    await recordAuditLog({
      userId: user.id,
      entity: 'order',
      entityId: order.id,
      action: 'ORDER_CREATED',
      after: {
        orderNumber,
        customerId,
        totalAmount,
        itemCount: order.items.length,
      },
      ip,
      userAgent,
    });

    logger.info({ orderNumber, totalAmount, userId: user.id }, 'Product order created successfully');
    return order;
  });
}

/**
 * Mark order as Packed (ready for courier handover)
 */
export async function packOrder(orderId: number, user: UserContext, ip?: string, userAgent?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('Order not found.');
  if (order.status === OrderStatuses.CANCELLED) {
    throw new Error('Cannot pack a cancelled order.');
  }

  const now = new Date();
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatuses.PACKED,
      packedAt: now,
      packedById: user.id,
    },
    include: {
      items: { include: { product: true } },
      customer: true,
      courierPartner: true,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entity: 'order',
    entityId: orderId,
    action: 'ORDER_PACKED',
    after: { status: OrderStatuses.PACKED, packedAt: now },
    ip,
    userAgent,
  });

  return updated;
}

export interface DispatchOrderInput {
  courierPartnerId?: number;
  courierName?: string;
  trackingNumber: string;
}

/**
 * Mark order as Dispatched with Courier and AWB Tracking Number
 */
export async function dispatchOrder(
  orderId: number,
  input: DispatchOrderInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('Order not found.');
  if (order.status === OrderStatuses.CANCELLED) {
    throw new Error('Cannot dispatch a cancelled order.');
  }
  if (!input.trackingNumber) {
    throw new Error('AWB / Tracking Number is required for dispatch.');
  }

  let courierName = input.courierName;
  let trackingUrl: string | null = null;

  if (input.courierPartnerId) {
    const courier = await prisma.courierPartner.findUnique({
      where: { id: input.courierPartnerId },
    });
    if (courier) {
      courierName = courier.name;
      if (courier.trackingUrlTemplate) {
        trackingUrl = courier.trackingUrlTemplate.replace('{TRACKING_NUMBER}', input.trackingNumber.trim());
      }
    }
  }

  const now = new Date();
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatuses.DISPATCHED,
      courierPartnerId: input.courierPartnerId,
      courierName: courierName || 'Standard Courier',
      trackingNumber: input.trackingNumber.trim(),
      trackingUrl,
      dispatchedAt: now,
      dispatchedById: user.id,
    },
    include: {
      items: { include: { product: true } },
      customer: true,
      courierPartner: true,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entity: 'order',
    entityId: orderId,
    action: 'ORDER_DISPATCHED',
    after: {
      status: OrderStatuses.DISPATCHED,
      courierName,
      trackingNumber: input.trackingNumber,
      dispatchedAt: now,
    },
    ip,
    userAgent,
  });

  return updated;
}

/**
 * Mark order as Delivered. Automatically calculates next purchase date
 * and schedules a replenishment follow-up reminder for the telecaller.
 */
export async function deliverOrder(orderId: number, user: UserContext, ip?: string, userAgent?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  if (!order) throw new Error('Order not found.');
  if (order.status === OrderStatuses.CANCELLED) {
    throw new Error('Cannot mark a cancelled order as delivered.');
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Calculate Replenishment Date
    // Find the longest refillDays among items (e.g. 30 days)
    let maxRefillDays = 0;
    const itemNames: string[] = [];

    for (const item of order.items) {
      itemNames.push(item.product.name);
      const refillDays = item.refillDays || item.product.refillDays;
      if (refillDays && refillDays > maxRefillDays) {
        maxRefillDays = refillDays;
      }
    }

    let nextRefillDate: Date | null = null;
    let refillTaskId: number | undefined = undefined;

    if (maxRefillDays > 0) {
      // Estimated finish date = deliveredAt + maxRefillDays
      nextRefillDate = new Date(now.getTime() + maxRefillDays * 24 * 60 * 60 * 1000);

      // Reminder triggers 5 days before supply finishes
      const reminderDays = Math.max(1, maxRefillDays - 5);
      const taskDueAt = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);

      const task = await tx.task.create({
        data: {
          title: `Refill Reminder: ${order.customer.name} (${itemNames.join(', ')})`,
          type: 'refill_reminder',
          dueAt: taskDueAt,
          leadId: order.leadId,
          ownerId: order.createdById || user.id,
          status: 'open',
          priority: 'warm',
        },
      });
      refillTaskId = task.id;
    }

    // 2. Update Order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatuses.DELIVERED,
        deliveredAt: now,
        deliveredById: user.id,
        paymentStatus: order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus,
        nextRefillDate,
        refillTaskId,
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        courierPartner: true,
      },
    });

    // 3. Update Customer Stats
    await tx.productCustomer.update({
      where: { id: order.customerId },
      data: {
        ordersCount: { increment: 1 },
        totalSpend: { increment: order.totalAmount },
        lastOrderAt: now,
        nextRefillDueAt: nextRefillDate,
        segment: 'buyer',
      },
    });

    // 4. Record Audit Log
    await recordAuditLog({
      userId: user.id,
      entity: 'order',
      entityId: orderId,
      action: 'ORDER_DELIVERED',
      after: {
        status: OrderStatuses.DELIVERED,
        deliveredAt: now,
        nextRefillDate,
        refillTaskId,
      },
      ip,
      userAgent,
    });

    logger.info({ orderId, orderNumber: order.orderNumber, nextRefillDate }, 'Order delivered and refill reminder scheduled');
    return updatedOrder;
  });
}

export interface OutOfStockInput {
  note?: string;
  customerInformed: boolean;
  backInStockDueAt?: string | Date;
}

/**
 * Mark order as Out of Stock, flag customer contact, and set back-in-stock reminder
 */
export async function markOutOfStock(
  orderId: number,
  input: OutOfStockInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new Error('Order not found.');
  const now = new Date();
  const backInStockDate = input.backInStockDueAt
    ? new Date(input.backInStockDueAt)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return await prisma.$transaction(async (tx) => {
    // 1. Create callback task for when stock arrives
    const task = await tx.task.create({
      data: {
        title: `Back in Stock Follow-up: ${order.customer.name} (Order ${order.orderNumber})`,
        type: 'callback',
        dueAt: backInStockDate,
        leadId: order.leadId,
        ownerId: order.createdById || user.id,
        status: 'open',
        priority: 'urgent',
      },
    });

    // 2. Update Order
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatuses.OUT_OF_STOCK,
        outOfStockAt: now,
        outOfStockNote: input.note || 'Items temporarily out of stock',
        customerInformed: input.customerInformed,
        backInStockDueAt: backInStockDate,
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        courierPartner: true,
      },
    });

    // 3. Record Audit Log
    await recordAuditLog({
      userId: user.id,
      entity: 'order',
      entityId: orderId,
      action: 'ORDER_OUT_OF_STOCK',
      after: {
        status: OrderStatuses.OUT_OF_STOCK,
        note: input.note,
        customerInformed: input.customerInformed,
        backInStockDate,
        followupTaskId: task.id,
      },
      ip,
      userAgent,
    });

    return updated;
  });
}

/**
 * Cancel an order with reason
 */
export async function cancelOrder(
  orderId: number,
  reason: string,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error('Order not found.');
  if (order.status === OrderStatuses.DELIVERED) {
    throw new Error('Delivered orders cannot be cancelled.');
  }

  const now = new Date();
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatuses.CANCELLED,
      cancelledAt: now,
      cancelReason: reason || 'Customer requested cancellation',
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });

  await recordAuditLog({
    userId: user.id,
    entity: 'order',
    entityId: orderId,
    action: 'ORDER_CANCELLED',
    after: { status: OrderStatuses.CANCELLED, cancelReason: reason },
    ip,
    userAgent,
  });

  return updated;
}

export interface ListOrdersQuery {
  status?: string;
  search?: string;
  courierPartnerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Lists orders with status tab filtering, search, and pagination
 */
export async function listOrders(user: UserContext, query: ListOrdersQuery) {
  const scopeCondition = scopeWhere(user, 'order', Permissions.ORDER_VIEW);

  const where: any = { ...scopeCondition };

  if (query.status && query.status !== 'all') {
    where.status = query.status;
  }

  if (query.courierPartnerId) {
    where.courierPartnerId = Number(query.courierPartnerId);
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
    if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { orderNumber: { contains: s } },
      { recipientName: { contains: s } },
      { phoneNumber: { contains: s } },
      { trackingNumber: { contains: s } },
      { customer: { name: { contains: s } } },
      { customer: { phone: { contains: s } } },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [orders, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, refillDays: true, imageUrl: true },
            },
          },
        },
        customer: true,
        courierPartner: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
    // Summary status counts for tabs
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: scopeCondition,
    }),
  ]);

  const statusCounts: Record<string, number> = {
    all: 0,
    order_received: 0,
    packed: 0,
    dispatched: 0,
    delivered: 0,
    out_of_stock: 0,
    cancelled: 0,
  };

  for (const c of counts) {
    statusCounts[c.status] = c._count;
    statusCounts.all += c._count;
  }

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    statusCounts,
  };
}

/**
 * Get full details of a specific order
 */
export async function getOrderDetails(orderId: number, user: UserContext) {
  const scopeCondition = scopeWhere(user, 'order', Permissions.ORDER_VIEW);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...scopeCondition,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
      customer: true,
      courierPartner: true,
      lead: {
        select: {
          id: true,
          name: true,
          mobile: true,
          source: { select: { labelEn: true } },
          campaign: { select: { name: true } },
          owner: { select: { id: true, name: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      packedBy: { select: { id: true, name: true } },
      dispatchedBy: { select: { id: true, name: true } },
      deliveredBy: { select: { id: true, name: true } },
    },
  });

  if (!order) {
    throw new Error('Order not found or access denied.');
  }

  return order;
}

