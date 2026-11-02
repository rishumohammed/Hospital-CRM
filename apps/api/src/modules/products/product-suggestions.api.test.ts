import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';
import { ProductStatuses, StockStatuses } from '@hospital-crm/shared';

describe('Milestone P3: Product Relations & Suggestion Engine Acceptance Tests', () => {
  let app: FastifyInstance;
  let prodMgrToken: string;
  let prodCallerToken: string;
  let testLeadId: number;
  let testCategoryId: number;
  const createdProductIds: number[] = [];
  const createdRelationIds: number[] = [];
  const createdLeadIds: number[] = [];

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

    // 2. Authenticate Product Sales Executive
    const pcLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_caller@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodCallerToken = JSON.parse(pcLogin.payload).accessToken;

    // Ensure a test category exists
    let cat = await prisma.productCategory.findFirst({ where: { slug: 'wellness-p3-test' } });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: {
          name: 'Wellness P3 Test',
          slug: 'wellness-p3-test',
          sort: 1,
          active: true,
        },
      });
    }
    testCategoryId = cat.id;

    const dept = await prisma.department.findFirstOrThrow({ where: { active: true } });
    const branch = await prisma.branch.findFirstOrThrow({ where: { archivedAt: null } });
    const src = await prisma.source.findFirstOrThrow({ where: { active: true } });

    // Create a product lead to test lead exclusions
    const lead = await prisma.lead.create({
      data: {
        leadType: 'product',
        name: 'P3 Suggestion Test Lead',
        mobile: '9847990001',
        mobileNorm: '9847990001',
        status: 'new',
        priority: 'medium',
        language: 'en',
        departmentId: dept.id,
        branchId: branch.id,
        sourceId: src.id,
      },
    });
    testLeadId = lead.id;
    createdLeadIds.push(lead.id);
  });

  afterAll(async () => {
    if (createdLeadIds.length > 0) {
      await prisma.leadProductInterest.deleteMany({ where: { leadId: { in: createdLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: createdLeadIds } } });
    }
    if (createdRelationIds.length > 0) {
      await prisma.productRelation.deleteMany({ where: { id: { in: createdRelationIds } } });
    }
    if (createdProductIds.length > 0) {
      await prisma.productRelation.deleteMany({
        where: {
          OR: [
            { productId: { in: createdProductIds } },
            { relatedProductId: { in: createdProductIds } },
          ],
        },
      });
      await prisma.leadProductInterest.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.productStockHistory.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.productPriceHistory.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    await app.close();
  });

  it('product cannot relate to itself and duplicate relation is rejected', async () => {
    // Create base product
    const p1 = await prisma.product.create({
      data: {
        sku: 'REL-SELF-01',
        name: 'Self Relation Test Product',
        price: 200,
        usageDescription: 'Used for self relation validation testing',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(p1.id);

    // 1. Attempt self relation -> 400
    const selfRes = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${p1.id}/relations`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        relatedProductId: p1.id,
        relationType: 'cross_sell',
        talkingPoint: 'Great companion product with herbal benefits',
      },
    });
    expect(selfRes.statusCode).toBe(400);
    const selfBody = JSON.parse(selfRes.payload);
    expect(selfBody.error.code).toBe('SELF_RELATION_FORBIDDEN');

    // Create target product
    const p2 = await prisma.product.create({
      data: {
        sku: 'REL-TARGET-01',
        name: 'Target Companion Product',
        price: 350,
        usageDescription: 'Companion herbal supplement for synergy',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(p2.id);

    // 2. Create valid relation with mirroring
    const relRes = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${p1.id}/relations`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        relatedProductId: p2.id,
        relationType: 'cross_sell',
        talkingPoint: 'Enhances overall vitality when used together',
        mirror: true,
      },
    });
    expect(relRes.statusCode).toBe(201);
    const rel = JSON.parse(relRes.payload);
    createdRelationIds.push(rel.id);

    // 3. Verify mirror relation exists in reverse
    const mirrorInDb = await prisma.productRelation.findUnique({
      where: {
        productId_relatedProductId_relationType: {
          productId: p2.id,
          relatedProductId: p1.id,
          relationType: 'cross_sell',
        },
      },
    });
    expect(mirrorInDb).not.toBeNull();
    if (mirrorInDb) createdRelationIds.push(mirrorInDb.id);

    // 4. Duplicate relation attempt -> 409
    const dupRes = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${p1.id}/relations`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        relatedProductId: p2.id,
        relationType: 'cross_sell',
        talkingPoint: 'Duplicate relation attempt',
      },
    });
    expect(dupRes.statusCode).toBe(409);
    const dupBody = JSON.parse(dupRes.payload);
    expect(dupBody.error.code).toBe('DUPLICATE_RELATION');
  });

  it('returns up to 6 suggestions in exact specified order, excluding drafts, archived, and already-added products', async () => {
    // Create Main Product (In Stock)
    const mainProd = await prisma.product.create({
      data: {
        sku: 'SUGG-MAIN-01',
        name: 'Main Ayurvedic Tonic',
        price: 500,
        usageDescription: 'Primary formulation for overall wellness and stamina',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(mainProd.id);

    // 1. Curated In-Stock Cross-Sell (Sort 1)
    const pCrossSell1 = await prisma.product.create({
      data: {
        sku: 'SUGG-CS-01',
        name: 'In-Stock Cross Sell 1',
        price: 250,
        usageDescription: 'First curated cross sell item description',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pCrossSell1.id);
    const rel1 = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pCrossSell1.id,
        relationType: 'cross_sell',
        talkingPoint: 'Take together for optimal absorption',
        sort: 1,
      },
    });
    createdRelationIds.push(rel1.id);

    // 2. Curated In-Stock Upsell (Sort 2)
    const pUpsell = await prisma.product.create({
      data: {
        sku: 'SUGG-UP-01',
        name: 'Premium In-Stock Upsell',
        price: 900,
        usageDescription: 'High potency extract for intensive rejuvenation',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pUpsell.id);
    const rel2 = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pUpsell.id,
        relationType: 'upsell',
        talkingPoint: 'Higher potency formulation for quicker results',
        sort: 2,
      },
    });
    createdRelationIds.push(rel2.id);

    // 3. Draft Product (Must be EXCLUDED even if curated)
    const pDraft = await prisma.product.create({
      data: {
        sku: 'SUGG-DRAFT-01',
        name: 'Unapproved Draft Relation',
        price: 300,
        usageDescription: 'Draft item that is not yet approved by manager',
        categoryId: testCategoryId,
        status: ProductStatuses.DRAFT,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pDraft.id);
    const relDraft = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pDraft.id,
        relationType: 'cross_sell',
        talkingPoint: 'Draft product point',
        sort: 0, // Lower sort, but draft so must be excluded
      },
    });
    createdRelationIds.push(relDraft.id);

    // 4. Archived Product (Must be EXCLUDED even if curated)
    const pArchived = await prisma.product.create({
      data: {
        sku: 'SUGG-ARCH-01',
        name: 'Archived Old Product',
        price: 320,
        usageDescription: 'Old discontinued product that was archived',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        archivedAt: new Date(),
        createdById: 14,
      },
    });
    createdProductIds.push(pArchived.id);
    const relArch = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pArchived.id,
        relationType: 'frequently_together',
        talkingPoint: 'Old archived item',
        sort: 0,
      },
    });
    createdRelationIds.push(relArch.id);

    // 5. Product already on the lead (Must be EXCLUDED when lead_id is provided)
    const pAlreadyOnLead = await prisma.product.create({
      data: {
        sku: 'SUGG-ONLEAD-01',
        name: 'Already on Lead Product',
        price: 400,
        usageDescription: 'Item already added to the caller interest list',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pAlreadyOnLead.id);
    const relOnLead = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pAlreadyOnLead.id,
        relationType: 'cross_sell',
        talkingPoint: 'Already on lead item',
        sort: 3,
      },
    });
    createdRelationIds.push(relOnLead.id);

    // Add this product to testLeadId
    await prisma.leadProductInterest.create({
      data: {
        leadId: testLeadId,
        productId: pAlreadyOnLead.id,
        quantity: 1,
        unitPriceAtTime: 400,
        status: 'interested',
        addedById: 14,
      },
    });

    // 6. Curated Out-of-Stock Product (Must be returned last with label "Out of stock")
    const pOos = await prisma.product.create({
      data: {
        sku: 'SUGG-OOS-01',
        name: 'Curated Out Of Stock Herb',
        price: 180,
        usageDescription: 'Temporarily out of stock traditional herbal formulation',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.OUT_OF_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pOos.id);
    const relOos = await prisma.productRelation.create({
      data: {
        productId: mainProd.id,
        relatedProductId: pOos.id,
        relationType: 'cross_sell',
        talkingPoint: 'Popular complementary choice currently restocking',
        sort: 4,
      },
    });
    createdRelationIds.push(relOos.id);

    // 7. Request suggestions WITH leadId
    const resWithLead = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${mainProd.id}/suggestions?lead_id=${testLeadId}`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(resWithLead.statusCode).toBe(200);
    const suggestions = JSON.parse(resWithLead.payload);

    // Check maximum 6 items returned
    expect(suggestions.length).toBeLessThanOrEqual(6);

    const suggestionIds = suggestions.map((s: any) => s.id);

    // MUST exclude draft
    expect(suggestionIds).not.toContain(pDraft.id);
    // MUST exclude archived
    expect(suggestionIds).not.toContain(pArchived.id);
    // MUST exclude already on lead
    expect(suggestionIds).not.toContain(pAlreadyOnLead.id);
    // MUST exclude self
    expect(suggestionIds).not.toContain(mainProd.id);

    // In-stock curated must appear before out of stock
    const oosIndex = suggestions.findIndex((s: any) => s.id === pOos.id);
    const cs1Index = suggestions.findIndex((s: any) => s.id === pCrossSell1.id);
    const upIndex = suggestions.findIndex((s: any) => s.id === pUpsell.id);

    expect(cs1Index).toBeGreaterThanOrEqual(0);
    expect(upIndex).toBeGreaterThanOrEqual(0);
    expect(cs1Index).toBeLessThan(upIndex); // Sorted by sort asc
    if (oosIndex >= 0) {
      expect(oosIndex).toBeGreaterThan(cs1Index);
      expect(oosIndex).toBeGreaterThan(upIndex);
      expect(suggestions[oosIndex].label).toBe('Out of stock');
    }

    // Includes talking points
    expect(suggestions[cs1Index].talkingPoint).toBe('Take together for optimal absorption');
    expect(suggestions[cs1Index].reason).toBe('curated');
  });

  it('out-of-stock selected product shows in-stock substitute relations FIRST labeled "Alternative"', async () => {
    // Create OOS Main Product
    const oosMain = await prisma.product.create({
      data: {
        sku: 'SUGG-OOSMAIN-01',
        name: 'Out of Stock Tonic Drink',
        price: 450,
        usageDescription: 'High demand tonic currently out of stock',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.OUT_OF_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(oosMain.id);

    // Create In-Stock Substitute (Alternative)
    const pSubstitute = await prisma.product.create({
      data: {
        sku: 'SUGG-SUB-01',
        name: 'Direct In-Stock Substitute Capsule',
        price: 470,
        usageDescription: 'Same active herbal principles in convenient capsule format',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pSubstitute.id);
    const relSub = await prisma.productRelation.create({
      data: {
        productId: oosMain.id,
        relatedProductId: pSubstitute.id,
        relationType: 'substitute',
        talkingPoint: 'Identical benefits and ingredients in capsule form available now',
        sort: 10, // Higher sort number, but as substitute for OOS it must rank FIRST
      },
    });
    createdRelationIds.push(relSub.id);

    // Create Regular Cross-Sell (Sort 1)
    const pCrossSell = await prisma.product.create({
      data: {
        sku: 'SUGG-CS-OOS-01',
        name: 'Regular In-Stock Complement',
        price: 200,
        usageDescription: 'Complementary oil for application',
        categoryId: testCategoryId,
        status: ProductStatuses.APPROVED,
        stockStatus: StockStatuses.IN_STOCK,
        createdById: 14,
      },
    });
    createdProductIds.push(pCrossSell.id);
    const relCs = await prisma.productRelation.create({
      data: {
        productId: oosMain.id,
        relatedProductId: pCrossSell.id,
        relationType: 'cross_sell',
        talkingPoint: 'Recommended complementary oil',
        sort: 1,
      },
    });
    createdRelationIds.push(relCs.id);

    // Query suggestions for OOS product
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${oosMain.id}/suggestions`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const suggestions = JSON.parse(res.payload);

    // First item MUST be the in-stock substitute labeled "Alternative"
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions[0].id).toBe(pSubstitute.id);
    expect(suggestions[0].reason).toBe('alternative');
    expect(suggestions[0].label).toBe('Alternative');
    expect(suggestions[0].relationType).toBe('substitute');
    expect(suggestions[0].talkingPoint).toContain('Identical benefits');
  });
});
