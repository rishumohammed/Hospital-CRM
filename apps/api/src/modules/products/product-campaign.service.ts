import { prisma } from '../../database/client';
import { UserContext, hasPermission, scopeWhere } from '../rbac/scope';
import { recordAuditLog } from '../audit/audit.service';
import {
  CreateProductCampaignInput,
  Permissions,
} from '@hospital-crm/shared';

function generateCampaignKey(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${randomSuffix}`;
}

export interface ListProductCampaignsParams {
  search?: string;
  status?: string;
  channel?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listProductCampaigns(
  params: ListProductCampaignsParams,
  user: UserContext
) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {
    archivedAt: null,
  };

  // Branch/owner scoping if user isCenterHead
  const scopedFilter = scopeWhere(user, 'product_campaign', Permissions.PRODUCT_CAMPAIGN_MANAGE);
  Object.assign(where, scopedFilter);

  if (params.status) {
    where.status = params.status;
  }

  if (params.channel) {
    where.channel = params.channel;
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { name: { contains: term } },
      { campaignKey: { contains: term } },
      { notes: { contains: term } },
    ];
  }

  const orderByField = params.sortBy || 'createdAt';
  const orderDir = params.sortOrder || 'desc';

  const [total, campaigns] = await Promise.all([
    prisma.productCampaign.count({ where }),
    prisma.productCampaign.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [orderByField]: orderDir },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            leads: true,
            campaignProducts: true,
          },
        },
      },
    }),
  ]);

  return {
    campaigns,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getProductCampaignById(id: number, user: UserContext) {
  const campaign = await prisma.productCampaign.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      campaignProducts: {
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              stockStatus: true,
              status: true,
              categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { sort: 'asc' },
      },
      _count: {
        select: {
          leads: true,
        },
      },
    },
  });

  if (!campaign || campaign.archivedAt) {
    const error: any = new Error('Product campaign not found');
    error.statusCode = 404;
    throw error;
  }

  // Calculate campaign metrics: leads, conversion, cost per lead, cost per sale
  const [totalLeads, convertedLeads, salesAggregate] = await Promise.all([
    prisma.lead.count({ where: { campaignId: id } }),
    prisma.lead.count({ where: { campaignId: id, saleConfirmedAt: { not: null } } }),
    prisma.lead.aggregate({
      where: { campaignId: id, saleConfirmedAt: { not: null } },
      _sum: { saleAmount: true },
    }),
  ]);

  const spent = Number(campaign.spent) || 0;
  const totalSales = Number(salesAggregate._sum.saleAmount) || 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const costPerLead = totalLeads > 0 ? spent / totalLeads : 0;
  const costPerSale = convertedLeads > 0 ? spent / convertedLeads : 0;

  return {
    ...campaign,
    metrics: {
      totalLeads,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalSales,
      spent,
      costPerLead: Math.round(costPerLead * 100) / 100,
      costPerSale: Math.round(costPerSale * 100) / 100,
    },
  };
}

export async function createProductCampaign(
  input: CreateProductCampaignInput,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const campaignKey = (
    input.campaignKey ??
    input.campaign_key ??
    generateCampaignKey(input.name)
  ).trim();

  // Ensure unique campaign key
  const existing = await prisma.productCampaign.findUnique({
    where: { campaignKey },
  });
  if (existing) {
    const error: any = new Error(`Campaign key '${campaignKey}' is already in use`);
    error.statusCode = 409;
    error.code = 'DUPLICATE_CAMPAIGN_KEY';
    throw error;
  }

  const startDate = input.startDate ?? input.start_date ? new Date(input.startDate ?? input.start_date!) : null;
  const endDate = input.endDate ?? input.end_date ? new Date(input.endDate ?? input.end_date!) : null;
  const ownerId = input.ownerId ?? input.owner_id ?? user.id;

  const productIds = input.productIds ?? input.product_ids ?? [];

  const campaign = await prisma.$transaction(async (tx) => {
    const c = await tx.productCampaign.create({
      data: {
        name: input.name.trim(),
        campaignKey,
        channel: input.channel,
        startDate,
        endDate,
        budget: input.budget !== undefined && input.budget !== null ? input.budget : null,
        spent: input.spent !== undefined ? input.spent : 0,
        ownerId,
        status: input.status ?? 'draft',
        notes: input.notes ?? null,
      },
    });

    if (productIds.length > 0) {
      const records = productIds.map((pid, idx) => ({
        campaignId: c.id,
        productId: pid,
        sort: idx,
      }));
      await tx.campaignProduct.createMany({
        data: records,
        skipDuplicates: true,
      });
    }

    return c;
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CAMPAIGN_CREATED',
    entity: 'product_campaign',
    entityId: campaign.id,
    after: campaign,
    ip,
    userAgent,
  });

  return campaign;
}

export async function updateProductCampaign(
  id: number,
  input: any,
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const existing = await prisma.productCampaign.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) {
    const error: any = new Error('Product campaign not found');
    error.statusCode = 404;
    throw error;
  }

  const data: any = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.channel !== undefined) data.channel = input.channel;
  if (input.status !== undefined) data.status = input.status;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.budget !== undefined) data.budget = input.budget;
  if (input.spent !== undefined) data.spent = input.spent;
  if (input.ownerId !== undefined || input.owner_id !== undefined) {
    data.ownerId = input.ownerId ?? input.owner_id;
  }
  if (input.startDate !== undefined || input.start_date !== undefined) {
    const val = input.startDate ?? input.start_date;
    data.startDate = val ? new Date(val) : null;
  }
  if (input.endDate !== undefined || input.end_date !== undefined) {
    const val = input.endDate ?? input.end_date;
    data.endDate = val ? new Date(val) : null;
  }

  const updated = await prisma.productCampaign.update({
    where: { id },
    data,
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CAMPAIGN_UPDATED',
    entity: 'product_campaign',
    entityId: id,
    before: existing,
    after: updated,
    ip,
    userAgent,
  });

  return updated;
}

export async function setCampaignProducts(
  campaignId: number,
  productIds: number[],
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  const campaign = await prisma.productCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.archivedAt) {
    const error: any = new Error('Product campaign not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing products for this campaign
    await tx.campaignProduct.deleteMany({ where: { campaignId } });

    // Create new records with preserved sort order
    if (productIds.length > 0) {
      await tx.campaignProduct.createMany({
        data: productIds.map((pid, idx) => ({
          campaignId,
          productId: pid,
          sort: idx,
        })),
        skipDuplicates: true,
      });
    }
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_CAMPAIGN_PRODUCTS_UPDATED',
    entity: 'product_campaign',
    entityId: campaignId,
    after: { productIds },
    ip,
    userAgent,
  });

  return { success: true, count: productIds.length };
}
