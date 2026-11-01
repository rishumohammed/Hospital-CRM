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
    { code: 'APPOINTMENT_BOOKED', labelEn: 'Appointment Booked', labelMl: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്തു', sort: 1 },
    { code: 'CALLBACK_REQUESTED', labelEn: 'Callback Requested', labelMl: 'തിരിച്ചുവിളിക്കാൻ ആവശ്യപ്പെട്ടു', sort: 2 },
    { code: 'INTERESTED_NOT_READY', labelEn: 'Interested Not Ready', labelMl: 'താല്പര്യമുണ്ട്, ഇപ്പോൾ സാധ്യമല്ല', sort: 3 },
    { code: 'INFORMATION_GIVEN', labelEn: 'Information Given', labelMl: 'വിവരങ്ങൾ നൽകി', sort: 4 },
    { code: 'NO_ANSWER', labelEn: 'No Answer', labelMl: 'ഫോൺ എടുത്തില്ല', sort: 5 },
    { code: 'SWITCHED_OFF_BUSY', labelEn: 'Switched Off or Busy', labelMl: 'സ്വിച്ച്ഡ് ഓഫ് അല്ലെങ്കിൽ ബിസി', sort: 6 },
    { code: 'WRONG_NUMBER', labelEn: 'Wrong Number', labelMl: 'തെറ്റായ നമ്പർ', sort: 7 },
    { code: 'NOT_INTERESTED', labelEn: 'Not Interested', labelMl: 'താല്പര്യമില്ല', sort: 8 },
    { code: 'EMERGENCY_REDIRECTED', labelEn: 'Emergency Redirected', labelMl: 'അടിയന്തിര വിഭാഗത്തിലേക്ക് തിരിച്ചുവിട്ടു', sort: 9 },
    { code: 'COMPLAINT', labelEn: 'Complaint', labelMl: 'പരാതി', sort: 10 },
  ];

  for (const co of callOutcomeDefs) {
    await prisma.callOutcome.upsert({
      where: { code: co.code },
      update: { labelEn: co.labelEn, labelMl: co.labelMl, sort: co.sort },
      create: co,
    });
  }
  console.log('✓ 10 Call Outcomes seeded');

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
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✓ System Settings (calling hours, SLA, contact rules, quiet hours) seeded');

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
