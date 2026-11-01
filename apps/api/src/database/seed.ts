import { prisma } from './client';
import { hashPassword } from '../modules/auth/password';
import { Roles, Teams, Scopes, Permissions } from '@hospital-crm/shared';

export async function seedDatabase() {
  console.log('--- Starting Database Seed ---');

  // 1. Seed MAIN Branch
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
        days: [1, 2, 3, 4, 5, 6], // Mon-Sat
      },
    },
  });
  console.log(`✓ Branch seeded: ${mainBranch.name} (${mainBranch.code})`);

  // 2. Seed Teams
  const teamDefs = [
    { code: Teams.SUPPORT, name: 'Support Team' },
    { code: Teams.ADMISSION, name: 'Admission Team' },
    { code: Teams.AFTERCARE, name: 'Aftercare Team' },
  ];

  const seededTeams: Record<string, any> = {};
  for (const t of teamDefs) {
    seededTeams[t.code] = await prisma.team.upsert({
      where: { code: t.code },
      update: { name: t.name },
      create: { code: t.code, name: t.name },
    });
  }
  console.log('✓ Teams seeded: Support, Admission, Aftercare');

  // 3. Seed Roles & Starter Permissions Matrix
  const roleDefinitions = [
    { code: Roles.OWNER, name: 'Managing Director', maskPhone: false },
    { code: Roles.ADMIN, name: 'IT Administrator', maskPhone: false },
    { code: Roles.CENTER_HEAD, name: 'Branch Manager', maskPhone: false },
    { code: Roles.TELECALLER_MANAGER, name: 'Patient Experience Lead', maskPhone: false },
    { code: Roles.SUPPORT_TELECALLER, name: 'Support Telecaller', maskPhone: false },
    { code: Roles.ADMISSION_SPECIALIST, name: 'Admission Specialist', maskPhone: false },
    { code: Roles.AFTERCARE_EXECUTIVE, name: 'Aftercare Executive', maskPhone: false },
    { code: Roles.DOCTOR, name: 'Treating Doctor', maskPhone: false },
    { code: Roles.AUDITOR, name: 'Quality / External Auditor', maskPhone: false },
  ];

  const seededRoles: Record<string, any> = {};
  for (const r of roleDefinitions) {
    seededRoles[r.code] = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, maskPhone: r.maskPhone },
      create: { code: r.code, name: r.name, maskPhone: r.maskPhone },
    });
  }

  // Clear existing role permissions to apply clean starter matrix
  await prisma.rolePermission.deleteMany({});

  // Define Starter Permissions Matrix
  const matrix: Array<{ roleCode: string; permissions: Array<{ permission: string; scope: string }> }> = [
    // 1. Owner: all permissions with scope 'all'
    {
      roleCode: Roles.OWNER,
      permissions: Object.values(Permissions).map((p) => ({
        permission: p,
        scope: Scopes.ALL,
      })),
    },
    // 2. Admin: settings, user, role, cadence, rules, audit: 'all'; Content is 'none' by default
    {
      roleCode: Roles.ADMIN,
      permissions: [
        { permission: Permissions.SETTINGS_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.USER_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.ROLE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.CADENCE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.ASSIGNMENT_RULE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.ALL },
      ],
    },
    // 3. Center Head: branch-level for everything, export approve: branch
    {
      roleCode: Roles.CENTER_HEAD,
      permissions: [
        { permission: Permissions.LEAD_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_EDIT, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_REASSIGN, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_MERGE, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_CLOSE, scope: Scopes.BRANCH },
        { permission: Permissions.CASE_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.CASE_EDIT, scope: Scopes.BRANCH },
        { permission: Permissions.CASE_REASSIGN, scope: Scopes.BRANCH },
        { permission: Permissions.TASK_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.BRANCH },
        { permission: Permissions.EXPORT_APPROVE, scope: Scopes.BRANCH },
        { permission: Permissions.CADENCE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.ASSIGNMENT_RULE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.BRANCH },
      ],
    },
    // 4. Telecaller Manager: branch-level for leads & cases, report: branch
    {
      roleCode: Roles.TELECALLER_MANAGER,
      permissions: [
        { permission: Permissions.LEAD_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_EDIT, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_REASSIGN, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_MERGE, scope: Scopes.BRANCH },
        { permission: Permissions.LEAD_CLOSE, scope: Scopes.BRANCH },
        { permission: Permissions.CASE_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.CASE_EDIT, scope: Scopes.BRANCH },
        { permission: Permissions.TASK_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.BRANCH },
        { permission: Permissions.CADENCE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.ASSIGNMENT_RULE_MANAGE, scope: Scopes.BRANCH },
      ],
    },
    // 5. Support Telecaller: own leads, own tasks, own reports
    {
      roleCode: Roles.SUPPORT_TELECALLER,
      permissions: [
        { permission: Permissions.LEAD_VIEW, scope: Scopes.OWN },
        { permission: Permissions.LEAD_CREATE, scope: Scopes.OWN },
        { permission: Permissions.LEAD_EDIT, scope: Scopes.OWN },
        { permission: Permissions.LEAD_CLOSE, scope: Scopes.OWN },
        { permission: Permissions.CASE_VIEW, scope: Scopes.OWN }, // Read-only for converted
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.OWN },
      ],
    },
    // 6. Admission Specialist: own cases & tasks
    {
      roleCode: Roles.ADMISSION_SPECIALIST,
      permissions: [
        { permission: Permissions.CASE_VIEW, scope: Scopes.OWN },
        { permission: Permissions.CASE_EDIT, scope: Scopes.OWN },
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.OWN },
      ],
    },
    // 7. Aftercare Executive: own cases & tasks
    {
      roleCode: Roles.AFTERCARE_EXECUTIVE,
      permissions: [
        { permission: Permissions.CASE_VIEW, scope: Scopes.OWN },
        { permission: Permissions.CASE_EDIT, scope: Scopes.OWN },
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.OWN },
      ],
    },
    // 8. Doctor: own cases, notes, escalation decision
    {
      roleCode: Roles.DOCTOR,
      permissions: [
        { permission: Permissions.CASE_VIEW, scope: Scopes.OWN },
        { permission: Permissions.CASE_EDIT, scope: Scopes.OWN },
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.ESCALATION_DECIDE, scope: Scopes.OWN },
      ],
    },
    // 9. Auditor: read-only all
    {
      roleCode: Roles.AUDITOR,
      permissions: [
        { permission: Permissions.LEAD_VIEW, scope: Scopes.ALL },
        { permission: Permissions.CASE_VIEW, scope: Scopes.ALL },
        { permission: Permissions.TASK_VIEW, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.ALL },
      ],
    },
  ];

  for (const item of matrix) {
    const role = seededRoles[item.roleCode];
    if (role && item.permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: item.permissions.map((p) => ({
          roleId: role.id,
          permission: p.permission,
          scope: p.scope,
        })),
      });
    }
  }
  console.log('✓ Roles & Permissions Matrix successfully seeded');

  // 4. Seed Demo Users
  const defaultPassword = 'HospitalCRM@2026';
  const passwordHash = await hashPassword(defaultPassword);

  const demoUsers = [
    {
      name: 'Dr. Managing Director',
      email: 'owner@hospital.test',
      mobile: '+919800000001',
      roleCode: Roles.OWNER,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: true,
    },
    {
      name: 'System IT Admin',
      email: 'admin@hospital.test',
      mobile: '+919800000002',
      roleCode: Roles.ADMIN,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Branch Manager (Center Head)',
      email: 'centerhead@hospital.test',
      mobile: '+919800000003',
      roleCode: Roles.CENTER_HEAD,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Priya Sharma (Telecaller Manager)',
      email: 'manager@hospital.test',
      mobile: '+919800000004',
      roleCode: Roles.TELECALLER_MANAGER,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Rahul Nair (Support Telecaller 1)',
      email: 'telecaller1@hospital.test',
      mobile: '+919800000005',
      roleCode: Roles.SUPPORT_TELECALLER,
      teams: [Teams.SUPPORT],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Anjali Menon (Support Telecaller 2)',
      email: 'telecaller2@hospital.test',
      mobile: '+919800000006',
      roleCode: Roles.SUPPORT_TELECALLER,
      teams: [Teams.SUPPORT],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Dr. Suresh Varma (Admission Specialist)',
      email: 'admission1@hospital.test',
      mobile: '+919800000007',
      roleCode: Roles.ADMISSION_SPECIALIST,
      teams: [Teams.ADMISSION],
      dutyNurse: false,
      dutyDoctor: true,
    },
    {
      name: 'Sr. Reshma Pillai (Aftercare Executive / Duty Nurse)',
      email: 'aftercare1@hospital.test',
      mobile: '+919800000008',
      roleCode: Roles.AFTERCARE_EXECUTIVE,
      teams: [Teams.AFTERCARE],
      dutyNurse: true,
      dutyDoctor: false,
    },
    {
      name: 'Dr. Harish Kumar (Treating Doctor / Duty Doctor)',
      email: 'doctor1@hospital.test',
      mobile: '+919800000009',
      roleCode: Roles.DOCTOR,
      teams: [],
      dutyNurse: false,
      dutyDoctor: true,
    },
    {
      name: 'Kavitha R (Quality Auditor)',
      email: 'auditor@hospital.test',
      mobile: '+919800000010',
      roleCode: Roles.AUDITOR,
      teams: [],
      dutyNurse: false,
      dutyDoctor: false,
    },
  ];

  for (const du of demoUsers) {
    const role = seededRoles[du.roleCode];
    const user = await prisma.user.upsert({
      where: { email: du.email },
      update: {
        name: du.name,
        mobile: du.mobile,
        passwordHash,
        roleId: role.id,
        dutyNurse: du.dutyNurse,
        dutyDoctor: du.dutyDoctor,
        status: 'active',
        available: true,
      },
      create: {
        name: du.name,
        email: du.email,
        mobile: du.mobile,
        passwordHash,
        roleId: role.id,
        dutyNurse: du.dutyNurse,
        dutyDoctor: du.dutyDoctor,
        status: 'active',
        available: true,
      },
    });

    // Link user to MAIN branch
    await prisma.userBranch.upsert({
      where: { userId_branchId: { userId: user.id, branchId: mainBranch.id } },
      update: {},
      create: { userId: user.id, branchId: mainBranch.id },
    });

    // Link user to teams
    for (const teamCode of du.teams) {
      const team = seededTeams[teamCode];
      if (team) {
        await prisma.userTeam.upsert({
          where: { userId_teamId: { userId: user.id, teamId: team.id } },
          update: {},
          create: { userId: user.id, teamId: team.id },
        });
      }
    }
  }

  console.log('✓ Demo users seeded (all passwords set to: HospitalCRM@2026):');
  for (const du of demoUsers) {
    console.log(`   - ${du.email} [Role: ${du.roleCode}]`);
  }

  console.log('--- Database Seed Complete ---');
}

// Execute when run directly via tsx
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
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
