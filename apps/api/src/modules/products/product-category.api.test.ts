import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { generateAccessToken } from '../auth/token';

describe('Product Category Creation & Management API', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  const createdCategoryIds: number[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Generate token for Managing Director (Owner - user id 1)
    ownerToken = generateAccessToken({
      userId: 1,
      email: 'md@samadelements.com',
      roleCode: 'owner',
      branchIds: [],
      teamCodes: [],
    });
  });

  afterAll(async () => {
    const validIds = createdCategoryIds.filter((id): id is number => typeof id === 'number' && !isNaN(id));
    if (validIds.length > 0) {
      await prisma.productCategory.deleteMany({ where: { id: { in: validIds } } });
    }
    await app.close();
  });

  it('creates top-level category with custom slug successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Classical Arishtams & Asavams',
        slug: 'classical-arishtams-test',
        parentId: null,
        sort: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    const cat = JSON.parse(res.payload);
    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('Classical Arishtams & Asavams');
    expect(cat.slug).toBe('classical-arishtams-test');
    expect(cat.parentId).toBeNull();
    createdCategoryIds.push(cat.id);
  });

  it('creates category with empty slug "" by automatically generating unique slug', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Herbal Choornams',
        slug: '',
        parentId: null,
        sort: 2,
      },
    });

    expect(res.statusCode).toBe(201);
    const cat = JSON.parse(res.payload);
    expect(cat.id).toBeDefined();
    expect(cat.name).toBe('Herbal Choornams');
    expect(cat.slug).toBe('herbal-choornams');
    createdCategoryIds.push(cat.id);
  });

  it('handles non-Latin / Unicode category names gracefully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'ഔഷധങ്ങൾ (Ayurvedic Herbs)',
        slug: '',
      },
    });

    expect(res.statusCode).toBe(201);
    const cat = JSON.parse(res.payload);
    expect(cat.id).toBeDefined();
    expect(cat.slug).toBeTruthy();
    createdCategoryIds.push(cat.id);
  });

  it('creates category with parentId successfully', async () => {
    const parentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Main Kashayam Category',
      },
    });
    expect(parentRes.statusCode).toBe(201);
    const parent = JSON.parse(parentRes.payload);
    createdCategoryIds.push(parent.id);

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Concentrated Kashaya Sookshma',
        parentId: parent.id,
      },
    });
    expect(subRes.statusCode).toBe(201);
    const sub = JSON.parse(subRes.payload);
    expect(sub.parentId).toBe(parent.id);
    createdCategoryIds.push(sub.id);
  });

  it('updates category via PATCH and PUT successfully', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Updatable Category',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const cat = JSON.parse(createRes.payload);
    createdCategoryIds.push(cat.id);

    // PATCH update
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/product-categories/${cat.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Updated via PATCH',
      },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.payload).name).toBe('Updated via PATCH');

    // PUT update
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/product-categories/${cat.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Updated via PUT',
      },
    });
    expect(putRes.statusCode).toBe(200);
    expect(JSON.parse(putRes.payload).name).toBe('Updated via PUT');
  });
});
