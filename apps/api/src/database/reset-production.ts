import { prisma } from './client';
import { hashPassword } from '../modules/auth/password';
import { Roles, Teams } from '@hospital-crm/shared';

export async function resetProductionData() {
  console.log('========================================================');
  console.log('  Hospital CRM - Resetting Database for Clean Production');
  console.log('========================================================');

  // 1. Delete all operational, activity, and transactional records
  console.log('==> Clearing transactional activity, logs, and interactions...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.interaction.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.leadTestimonialSend.deleteMany({});
  await prisma.testimonial.deleteMany({});
  await prisma.treatmentCheckin.deleteMany({});
  await prisma.scheduledVisit.deleteMany({});
  await prisma.scheduleExtensionRequest.deleteMany({});
  await prisma.visitSchedule.deleteMany({});
  await prisma.caseHandover.deleteMany({});
  await prisma.escalation.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.productWaitlist.deleteMany({});
  await prisma.leadProductInterest.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.export.deleteMany({});
  await prisma.import.deleteMany({});

  // 2. Delete product sales, history, and campaigns
  console.log('==> Clearing test products and campaigns...');
  await prisma.productStockHistory.deleteMany({});
  await prisma.productPriceHistory.deleteMany({});
  await prisma.productRelation.deleteMany({});
  await prisma.productCampaign.deleteMany({});
  await prisma.product.deleteMany({});

  // 3. Ensure OWNER role exists
  const ownerRole = await prisma.role.findFirst({
    where: { code: Roles.OWNER },
  });
  if (!ownerRole) {
    throw new Error('Owner (Managing Director) role not found in system.');
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
  console.log('==> Creating/Updating Managing Director account (md@samadelements.com)...');
  const defaultPassword = 'HospitalCRM@2026';
  const passwordHash = await hashPassword(defaultPassword);

  // Find any existing Managing Director user or create fresh
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
        passwordHash: existingMd.passwordHash || passwordHash,
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
  await prisma.userBranch.deleteMany({
    where: { userId: { not: mdUser.id } },
  });
  await prisma.userTeam.deleteMany({
    where: { userId: { not: mdUser.id } },
  });
  await prisma.permissionGrant.deleteMany({
    where: {
      OR: [
        { userId: { not: mdUser.id } },
        { grantedBy: { not: mdUser.id } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: { id: { not: mdUser.id } },
  });

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

