import { describe, it, expect } from 'vitest';
import { seedProductModule } from '../../database/seed-products';
import { prisma } from '../../database/client';

describe('Product Module Demo Data Seeder', () => {
  it('successfully seeds 20 products, 15 relations, 3 campaigns, 25 product leads, and waitlist entries', async () => {
    await seedProductModule();

    const productCount = await prisma.product.count({
      where: { sku: { startsWith: 'AYUR-' } },
    });
    const relationCount = await prisma.productRelation.count();
    const campaignCount = await prisma.productCampaign.count();
    const productLeadCount = await prisma.lead.count({
      where: { leadType: 'product', mobile: { startsWith: '+91980001' } },
    });
    const waitlistCount = await prisma.productWaitlist.count();
    const refillTaskCount = await prisma.task.count({
      where: { type: 'refill_reminder' },
    });

    console.log(`Seeded Products (AYUR-*): ${productCount}`);
    console.log(`Seeded Relations: ${relationCount}`);
    console.log(`Seeded Campaigns: ${campaignCount}`);
    console.log(`Seeded Product Leads (+91980001*): ${productLeadCount}`);
    console.log(`Seeded Waitlist Entries: ${waitlistCount}`);
    console.log(`Seeded Refill Tasks: ${refillTaskCount}`);

    expect(productCount).toBe(20);
    expect(relationCount).toBe(15);
    expect(campaignCount).toBeGreaterThanOrEqual(3);
    expect(productLeadCount).toBe(25);
    expect(waitlistCount).toBeGreaterThanOrEqual(2);
    expect(refillTaskCount).toBeGreaterThanOrEqual(5);
  }, 60000);
});
