import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions } from '@hospital-crm/shared';
import { createOrder, CreateOrderInput } from '../orders/order.service';

export interface ListCustomersQuery {
  tab?: 'all' | 'buyers' | 'inquiries' | 'refill_due';
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
}

/**
 * List product customers with segmented tabs: Buyers vs Inquiries vs Refill Due
 */
export async function listProductCustomers(user: UserContext, query: ListCustomersQuery) {
  const scopeCondition = scopeWhere(user, 'product_customer', Permissions.CUSTOMER_VIEW);

  const where: any = { ...scopeCondition };

  const tab = query.tab || 'all';
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (tab === 'buyers') {
    where.ordersCount = { gt: 0 };
  } else if (tab === 'inquiries') {
    where.ordersCount = 0;
  } else if (tab === 'refill_due') {
    where.nextRefillDueAt = {
      not: null,
      lte: nextWeek,
    };
  }

  if (query.city) {
    where.city = { contains: query.city.trim() };
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s } },
      { phone: { contains: s } },
      { phoneNorm: { contains: s } },
      { secondaryPhone: { contains: s } },
      { city: { contains: s } },
      { pincode: { contains: s } },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [customers, total, stats] = await Promise.all([
    prisma.productCustomer.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        tab === 'refill_due' ? { nextRefillDueAt: 'asc' } : { lastOrderAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        orders: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            deliveredAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            leads: true,
          },
        },
      },
    }),
    prisma.productCustomer.count({ where }),
    // Quick summary metrics
    Promise.all([
      prisma.productCustomer.count({ where: { ...scopeCondition, ordersCount: { gt: 0 } } }),
      prisma.productCustomer.count({ where: { ...scopeCondition, ordersCount: 0 } }),
      prisma.productCustomer.count({
        where: {
          ...scopeCondition,
          nextRefillDueAt: { not: null, lte: nextWeek },
        },
      }),
      prisma.productCustomer.aggregate({
        where: scopeCondition,
        _sum: { totalSpend: true },
      }),
    ]),
  ]);

  const [totalBuyers, totalInquiries, totalRefillDue, spendAggregate] = stats;

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    metrics: {
      totalBuyers,
      totalInquiries,
      totalRefillDue,
      totalRevenue: Number(spendAggregate._sum.totalSpend || 0),
    },
  };
}

/**
 * Retrieve comprehensive Customer Dossier with complete order and inquiry history
 */
export async function getProductCustomerDetails(customerId: number, user: UserContext) {
  const scopeCondition = scopeWhere(user, 'product_customer', Permissions.CUSTOMER_VIEW);

  const customer = (await prisma.productCustomer.findFirst({
    where: {
      id: customerId,
      ...scopeCondition,
    },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                  packSize: true,
                  refillDays: true,
                },
              },
            },
          },
          courierPartner: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        include: {
          source: { select: { labelEn: true } },
          campaign: { select: { name: true } },
          owner: { select: { id: true, name: true } },
          productInterests: {
            include: { product: true },
          },
          interactions: {
            take: 10,
            orderBy: { occurredAt: 'desc' },
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })) as any;

  if (!customer) {
    throw new Error('Customer not found or access denied.');
  }

  // Aggregate active products currently being consumed
  const activeProducts: Array<{
    productName: string;
    packSize?: string | null;
    deliveredAt?: Date | null;
    refillDays?: number | null;
    estimatedFinishDate?: Date | null;
    daysRemaining: number;
  }> = [];

  const now = new Date();

  for (const order of customer.orders) {
    if (order.status === 'delivered' && order.deliveredAt) {
      for (const item of order.items) {
        const refillDays = item.refillDays || item.product.refillDays;
        if (refillDays && refillDays > 0) {
          const finishDate = new Date(order.deliveredAt.getTime() + refillDays * 24 * 60 * 60 * 1000);
          const daysRemaining = Math.ceil((finishDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          activeProducts.push({
            productName: item.product.name,
            packSize: item.product.packSize,
            deliveredAt: order.deliveredAt,
            refillDays,
            estimatedFinishDate: finishDate,
            daysRemaining,
          });
        }
      }
    }
  }

  return {
    customer,
    activeProducts,
  };
}

/**
 * 1-Click re-order generation for returning customer during refill follow-up
 */
export async function createCustomerReorder(
  customerId: number,
  input: {
    items: Array<{ productId: number; quantity: number; unitPrice?: number }>;
    paymentMethod?: string;
    customerNotes?: string;
    shippingAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
  },
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const customer = await prisma.productCustomer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error('Customer not found.');

  const orderPayload: CreateOrderInput = {
    customerId: customer.id,
    recipientName: customer.name,
    phoneNumber: customer.phone,
    secondaryPhone: customer.secondaryPhone || undefined,
    shippingAddress: input.shippingAddress || customer.address || 'Address pending',
    city: input.city || customer.city || undefined,
    state: input.state || customer.state || undefined,
    pincode: input.pincode || customer.pincode || undefined,
    paymentMethod: input.paymentMethod || 'cod',
    customerNotes: input.customerNotes,
    items: input.items,
  };

  return await createOrder(orderPayload, user, ip, userAgent);
}

