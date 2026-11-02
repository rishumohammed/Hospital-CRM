import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';

describe('Milestone P2: Products & Categories Catalog Acceptance Tests', () => {
  let app: FastifyInstance;
  let prodMgrToken: string;
  let prodCallerToken: string;
  let pharmacyToken: string;
  let telecallerToken: string;
  let uncategorizedId: number;
  let createdCategoryIds: number[] = [];
  let createdProductIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Authenticate Product Manager (catalog owner)
    const pmLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_mgr@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodMgrToken = JSON.parse(pmLogin.payload).accessToken;

    // 2. Authenticate Product Sales Executive (caller)
    const pcLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'prod_caller@hospital.test', password: 'HospitalCRM@2026' },
    });
    prodCallerToken = JSON.parse(pcLogin.payload).accessToken;

    // 3. Authenticate Pharmacy Store (stock only)
    const phLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'pharmacy@hospital.test', password: 'HospitalCRM@2026' },
    });
    pharmacyToken = JSON.parse(phLogin.payload).accessToken;

    // 4. Authenticate Treatment Telecaller (no product catalog manage)
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecallerToken = JSON.parse(tLogin.payload).accessToken;

    // Clean up any test categories from previous interrupted runs
    await prisma.productCategory.deleteMany({
      where: {
        slug: { in: ['custom-hair-care-category', 'target-hair-wellness-category'] },
      },
    });

    // Fetch Uncategorized
    const uncat = await prisma.productCategory.findUnique({ where: { slug: 'uncategorized' } });
    if (uncat) {
      uncategorizedId = uncat.id;
    } else {
      const created = await prisma.productCategory.create({
        data: { name: 'Uncategorized', slug: 'uncategorized', sort: 1, active: true },
      });
      uncategorizedId = created.id;
    }
  });

  afterAll(async () => {
    if (createdProductIds.length > 0) {
      await prisma.productStockHistory.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.productPriceHistory.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.leadProductInterest.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.productCategory.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
    await app.close();
  });

  it('rejects product creation without required fields (SKU, name, price, usage description, category) or price < 0', async () => {
    // Missing SKU
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        name: 'Ashwagandha Churna',
        price: 250,
        usageDescription: 'Used for general stress relief and vitality enhancement',
        categoryId: uncategorizedId,
      },
    });
    expect(res1.statusCode).toBe(400);

    // Negative price
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'ASH-001',
        name: 'Ashwagandha Churna',
        price: -50,
        usageDescription: 'Used for general stress relief and vitality enhancement',
        categoryId: uncategorizedId,
      },
    });
    expect(res2.statusCode).toBe(400);

    // Usage description too short (<10 chars)
    const res3 = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'ASH-001',
        name: 'Ashwagandha Churna',
        price: 250,
        usageDescription: 'Stress',
        categoryId: uncategorizedId,
      },
    });
    expect(res3.statusCode).toBe(400);
  });

  it('rejects duplicate SKU (case-insensitive and trimmed) with clear error naming existing product', async () => {
    const sku = 'TEST-SKU-001';
    const prodRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku,
        name: 'Ayurvedic Immunity Rasayana',
        price: 499,
        usageDescription: 'Traditional formulation for natural immunity and wellness',
        categoryId: uncategorizedId,
      },
    });
    expect(prodRes.statusCode).toBe(201);
    const prod = JSON.parse(prodRes.payload);
    createdProductIds.push(prod.id);

    // Duplicate in lower case with extra whitespace
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: '  test-sku-001  ',
        name: 'Duplicate Item Name',
        price: 300,
        usageDescription: 'Duplicate item description for testing uniqueness',
        categoryId: uncategorizedId,
      },
    });
    expect(dupRes.statusCode).toBe(409);
    const body = JSON.parse(dupRes.payload);
    expect(body.error.code).toBe('DUPLICATE_SKU');
    expect(body.error.message).toContain('Ayurvedic Immunity Rasayana');
  });

  it('product executive cannot see draft or archived products', async () => {
    // 1. Create a draft product
    const draftRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'DRAFT-ITEM-99',
        name: 'Under Review Formulation',
        price: 150,
        usageDescription: 'Product in draft review stage not yet approved',
        categoryId: uncategorizedId,
      },
    });
    expect(draftRes.statusCode).toBe(201);
    const draftProd = JSON.parse(draftRes.payload);
    expect(draftProd.status).toBe('draft');
    createdProductIds.push(draftProd.id);

    // Product executive listing products
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.payload);
    const containsDraft = listBody.products.some((p: any) => p.id === draftProd.id);
    expect(containsDraft).toBe(false);

    // Product executive direct get by ID should return 403
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${draftProd.id}`,
      headers: { authorization: `Bearer ${prodCallerToken}` },
    });
    expect(getRes.statusCode).toBe(403);
  });

  it('approval requires confirmation checkbox; editing clinical descriptions resets approved product back to draft', async () => {
    // 1. Create product
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'APPR-FLOW-01',
        name: 'Herbal Digestive Kashayam',
        price: 220,
        usageDescription: 'Herbal decoction supporting digestive comfort and appetite',
        categoryId: uncategorizedId,
      },
    });
    const prod = JSON.parse(createRes.payload);
    createdProductIds.push(prod.id);
    expect(prod.status).toBe('draft');

    // 2. Attempt approve without confirmation -> fails
    const failApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${prod.id}/approve`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: { confirmation: false },
    });
    expect(failApprove.statusCode).toBe(400);

    // 3. Approve with confirmation -> succeeds
    const successApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${prod.id}/approve`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: { confirmation: true },
    });
    expect(successApprove.statusCode).toBe(200);
    const approvedProd = JSON.parse(successApprove.payload);
    expect(approvedProd.status).toBe('approved');
    expect(approvedProd.approvedAt).toBeDefined();

    // 4. Edit usageDescription without ticking approval box -> resets back to draft
    const editRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${prod.id}`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        usageDescription: 'Updated herbal decoction for enhanced gut wellness and digestion',
      },
    });
    expect(editRes.statusCode).toBe(200);
    const revertedProd = JSON.parse(editRes.payload);
    expect(revertedProd.status).toBe('draft');
    expect(revertedProd.approvedById).toBeNull();
  });

  it('changing a price writes a price history row with old and new price', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'PRICE-HIST-01',
        name: 'Brahmi Ghritam',
        price: 350,
        usageDescription: 'Traditional medicated ghee used for cognitive and memory support',
        categoryId: uncategorizedId,
      },
    });
    const prod = JSON.parse(createRes.payload);
    createdProductIds.push(prod.id);

    // Change price from 350 to 395
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${prod.id}`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        price: 395,
        priceChangeReason: 'Raw materials cost update',
      },
    });
    expect(patchRes.statusCode).toBe(200);

    // Query price history
    const histRes = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${prod.id}/price-history`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(histRes.statusCode).toBe(200);
    const history = JSON.parse(histRes.payload);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(Number(history[0].oldPrice)).toBe(350);
    expect(Number(history[0].newPrice)).toBe(395);
    expect(history[0].reason).toBe('Raw materials cost update');
  });

  it('stock switch works for product.stock_update and pharmacy_store, refused for unauthorized roles', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'STOCK-TOG-01',
        name: 'Triphala Tablets',
        price: 180,
        usageDescription: 'Gentle colon cleanse and daily digestive support',
        categoryId: uncategorizedId,
      },
    });
    const prod = JSON.parse(createRes.payload);
    createdProductIds.push(prod.id);
    expect(prod.stockStatus).toBe('in_stock');

    // 1. Treatment telecaller attempts stock update -> 403 Forbidden
    const unauthRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${prod.id}/stock`,
      headers: { authorization: `Bearer ${telecallerToken}` },
      payload: { stockStatus: 'out_of_stock' },
    });
    expect(unauthRes.statusCode).toBe(403);

    // 2. Pharmacy store user marks out of stock -> 200 OK
    const pharmRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/products/${prod.id}/stock`,
      headers: { authorization: `Bearer ${pharmacyToken}` },
      payload: {
        stockStatus: 'out_of_stock',
        note: 'Awaiting fresh batch from pharmacy warehouse',
      },
    });
    expect(pharmRes.statusCode).toBe(200);
    const updatedProd = JSON.parse(pharmRes.payload);
    expect(updatedProd.stockStatus).toBe('out_of_stock');

    // 3. Verify stock history entry
    const histRes = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${prod.id}/stock-history`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(histRes.statusCode).toBe(200);
    const history = JSON.parse(histRes.payload);
    expect(history.some((h: any) => h.status === 'out_of_stock' || h.newStatus === 'out_of_stock')).toBe(true);
  });

  it('bulk stock update updates multiple products atomically', async () => {
    const p1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'BULK-01',
        name: 'Bulk Item 1',
        price: 100,
        usageDescription: 'Bulk test item one for batch stock testing',
        categoryId: uncategorizedId,
      },
    });
    const p1 = JSON.parse(p1Res.payload);
    createdProductIds.push(p1.id);

    const p2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'BULK-02',
        name: 'Bulk Item 2',
        price: 120,
        usageDescription: 'Bulk test item two for batch stock testing',
        categoryId: uncategorizedId,
      },
    });
    const p2 = JSON.parse(p2Res.payload);
    createdProductIds.push(p2.id);

    const bulkRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products/bulk-stock',
      headers: { authorization: `Bearer ${pharmacyToken}` },
      payload: {
        productIds: [p1.id, p2.id],
        stockStatus: 'out_of_stock',
        note: 'Batch stock depletion',
      },
    });
    expect(bulkRes.statusCode).toBe(200);

    const check1 = await prisma.product.findUnique({ where: { id: p1.id } });
    const check2 = await prisma.product.findUnique({ where: { id: p2.id } });
    expect(check1?.stockStatus).toBe('out_of_stock');
    expect(check2?.stockStatus).toBe('out_of_stock');
  });

  it('category with active products cannot be archived until products are moved, and move action works', async () => {
    // 1. Create custom category A
    const catARes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        name: 'Custom Hair Care Category',
        description: 'Herbal solutions for scalp and hair',
      },
    });
    expect(catARes.statusCode).toBe(201);
    const catA = JSON.parse(catARes.payload);
    createdCategoryIds.push(catA.id);

    // 2. Create custom category B
    const catBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        name: 'Target Hair Wellness Category',
        description: 'New unified category for hair products',
      },
    });
    expect(catBRes.statusCode).toBe(201);
    const catB = JSON.parse(catBRes.payload);
    createdCategoryIds.push(catB.id);

    // 3. Add a product to category A
    const prodRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'HAIR-OIL-01',
        name: 'Neelibhringadi Hair Oil',
        price: 280,
        usageDescription: 'Nourishing herbal oil for scalp cooling and hair strength',
        categoryId: catA.id,
      },
    });
    const prod = JSON.parse(prodRes.payload);
    createdProductIds.push(prod.id);

    // 4. Attempt to archive Category A -> fails because active product exists
    const archiveFailRes = await app.inject({
      method: 'POST',
      url: `/api/v1/product-categories/${catA.id}/archive`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(archiveFailRes.statusCode).toBe(400);
    const errBody = JSON.parse(archiveFailRes.payload);
    expect(errBody.error.code).toBe('CATEGORY_HAS_ACTIVE_PRODUCTS');

    // 5. Move products from Category A to Category B
    const moveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/product-categories/${catA.id}/move-products`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        targetCategoryId: catB.id,
      },
    });
    expect(moveRes.statusCode).toBe(200);
    const moveBody = JSON.parse(moveRes.payload);
    expect(moveBody.movedCount).toBe(1);

    // 6. Now archiving Category A succeeds
    const archiveSuccessRes = await app.inject({
      method: 'POST',
      url: `/api/v1/product-categories/${catA.id}/archive`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(archiveSuccessRes.statusCode).toBe(200);
  });

  it('CSV import preview detects duplicates and errors, and commits imported products as draft', async () => {
    const csvContent = `sku,name,price,usage_description,pack_size
CSV-001,Neem Capsules,150,Traditional purifying herb for skin and immune support,60 caps
CSV-002,Invalid Item,-10,Too cheap,,
CSV-003,Guduchi Kwath,210,Classical decoction for balancing doshas and wellness,200 ml`;

    // 1. Preview
    const previewRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products/import/preview',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: { csv: csvContent },
    });
    expect(previewRes.statusCode).toBe(200);
    const preview = JSON.parse(previewRes.payload);
    expect(preview.totalRows).toBe(3);
    expect(preview.validCount).toBe(2);
    expect(preview.errorCount).toBe(1);
    expect(preview.errors[0].field).toBe('price');

    // Verify nothing saved yet
    const notSaved = await prisma.product.findUnique({ where: { sku: 'CSV-001' } });
    expect(notSaved).toBeNull();

    // 2. Commit valid rows
    const commitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products/import/commit',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: { rows: preview.previewRows },
    });
    expect(commitRes.statusCode).toBe(200);
    const commitResult = JSON.parse(commitRes.payload);
    expect(commitResult.createdCount).toBe(2);

    // Verify imported products arrive as draft
    const savedProd = await prisma.product.findUnique({ where: { sku: 'CSV-001' } });
    expect(savedProd).toBeDefined();
    expect(savedProd?.status).toBe('draft');
    if (savedProd) createdProductIds.push(savedProd.id);

    const savedProd2 = await prisma.product.findUnique({ where: { sku: 'CSV-003' } });
    if (savedProd2) createdProductIds.push(savedProd2.id);
  });

  it('Malayalam text in product name and notes saves, displays, and can be searched', async () => {
    const malayalamName = 'അശ്വഗന്ധ ചൂർണം (Ashwagandha)';
    const malayalamNote = 'മലയാളം കുറിപ്പ്: ഗുണനിലവാരം ഉറപ്പുവരുത്തി.';

    const prodRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: { authorization: `Bearer ${prodMgrToken}` },
      payload: {
        sku: 'ML-TEST-01',
        name: malayalamName,
        price: 290,
        usageDescription: 'Ashwagandha formulation for rejuvenation and wellness',
        internalNote: malayalamNote,
        categoryId: uncategorizedId,
      },
    });
    expect(prodRes.statusCode).toBe(201);
    const prod = JSON.parse(prodRes.payload);
    createdProductIds.push(prod.id);
    expect(prod.name).toBe(malayalamName);

    // Search by Malayalam text
    const searchRes = await app.inject({
      method: 'GET',
      url: `/api/v1/products?search=${encodeURIComponent('അശ്വഗന്ധ')}`,
      headers: { authorization: `Bearer ${prodMgrToken}` },
    });
    expect(searchRes.statusCode).toBe(200);
    const searchBody = JSON.parse(searchRes.payload);
    expect(searchBody.products.some((p: any) => p.id === prod.id)).toBe(true);
  });
});
