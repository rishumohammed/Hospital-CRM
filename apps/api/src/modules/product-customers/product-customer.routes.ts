import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Permissions } from '@hospital-crm/shared';
import { authenticate, requirePermission } from '../auth/auth.middleware';
import {
  listProductCustomers,
  getProductCustomerDetails,
  createCustomerReorder,
} from './product-customer.service';

const reorderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().default(1),
      unitPrice: z.number().nonnegative().optional(),
    })
  ).min(1, 'At least one item is required for re-order'),
  paymentMethod: z.enum(['cod', 'prepaid', 'upi']).default('cod'),
  customerNotes: z.string().optional(),
  shippingAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export const productCustomerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  // 1. List Customers with Segmented Tabs
  const listHandler = async (request: any, reply: any) => {
    const query = request.query as any;
    const result = await listProductCustomers(request.user!, query);
    return reply.send(result);
  };
  fastify.get(
    '/product-customers',
    {
      preHandler: [requirePermission([Permissions.CUSTOMER_VIEW, Permissions.PRODUCT_LEAD_VIEW])],
      schema: {
        description: 'List product customers with segmented tabs: buyers, inquiries, and refill due',
        tags: ['Product Customers'],
      },
    },
    listHandler
  );
  fastify.get('/admin/product-customers', { preHandler: [requirePermission([Permissions.CUSTOMER_VIEW, Permissions.PRODUCT_LEAD_VIEW])] }, listHandler);

  // 2. Get Customer Dossier Details
  const getDetailsHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const customer = await getProductCustomerDetails(parseInt(id, 10), request.user!);
    return reply.send(customer);
  };
  fastify.get(
    '/product-customers/:id',
    {
      preHandler: [requirePermission([Permissions.CUSTOMER_VIEW, Permissions.PRODUCT_LEAD_VIEW])],
      schema: {
        description: 'Get full Customer Dossier with order history, inquiry timeline, and refill schedule',
        tags: ['Product Customers'],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    getDetailsHandler
  );
  fastify.get('/admin/product-customers/:id', { preHandler: [requirePermission([Permissions.CUSTOMER_VIEW, Permissions.PRODUCT_LEAD_VIEW])] }, getDetailsHandler);

  // 3. 1-Click Re-order for Returning Customer
  const reorderHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const body = reorderSchema.parse(request.body);
    const order = await createCustomerReorder(
      parseInt(id, 10),
      body,
      request.user!,
      request.ip,
      request.headers['user-agent'] as string
    );
    return reply.status(201).send({
      success: true,
      message: `Re-order ${order.orderNumber} placed successfully.`,
      order,
    });
  };
  fastify.post(
    '/product-customers/:id/reorder',
    {
      preHandler: [requirePermission([Permissions.ORDER_CREATE, Permissions.PRODUCT_LEAD_EDIT])],
      schema: {
        description: '1-Click re-order generation for returning customer',
        tags: ['Product Customers'],
      },
    },
    reorderHandler
  );
  fastify.post('/admin/product-customers/:id/reorder', { preHandler: [requirePermission([Permissions.ORDER_CREATE, Permissions.PRODUCT_LEAD_EDIT])] }, reorderHandler);
};

