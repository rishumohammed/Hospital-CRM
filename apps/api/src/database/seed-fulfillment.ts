import { prisma } from './client';

export async function seedFulfillmentModule() {
  console.log('--- Starting Fulfillment & Courier Partners Seed ---');

  const defaultCouriers = [
    {
      code: 'DTDC',
      name: 'DTDC Express',
      trackingUrlTemplate: 'https://www.dtdc.in/tracking/shipment-tracking.asp?strRefNo={TRACKING_NUMBER}',
      active: true,
      sort: 1,
    },
    {
      code: 'DELHIVERY',
      name: 'Delhivery',
      trackingUrlTemplate: 'https://www.delhivery.com/track/package/{TRACKING_NUMBER}',
      active: true,
      sort: 2,
    },
    {
      code: 'BLUEDART',
      name: 'Blue Dart',
      trackingUrlTemplate: 'https://www.bluedart.com/tracking?trackNumber={TRACKING_NUMBER}',
      active: true,
      sort: 3,
    },
    {
      code: 'INDIAPOST',
      name: 'India Post (Speed Post)',
      trackingUrlTemplate: 'https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx',
      active: true,
      sort: 4,
    },
    {
      code: 'PROFESSIONAL',
      name: 'The Professional Couriers',
      trackingUrlTemplate: 'https://www.tpcindia.com/',
      active: true,
      sort: 5,
    },
    {
      code: 'LOCAL_RUNNER',
      name: 'Direct Clinic Delivery / Runner',
      trackingUrlTemplate: null,
      active: true,
      sort: 6,
    },
  ];

  for (const c of defaultCouriers) {
    await prisma.courierPartner.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        trackingUrlTemplate: c.trackingUrlTemplate,
        active: c.active,
        sort: c.sort,
      },
      create: c,
    });
  }

  console.log(`✓ Seeded ${defaultCouriers.length} default courier partners (DTDC, Delhivery, Blue Dart, India Post, etc.)`);
  console.log('--- Fulfillment & Courier Partners Seed Complete ---');
}

if (process.argv[1]?.includes('seed-fulfillment')) {
  seedFulfillmentModule()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

