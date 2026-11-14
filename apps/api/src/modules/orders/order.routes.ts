import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Permissions } from '@hospital-crm/shared';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import { prisma } from '../../database/client';
import {
  listOrders,
  getOrderDetails,
  createOrder,
  packOrder,
  dispatchOrder,
  deliverOrder,
  markOutOfStock,
  cancelOrder,
} from './order.service';

const createOrderSchema = z.object({
  leadId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(),
  recipientName: z.string().min(1, 'Recipient name is required'),
  phoneNumber: z.string().min(8, 'Phone number is required'),
  secondaryPhone: z.string().optional(),
  shippingAddress: z.string().min(3, 'Shipping address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  customerNotes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'prepaid', 'upi']).default('cod'),
  paymentStatus: z.enum(['pending', 'paid', 'cod_pending', 'failed']).default('pending'),
  shippingCharge: z.number().nonnegative().optional().default(0),
  discount: z.number().nonnegative().optional().default(0),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().default(1),
      unitPrice: z.number().nonnegative().optional(),
    })
  ).min(1, 'At least one item is required'),
});

const dispatchOrderSchema = z.object({
  courierPartnerId: z.number().int().positive().optional(),
  courierName: z.string().optional(),
  trackingNumber: z.string().min(1, 'Tracking number (AWB) is required'),
});

