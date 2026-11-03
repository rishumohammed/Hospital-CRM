import { prisma } from './client';
import { hashPassword } from '../modules/auth/password';
import { Roles, Teams, Scopes, Permissions } from '@hospital-crm/shared';
import { ensureDefaultCadences } from '../modules/cadences/cadence.service';
import { seedProductModule } from './seed-products';

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
    { code: Teams.TREATMENT_FOLLOWUP, name: 'Treatment Follow-up Team' },
    { code: Teams.PRODUCT_SALES, name: 'Product Sales Team' },
  ];

  const seededTeams: Record<string, any> = {};
  for (const t of teamDefs) {
    seededTeams[t.code] = await prisma.team.upsert({
      where: { code: t.code },
      update: { name: t.name },
      create: { code: t.code, name: t.name },
    });
  }
  console.log('✓ Teams seeded: Support, Admission, Aftercare, Treatment Follow-up, Product Sales');

  // 3. Seed Roles & Starter Permissions Matrix
  const roleDefinitions = [
    { code: Roles.OWNER, name: 'Managing Director', maskPhone: false },
    { code: Roles.ADMIN, name: 'IT Administrator', maskPhone: false },
    { code: Roles.CENTER_HEAD, name: 'Branch Manager', maskPhone: false },
    { code: Roles.TELECALLER_MANAGER, name: 'Patient Experience Lead', maskPhone: false },
    { code: Roles.SUPPORT_TELECALLER, name: 'Support Telecaller', maskPhone: false },
    { code: Roles.ADMISSION_SPECIALIST, name: 'Admission Specialist', maskPhone: false },
    { code: Roles.AFTERCARE_EXECUTIVE, name: 'Aftercare Executive', maskPhone: false },
    { code: Roles.TREATMENT_FOLLOWUP_EXECUTIVE, name: 'Treatment Follow-up Executive', maskPhone: false },
    { code: Roles.FRONT_OFFICE, name: 'Front Office / Reception', maskPhone: false },
    { code: Roles.DOCTOR, name: 'Treating Doctor', maskPhone: false },
    { code: Roles.AUDITOR, name: 'Quality / External Auditor', maskPhone: false },
    { code: Roles.PRODUCT_SALES_EXECUTIVE, name: 'Product Sales Executive', maskPhone: false },
    { code: Roles.PRODUCT_MANAGER, name: 'Product Manager', maskPhone: false },
    { code: Roles.PHARMACY_STORE, name: 'Pharmacy Store', maskPhone: false },
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
    // 2. Admin: settings, user, role, cadence, rules, audit: 'all'; Content is 'none' by default. Catalog management is allowed.
    {
      roleCode: Roles.ADMIN,
      permissions: [
        { permission: Permissions.SETTINGS_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.USER_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.ROLE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.CADENCE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.ASSIGNMENT_RULE_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.IMPORT_RUN, scope: Scopes.ALL },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_CREATE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_EDIT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_ARCHIVE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_IMPORT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_CATEGORY_MANAGE, scope: Scopes.ALL },
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
        { permission: Permissions.TESTIMONIAL_SEND, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_VOID, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_MARK, scope: Scopes.BRANCH },
        { permission: Permissions.CHECKIN_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.FOLLOWUP_REPORT, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.SETTINGS_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_CAMPAIGN_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_LEAD_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_LEAD_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_LEAD_EDIT, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_LEAD_REASSIGN, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_REPORT_VIEW, scope: Scopes.BRANCH },
      ],
    },
    // 4. Telecaller Manager: branch-level for leads & cases, report: branch
    {
      roleCode: Roles.TELECALLER_MANAGER,
      permissions: [
        { permission: Permissions.SETTINGS_MANAGE, scope: Scopes.BRANCH },
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
        { permission: Permissions.EXPORT_APPROVE, scope: Scopes.BRANCH },
        { permission: Permissions.CADENCE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.ASSIGNMENT_RULE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_SEND, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_VOID, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_MANAGE, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_MARK, scope: Scopes.BRANCH },
        { permission: Permissions.CHECKIN_CREATE, scope: Scopes.BRANCH },
        { permission: Permissions.FOLLOWUP_REPORT, scope: Scopes.BRANCH },
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
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
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.OWN },
        { permission: Permissions.TESTIMONIAL_SEND, scope: Scopes.OWN },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
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
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.OWN },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.OWN },
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
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.OWN },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.OWN },
      ],
    },
    // 8. Treatment Follow-up Executive: own & team cases, tasks, visits, checkins
    {
      roleCode: Roles.TREATMENT_FOLLOWUP_EXECUTIVE,
      permissions: [
        { permission: Permissions.CASE_VIEW, scope: Scopes.TEAM },
        { permission: Permissions.CASE_EDIT, scope: Scopes.TEAM },
        { permission: Permissions.TASK_VIEW, scope: Scopes.TEAM },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.TEAM },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.TEAM },
        { permission: Permissions.ESCALATION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.TEAM },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.TEAM },
        { permission: Permissions.SCHEDULE_MANAGE, scope: Scopes.TEAM },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.TEAM },
        { permission: Permissions.VISIT_MARK, scope: Scopes.TEAM },
        { permission: Permissions.CHECKIN_CREATE, scope: Scopes.TEAM },
        { permission: Permissions.FOLLOWUP_REPORT, scope: Scopes.TEAM },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
      ],
    },
    // 9. Front Office (Reception): branch today's visits board & attendance marking
    {
      roleCode: Roles.FRONT_OFFICE,
      permissions: [
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.BRANCH },
        { permission: Permissions.VISIT_MARK, scope: Scopes.BRANCH },
      ],
    },
    // 10. Doctor: own patients' cases, schedules, extensions, escalations
    {
      roleCode: Roles.DOCTOR,
      permissions: [
        { permission: Permissions.CASE_VIEW, scope: Scopes.OWN },
        { permission: Permissions.CASE_EDIT, scope: Scopes.OWN },
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.ESCALATION_DECIDE, scope: Scopes.OWN },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.OWN },
        { permission: Permissions.SCHEDULE_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.SCHEDULE_APPROVE_EXTENSION, scope: Scopes.OWN },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.OWN },
        { permission: Permissions.VISIT_MARK, scope: Scopes.OWN },
        { permission: Permissions.CHECKIN_CREATE, scope: Scopes.OWN },
        { permission: Permissions.FOLLOWUP_REPORT, scope: Scopes.OWN },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.BRANCH },
      ],
    },
    // 11. Auditor: read-only all
    {
      roleCode: Roles.AUDITOR,
      permissions: [
        { permission: Permissions.LEAD_VIEW, scope: Scopes.ALL },
        { permission: Permissions.CASE_VIEW, scope: Scopes.ALL },
        { permission: Permissions.TASK_VIEW, scope: Scopes.ALL },
        { permission: Permissions.REPORT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.ALL },
        { permission: Permissions.TESTIMONIAL_VIEW, scope: Scopes.ALL },
        { permission: Permissions.SCHEDULE_VIEW, scope: Scopes.ALL },
        { permission: Permissions.VISIT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.FOLLOWUP_REPORT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_REPORT_VIEW, scope: Scopes.ALL },
      ],
    },
    // 12. Product Manager: owns catalog, categories, relations, campaigns, reports, and leads
    {
      roleCode: Roles.PRODUCT_MANAGER,
      permissions: [
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_CREATE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_EDIT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_APPROVE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_ARCHIVE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_STOCK_UPDATE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_IMPORT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_CATEGORY_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_RELATION_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_CAMPAIGN_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_CREATE, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_EDIT, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_REASSIGN, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_REPORT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.AUDIT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.TASK_VIEW, scope: Scopes.ALL },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.ALL },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.ALL },
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.ALL },
      ],
    },
    // 13. Product Sales Executive: calls product leads
    {
      roleCode: Roles.PRODUCT_SALES_EXECUTIVE,
      permissions: [
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_LEAD_VIEW, scope: Scopes.OWN },
        { permission: Permissions.PRODUCT_LEAD_CREATE, scope: Scopes.OWN },
        { permission: Permissions.PRODUCT_LEAD_EDIT, scope: Scopes.OWN },
        { permission: Permissions.PRODUCT_REPORT_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_VIEW, scope: Scopes.OWN },
        { permission: Permissions.TASK_MANAGE, scope: Scopes.OWN },
        { permission: Permissions.INTERACTION_CREATE, scope: Scopes.OWN },
        { permission: Permissions.EXPORT_REQUEST, scope: Scopes.OWN },
      ],
    },
    // 14. Pharmacy Store: stock updates only
    {
      roleCode: Roles.PHARMACY_STORE,
      permissions: [
        { permission: Permissions.PRODUCT_VIEW, scope: Scopes.ALL },
        { permission: Permissions.PRODUCT_STOCK_UPDATE, scope: Scopes.ALL },
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
      name: 'Managing Director',
      email: 'md@hospital.local',
      mobile: '+919800000099',
      roleCode: Roles.OWNER,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: true,
    },
    {
      name: 'Hospital Administrator',
      email: 'admin@samadselements.com',
      mobile: '+919800000098',
      roleCode: Roles.ADMIN,
      teams: [Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE],
      dutyNurse: false,
      dutyDoctor: false,
    },
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
    {
      name: 'Sr. Bindu Thomas (Treatment Follow-up Executive)',
      email: 'treatment1@hospital.test',
      mobile: '+919800000051',
      roleCode: Roles.TREATMENT_FOLLOWUP_EXECUTIVE,
      teams: [Teams.TREATMENT_FOLLOWUP],
      dutyNurse: true,
      dutyDoctor: false,
    },
    {
      name: 'Anu Mohan (Front Office Reception)',
      email: 'reception1@hospital.test',
      mobile: '+919800000052',
      roleCode: Roles.FRONT_OFFICE,
      teams: [],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Deepak V (Product Sales Executive)',
      email: 'prod_caller@hospital.test',
      mobile: '+919800000060',
      roleCode: Roles.PRODUCT_SALES_EXECUTIVE,
      teams: [Teams.PRODUCT_SALES],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'Meera N (Product Manager)',
      email: 'prod_mgr@hospital.test',
      mobile: '+919800000061',
      roleCode: Roles.PRODUCT_MANAGER,
      teams: [Teams.PRODUCT_SALES],
      dutyNurse: false,
      dutyDoctor: false,
    },
    {
      name: 'George K (Pharmacy Store)',
      email: 'pharmacy@hospital.test',
      mobile: '+919800000062',
      roleCode: Roles.PHARMACY_STORE,
      teams: [],
      dutyNurse: false,
      dutyDoctor: false,
    },
  ];

  const seededUsers: Record<string, any> = {};
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
    seededUsers[du.email] = user;

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

  // 5. Seed 15 Departments + Other
  const departmentDefs = [
    { code: 'TRADITIONAL_AYURVEDA', labelEn: 'Traditional Ayurveda', labelMl: 'പരമ്പരാഗത ആയുർവേദം', sort: 1 },
    { code: 'INTEGRATED_MEDICINE', labelEn: 'Integrated Medicine', labelMl: 'ഇന്റഗ്രേറ്റഡ് മെഡിസിൻ', sort: 2 },
    { code: 'PSYCHOLOGICAL_COUNSELING', labelEn: 'Psychological Counseling', labelMl: 'സൈക്കോളജിക്കൽ കൗൺസിലിംഗ്', sort: 3 },
    { code: 'YOGA_WELLNESS', labelEn: 'Yoga and Wellness', labelMl: 'യോഗ & വെൽനസ്', sort: 4 },
    { code: 'HIJAMA_ACUPUNCTURE', labelEn: 'Hijama and Acupuncture', labelMl: 'ഹിജാമ & അക്യുപങ്ചർ', sort: 5 },
    { code: 'PHYSIOTHERAPY_NATUROPATHY', labelEn: 'Physiotherapy and Naturopathy', labelMl: 'ഫിസിയോതെറാപ്പി & നേച്ചുറോപ്പതി', sort: 6 },
    { code: 'DIABETIC_VARICOSE', labelEn: 'Diabetic and Varicose Clinic', labelMl: 'ഡയബറ്റിക് & വെരിക്കോസ് ക്ലിനിക്ക്', sort: 7 },
    { code: 'ELECTRO_HOMEOPATHY', labelEn: 'Electro Homeopathy', labelMl: 'ഇലക്ട്രോ ഹോമിയോപ്പതി', sort: 8 },
    { code: 'DE_ADDICTION_REFLEXOLOGY', labelEn: 'De-addiction and Reflexology', labelMl: 'ഡി-അഡിക്ഷൻ & റിഫ്ലെക്സോളജി', sort: 9 },
    { code: 'PANCHA_KARMA_SPA', labelEn: 'Pancha Karma and Spa', labelMl: 'പഞ്ചകർമ്മ & സ്പാ', sort: 10 },
    { code: 'INFERTILITY_COSMETIC', labelEn: 'Infertility and Cosmetic Clinic', labelMl: 'ഇൻഫെർട്ടിലിറ്റി & കോസ്മെറ്റിക് ക്ലിനിക്ക്', sort: 11 },
    { code: 'MARMA_BONE_ALIGNMENT', labelEn: 'Marma and Bone Alignment', labelMl: 'മർമ്മ & അസ്ഥി ക്രമീകരണം', sort: 12 },
    { code: 'POST_NATAL_CARE', labelEn: 'Post Natal Care', labelMl: 'പ്രസവാനന്തര ശുശ്രൂഷ', sort: 13 },
    { code: 'LABS_SCANS', labelEn: 'Labs and Scans', labelMl: 'ലാബുകൾ & സ്കാനുകൾ', sort: 14 },
    { code: 'CIRCUMCISION', labelEn: 'Circumcision', labelMl: 'സുന്നത്ത് ക്ലിനിക്ക്', sort: 15 },
    { code: 'OTHER', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 16 },
  ];

  for (const dept of departmentDefs) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { labelEn: dept.labelEn, labelMl: dept.labelMl, sort: dept.sort },
      create: dept,
    });
  }
  console.log('✓ 15 Departments + Other seeded with Malayalam labels');

  // 6. Seed Sources
  const sourceDefs = [
    { code: 'GOOGLE_ADS', labelEn: 'Google Ads', labelMl: 'ഗൂഗിൾ പരസ്യങ്ങൾ', sort: 1 },
    { code: 'META_ADS', labelEn: 'Meta Ads', labelMl: 'മെറ്റ പരസ്യങ്ങൾ', sort: 2 },
    { code: 'DOCTOR_REFERRAL', labelEn: 'Doctor Referral', labelMl: 'ഡോക്ടർ റെഫറൽ', sort: 3 },
    { code: 'PATIENT_REFERRAL', labelEn: 'Patient Referral', labelMl: 'രോഗി റെഫറൽ', sort: 4 },
    { code: 'WEBSITE', labelEn: 'Website', labelMl: 'വെബ്സൈറ്റ്', sort: 5 },
    { code: 'WALK_IN', labelEn: 'Walk-in', labelMl: 'നേരിട്ടെത്തിയവർ', sort: 6 },
    { code: 'CAMP_EVENT', labelEn: 'Camp or Event', labelMl: 'മെഡിക്കൽ ക്യാമ്പ് / ഇവന്റ്', sort: 7 },
    { code: 'WHATSAPP', labelEn: 'WhatsApp', labelMl: 'വാട്സ്ആപ്പ്', sort: 8 },
    { code: 'PHONE_CALL', labelEn: 'Phone Call', labelMl: 'ഫോൺ കോൾ', sort: 9 },
    { code: 'OTHER', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 10 },
  ];

  for (const src of sourceDefs) {
    await prisma.source.upsert({
      where: { code: src.code },
      update: { labelEn: src.labelEn, labelMl: src.labelMl, sort: src.sort },
      create: src,
    });
  }
  console.log('✓ 10 Sources seeded');

  // 7. Seed Call Outcomes
  const callOutcomeDefs = [
    { code: 'APPOINTMENT_BOOKED', labelEn: 'Appointment Booked', labelMl: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്തു', scope: 'treatment', sort: 1 },
    { code: 'CALLBACK_REQUESTED', labelEn: 'Callback Requested', labelMl: 'തിരിച്ചുവിളിക്കാൻ ആവശ്യപ്പെട്ടു', scope: 'both', sort: 2 },
    { code: 'INTERESTED_NOT_READY', labelEn: 'Interested Not Ready', labelMl: 'താല്പര്യമുണ്ട്, ഇപ്പോൾ സാധ്യമല്ല', scope: 'treatment', sort: 3 },
    { code: 'INFORMATION_GIVEN', labelEn: 'Information Given', labelMl: 'വിവരങ്ങൾ നൽകി', scope: 'both', sort: 4 },
    { code: 'NO_ANSWER', labelEn: 'No Answer', labelMl: 'ഫോൺ എടുത്തില്ല', scope: 'both', sort: 5 },
    { code: 'SWITCHED_OFF_BUSY', labelEn: 'Switched Off or Busy', labelMl: 'സ്വിച്ച്ഡ് ഓഫ് അല്ലെങ്കിൽ ബിസി', scope: 'both', sort: 6 },
    { code: 'WRONG_NUMBER', labelEn: 'Wrong Number', labelMl: 'തെറ്റായ നമ്പർ', scope: 'both', sort: 7 },
    { code: 'NOT_INTERESTED', labelEn: 'Not Interested', labelMl: 'താല്പര്യമില്ല', scope: 'both', sort: 8 },
    { code: 'EMERGENCY_REDIRECTED', labelEn: 'Emergency Redirected', labelMl: 'അടിയന്തിര വിഭാഗത്തിലേക്ക് തിരിച്ചുവിട്ടു', scope: 'treatment', sort: 9 },
    { code: 'COMPLAINT', labelEn: 'Complaint', labelMl: 'പരാതി', scope: 'treatment', sort: 10 },
    // Product Call Outcomes
    { code: 'INTERESTED', labelEn: 'Interested', labelMl: 'താല്പര്യമുണ്ട്', scope: 'product', sort: 11 },
    { code: 'ORDER_CONFIRMED', labelEn: 'Order Confirmed', labelMl: 'ഓർഡർ സ്ഥിരീകരിച്ചു', scope: 'product', sort: 12 },
    { code: 'PRICE_CONCERN', labelEn: 'Price Concern', labelMl: 'വില കൂടുതൽ', scope: 'product', sort: 13 },
    { code: 'OUT_OF_STOCK_WAITLISTED', labelEn: 'Out of Stock and Waitlisted', labelMl: 'സ്റ്റോക്കില്ല, വെയിറ്റ്‌ലിസ്റ്റ് ചെയ്തു', scope: 'product', sort: 14 },
    { code: 'NEEDS_DOCTOR_ADVICE', labelEn: 'Needs Doctor Advice', labelMl: 'ഡോക്ടറുടെ ഉപദേശം വേണം', scope: 'product', sort: 15 },
  ];

  for (const co of callOutcomeDefs) {
    await prisma.callOutcome.upsert({
      where: { code: co.code },
      update: { labelEn: co.labelEn, labelMl: co.labelMl, scope: co.scope, sort: co.sort },
      create: co,
    });
  }
  console.log('✓ 15 Call Outcomes seeded (treatment, product, and both)');

  // 8. Seed Lost Reasons (Leads)
  const lostReasonDefs = [
    { code: 'PRICE', labelEn: 'Price', labelMl: 'ചികിത്സാ ചെലവ്', sort: 1 },
    { code: 'DISTANCE', labelEn: 'Distance', labelMl: 'ദൂരം', sort: 2 },
    { code: 'CHOSE_ANOTHER_CENTER', labelEn: 'Chose Another Center', labelMl: 'മറ്റൊരു സെന്റർ തിരഞ്ഞെടുത്തു', sort: 3 },
    { code: 'NOT_READY', labelEn: 'Not Ready', labelMl: 'ഇപ്പോൾ തയ്യാറല്ല', sort: 4 },
    { code: 'NO_RESPONSE', labelEn: 'No Response', labelMl: 'പ്രതികരണമില്ല', sort: 5 },
    { code: 'WRONG_NUMBER', labelEn: 'Wrong Number', labelMl: 'തെറ്റായ നമ്പർ', sort: 6 },
    { code: 'NOT_SUITABLE', labelEn: 'Not Suitable', labelMl: 'അനുയോജ്യമല്ല', sort: 7 },
    { code: 'OTHER', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 8 },
  ];

  for (const lr of lostReasonDefs) {
    await prisma.lostReason.upsert({
      where: { code: lr.code },
      update: { labelEn: lr.labelEn, labelMl: lr.labelMl, sort: lr.sort },
      create: lr,
    });
  }
  console.log('✓ 8 Lost Reasons seeded');

  // 9. Seed Decline Reasons (Admission Cases)
  const declineReasonDefs = [
    { code: 'COST', labelEn: 'Cost', labelMl: 'ചെലവ് കൂടുതൽ', sort: 1 },
    { code: 'DISTANCE', labelEn: 'Distance', labelMl: 'യാത്രാ ദൂരം', sort: 2 },
    { code: 'FAMILY_DECISION', labelEn: 'Family Decision', labelMl: 'കുടുംബ തീരുമാനം', sort: 3 },
    { code: 'CHOSE_ANOTHER_CENTER', labelEn: 'Chose Another Center', labelMl: 'മറ്റൊരു ആശുപത്രി തിരഞ്ഞെടുത്തു', sort: 4 },
    { code: 'NOT_READY', labelEn: 'Not Ready', labelMl: 'ഇപ്പോൾ തയ്യാറല്ല', sort: 5 },
    { code: 'NOT_SUITABLE', labelEn: 'Not Suitable', labelMl: 'അനുയോജ്യമല്ല', sort: 6 },
    { code: 'OTHER', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 7 },
  ];

  for (const dr of declineReasonDefs) {
    await prisma.declineReason.upsert({
      where: { code: dr.code },
      update: { labelEn: dr.labelEn, labelMl: dr.labelMl, sort: dr.sort },
      create: dr,
    });
  }
  console.log('✓ 7 Decline Reasons seeded');

  // 10. Seed Closure Codes (Aftercare Cases)
  const closureCodeDefs = [
    { code: 'IMPROVED', labelEn: 'Improved', labelMl: 'രോഗശമനം ഉണ്ടായി', sort: 1 },
    { code: 'NO_CHANGE', labelEn: 'No Change', labelMl: 'മാറ്റമില്ല', sort: 2 },
    { code: 'REFERRED', labelEn: 'Referred', labelMl: 'റഫർ ചെയ്തു', sort: 3 },
    { code: 'DISCONTINUED', labelEn: 'Discontinued', labelMl: 'ചികിത്സ നിർത്തിവച്ചു', sort: 4 },
    { code: 'LOST_TO_FOLLOW_UP', labelEn: 'Lost to Follow-up', labelMl: 'ബന്ധപ്പെടാൻ സാധിച്ചില്ല', sort: 5 },
  ];

  for (const cc of closureCodeDefs) {
    await prisma.closureCode.upsert({
      where: { code: cc.code },
      update: { labelEn: cc.labelEn, labelMl: cc.labelMl, sort: cc.sort },
      create: cc,
    });
  }
  console.log('✓ 5 Closure Codes seeded');

  // 11. Seed System Settings
  const defaultSettings = [
    {
      key: 'calling_hours',
      value: {
        start: '09:00',
        end: '20:00',
        timezone: 'Asia/Kolkata',
        enforce: true,
      },
    },
    {
      key: 'sla_minutes',
      value: {
        meta_ads: 5,
        google_ads: 5,
        default: 15,
        business_hours_only: true,
      },
    },
    {
      key: 'contact_rules',
      value: {
        max_calls_per_day: 1,
        max_attempts_per_cycle: 3,
        warn_on_excess: true,
      },
    },
    {
      key: 'quiet_hours',
      value: {
        enabled: true,
        start: '20:00',
        end: '09:00',
      },
    },
    {
      key: 'retention_policies',
      value: {
        leads_days: 1825, // 5 years
        audit_days: 2555, // 7 years
      },
    },
    {
      key: 'testimonial_followup_hours',
      value: {
        hours: 24,
      },
    },
    {
      key: 'adherence_thresholds',
      value: {
        medium_missed_in_last_3: 1,
        medium_rate: 80,
        high_consecutive_missed: 2,
        high_rate: 60,
      },
    },
    {
      key: 'daily_reminder_mode',
      value: 'each_visit',
    },
    {
      key: 'inpatient_checkin_interval_days',
      value: 3,
    },
    {
      key: 'followup_call_limit_per_day',
      value: 2,
    },
    {
      key: 'unmarked_visit_grace_minutes',
      value: 60,
    },
    {
      key: 'product_first_response_minutes',
      value: 15,
    },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✓ System Settings (calling hours, SLA, contact rules, adherence thresholds, followup limits) seeded');

  // 12. Seed Starter Product Categories
  const starterCategories = [
    { name: 'Uncategorized', slug: 'uncategorized', sort: 1, description: 'Default category for products' },
    { name: 'Immunity and Wellness', slug: 'immunity-and-wellness', sort: 2, description: 'Products supporting immune health and overall vitality' },
    { name: 'Pain and Joint Care', slug: 'pain-and-joint-care', sort: 3, description: 'Ayurvedic formulations for joints, muscles, and mobility' },
    { name: 'Digestive Health', slug: 'digestive-health', sort: 4, description: 'Gut health, digestion, and metabolic balance' },
    { name: 'Skin and Hair', slug: 'skin-and-hair', sort: 5, description: 'Natural remedies for skin clarity and hair nourishment' },
    { name: 'Women\'s Health', slug: 'womens-health', sort: 6, description: 'Dedicated wellness products for women' },
    { name: 'Diabetes Care', slug: 'diabetes-care', sort: 7, description: 'Herbal and dietary support for healthy glucose levels' },
    { name: 'Respiratory Care', slug: 'respiratory-care', sort: 8, description: 'Herbal formulations for respiratory comfort' },
    { name: 'Oils and External Use', slug: 'oils-and-external-use', sort: 9, description: 'Traditional thailams and external application remedies' },
    { name: 'General', slug: 'general', sort: 10, description: 'General health and daily wellness' },
  ];

  for (const cat of starterCategories) {
    await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sort: cat.sort, description: cat.description },
      create: { name: cat.name, slug: cat.slug, sort: cat.sort, description: cat.description, active: true },
    });
  }
  console.log('✓ 10 Starter Product Categories seeded');

  // 11b. Seed Therapies & Visit Types
  const therapyDefs = [
    { code: 'doctor_review', labelEn: 'Doctor Review', labelMl: 'ഡോക്ടർ പരിശോധന', sort: 1 },
    { code: 'pancha_karma', labelEn: 'Pancha Karma Session', labelMl: 'പഞ്ചകർമ്മ സെഷൻ', sort: 2 },
    { code: 'physiotherapy', labelEn: 'Physiotherapy Session', labelMl: 'ഫിസിയോതെറാപ്പി സെഷൻ', sort: 3 },
    { code: 'naturopathy', labelEn: 'Naturopathy Session', labelMl: 'പ്രകൃതിചികിത്സ സെഷൻ', sort: 4 },
    { code: 'hijama', labelEn: 'Hijama Session', labelMl: 'ഹിജാമ സെഷൻ', sort: 5 },
    { code: 'acupuncture', labelEn: 'Acupuncture Session', labelMl: 'അക്യുപങ്ചർ സെഷൻ', sort: 6 },
    { code: 'electro_homeopathy', labelEn: 'Electro Homeopathy Session', labelMl: 'ഇലക്ട്രോ ഹോമിയോപ്പതി സെഷൻ', sort: 7 },
    { code: 'yoga', labelEn: 'Yoga Session', labelMl: 'യോഗ സെഷൻ', sort: 8 },
    { code: 'counseling', labelEn: 'Counseling Session', labelMl: 'കൗൺസിലിംഗ് സെഷൻ', sort: 9 },
    { code: 'reflexology', labelEn: 'Reflexology Session', labelMl: 'റിഫ്ലെക്സോളജി സെഷൻ', sort: 10 },
    { code: 'procedure_care', labelEn: 'Dressing or Procedure Care', labelMl: 'ഡ്രസ്സിംഗ് / പ്രൊസീജിയർ പരിചരണം', sort: 11 },
    { code: 'other', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 12 },
  ];

  const seededTherapies: Record<string, any> = {};
  for (const th of therapyDefs) {
    seededTherapies[th.code] = await prisma.therapy.upsert({
      where: { code: th.code },
      update: { labelEn: th.labelEn, labelMl: th.labelMl, sort: th.sort },
      create: th,
    });
  }
  console.log('✓ 12 Therapies seeded with Malayalam labels');

  // 11c. Seed Missed Reasons
  const missedReasonDefs = [
    { code: 'transport', labelEn: 'Transport', labelMl: 'യാത്രാസൗകര്യക്കുറവ്', sort: 1 },
    { code: 'illness', labelEn: 'Illness', labelMl: 'അസുഖം', sort: 2 },
    { code: 'family_reason', labelEn: 'Family Reason', labelMl: 'കുടുംബപരമായ കാരണം', sort: 3 },
    { code: 'work', labelEn: 'Work', labelMl: 'ജോലി തിരക്ക്', sort: 4 },
    { code: 'cost', labelEn: 'Cost', labelMl: 'ചെലവ് / സാമ്പത്തിക ബുദ്ധിമുട്ട്', sort: 5 },
    { code: 'forgot', labelEn: 'Forgot', labelMl: 'മറന്നുപോയി', sort: 6 },
    { code: 'felt_better', labelEn: 'Felt Better', labelMl: 'സുഖം തോന്നി', sort: 7 },
    { code: 'not_convinced', labelEn: 'Not Convinced', labelMl: 'വിശ്വാസമില്ലായ്മ', sort: 8 },
    { code: 'other', labelEn: 'Other', labelMl: 'മറ്റുള്ളവ', sort: 9 },
  ];

  const seededMissedReasons: Record<string, any> = {};
  for (const mr of missedReasonDefs) {
    seededMissedReasons[mr.code] = await prisma.missedReason.upsert({
      where: { code: mr.code },
      update: { labelEn: mr.labelEn, labelMl: mr.labelMl, sort: mr.sort },
      create: mr,
    });
  }
  console.log('✓ 9 Missed Reasons seeded with Malayalam labels');

  // 11d. Seed Assignment Rule for Treatment Follow-up Desk
  const existingFollowupRule = await prisma.assignmentRule.findFirst({
    where: { resource: 'case_treatment_followup' },
  });
  if (existingFollowupRule) {
    await prisma.assignmentRule.update({
      where: { id: existingFollowupRule.id },
      data: {
        targetTeam: Teams.TREATMENT_FOLLOWUP,
        maxOpenPerUser: 50,
        active: true,
      },
    });
  } else {
    await prisma.assignmentRule.create({
      data: {
        name: 'Treatment Follow-up Desk Default Assignment',
        resource: 'case_treatment_followup',
        targetTeam: Teams.TREATMENT_FOLLOWUP,
        priorityOrder: 1,
        conditions: {},
        maxOpenPerUser: 50,
        active: true,
      },
    });
  }
  console.log('✓ Treatment Follow-up assignment rule seeded');

  await ensureDefaultCadences(prisma);
  console.log('✓ Default Cadences & Steps seeded');

  // 12. Seed 40 Synthetic Leads
  const t1 = seededUsers['telecaller1@hospital.test'];
  const t2 = seededUsers['telecaller2@hospital.test'];
  const managerUser = seededUsers['manager@hospital.test'];
  const ownerUser = seededUsers['owner@hospital.test'];

  const depts = await prisma.department.findMany();
  const sources = await prisma.source.findMany();

  const syntheticLeadDefs = [
    { name: 'ഫാത്തിമ റഹ്മാൻ', mobile: '+919800000010', lang: 'ml', concern: 'മുട്ടുവേദനയും നടുവേദനയും കാരണം നടക്കാൻ പ്രയാസപ്പെടുന്നു. ആയുർവേദ ചികിത്സ താല്പര്യപ്പെടുന്നു.', deptCode: 'ayurveda', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'Rajesh Nair', mobile: '+919800000011', lang: 'en', concern: 'Chronic lower back pain L4-L5 disc bulge inquiry for Marma alignment', deptCode: 'marma', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t2.id },
    { name: 'Mary Varghese', mobile: '+919800000012', lang: 'en', concern: 'Varicose veins laser/leech therapy consultation needed for severe swelling', deptCode: 'varicose', sourceCode: 'WEBSITE', status: 'contacted', priority: 'warm', ownerId: t1.id },
    { name: 'മുഹമ്മദ് ആഷിഖ്', mobile: '+919800000013', lang: 'ml', concern: 'കഠിനമായ മൈഗ്രേൻ തലവേദനയ്ക്ക് ഹിജാമ (കപ്പിംഗ്) തെറാപ്പി അന്വേഷിക്കുന്നു', deptCode: 'hijama', sourceCode: 'META_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id },
    { name: 'Lakshmi Pillai', mobile: '+919800000014', lang: 'en', concern: 'Post-natal care package inquiry for newborn and mother rehabilitation', deptCode: 'post_natal', sourceCode: 'PATIENT_REFERRAL', status: 'appointment_booked', priority: 'hot', ownerId: t1.id },
    { name: 'അബ്ദുൾ ഖാദർ', mobile: '+919800000015', lang: 'ml', concern: 'പ്രമേഹ രോഗികൾക്കുള്ള കാലിലെ പഴുപ്പ് ചികിത്സയും പഞ്ചകർമ്മ തെറാപ്പിയും', deptCode: 'varicose', sourceCode: 'DOCTOR_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t2.id },
    { name: 'Anjali Menon', mobile: '+919800000016', lang: 'en', concern: 'Fertility and PCOS natural therapy package inquiry', deptCode: 'infertility', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'തോമസ് മാത്യു', mobile: '+919800000017', lang: 'ml', concern: 'സ്ട്രോക്കിന് ശേഷമുള്ള ഫിസിയോതെറാപ്പിയും ആയുർവേദ പുനരധിവാസവും', deptCode: 'physiotherapy', sourceCode: 'PHONE_CALL', status: 'qualified', priority: 'warm', ownerId: t2.id },
    { name: 'Deepa Krishnan', mobile: '+919800000018', lang: 'en', concern: 'Chronic anxiety, sleep disorders and stress relief counseling', deptCode: 'counseling', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t1.id },
    { name: 'ഷാജി സലീം', mobile: '+919800000019', lang: 'ml', concern: 'പുകവലി, മദ്യപാന വിമുക്തി ചികിത്സയ്ക്കായുള്ള കൗൺസിലിംഗ് അന്വേഷണം', deptCode: 'deaddiction', sourceCode: 'META_ADS', status: 'contacted', priority: 'warm', ownerId: t2.id },
    { name: 'Sanjay Varma', mobile: '+919800000020', lang: 'en', concern: 'Full body rejuvenation Panchakarma 14 days wellness retreat pricing', deptCode: 'panchakarma', sourceCode: 'WEBSITE', status: 'qualified', priority: 'warm', ownerId: t1.id },
    { name: 'സുജാത മേനോൻ', mobile: '+919800000021', lang: 'ml', concern: 'തൈറോയ്ഡ്, അമിതവണ്ണ നിയന്ത്രണത്തിനായുള്ള യോഗയും പ്രകൃതിചികിത്സയും', deptCode: 'yoga', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t2.id },
    { name: 'Kavitha R', mobile: '+919800000022', lang: 'en', concern: 'Skin pigmentation and cosmetic acupuncture options', deptCode: 'infertility', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'ഹരിദാസ് കെ.പി', mobile: '+919800000023', lang: 'ml', concern: 'കഴുത്ത് തിരിക്കാൻ പറ്റാത്ത വിധം വേദന (സെർവിക്കൽ സ്പോണ്ടിലോസിസ്)', deptCode: 'marma', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t2.id },
    { name: 'George Mathew', mobile: '+919800000024', lang: 'en', concern: 'Routine executive health checkup lab packages and ultrasounds', deptCode: 'labs', sourceCode: 'PHONE_CALL', status: 'contacted', priority: 'cold', ownerId: t1.id },
    { name: 'ആയിഷ ബീവി', mobile: '+919800000025', lang: 'ml', concern: 'കുഞ്ഞിന്റെ സുന്നത്ത് (സർക്കംസിഷൻ) സർജറി സംബന്ധിച്ച വിവരങ്ങൾ', deptCode: 'circumcision', sourceCode: 'DOCTOR_REFERRAL', status: 'qualified', priority: 'warm', ownerId: t2.id },
    { name: 'Pradeep Kumar', mobile: '+919800000026', lang: 'en', concern: 'Knee ligament tear post-accident physiotherapy rehabilitation', deptCode: 'physiotherapy', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t1.id },
    { name: 'ജയശ്രീ പിള്ള', mobile: '+919800000027', lang: 'ml', concern: 'വിട്ടുമാറാത്ത സോറിയാസിസ് ത്വക്ക് രോഗത്തിന് പരമ്പരാഗത ആയുർവേദം', deptCode: 'ayurveda', sourceCode: 'PATIENT_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t2.id },
    { name: 'Naveen Joseph', mobile: '+919800000028', lang: 'en', concern: 'Electro-homeopathy medicine consultation for chronic sinusitis', deptCode: 'electro_homeo', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t1.id },
    { name: 'നൂർജഹാൻ എം', mobile: '+919800000029', lang: 'ml', concern: 'ഗർഭധാരണത്തിന് മുൻപുള്ള പ്രീ-കൺസെപ്ഷൻ ആയുർവേദ കെയർ', deptCode: 'infertility', sourceCode: 'META_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id },
    { name: 'Ajith Balakrishnan', mobile: '+919800000030', lang: 'en', concern: 'Shoulder dislocation physiotherapy after cricket injury', deptCode: 'physiotherapy', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'വിനോദ് കുമാർ', mobile: '+919800000031', lang: 'ml', concern: 'നടുവേദന കാരണം ഡ്രൈവ് ചെയ്യാൻ ബുദ്ധിമുട്ട്. മർമ്മ ചികിത്സ താല്പര്യം', deptCode: 'marma', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id },
    { name: 'Bhavana Das', mobile: '+919800000032', lang: 'en', concern: 'Post-covid fatigue syndrome integrated medicine consultation', deptCode: 'integrated', sourceCode: 'DOCTOR_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t1.id },
    { name: 'സൈനുദ്ദീൻ വി.പി', mobile: '+919800000033', lang: 'ml', concern: 'വെരിക്കോസ് വെയിൻ കാരണം കാലുകളിൽ വ്രണങ്ങളും കറുത്ത പാടുകളും', deptCode: 'varicose', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t2.id },
    { name: 'Geetha Raman', mobile: '+919800000034', lang: 'en', concern: 'Yoga therapy classes for elderly hypertension management', deptCode: 'yoga', sourceCode: 'CAMP_EVENT', status: 'qualified', priority: 'warm', ownerId: t1.id },
    { name: 'പ്രശാന്ത് പി', mobile: '+919800000035', lang: 'ml', concern: 'കായികതാരങ്ങൾക്കായുള്ള സ്പോർട്സ് മസാജും പഞ്ചകർമ്മ തൈലങ്ങളും', deptCode: 'panchakarma', sourceCode: 'PHONE_CALL', status: 'contacted', priority: 'cold', ownerId: t2.id },
    { name: 'Laila Kabeer', mobile: '+919800000036', lang: 'en', concern: 'Neonatal circumcision slot booking and pediatrician consultation', deptCode: 'circumcision', sourceCode: 'DOCTOR_REFERRAL', status: 'appointment_booked', priority: 'hot', ownerId: t1.id },
    { name: 'മനോജ് നമ്പൂതിരി', mobile: '+919800000037', lang: 'ml', concern: 'മാനസിക സമ്മർദ്ദവും ഡിപ്രഷനും കാരണമുള്ള കൗൺസിലിംഗ് സെഷൻ', deptCode: 'counseling', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id },
    { name: 'Divya Unnikrishnan', mobile: '+919800000038', lang: 'en', concern: 'Post-pregnancy back pain relief and herbal dietary advice', deptCode: 'post_natal', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'റാഫി മുഹമ്മദ്', mobile: '+919800000039', lang: 'ml', concern: 'ഷുഗർ കൂടിയതുകാരണം ഉണ്ടായ കാൽ മരവിപ്പിന് റിഫ്ലെക്സോളജി', deptCode: 'deaddiction', sourceCode: 'GOOGLE_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id },
    { name: 'Arun Chandran', mobile: '+919800000040', lang: 'en', concern: 'Acupuncture therapy for facial nerve paralysis (Bells palsy)', deptCode: 'hijama', sourceCode: 'PATIENT_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t1.id },
    { name: 'സാവിത്രി അമ്മ', mobile: '+919800000041', lang: 'ml', concern: 'മുട്ടിലെ തേയ്മാനം മൂലം ഇരിക്കാനും എഴുന്നേൽക്കാനും പ്രയാസം', deptCode: 'ayurveda', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t2.id },
    { name: 'Rahul V.S', mobile: '+919800000042', lang: 'en', concern: 'Comprehensive blood scan panel and thyroid profile booking', deptCode: 'labs', sourceCode: 'PHONE_CALL', status: 'new', priority: 'warm', ownerId: t1.id },
    { name: 'മുജീബ് റഹ്മാൻ', mobile: '+919800000043', lang: 'ml', concern: 'കാലിലെ വെരിക്കോസ് ഞരമ്പുകൾ മുഴച്ചുനിൽക്കുന്നത് നീക്കം ചെയ്യാൻ', deptCode: 'varicose', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t2.id },
    { name: 'Suma Cherian', mobile: '+919800000044', lang: 'en', concern: 'Weight loss yoga and natural detox diet package inquiry', deptCode: 'yoga', sourceCode: 'WEBSITE', status: 'contacted', priority: 'cold', ownerId: t1.id },
    { name: 'ഗിരീഷ് ബാബു', mobile: '+919800000045', lang: 'ml', concern: 'തോൾ സന്ധിയിലെ വേദന (ഫ്രോസൺ ഷോൾഡർ) ഫിസിയോതെറാപ്പി', deptCode: 'physiotherapy', sourceCode: 'GOOGLE_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id },
    { name: 'Anita Philip', mobile: '+919800000046', lang: 'en', concern: 'Post-delivery traditional massage and rejuvenation package', deptCode: 'post_natal', sourceCode: 'DOCTOR_REFERRAL', status: 'new', priority: 'warm', ownerId: t1.id },
    { name: 'ഹസ്സൻ കുട്ടി', mobile: '+919800000047', lang: 'ml', concern: 'മദ്യപാനം നിർത്തുന്നതിനായുള്ള കൗൺസിലിംഗും ഡി-അഡിക്ഷൻ ചികിത്സയും', deptCode: 'deaddiction', sourceCode: 'PHONE_CALL', status: 'new', priority: 'warm', ownerId: t2.id },
    { name: 'Siddharth M', mobile: '+919800000048', lang: 'en', concern: 'Lower back marma therapy for sciatica nerve compression', deptCode: 'marma', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id },
    { name: 'സുബൈദ ബീഗം', mobile: '+919800000049', lang: 'ml', concern: 'തലവേദനയ്ക്കും പിരടിവേദനയ്ക്കും ഡ്രൈ കപ്പിംഗ് (ഹിജാമ) ചികിത്സ', deptCode: 'hijama', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id },
  ];

  for (const sLead of syntheticLeadDefs) {
    const dept = depts.find((d) => d.code === sLead.deptCode) || depts[0];
    const src = sources.find((s) => s.code === sLead.sourceCode) || sources[0];

    // SLA calculation: Ad leads get 5m, others get 15m
    const isAd = src.code === 'META_ADS' || src.code === 'GOOGLE_ADS';
    const slaMin = isAd ? 5 : 15;
    const firstResponseDueAt = new Date(Date.now() + slaMin * 60 * 1000);

    await prisma.lead.upsert({
      where: { id: parseInt(sLead.mobile.slice(-4), 10) },
      update: {
        name: sLead.name,
        concern: sLead.concern,
        status: sLead.status,
        priority: sLead.priority,
        ownerId: sLead.ownerId,
        consentCalls: true,
        consentWhatsapp: true,
        consentSms: true,
      },
      create: {
        id: parseInt(sLead.mobile.slice(-4), 10),
        name: sLead.name,
        mobile: sLead.mobile,
        mobileNorm: sLead.mobile,
        language: sLead.lang,
        concern: sLead.concern,
        departmentId: dept.id,
        sourceId: src.id,
        branchId: mainBranch.id,
        status: sLead.status,
        priority: sLead.priority,
        ownerId: sLead.ownerId,
        firstResponseDueAt,
        consentCalls: true,
        consentWhatsapp: true,
        consentSms: true,
        consentSource: 'seed_synthetic',
        consentDate: new Date(),
      },
    });
  }
  console.log(`✓ ${syntheticLeadDefs.length} Synthetic Leads seeded with bilingual concerns`);

  // 13. Seed Synthetic Testimonials Library (Section 10)
  const ayurvedaDept = depts.find((d) => d.code === 'ayurveda') || depts[0];
  const marmaDept = depts.find((d) => d.code === 'marma') || depts[0];
  const varicoseDept = depts.find((d) => d.code === 'varicose') || depts[0];

  const syntheticTestimonials = [
    {
      title: 'മുട്ടുവേദന ആയുർവേദ ചികിത്സയിലൂടെ ഭേദമായ അനുഭവം',
      type: 'video',
      url: 'https://cdn.hospital.test/testimonials/knee-ayurveda.mp4',
      language: 'ml',
      departmentId: ayurvedaDept.id,
      summary: 'മുട്ടിലെ തേയ്മാനം മൂലം നടക്കാൻ ബുദ്ധിമുട്ടിയ രോഗി 14 ദിവസത്തെ ചികിത്സ കൊണ്ട് സുഖം പ്രാപിച്ച അനുഭവം.',
      consentConfirmed: true,
      consentReference: 'DEMO-001',
      approvedBy: ownerUser.id,
      approvedAt: new Date(),
      active: true,
      createdBy: ownerUser.id,
    },
    {
      title: 'Back Pain Recovery through Marma Alignment',
      type: 'text',
      url: 'https://cdn.hospital.test/testimonials/backpain-marma.pdf',
      language: 'en',
      departmentId: marmaDept.id,
      summary: 'Office professional shares experience of relieving severe lumbar back pain without surgery after 7 sessions of Marma alignment.',
      consentConfirmed: true,
      consentReference: 'DEMO-002',
      approvedBy: ownerUser.id,
      approvedAt: new Date(),
      active: true,
      createdBy: ownerUser.id,
    },
    {
      title: 'Varicose Veins Laser Therapy Clinical Case',
      type: 'pdf',
      url: 'https://cdn.hospital.test/testimonials/varicose-veins-case.pdf',
      language: 'en',
      departmentId: varicoseDept.id,
      summary: 'Patient documentation highlighting complete resolution of swelling, burning sensation, and skin discoloration post laser and leech therapy.',
      consentConfirmed: true,
      consentReference: 'DEMO-003',
      approvedBy: ownerUser.id,
      approvedAt: new Date(),
      active: true,
      createdBy: ownerUser.id,
    },
  ];

  const seededLibrary: any[] = [];
  for (const tDef of syntheticTestimonials) {
    const existing = await prisma.testimonial.findFirst({
      where: { consentReference: tDef.consentReference },
    });
    if (existing) {
      seededLibrary.push(
        await prisma.testimonial.update({
          where: { id: existing.id },
          data: tDef,
        })
      );
    } else {
      seededLibrary.push(await prisma.testimonial.create({ data: tDef }));
    }
  }
  console.log(`✓ ${seededLibrary.length} Synthetic Approved Testimonials seeded in library`);

  // 14. Seed Testimonial Sends for ~10 Leads across channels
  // Clear any previous seed sends to keep fresh state
  await prisma.leadTestimonialSendItem.deleteMany({});
  await prisma.leadTestimonialSend.deleteMany({});
  await prisma.interaction.deleteMany({
    where: {
      type: { in: ['testimonial_sent', 'testimonial_void'] },
    },
  });

  const sendSpecs = [
    { leadId: 10, channel: 'whatsapp', itemIdx: 0, sentBy: t1.id, note: 'വാട്സാപ്പ് വഴി വീഡിയോ അനുഭവം അയച്ചുകൊടുത്തു.', hoursAgo: 2 },
    { leadId: 11, channel: 'sms', itemIdx: 1, sentBy: t2.id, note: 'Sent Marma therapy feedback via SMS.', hoursAgo: 4 },
    { leadId: 12, channel: 'email', itemIdx: 2, sentBy: t1.id, note: 'Email sent with case summary document.', hoursAgo: 6 },
    { leadId: 13, channel: 'call_readout', itemIdx: 0, sentBy: t2.id, note: 'Read out key patient recovery points during phone consultation.', hoursAgo: 8 },
    { leadId: 14, channel: 'whatsapp', itemIdx: 1, sentBy: t1.id, note: 'Sent WhatsApp link before booking appointment.', hoursAgo: 10 },
    { leadId: 15, channel: 'other', itemIdx: 2, sentBy: t2.id, note: 'Printed brochure shared with patient attendant.', hoursAgo: 12 },
    { leadId: 16, channel: 'whatsapp', itemIdx: 0, sentBy: t1.id, note: 'Video testimonial sent upon patient inquiry.', hoursAgo: 14 },
    { leadId: 17, channel: 'sms', itemIdx: 1, sentBy: t2.id, note: 'SMS sent with results disclaimer.', hoursAgo: 16 },
    { leadId: 18, channel: 'whatsapp', itemIdx: 0, sentBy: t1.id, note: 'Shared link with greeting.', hoursAgo: 18 },
    { leadId: 19, channel: 'call_readout', itemIdx: 1, sentBy: t2.id, note: 'Read out testimonial on call as requested.', hoursAgo: 20 },
  ];

  for (const spec of sendSpecs) {
    const testimonial = seededLibrary[spec.itemIdx];
    const sentAt = new Date(Date.now() - spec.hoursAgo * 3600 * 1000);

    const send = await prisma.leadTestimonialSend.create({
      data: {
        leadId: spec.leadId,
        sentBy: spec.sentBy,
        sentAt,
        channel: spec.channel,
        note: spec.note,
        items: {
          create: [{ testimonialId: testimonial.id }],
        },
      },
    });

    // Write timeline interaction
    await prisma.interaction.create({
      data: {
        type: 'testimonial_sent',
        direction: 'outbound',
        userId: spec.sentBy,
        leadId: spec.leadId,
        note: spec.note,
        details: {
          sendId: send.id,
          channel: spec.channel,
          testimonialIds: [testimonial.id],
          titles: [testimonial.title],
        },
        occurredAt: sentAt,
      },
    });

    // Update lead counters
    await prisma.lead.update({
      where: { id: spec.leadId },
      data: {
        testimonialsSentCount: 1,
        testimonialsLastSentAt: sentAt,
      },
    });
  }

  // Also add a voided send on Lead 10 to demonstrate void history in seed data
  const voidedSentAt = new Date(Date.now() - 5 * 3600 * 1000);
  const voidedSend = await prisma.leadTestimonialSend.create({
    data: {
      leadId: 10,
      sentBy: t1.id,
      sentAt: voidedSentAt,
      channel: 'sms',
      note: 'SMS sent earlier in the morning',
      voidedAt: new Date(Date.now() - 4 * 3600 * 1000),
      voidedBy: managerUser.id,
      voidReason: 'Patient requested WhatsApp instead of SMS link',
      items: {
        create: [{ testimonialId: seededLibrary[1].id }],
      },
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'testimonial_sent',
      direction: 'outbound',
      userId: t1.id,
      leadId: 10,
      note: 'SMS sent earlier in the morning',
      details: {
        sendId: voidedSend.id,
        channel: 'sms',
        testimonialIds: [seededLibrary[1].id],
        titles: [seededLibrary[1].title],
      },
      occurredAt: voidedSentAt,
    },
  });

  await prisma.interaction.create({
    data: {
      type: 'testimonial_void',
      direction: 'outbound',
      userId: managerUser.id,
      leadId: 10,
      note: 'Patient requested WhatsApp instead of SMS link',
      details: {
        sendId: voidedSend.id,
        voidReason: 'Patient requested WhatsApp instead of SMS link',
      },
      occurredAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
  });

  console.log(`✓ 10 Leads seeded with testimonial sends (including 1 voided send on Lead 10)`);

  // 14. Seed Treatment Follow-up Synthetic Cases, Schedules, Visits & Check-ins
  console.log('Seeding Treatment Follow-up Synthetic Cases & Schedules...');
  const treatmentExec = seededUsers['treatment1@hospital.test'];
  const doctorUser = seededUsers['doctor1@hospital.test'];
  const admissionUser = seededUsers['admission1@hospital.test'];

  // Clear existing synthetic treatment data
  await prisma.scheduledVisit.deleteMany({});
  await prisma.scheduleExtensionRequest.deleteMany({});
  await prisma.visitSchedule.deleteMany({});
  await prisma.treatmentCheckin.deleteMany({});
  await prisma.caseHandover.deleteMany({});
  await prisma.escalation.deleteMany({
    where: {
      escalationType: { in: ['adherence', 'inpatient_concern'] },
    },
  });

  const panchaKarmaTherapy = seededTherapies['pancha_karma'] || Object.values(seededTherapies)[0];
  const doctorReviewTherapy = seededTherapies['doctor_review'] || Object.values(seededTherapies)[0];
  const physioTherapy = seededTherapies['physiotherapy'] || Object.values(seededTherapies)[0];
  const naturopathyTherapy = seededTherapies['naturopathy'] || Object.values(seededTherapies)[0];
  const acupunctureTherapy = seededTherapies['acupuncture'] || Object.values(seededTherapies)[0];
  const reflexologyTherapy = seededTherapies['reflexology'] || Object.values(seededTherapies)[0];
  const procedureCareTherapy = seededTherapies['procedure_care'] || Object.values(seededTherapies)[0];

  const missedTransport = seededMissedReasons['transport'] || Object.values(seededMissedReasons)[0];
  const missedWork = seededMissedReasons['work'] || Object.values(seededMissedReasons)[0];
  const missedIllness = seededMissedReasons['illness'] || Object.values(seededMissedReasons)[0];
  const missedForgot = seededMissedReasons['forgot'] || Object.values(seededMissedReasons)[0];
  const missedCost = seededMissedReasons['cost'] || Object.values(seededMissedReasons)[0];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to format Date to YYYY-MM-DD
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Helper to add days
  const addDayOffset = (base: Date, days: number) => {
    const res = new Date(base);
    res.setDate(res.getDate() + days);
    return res;
  };

  const syntheticCases = [
    // 5 In-Patient Cases
    {
      code: 'PAT-TF-001',
      name: 'K. Ramanathan',
      mobile: '+919810000001',
      setting: 'inpatient',
      careType: 'in_patient',
      stage: 'in_treatment',
      therapy: panchaKarmaTherapy,
      sessions: 14,
      freq: 'daily',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
      expectedDischargeDays: 7,
      checkins: [
        { channel: 'bedside', contactedWho: 'Patient', condition: 'comfortable', therapiesAsPlanned: 'yes', note: 'Patient is comfortable. Pancha karma therapy well tolerated.' },
      ],
    },
    {
      code: 'PAT-TF-002',
      name: 'Zainaba Beevi',
      mobile: '+919810000002',
      setting: 'inpatient',
      careType: 'in_patient',
      stage: 'in_treatment',
      therapy: naturopathyTherapy,
      sessions: 10,
      freq: 'daily',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
      expectedDischargeDays: 5,
      checkins: [
        { channel: 'bedside', contactedWho: 'Family (Son)', condition: 'comfortable', therapiesAsPlanned: 'yes', note: 'Family reported good recovery. Diet preferences updated.' },
      ],
    },
    {
      code: 'PAT-TF-003',
      name: 'Madhavan Pillai',
      mobile: '+919810000003',
      setting: 'inpatient',
      careType: 'in_patient',
      stage: 'in_treatment',
      therapy: physioTherapy,
      sessions: 10,
      freq: 'daily',
      risk: 'medium',
      consecutiveMissed: 1,
      attRate: 75.0,
      expectedDischargeDays: 4,
      checkins: [
        { channel: 'bedside', contactedWho: 'Patient', condition: 'unwell', therapiesAsPlanned: 'no', missedTherapiesNote: 'Fever and chills, session paused', concerns: 'Patient feeling feverish', escalate: true, note: 'Escalated to duty doctor and ward nurse due to fever and nausea.' },
      ],
    },
    {
      code: 'PAT-TF-004',
      name: 'Gracy Joseph',
      mobile: '+919810000004',
      setting: 'inpatient',
      careType: 'in_patient',
      stage: 'in_treatment',
      therapy: reflexologyTherapy,
      sessions: 10,
      freq: 'daily',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
      expectedDischargeDays: 6,
      checkins: [
        { channel: 'call', contactedWho: 'Family (Daughter)', condition: 'comfortable', therapiesAsPlanned: 'yes', note: 'Telephonic check-in with family attendant.' },
      ],
    },
    {
      code: 'PAT-TF-005',
      name: 'Biju Augustine',
      mobile: '+919810000005',
      setting: 'inpatient',
      careType: 'in_patient',
      stage: 'in_treatment',
      therapy: procedureCareTherapy,
      sessions: 10,
      freq: 'daily',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
      expectedDischargeDays: 1,
      checkins: [
        { channel: 'bedside', contactedWho: 'Patient', condition: 'comfortable', therapiesAsPlanned: 'yes', note: 'Wound dressing intact and clean. Discharge readiness review planned tomorrow.' },
      ],
    },

    // 5 Out-Patient Cases
    {
      code: 'PAT-TF-006',
      name: 'Valsala Kumari',
      mobile: '+919810000006',
      setting: 'opd',
      careType: 'opd_course',
      stage: 'in_treatment',
      therapy: panchaKarmaTherapy,
      sessions: 12,
      freq: 'daily',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
    },
    {
      code: 'PAT-TF-007',
      name: 'Sukumaran Nair',
      mobile: '+919810000007',
      setting: 'opd',
      careType: 'opd_course',
      stage: 'in_treatment',
      therapy: doctorReviewTherapy,
      sessions: 8,
      freq: 'weekly',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
    },
    {
      // High Risk Case #1: 2 consecutive missed visits
      code: 'PAT-TF-008',
      name: 'Anoop Chandran',
      mobile: '+919810000008',
      setting: 'opd',
      careType: 'opd_course',
      stage: 'in_treatment',
      therapy: physioTherapy,
      sessions: 9,
      freq: 'custom_weekdays',
      weekdays: [1, 3, 5],
      risk: 'high',
      consecutiveMissed: 2,
      attRate: 50.0,
    },
    {
      // High Risk Case #2: Attendance rate 50% (<60%)
      code: 'PAT-TF-009',
      name: 'Leela George',
      mobile: '+919810000009',
      setting: 'opd',
      careType: 'opd_course',
      stage: 'in_treatment',
      therapy: acupunctureTherapy,
      sessions: 10,
      freq: 'daily',
      risk: 'high',
      consecutiveMissed: 2,
      attRate: 50.0,
    },
    {
      // Pending extension request case
      code: 'PAT-TF-010',
      name: 'Usman Farooqi',
      mobile: '+919810000010',
      setting: 'opd',
      careType: 'opd_course',
      stage: 'in_treatment',
      therapy: naturopathyTherapy,
      sessions: 8,
      freq: 'alternate_days',
      risk: 'low',
      consecutiveMissed: 0,
      attRate: 100.0,
      hasPendingExtension: true,
    },
  ];

  let totalVisitsSeeded = 0;

  for (let idx = 0; idx < syntheticCases.length; idx++) {
    const sc = syntheticCases[idx];

    // 1. Upsert Patient
    const patient = await prisma.patient.upsert({
      where: { patientCode: sc.code },
      update: { name: sc.name, mobileNorm: sc.mobile },
      create: {
        patientCode: sc.code,
        name: sc.name,
        mobileNorm: sc.mobile,
        language: 'en',
        branchId: mainBranch.id,
      },
    });

    // 2. Create or find Case
    const existingCase = await prisma.case.findFirst({
      where: { patientId: patient.id },
    });

    const expectedDischarge = sc.expectedDischargeDays ? addDayOffset(today, sc.expectedDischargeDays) : null;

    const patientCase = existingCase
      ? await prisma.case.update({
          where: { id: existingCase.id },
          data: {
            stage: sc.stage,
            setting: sc.setting,
            careType: sc.careType,
            team: Teams.TREATMENT_FOLLOWUP,
            ownerId: treatmentExec.id,
            treatingDoctorId: doctorUser.id,
            attendanceRate: sc.attRate,
            consecutiveMissed: sc.consecutiveMissed,
            adherenceRisk: sc.risk,
            expectedDischargeDate: expectedDischarge,
          },
        })
      : await prisma.case.create({
          data: {
            patientId: patient.id,
            branchId: mainBranch.id,
            departmentId: depts[0].id,
            stage: sc.stage,
            setting: sc.setting,
            careType: sc.careType,
            team: Teams.TREATMENT_FOLLOWUP,
            ownerId: treatmentExec.id,
            treatingDoctorId: doctorUser.id,
            attendanceRate: sc.attRate,
            consecutiveMissed: sc.consecutiveMissed,
            adherenceRisk: sc.risk,
            expectedDischargeDate: expectedDischarge,
          },
        });

    // 3. Record Handover
    await prisma.caseHandover.create({
      data: {
        caseId: patientCase.id,
        fromTeam: sc.setting === 'inpatient' ? Teams.ADMISSION : Teams.SUPPORT,
        toTeam: Teams.TREATMENT_FOLLOWUP,
        fromUserId: sc.setting === 'inpatient' ? admissionUser.id : doctorUser.id,
        toUserId: treatmentExec.id,
        note:
          sc.setting === 'inpatient'
            ? 'Admitted for in-patient hospital care. Transferred to Treatment Follow-up.'
            : 'Treatment plan accepted and therapy schedule booked. Transferred to Treatment Follow-up.',
        at: new Date(Date.now() - 7 * 86400 * 1000),
      },
    });

    // 4. Record In-Patient Check-ins
    if (sc.checkins && sc.checkins.length > 0) {
      for (const chk of sc.checkins as any[]) {
        let escalationId: number | null = null;
        if (chk.escalate) {
          const esc = await prisma.escalation.create({
            data: {
              caseId: patientCase.id,
              raisedBy: treatmentExec.id,
              assignedDoctorId: doctorUser.id,
              escalationType: 'inpatient_concern',
              reason: chk.concerns || 'Patient reported acute symptoms during bedside check-in',
              dueAt: new Date(Date.now() + 3600 * 1000), // 1 hour SLA
              status: 'pending',
              wardNotified: true,
            },
          });
          escalationId = esc.id;
        }

        await prisma.treatmentCheckin.create({
          data: {
            caseId: patientCase.id,
            userId: treatmentExec.id,
            channel: chk.channel,
            contactedWho: chk.contactedWho,
            condition: chk.condition,
            therapiesAsPlanned: chk.therapiesAsPlanned,
            missedTherapiesNote: chk.missedTherapiesNote || null,
            concerns: chk.concerns || null,
            billingConcern: false,
            expectedDischargeDate: expectedDischarge,
            nextCheckinAt: addDayOffset(today, 2),
            escalationId,
            occurredAt: new Date(Date.now() - 3600 * 1000),
          },
        });
      }
    }

    // 5. Create Visit Schedule
    const startDate = addDayOffset(today, -6); // Started 6 days ago
    const schedule = await prisma.visitSchedule.create({
      data: {
        caseId: patientCase.id,
        setting: sc.setting,
        therapyId: sc.therapy.id,
        frequencyType: sc.freq,
        weekdays: sc.weekdays !== undefined ? (sc.weekdays as any) : undefined,
        startDate: startDate,
        totalSessions: sc.sessions,
        windowStart: '09:00',
        windowEnd: '11:00',
        durationMinutes: 60,
        doctorId: doctorUser.id,
        notes: `Standard protocol for ${sc.therapy.labelEn}`,
        status: 'active',
        createdBy: treatmentExec.id,
      },
    });

    // 6. Generate Visits for this schedule
    for (let sessionNo = 1; sessionNo <= sc.sessions; sessionNo++) {
      // Offset calculation based on frequency
      let dayOffset = sessionNo - 1;
      if (sc.freq === 'alternate_days') dayOffset = (sessionNo - 1) * 2;
      if (sc.freq === 'weekly') dayOffset = (sessionNo - 1) * 7;
      if (sc.freq === 'custom_weekdays') dayOffset = (sessionNo - 1) * 2; // approximation for Mon/Wed/Fri

      const visitDate = addDayOffset(startDate, dayOffset);
      const isPast = visitDate.getTime() < today.getTime();
      const isToday = formatDateStr(visitDate) === formatDateStr(today);

      let status = 'planned';
      let markedBy: number | null = null;
      let markedAt: Date | null = null;
      let missedReasonId: number | null = null;

      if (isPast) {
        if (sc.code === 'PAT-TF-008') {
          // High risk patient 1: sessions 1-2 attended, session 3-4 missed
          if (sessionNo <= 2) {
            status = 'attended';
            markedBy = treatmentExec.id;
            markedAt = visitDate;
          } else {
            status = 'missed';
            markedBy = treatmentExec.id;
            markedAt = visitDate;
            missedReasonId = sessionNo === 3 ? missedTransport.id : missedWork.id;
          }
        } else if (sc.code === 'PAT-TF-009') {
          // High risk patient 2: sessions 1-2 attended, 3 missed, 4 attended, 5-6 missed
          if (sessionNo === 1 || sessionNo === 2 || sessionNo === 4) {
            status = 'attended';
            markedBy = treatmentExec.id;
            markedAt = visitDate;
          } else {
            status = 'missed';
            markedBy = treatmentExec.id;
            markedAt = visitDate;
            missedReasonId = sessionNo === 3 ? missedIllness.id : sessionNo === 5 ? missedForgot.id : missedCost.id;
          }
        } else if (sc.code === 'PAT-TF-003' && sessionNo === 4) {
          // IP case 3: session 4 missed due to fever
          status = 'missed';
          markedBy = treatmentExec.id;
          markedAt = visitDate;
          missedReasonId = missedIllness.id;
        } else {
          // Normal past visits: attended
          status = 'attended';
          markedBy = treatmentExec.id;
          markedAt = visitDate;
        }
      } else if (isToday) {
        // Today's visit: reminded or planned
        status = sessionNo % 2 === 0 ? 'reminded' : 'planned';
      } else {
        // Future visits
        status = 'planned';
      }

      await prisma.scheduledVisit.create({
        data: {
          scheduleId: schedule.id,
          caseId: patientCase.id,
          sessionNo,
          scheduledDate: visitDate,
          windowStart: '09:00',
          windowEnd: '11:00',
          status,
          markedBy,
          markedAt,
          missedReasonId,
          note: isPast ? 'Session completed' : null,
        },
      });
      totalVisitsSeeded++;
    }

    // 7. If Case 10, add pending extension request
    if (sc.hasPendingExtension) {
      await prisma.scheduleExtensionRequest.create({
        data: {
          scheduleId: schedule.id,
          requestedBy: treatmentExec.id,
          additionalSessions: 4,
          reason: 'Patient requests 4 additional Naturopathy sessions for knee stiffness relief.',
          status: 'pending',
        },
      });
    }
  }

  console.log(`✓ Seeded ${syntheticCases.length} cases with schedules, ${totalVisitsSeeded} visits (mixed statuses), 5 IP check-ins, 2 high-risk cohorts, and 1 pending extension request.`);

  // 17. Seed Product Module (Catalog, Relations, Campaigns, Product Leads, Waitlist)
  await seedProductModule();

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
