import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { generateAccessToken } from '../auth/token';

describe('Product Fulfillment & Customer Orders Acceptance Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let testProductId: number;
  let testCourierId: number;
  let createdOrderIds: number[] = [];
  let createdCustomerIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate with an active owner or admin user from DB
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { code: { in: ['owner', 'admin'] } },
        status: 'active',
      },
      include: { role: true },
    });
    if (!adminUser) {
      throw new Error('No active owner or admin user found in database');
    }

    adminToken = generateAccessToken({
      userId: adminUser.id,
      email: adminUser.email,
      roleCode: adminUser.role.code,
      branchIds: [],
      teamCodes: [],
    });

    // Fetch an existing active product or create one
    let product = await prisma.product.findFirst({ where: { status: 'active', archivedAt: null } });
    if (!product) {
      const category = await prisma.productCategory.findFirst();
      product = await prisma.product.create({
        data: {
          sku: 'TEST-SKU-FULFILL',
          name: 'Wellness Herbal Tonic 500ml',
          price: 499.00,
          usageDescription: 'Herbal health booster',
          categoryId: category?.id || 1,
          packSize: '500ml',
          refillDays: 30,
          status: 'active',
          stockStatus: 'in_stock',
          createdById: adminUser.id,
        },
      });
    }
    testProductId = product.id;

    // Fetch or create a courier partner
    let courier = await prisma.courierPartner.findFirst({ where: { active: true } });
    if (!courier) {
      courier = await prisma.courierPartner.create({
        data: {
          code: 'DTDC',
          name: 'DTDC Express',
          trackingUrlTemplate: 'https://www.dtdc.in/tracking/shipment-tracking.asp?strRefNo={TRACKING_NUMBER}',
          active: true,
          sort: 1,
        },
      });
    }
    testCourierId = courier.id;
  });

  let testPhone = `9847${Math.floor(100000 + Math.random() * 900000)}`;

  afterAll(async () => {
    // Clean up created orders & customers
    try {
      if (createdCustomerIds.length > 0) {
        await prisma.lead.updateMany({
          where: { customerId: { in: createdCustomerIds } },
          data: { customerId: null },
        });
        await prisma.task.deleteMany({
          where: {
            OR: [
              { title: { contains: 'Deepak Varma' } },
              { title: { contains: 'Anita Nair' } },
            ],
          },
        });
        await prisma.orderItem.deleteMany({
          where: { order: { customerId: { in: createdCustomerIds } } },
        });
        await prisma.order.deleteMany({
          where: { customerId: { in: createdCustomerIds } },
        });
        await prisma.productCustomer.deleteMany({
          where: { id: { in: createdCustomerIds } },
        });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await app.close();
  });

  it('1. GET /api/v1/couriers - should list available courier partners', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/couriers',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.couriers).toBeDefined();
    expect(Array.isArray(body.couriers)).toBe(true);
    expect(body.couriers.length).toBeGreaterThan(0);
    expect(body.couriers[0].name).toBeDefined();
  });

  it('2. POST /api/v1/orders - should create a new order in order_received status', async () => {
    const payload = {
      recipientName: 'Deepak Varma',
      phoneNumber: testPhone,
      shippingAddress: 'Flat 4B, Greenfield Heights, Kakkanad',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682030',
      paymentMethod: 'cod',
      shippingCharge: 50,
      customerNotes: 'Please deliver after 2 PM',
      items: [
        {
          productId: testProductId,
          quantity: 2,
          unitPrice: 499.00,
          refillDays: 30,
        },
      ],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${adminToken}` },
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.order).toBeDefined();
    expect(body.order.orderNumber).toMatch(/^ORD-\d{6}-\d{4}$/);
    expect(body.order.status).toBe('order_received');
    expect(body.order.items.length).toBe(1);
    expect(Number(body.order.subtotal)).toBe(998);
    expect(Number(body.order.totalAmount)).toBe(1048); // 998 + 50 shipping
    expect(body.order.customerId).toBeDefined();

    createdOrderIds.push(body.order.id);
    if (body.order.customerId) {
      createdCustomerIds.push(body.order.customerId);
    }
  });

  it('3. Order Fulfillment Lifecycle: Pack -> Dispatch -> Deliver with Refill Scheduling', async () => {
    const orderId = createdOrderIds[0];

    // Step A: Pack Order
    const packRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/pack`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { packingNotes: 'Packed in corrugated box with bubble wrap' },
    });
    if (packRes.statusCode !== 200) {
      console.error('packRes failed:', packRes.statusCode, packRes.payload);
    }
    expect(packRes.statusCode).toBe(200);
    const packed = JSON.parse(packRes.payload).order;
    expect(packed.status).toBe('packed');
    expect(packed.packedAt).toBeDefined();

    // Step B: Dispatch Order with Courier & AWB
    const dispatchRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/dispatch`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        courierPartnerId: testCourierId,
        trackingNumber: 'DTDC99887766',
        dispatchNotes: 'Handed over to DTDC pickup agent',
      },
    });
    expect(dispatchRes.statusCode).toBe(200);
    const dispatched = JSON.parse(dispatchRes.payload).order;
    expect(dispatched.status).toBe('dispatched');
    expect(dispatched.trackingNumber).toBe('DTDC99887766');
    expect(dispatched.trackingUrl).toContain('DTDC99887766');

    // Step C: Deliver Order
    const deliverRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${orderId}/deliver`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { deliveryNotes: 'Customer received package in good condition' },
    });
    expect(deliverRes.statusCode).toBe(200);
    const delivered = JSON.parse(deliverRes.payload).order;
    expect(delivered.status).toBe('delivered');
    expect(delivered.deliveredAt).toBeDefined();
    expect(delivered.nextRefillDate).toBeDefined(); // Calculated 30 days ahead

    // Step D: Verify Refill task was scheduled in Task table
    const refillTask = await prisma.task.findFirst({
      where: {
        type: 'refill_reminder',
        title: { contains: 'Deepak Varma' },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(refillTask).toBeDefined();
    expect(refillTask?.title).toContain('Refill Reminder');

    // Step E: Verify ProductCustomer metrics updated
    const customer = await prisma.productCustomer.findUnique({
      where: { id: delivered.customerId },
    });
    expect(customer?.segment).toBe('buyer');
    expect(customer?.ordersCount).toBe(1);
    expect(Number(customer?.totalSpend)).toBe(1048);
  });

  it('4. Out of Stock Handling: Mark out-of-stock and create restock follow-up task', async () => {
    // Create another order for an item that is out of stock
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        recipientName: 'Anita Nair',
        phoneNumber: '9847054321',
        shippingAddress: 'Apartment 12A, Marine Drive',
        city: 'Kochi',
        state: 'Kerala',
        paymentMethod: 'prepaid',
        items: [{ productId: testProductId, quantity: 1, unitPrice: 499.00 }],
      },
    });
    const order = JSON.parse(createRes.payload).order;
    createdOrderIds.push(order.id);
    if (order.customerId) createdCustomerIds.push(order.customerId);

    // Mark Out of Stock
    const oosRes = await app.inject({
      method: 'POST',
      url: `/api/v1/orders/${order.id}/out-of-stock`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        note: 'Fresh batch expected next Tuesday from warehouse',
        customerInformed: true,
        backInStockDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    expect(oosRes.statusCode).toBe(200);
    const oosOrder = JSON.parse(oosRes.payload).order;
    expect(oosOrder.status).toBe('out_of_stock');
    expect(oosOrder.outOfStockNote).toContain('Fresh batch expected');
    expect(oosOrder.customerInformed).toBe(true);

    // Verify task scheduled to notify customer
    const oosTask = await prisma.task.findFirst({
      where: {
        type: 'callback',
        title: { contains: 'Anita Nair' },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(oosTask).toBeDefined();
    expect(oosTask?.title).toContain('Back in Stock');
  });

  it('5. GET /api/v1/product-customers - list customers with segment tabs and metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/product-customers?tab=buyers',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.customers).toBeDefined();
    expect(body.metrics).toBeDefined();
    expect(body.metrics.totalBuyers).toBeGreaterThanOrEqual(1);

    // Retrieve Customer Dossier
    const customerId = createdCustomerIds[0];
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/product-customers/${customerId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const dossier = JSON.parse(detailRes.payload);
    expect(dossier.customer).toBeDefined();
    expect(dossier.customer.orders.length).toBeGreaterThanOrEqual(1);
    expect(dossier.activeProducts).toBeDefined();
  });
});
