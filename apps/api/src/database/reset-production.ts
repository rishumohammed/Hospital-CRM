import { prisma } from './client';
import { hashPassword } from '../modules/auth/password';
import { Roles } from '@hospital-crm/shared';

export async function resetProductionData() {
  console.log('========================================================');
  console.log('  Hospital CRM - Resetting Database for Clean Production');
  console.log('========================================================');

  // 1. Break circular / self references on leads and cases
  console.log('==> Clearing transactional activity, logs, and interactions...');
  try {
    await prisma.lead.updateMany({
      data: {
        referredFromLeadId: null,
        convertedPatientId: null,
        closedReasonId: null,
        campaignId: null,
        ownerId: null,
      },
    });
    await prisma.case.updateMany({
      data: {
        leadId: null,
        treatingDoctorId: null,
        ownerId: null,
        notStartedReasonId: null,
        closureCodeId: null,
      },
    });
  } catch (e) {
    // Ignore if tables are already empty
  }

  // 2. Clear all operational, activity, and transactional records with FOREIGN_KEY_CHECKS disabled
  const tablesToClear = [
    'audit_logs',
    'notifications',
    'outbox_events',
    'exports',
    'imports',
    'lead_testimonial_send_items',
    'lead_testimonial_sends',
    'testimonials',
    'treatment_checkins',
    'scheduled_visits',
    'schedule_extension_requests',
    'visit_schedules',
    'case_handovers',
    'escalations',
    'appointments',
    'tasks',
    'interactions',
    'cases',
    'lead_product_interests',
    'product_waitlist',
    'leads',
    'patients',
    'campaign_products',
    'product_campaigns',
    'product_relations',
    'product_price_history',
    'product_stock_history',
    'products',
    'product_categories',
  ];

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  for (const tbl of tablesToClear) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${tbl}\`;`);
    } catch (err: any) {
      console.warn(`Warning clearing ${tbl}:`, err.message);
    }
  }
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  // 3. Ensure OWNER role exists
  let ownerRole = await prisma.role.findFirst({
    where: { code: Roles.OWNER },
  });
  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        code: Roles.OWNER,
        name: 'Managing Director',
        maskPhone: false,
      },
    });
  }

  // 4. Ensure MAIN branch exists
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Hospital Main Campus',
      type: 'own',
      timezone: 'Asia/Kolkata',
      businessHours: {
        open: '09:00',
        close: '20:00',
        days: [1, 2, 3, 4, 5, 6],
      },
    },
  });

  // 5. Configure Managing Director Account with md@samadelements.com
  console.log('==> Configuring Managing Director account (md@samadelements.com)...');
  const defaultPassword = 'HospitalCRM@2026';
  const passwordHash = await hashPassword(defaultPassword);

  const existingMd = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'md@samadelements.com' },
        { email: 'md@hospital.local' },
        { email: 'owner@hospital.test' },
        { roleId: ownerRole.id },
      ],
    },
  });

  let mdUser;
  if (existingMd) {
    mdUser = await prisma.user.update({
      where: { id: existingMd.id },
      data: {
        name: 'Managing Director',
        email: 'md@samadelements.com',
        mobile: '+919800000001',
        passwordHash, // Reset password
        roleId: ownerRole.id,
        dutyDoctor: true,
        dutyNurse: false,
        status: 'active',
        available: true,
      },
    });
  } else {
    mdUser = await prisma.user.create({
      data: {
        name: 'Managing Director',
        email: 'md@samadelements.com',
        mobile: '+919800000001',
        passwordHash,
        roleId: ownerRole.id,
        dutyDoctor: true,
        dutyNurse: false,
        status: 'active',
        available: true,
      },
    });
  }

  // 6. Delete all other users except mdUser
  console.log(`==> Removing all test users except Managing Director (User ID: ${mdUser.id})...`);
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.permissionGrant.deleteMany({
    where: {
      OR: [
        { userId: { not: mdUser.id } },
        { grantedBy: { not: mdUser.id } },
      ],
    },
  });
  await prisma.userBranch.deleteMany({
    where: { userId: { not: mdUser.id } },
  });
  await prisma.userTeam.deleteMany({
    where: { userId: { not: mdUser.id } },
  });
  await prisma.user.deleteMany({
    where: { id: { not: mdUser.id } },
  });
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  // 7. Ensure MD is attached to MAIN branch and all departments/teams
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: mdUser.id, branchId: mainBranch.id } },
    update: {},
    create: { userId: mdUser.id, branchId: mainBranch.id },
  });

  const allTeams = await prisma.team.findMany();
  for (const t of allTeams) {
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId: mdUser.id, teamId: t.id } },
      update: {},
      create: { userId: mdUser.id, teamId: t.id },
    });
  }

  console.log('');
  console.log('✓ Successfully reset database for clean production!');
  console.log('========================================================');
  console.log('Single Active User:');
  console.log('  Role:     Managing Director (OWNER)');
  console.log('  Email:    md@samadelements.com');
  console.log('  Mobile:   +919800000001');
  console.log('  Password: HospitalCRM@2026');
  console.log('========================================================');
}

resetProductionData()
  .catch((err) => {
    console.error('Error resetting database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