const outOfStockSchema = z.object({
  note: z.string().optional(),
  customerInformed: z.boolean().default(false),
  backInStockDueAt: z.string().or(z.date()).optional(),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // 1. List Orders
  const listHandler = async (request: any, reply: any) => {
    const query = request.query as any;
    const result = await listOrders(request.user!, query);
    return reply.send(result);
  };
  fastify.get(
    '/orders',
    {
      preHandler: [requirePermission([Permissions.ORDER_VIEW, Permissions.PRODUCT_LEAD_VIEW])],
      schema: { description: 'List orders with pagination, search, and status counters', tags: ['Orders & Fulfillment'] },
    },
    listHandler
  );
  fastify.get('/admin/orders', { preHandler: [requirePermission([Permissions.ORDER_VIEW, Permissions.PRODUCT_LEAD_VIEW])] }, listHandler);

  // 2. Get Order Details
  const getDetailsHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const order = await getOrderDetails(parseInt(id, 10), request.user!);
    return reply.send(order);
  };
  fastify.get(
    '/orders/:id',
    {
      preHandler: [requirePermission([Permissions.ORDER_VIEW, Permissions.PRODUCT_LEAD_VIEW])],
      schema: {
        description: 'Get full details of an order including items and timeline',
        tags: ['Orders & Fulfillment'],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
    },
    getDetailsHandler
  );
  fastify.get('/admin/orders/:id', { preHandler: [requirePermission([Permissions.ORDER_VIEW, Permissions.PRODUCT_LEAD_VIEW])] }, getDetailsHandler);

  // 3. Create Order
  const createHandler = async (request: any, reply: any) => {
    const body = createOrderSchema.parse(request.body);
    const order = await createOrder(body, request.user!, request.ip, request.headers['user-agent'] as string);
    return reply.status(201).send({
      success: true,
      message: `Order ${order.orderNumber} created successfully.`,
      order,
    });
  };
  fastify.post(
    '/orders',
    {
      preHandler: [requirePermission([Permissions.ORDER_CREATE, Permissions.PRODUCT_LEAD_EDIT])],
      schema: { description: 'Create a new order (from lead or standalone for customer)', tags: ['Orders & Fulfillment'] },
    },
    createHandler
  );
  fastify.post('/admin/orders', { preHandler: [requirePermission([Permissions.ORDER_CREATE, Permissions.PRODUCT_LEAD_EDIT])] }, createHandler);

  // 4. Pack Order
  const packHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const order = await packOrder(parseInt(id, 10), request.user!, request.ip, request.headers['user-agent'] as string);
    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} marked as Packed.`,
      order,
    });
  };
  fastify.patch('/orders/:id/pack', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, packHandler);
  fastify.post('/orders/:id/pack', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, packHandler);
  fastify.patch('/admin/orders/:id/pack', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, packHandler);
  fastify.post('/admin/orders/:id/pack', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, packHandler);

  // 5. Dispatch Order
  const dispatchHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = dispatchOrderSchema.parse(request.body);
    const order = await dispatchOrder(
      parseInt(id, 10),
      body,
      request.user!,
      request.ip,
      request.headers['user-agent'] as string
    );
    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} dispatched via ${order.courierName} (AWB: ${order.trackingNumber}).`,
      order,
    });
  };
  fastify.patch('/orders/:id/dispatch', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, dispatchHandler);
  fastify.post('/orders/:id/dispatch', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, dispatchHandler);
  fastify.patch('/admin/orders/:id/dispatch', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, dispatchHandler);
  fastify.post('/admin/orders/:id/dispatch', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, dispatchHandler);

  // 6. Deliver Order (Triggers Refill Reminder Engine)
  const deliverHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const order = await deliverOrder(parseInt(id, 10), request.user!, request.ip, request.headers['user-agent'] as string);
    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} delivered. Refill follow-up scheduled.`,
      order,
    });
  };
  fastify.patch('/orders/:id/deliver', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, deliverHandler);
  fastify.post('/orders/:id/deliver', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, deliverHandler);
  fastify.patch('/admin/orders/:id/deliver', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, deliverHandler);
  fastify.post('/admin/orders/:id/deliver', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, deliverHandler);

  // 7. Mark Out of Stock
  const oosHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = outOfStockSchema.parse(request.body);
    const order = await markOutOfStock(
      parseInt(id, 10),
      body,
      request.user!,
      request.ip,
      request.headers['user-agent'] as string
    );
    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} marked Out of Stock. Follow-up reminder created.`,
      order,
    });
  };
  fastify.patch('/orders/:id/out-of-stock', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, oosHandler);
  fastify.post('/orders/:id/out-of-stock', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, oosHandler);
  fastify.patch('/admin/orders/:id/out-of-stock', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, oosHandler);
  fastify.post('/admin/orders/:id/out-of-stock', { preHandler: [requirePermission([Permissions.ORDER_FULFILL, Permissions.ORDER_EDIT])] }, oosHandler);

  // 8. Cancel Order
  const cancelHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = cancelOrderSchema.parse(request.body);
    const order = await cancelOrder(
      parseInt(id, 10),
      body.reason,
      request.user!,
      request.ip,
      request.headers['user-agent'] as string
    );
    return reply.send({
      success: true,
      message: `Order ${order.orderNumber} cancelled.`,
      order,
    });
  };
  fastify.patch('/orders/:id/cancel', { preHandler: [requirePermission([Permissions.ORDER_EDIT, Permissions.ORDER_FULFILL])] }, cancelHandler);
  fastify.post('/orders/:id/cancel', { preHandler: [requirePermission([Permissions.ORDER_EDIT, Permissions.ORDER_FULFILL])] }, cancelHandler);
  fastify.patch('/admin/orders/:id/cancel', { preHandler: [requirePermission([Permissions.ORDER_EDIT, Permissions.ORDER_FULFILL])] }, cancelHandler);
  fastify.post('/admin/orders/:id/cancel', { preHandler: [requirePermission([Permissions.ORDER_EDIT, Permissions.ORDER_FULFILL])] }, cancelHandler);

  // 9. Public / Active Courier Partners List
  fastify.get(
    '/couriers',
    {
      schema: {
        description: 'Get active courier delivery partners for dropdown selection',
        tags: ['Orders & Fulfillment'],
      },
    },
    async (_request, reply) => {
      const couriers = await prisma.courierPartner.findMany({
        where: { active: true },
        orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      });
      return reply.send({ success: true, couriers });
    }
  );

  // 10. Admin Courier Partners Management
  fastify.get(
    '/admin/couriers',
    {
      preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)],
      schema: {
        description: 'Get all courier partners including inactive for admin management',
        tags: ['Orders & Fulfillment'],
      },
    },
    async (_request, reply) => {
      const couriers = await prisma.courierPartner.findMany({
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      });
      return reply.send({ success: true, couriers });
    }
  );

  fastify.post(
    '/admin/couriers',
    {
      preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)],
      schema: {
        description: 'Create a new courier partner',
        tags: ['Orders & Fulfillment'],
      },
    },
    async (request, reply) => {
      const schema = z.object({
        code: z.string().min(1).max(50).transform((s) => s.trim().toUpperCase().replace(/\s+/g, '_')),
        name: z.string().min(1).max(100),
        trackingUrlTemplate: z.string().url().or(z.string().length(0)).optional().nullable(),
        active: z.boolean().default(true),
        sort: z.number().int().default(0),
      });

      const body = schema.parse(request.body);
      const courier = await prisma.courierPartner.create({
        data: {
          code: body.code,
          name: body.name,
          trackingUrlTemplate: body.trackingUrlTemplate || null,
          active: body.active,
          sort: body.sort,
        },
      });

      return reply.status(201).send({
        success: true,
        message: `Courier partner '${courier.name}' added successfully.`,
        courier,
      });
    }
  );

  fastify.patch(
    '/admin/couriers/:id',
    {
      preHandler: [requirePermission(Permissions.SETTINGS_MANAGE)],
      schema: {
        description: 'Update a courier partner',
        tags: ['Orders & Fulfillment'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        trackingUrlTemplate: z.string().url().or(z.string().length(0)).optional().nullable(),
        active: z.boolean().optional(),
        sort: z.number().int().optional(),
      });

      const body = schema.parse(request.body);
      const courier = await prisma.courierPartner.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.trackingUrlTemplate !== undefined && { trackingUrlTemplate: body.trackingUrlTemplate || null }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.sort !== undefined && { sort: body.sort }),
        },
      });

      return reply.send({
        success: true,
        message: `Courier partner '${courier.name}' updated.`,
        courier,
      });
    }
  );
};

