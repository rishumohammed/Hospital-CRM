import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions } from '@hospital-crm/shared';

export interface ProductReportFilter {
  branchId?: number;
  campaignId?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 1. Product Leads & Campaign Performance Report
 */
export async function getProductLeadsReport(filter: ProductReportFilter, user: UserContext) {
  const scope = scopeWhere(user, 'product_lead', Permissions.PRODUCT_LEAD_VIEW);

  const where: any = {
    ...scope,
    leadType: 'product',
    archivedAt: null,
  };

  if (filter.branchId) {
    where.branchId = filter.branchId;
  }
  if (filter.campaignId) {
    where.campaignId = filter.campaignId;
  }
  if (filter.startDate || filter.endDate) {
    where.createdAt = {};
    if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
    if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
  }

  const [totalLeads, convertedLeads, leadsByStatus, leadsByCampaign, leadsByChannel] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'converted' } }),
    prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ['campaignId'],
      where: { ...where, campaignId: { not: null } },
      _count: { id: true },
    }),
    prisma.productCampaign.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        channel: true,
        budget: true,
        spent: true,
        _count: {
          select: { leads: true },
        },
      },
    }),
  ]);

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // Calculate total sales confirmed
  const salesInterests = await prisma.leadProductInterest.findMany({
    where: {
      status: 'accepted',
      lead: where,
    },
    select: {
      unitPriceAtTime: true,
      quantity: true,
    },
  });

  const totalRevenue = salesInterests.reduce((sum, item) => sum + Number(item.unitPriceAtTime) * item.quantity, 0);

  return {
    kpis: {
      totalLeads,
      convertedLeads,
      conversionRate: `${conversionRate}%`,
      totalRevenue,
    },
    statusBreakdown: leadsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
      percentage: totalLeads > 0 ? ((s._count.id / totalLeads) * 100).toFixed(1) : '0.0',
    })),
    campaigns: leadsByChannel.map((c) => ({
      id: c.id,
      name: c.name,
      channel: c.channel,
      leadsCount: c._count.leads,
      budget: Number(c.budget || 0),
      spent: Number(c.spent || 0),
      costPerLead: c._count.leads > 0 ? (Number(c.spent || 0) / c._count.leads).toFixed(1) : '0.0',
    })),
  };
}

/**
 * 2. Curated Relations & Cross-Sell Conversion Report
 */
export async function getCrossSellReport(filter: ProductReportFilter, user: UserContext) {
  const scope = scopeWhere(user, 'product_lead', Permissions.PRODUCT_LEAD_VIEW);

  const interestWhere: any = {
    lead: {
      ...scope,
      leadType: 'product',
      archivedAt: null,
    },
  };

  if (filter.branchId) {
    interestWhere.lead.branchId = filter.branchId;
  }

  const [totalInterests, acceptedInterests, declinedInterests, relationsCount] = await Promise.all([
    prisma.leadProductInterest.count({ where: interestWhere }),
    prisma.leadProductInterest.count({ where: { ...interestWhere, status: 'accepted' } }),
    prisma.leadProductInterest.count({ where: { ...interestWhere, status: 'declined' } }),
    prisma.productRelation.count(),
  ]);

  const crossSellConversionRate =
    totalInterests > 0 ? ((acceptedInterests / totalInterests) * 100).toFixed(1) : '0.0';

  // Relation breakdown
  const relationsByType = await prisma.productRelation.groupBy({
    by: ['relationType'],
    _count: { id: true },
  });

  return {
    kpis: {
      totalInterests,
      acceptedInterests,
      declinedInterests,
      crossSellConversionRate: `${crossSellConversionRate}%`,
      activeRelationsCount: relationsCount,
    },
    relationTypes: relationsByType.map((r) => ({
      relationType: r.relationType,
      count: r._count.id,
    })),
  };
}

/**
 * 3. Out-of-Stock Unmet Demand & Waitlist Report
 */
export async function getProductDemandReport(filter: ProductReportFilter, user: UserContext) {
  const [totalWaitlisted, notifiedWaitlisted, oosProducts] = await Promise.all([
    prisma.productWaitlist.count(),
    prisma.productWaitlist.count({ where: { notifiedAt: { not: null } } }),
    prisma.product.findMany({
      where: {
        stockStatus: 'out_of_stock',
        archivedAt: null,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        _count: {
          select: {
            waitlistEntries: true,
            leadInterests: true,
          },
        },
      },
    }),
  ]);

  const estimatedLostRevenue = oosProducts.reduce(
    (sum, p) => sum + Number(p.price) * p._count.waitlistEntries,
    0
  );

  return {
    kpis: {
      totalWaitlisted,
      notifiedWaitlisted,
      pendingWaitlist: totalWaitlisted - notifiedWaitlisted,
      estimatedLostRevenue,
      outOfStockProductsCount: oosProducts.length,
    },
    topOosProducts: oosProducts
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: Number(p.price),
        waitlistCount: p._count.waitlistEntries,
        lostRevenuePotential: Number(p.price) * p._count.waitlistEntries,
      }))
      .sort((a, b) => b.waitlistCount - a.waitlistCount),
  };
}

/**
 * 4. Catalog Health & Stock Hygiene Report
 */
export async function getCatalogHealthReport() {
  const [total, draft, approved, archived, inStock, outOfStock, categoriesCount] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'draft', archivedAt: null } }),
    prisma.product.count({ where: { status: 'approved', archivedAt: null } }),
    prisma.product.count({ where: { archivedAt: { not: null } } }),
    prisma.product.count({ where: { stockStatus: 'in_stock', archivedAt: null } }),
    prisma.product.count({ where: { stockStatus: 'out_of_stock', archivedAt: null } }),
    prisma.productCategory.count({ where: { archivedAt: null } }),
  ]);

  const activeCatalog = approved;
  const oosRate = activeCatalog > 0 ? ((outOfStock / activeCatalog) * 100).toFixed(1) : '0.0';

  return {
    kpis: {
      totalProducts: total,
      activeApproved: approved,
      draftPendingApproval: draft,
      archived,
      inStock,
      outOfStock,
      outOfStockRate: `${oosRate}%`,
      categoriesCount,
    },
  };
}
