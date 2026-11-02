import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';
import { ProductStatuses, StockStatuses } from '@hospital-crm/shared';

describe('Milestone P4: Product Leads, Campaigns, Sale Confirmation & Operations Acceptance Tests', () => {
  let app: FastifyInstance;
  let prodMgrToken: string;
  let prodCallerToken: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let categoryId: number;

  const createdLeadIds: number[] = [];
  const createdProductIds: number[] = [];
  const createdCampaignIds: number[] = [];
  const createdTaskIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Authenticate Product Manager
    const pmLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_mgr@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodMgrToken = JSON.parse(pmLogin.payload).accessToken;

    // 2. Authenticate Product Caller
    const pcLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_caller@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodCallerToken = JSON.parse(pcLogin.payload).accessToken;

    // Fetch setup references
    const branch = await prisma.branch.findFirstOrThrow({ where: { archivedAt: null } });
    branchId = branch.id;
    const dept = await prisma.department.findFirstOrThrow({ where: { active: true } });
    deptId = dept.id;
    const src = await prisma.source.findFirstOrThrow({ where: { active: true } });
    sourceId = src.id;

    let cat = await prisma.productCategory.findFirst({ where: { slug: 'wellness-p4' } });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: { name: 'Wellness P4', slug: 'wellness-p4', sort: 1, active: true },
      });
    }
    categoryId = cat.id;

    // Clean up test records from previous interrupted runs
    const testCampaignKeys = ['summer-wellness-2026', 'monsoon-immunity-2026'];
    const oldCampaigns = await prisma.productCampaign.findMany({ where: { campaignKey: { in: testCampaignKeys } }, select: { id: true } });
    if (oldCampaigns.length > 0) {
      const campIds = oldCampaigns.map((c) => c.id);
      await prisma.campaignProduct.deleteMany({ where: { campaignId: { in: campIds } } });
      await prisma.lead.updateMany({ where: { campaignId: { in: campIds } }, data: { campaignId: null } });
      await prisma.productCampaign.deleteMany({ where: { id: { in: campIds } } });
    }

    const testSkus = ['CAMP-PROD-01', 'LINE-PROD-01', 'LINE-PROD-02', 'DRAFT-GATE-01', 'DRAFT-PROD-01', 'LOCK-PRICE-01', 'OOS-WAIT-01', 'RX-MED-01'];
    const prods = await prisma.product.findMany({ where: { sku: { in: testSkus } }, select: { id: true } });
    const pIds = prods.map((p) => p.id);
    if (pIds.length > 0) {
      await prisma.leadProductInterest.deleteMany({ where: { productId: { in: pIds } } });
      await prisma.productWaitlist.deleteMany({ where: { productId: { in: pIds } } });
      await prisma.campaignProduct.deleteMany({ where: { productId: { in: pIds } } });
      await prisma.productStockHistory.deleteMany({ where: { productId: { in: pIds } } });
      await prisma.productPriceHistory.deleteMany({ where: { productId: { in: pIds } } });
      await prisma.product.deleteMany({ where: { id: { in: pIds } } });
    }

    const oldLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { mobile: { contains: '9847' } },
          { mobileNorm: { contains: '9847' } },
        ],
      },
      select: { id: true },
    });
    const oldLeadIds = oldLeads.map((l) => l.id);
    if (oldLeadIds.length > 0) {
      await prisma.task.deleteMany({ where: { leadId: { in: oldLeadIds } } });
      await prisma.interaction.deleteMany({ where: { leadId: { in: oldLeadIds } } });
      await prisma.leadProductInterest.deleteMany({ where: { leadId: { in: oldLeadIds } } });
      await prisma.productWaitlist.deleteMany({ where: { leadId: { in: oldLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: oldLeadIds } } });
    }
  });

  afterAll(async () => {
    const validTaskIds = createdTaskIds.filter((id) => typeof id === 'number');
    if (validTaskIds.length > 0) {
      await prisma.task.deleteMany({ where: { id: { in: validTaskIds } } });
    }
    const validLeadIds = createdLeadIds.filter((id) => typeof id === 'number');
    if (validLeadIds.length > 0) {
      await prisma.task.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.interaction.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.leadProductInterest.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.productWaitlist.deleteMany({ where: { leadId: { in: validLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: validLeadIds } } });
    }
    const validCampaignIds = createdCampaignIds.filter((id) => typeof id === 'number');
    if (validCampaignIds.length > 0) {
      await prisma.campaignProduct.deleteMany({ where: { campaignId: { in: validCampaignIds } } });
      await prisma.productCampaign.deleteMany({ where: { id: { in: validCampaignIds } } });
    }
    const validProductIds = createdProductIds.filter((id) => typeof id === 'number');
    if (validProductIds.length > 0) {
      await prisma.productStockHistory.deleteMany({ where: { productId: { in: validProductIds } } });
      await prisma.productPriceHistory.deleteMany({ where: { productId: { in: validProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: validProductIds } } });
    }
    await app.close();
  });

  it('campaign CRUD, linking products, and calculating metrics', async () => {
    // 1. Create product to link
    const prod = await prisma.product.create({
      data: {
        sku: 'CAMP-PROD-01',
        name: 'Immunity Booster Campaign Pack',
        price: 650,
        usageDescription: 'Product for campaign validation',
        categoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(prod.id);

    // 2. Create Campaign
    const campRes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-campaigns',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        name: 'Summer Wellness Campaign 2026',
        campaignKey: 'summer-wellness-2026',
        channel: 'meta_ads',
        budget: 50000,
        spent: 12000,
        status: 'active',
        productIds: [prod.id],
      },
    });
    expect(campRes.statusCode).toBe(201);
    const campaign = JSON.parse(campRes.payload);
    createdCampaignIds.push(campaign.id);
    expect(campaign.name).toBe('Summer Wellness Campaign 2026');
    expect(campaign.campaignKey).toBe('summer-wellness-2026');

    // 3. Query Campaign Detail with metrics
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/product-campaigns/${campaign.id}`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = JSON.parse(detailRes.payload);
    expect(detail.metrics).toBeDefined();
    expect(detail.campaignProducts.length).toBe(1);
    expect(detail.campaignProducts[0].productId).toBe(prod.id);
  });

  it('adding product lines to lead keeps locked unit_price_at_time and rejects drafts', async () => {
    // Create lead
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        leadType: 'product',
        name: 'Product Price Lock Customer',
        mobile: '9847112233',
        branchId,
        departmentId: deptId,
        sourceId,
        language: 'en',
      },
    });
    expect(leadRes.statusCode).toBe(201);
    const lead = JSON.parse(leadRes.payload);
    createdLeadIds.push(lead.id);

    // Create Draft Product
    const draftProd = await prisma.product.create({
      data: {
        sku: 'DRAFT-GATE-01',
        name: 'Unapproved Herbal Syrup',
        price: 300,
        usageDescription: 'Draft product description not approved',
        categoryId,
        status: ProductStatuses.DRAFT,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(draftProd.id);

    // 1. Attempt adding draft product to lead -> rejected with 400
    const addDraftRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/products`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        productId: draftProd.id,
      },
    });
    expect(addDraftRes.statusCode).toBe(400);

    // Create Approved Product
    const appProd = await prisma.product.create({
      data: {
        sku: 'LOCK-PRICE-01',
        name: 'Triphala Churna Premium',
        price: 250,
        usageDescription: 'Herbal digestive wellness powder',
        categoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(appProd.id);

    // 2. Add approved product to lead -> locked price = 250
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/products`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        productId: appProd.id,
        quantity: 2,
      },
    });
    expect(addRes.statusCode).toBe(201);
    const line = JSON.parse(addRes.payload);
    expect(Number(line.unitPriceAtTime)).toBe(250);

    // 3. Manager changes catalog price of product to 320
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${appProd.id}`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        price: 320,
        priceChangeReason: 'Annual revision',
      },
    });

    // 4. Query lead products: locked price remains 250, priceChanged is flagged true
    const leadProdsRes = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${lead.id}/products`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(leadProdsRes.statusCode).toBe(200);
    const prodsData = JSON.parse(leadProdsRes.payload);
    expect(prodsData.lines.length).toBe(1);
    expect(Number(prodsData.lines[0].unitPriceAtTime)).toBe(250);
    expect(prodsData.lines[0].priceChanged).toBe(true);
    expect(Number(prodsData.lines[0].currentPrice)).toBe(320);
  });

  it('selecting an out-of-stock product waitlists the lead and creates product_waitlist entry', async () => {
    // Create OOS product
    const oosProd = await prisma.product.create({
      data: {
        sku: 'OOS-WAIT-01',
        name: 'Rare Himalayan Shilajit Resin',
        price: 1200,
        usageDescription: 'Pure mineral pitch resin for vitality',
        categoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.OUT_OF_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(oosProd.id);

    // Create lead
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        leadType: 'product',
        name: 'OOS Waitlist Customer',
        mobile: '9847223344',
        branchId,
        departmentId: deptId,
        sourceId,
        language: 'en',
      },
    });
    const lead = JSON.parse(leadRes.payload);
    createdLeadIds.push(lead.id);

    // Add OOS product to lead
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/products`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        productId: oosProd.id,
      },
    });
    expect(addRes.statusCode).toBe(201);
    const line = JSON.parse(addRes.payload);
    expect(line.waitlisted).toBe(true);

    // Verify product_waitlist table entry
    const waitlistEntry = await prisma.productWaitlist.findUnique({
      where: {
        leadId_productId: {
          leadId: lead.id,
          productId: oosProd.id,
        },
      },
    });
    expect(waitlistEntry).not.toBeNull();
    expect(waitlistEntry?.notifiedAt).toBeNull();
  });

  it('refer to treatment desk creates linked treatment lead and retains product lead', async () => {
    // Create product lead
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        leadType: 'product',
        name: 'Chronic Backache Caller',
        mobile: '9847334455',
        branchId,
        departmentId: deptId,
        sourceId,
        language: 'ml',
      },
    });
    const pLead = JSON.parse(leadRes.payload);
    createdLeadIds.push(pLead.id);

    // Call Refer to Treatment Desk
    const referRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${pLead.id}/refer-to-treatment`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        concern: 'Patient has severe lumbar radiculopathy pain for 6 months; needs spine doctor consult.',
      },
    });
    expect(referRes.statusCode).toBe(201);
    const result = JSON.parse(referRes.payload);
    expect(result.success).toBe(true);
    expect(result.treatmentLead).toBeDefined();
    expect(result.treatmentLead.leadType).toBe('treatment');
    expect(result.treatmentLead.referredFromLeadId).toBe(pLead.id);
    expect(result.treatmentLead.name).toBe('Chronic Backache Caller');
    expect(result.treatmentLead.mobile).toContain('9847334455');
    createdLeadIds.push(result.treatmentLead.id);

    // Verify product lead status remains 'new' (unchanged)
    const checkProductLead = await prisma.lead.findUnique({ where: { id: pLead.id } });
    expect(checkProductLead?.status).toBe('new');
    expect(checkProductLead?.leadType).toBe('product');
  });

  it('sale confirmation enforces prescription verification gate, order reference, and schedules refill reminder task', async () => {
    // Create prescription-required product with refill_days = 30
    const rxProd = await prisma.product.create({
      data: {
        sku: 'RX-MED-01',
        name: 'Classical Suvarna Bhasma Formulation',
        price: 1800,
        usageDescription: 'Potent mineral formulation requiring physician prescription',
        categoryId,
        prescriptionRequired: true,
        refillDays: 30,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(rxProd.id);

    // Create product lead
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        leadType: 'product',
        name: 'Prescription Customer Alpha',
        mobile: '9847445566',
        branchId,
        departmentId: deptId,
        sourceId,
        language: 'en',
      },
    });
    const lead = JSON.parse(leadRes.payload);
    createdLeadIds.push(lead.id);

    // Add RX product as accepted line without prescription verified
    const addLineRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/products`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        productId: rxProd.id,
        quantity: 1,
        status: 'accepted',
        prescriptionVerified: false,
      },
    });
    expect(addLineRes.statusCode).toBe(201);
    const line = JSON.parse(addLineRes.payload);

    // 1. Confirm sale without prescription verified -> FAILS 400
    const failConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/confirm-sale`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        orderReference: 'INV-2026-001',
        saleAmount: 1800,
      },
    });
    expect(failConfirm.statusCode).toBe(400);
    const failBody = JSON.parse(failConfirm.payload);
    expect(failBody.error.code).toBe('PRESCRIPTION_VERIFICATION_REQUIRED');

    // 2. Confirm sale with prescription verified -> SUCCEEDS
    const successConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/confirm-sale`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
      payload: {
        orderReference: 'INV-2026-001',
        saleAmount: 1800,
        prescriptionVerifiedLines: [line.id],
      },
    });
    expect(successConfirm.statusCode).toBe(200);

    // Verify lead status is converted
    const confirmedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(confirmedLead?.status).toBe('converted');
    expect(confirmedLead?.orderReference).toBe('INV-2026-001');
    expect(Number(confirmedLead?.saleAmount)).toBe(1800);
    expect(confirmedLead?.saleConfirmedAt).not.toBeNull();

    // 3. Verify Refill Reminder Task is created at refillDays - 5 = 25 days
    const tasks = await prisma.task.findMany({
      where: { leadId: lead.id, type: 'refill_reminder' },
    });
    expect(tasks.length).toBe(1);
    tasks.forEach((t) => createdTaskIds.push(t.id));
    expect(tasks[0].title).toContain('Classical Suvarna Bhasma Formulation');
    expect(tasks[0].type).toBe('refill_reminder');

    // Due date should be ~25 days in future
    const nowMs = Date.now();
    const dueMs = new Date(tasks[0].dueAt).getTime();
    const diffDays = Math.round((dueMs - nowMs) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(25);
  });
});
