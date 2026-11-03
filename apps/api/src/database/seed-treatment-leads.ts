import { prisma } from './client';
import { seedProductModule } from './seed-products';

export async function seedTreatmentLeadsAndTasks() {
  console.log('--- Starting Synthetic Treatment Leads & Tasks Seed ---');

  const mainBranch = await prisma.branch.findFirst({ where: { code: 'MAIN' } });
  if (!mainBranch) {
    console.error('Main branch not found. Aborting treatment lead seed.');
    return;
  }

  const t1 = await prisma.user.findUnique({ where: { email: 'telecaller1@hospital.test' } });
  const t2 = await prisma.user.findUnique({ where: { email: 'telecaller2@hospital.test' } });

  if (!t1 || !t2) {
    console.error('Telecallers not found in database. Aborting treatment lead seed.');
    return;
  }

  const depts = await prisma.department.findMany();
  const sources = await prisma.source.findMany();

  const syntheticLeadDefs = [
    { name: 'ഫാത്തിമ റഹ്മാൻ', mobile: '+919800000010', lang: 'ml', concern: 'മുട്ടുവേദനയും നടുവേദനയും കാരണം നടക്കാൻ പ്രയാസപ്പെടുന്നു. ആയുർവേദ ചികിത്സ താല്പര്യപ്പെടുന്നു.', deptCode: 'TRADITIONAL_AYURVEDA', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'Rajesh Nair', mobile: '+919800000011', lang: 'en', concern: 'Chronic lower back pain L4-L5 disc bulge inquiry for Marma alignment', deptCode: 'MARMA_BONE_ALIGNMENT', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t2.id, timing: 'today' },
    { name: 'Mary Varghese', mobile: '+919800000012', lang: 'en', concern: 'Varicose veins laser/leech therapy consultation needed for severe swelling', deptCode: 'DIABETIC_VARICOSE', sourceCode: 'WEBSITE', status: 'contacted', priority: 'warm', ownerId: t1.id, timing: 'overdue' },
    { name: 'മുഹമ്മദ് ആഷിഖ്', mobile: '+919800000013', lang: 'ml', concern: 'കഠിനമായ മൈഗ്രേൻ തലവേദനയ്ക്ക് ഹിജാമ (കപ്പിംഗ്) തെറാപ്പി അന്വേഷിക്കുന്നു', deptCode: 'HIJAMA_ACUPUNCTURE', sourceCode: 'META_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id, timing: 'today' },
    { name: 'Lakshmi Pillai', mobile: '+919800000014', lang: 'en', concern: 'Post-natal care package inquiry for newborn and mother rehabilitation', deptCode: 'POST_NATAL_CARE', sourceCode: 'PATIENT_REFERRAL', status: 'appointment_booked', priority: 'hot', ownerId: t1.id, timing: 'upcoming' },
    { name: 'അബ്ദുൾ ഖാദർ', mobile: '+919800000015', lang: 'ml', concern: 'പ്രമേഹ രോഗികൾക്കുള്ള കാലിലെ പഴുപ്പ് ചികിത്സയും പഞ്ചകർമ്മ തെറാപ്പിയും', deptCode: 'DIABETIC_VARICOSE', sourceCode: 'DOCTOR_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Anjali Menon', mobile: '+919800000016', lang: 'en', concern: 'Fertility and PCOS natural therapy package inquiry', deptCode: 'INFERTILITY_COSMETIC', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'തോമസ് മാത്യു', mobile: '+919800000017', lang: 'ml', concern: 'സ്ട്രോക്കിന് ശേഷമുള്ള ഫിസിയോതെറാപ്പിയും ആയുർവേദ പുനരധിവാസവും', deptCode: 'PHYSIOTHERAPY_NATUROPATHY', sourceCode: 'PHONE_CALL', status: 'qualified', priority: 'warm', ownerId: t2.id, timing: 'upcoming' },
    { name: 'Deepa Krishnan', mobile: '+919800000018', lang: 'en', concern: 'Chronic anxiety, sleep disorders and stress relief counseling', deptCode: 'PSYCHOLOGICAL_COUNSELING', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t1.id, timing: 'overdue' },
    { name: 'ഷാജി സലീം', mobile: '+919800000019', lang: 'ml', concern: 'പുകവലി, മദ്യപാന വിമുക്തി ചികിത്സയ്ക്കായുള്ള കൗൺസിലിംഗ് അന്വേഷണം', deptCode: 'DE_ADDICTION_REFLEXOLOGY', sourceCode: 'META_ADS', status: 'contacted', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Sanjay Varma', mobile: '+919800000020', lang: 'en', concern: 'Full body rejuvenation Panchakarma 14 days wellness retreat pricing', deptCode: 'PANCHA_KARMA_SPA', sourceCode: 'WEBSITE', status: 'qualified', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'സുജാത മേനോൻ', mobile: '+919800000021', lang: 'ml', concern: 'തൈറോയ്ഡ്, അമിതവണ്ണ നിയന്ത്രണത്തിനായുള്ള യോഗയും പ്രകൃതിചികിത്സയും', deptCode: 'YOGA_WELLNESS', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t2.id, timing: 'upcoming' },
    { name: 'Kavitha R', mobile: '+919800000022', lang: 'en', concern: 'Skin pigmentation and cosmetic acupuncture options', deptCode: 'INFERTILITY_COSMETIC', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'ഹരിദാസ് കെ.പി', mobile: '+919800000023', lang: 'ml', concern: 'കഴുത്ത് തിരിക്കാൻ പറ്റാത്ത വിധം വേദന (സെർവിക്കൽ സ്പോണ്ടിലോസിസ്)', deptCode: 'MARMA_BONE_ALIGNMENT', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t2.id, timing: 'overdue' },
    { name: 'George Mathew', mobile: '+919800000024', lang: 'en', concern: 'Routine executive health checkup lab packages and ultrasounds', deptCode: 'LABS_SCANS', sourceCode: 'PHONE_CALL', status: 'contacted', priority: 'cold', ownerId: t1.id, timing: 'upcoming' },
    { name: 'ആയിഷ ബീവി', mobile: '+919800000025', lang: 'ml', concern: 'കുഞ്ഞിന്റെ സുന്നത്ത് (സർക്കംസിഷൻ) സർജറി സംബന്ധിച്ച വിവരങ്ങൾ', deptCode: 'CIRCUMCISION', sourceCode: 'DOCTOR_REFERRAL', status: 'qualified', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Pradeep Kumar', mobile: '+919800000026', lang: 'en', concern: 'Knee ligament tear post-accident physiotherapy rehabilitation', deptCode: 'PHYSIOTHERAPY_NATUROPATHY', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t1.id, timing: 'upcoming' },
    { name: 'ജയശ്രീ പിള്ള', mobile: '+919800000027', lang: 'ml', concern: 'വിട്ടുമാറാത്ത സോറിയാസിസ് ത്വക്ക് രോഗത്തിന് പരമ്പരാഗത ആയുർവേദം', deptCode: 'TRADITIONAL_AYURVEDA', sourceCode: 'PATIENT_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Naveen Joseph', mobile: '+919800000028', lang: 'en', concern: 'Electro-homeopathy medicine consultation for chronic sinusitis', deptCode: 'ELECTRO_HOMEOPATHY', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'നൂർജഹാൻ എം', mobile: '+919800000029', lang: 'ml', concern: 'ഗർഭധാരണത്തിന് മുൻപുള്ള പ്രീ-കൺസെപ്ഷൻ ആയുർവേദ കെയർ', deptCode: 'INFERTILITY_COSMETIC', sourceCode: 'META_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id, timing: 'overdue' },
    { name: 'Ajith Balakrishnan', mobile: '+919800000030', lang: 'en', concern: 'Shoulder dislocation physiotherapy after cricket injury', deptCode: 'PHYSIOTHERAPY_NATUROPATHY', sourceCode: 'GOOGLE_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'വിനോദ് കുമാർ', mobile: '+919800000031', lang: 'ml', concern: 'നടുവേദന കാരണം ഡ്രൈവ് ചെയ്യാൻ ബുദ്ധിമുട്ട്. മർമ്മ ചികിത്സ താല്പര്യം', deptCode: 'MARMA_BONE_ALIGNMENT', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Bhavana Das', mobile: '+919800000032', lang: 'en', concern: 'Post-covid fatigue syndrome integrated medicine consultation', deptCode: 'INTEGRATED_MEDICINE', sourceCode: 'DOCTOR_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t1.id, timing: 'upcoming' },
    { name: 'സൈനുദ്ദീൻ വി.പി', mobile: '+919800000033', lang: 'ml', concern: 'വെരിക്കോസ് വെയിൻ കാരണം കാലുകളിൽ വ്രണങ്ങളും കറുത്ത പാടുകളും', deptCode: 'DIABETIC_VARICOSE', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t2.id, timing: 'overdue' },
    { name: 'Geetha Raman', mobile: '+919800000034', lang: 'en', concern: 'Yoga therapy classes for elderly hypertension management', deptCode: 'YOGA_WELLNESS', sourceCode: 'CAMP_EVENT', status: 'qualified', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'പ്രശാന്ത് പി', mobile: '+919800000035', lang: 'ml', concern: 'കായികതാരങ്ങൾക്കായുള്ള സ്പോർട്സ് മസാജും പഞ്ചകർമ്മ തൈലങ്ങളും', deptCode: 'PANCHA_KARMA_SPA', sourceCode: 'PHONE_CALL', status: 'contacted', priority: 'cold', ownerId: t2.id, timing: 'upcoming' },
    { name: 'Laila Kabeer', mobile: '+919800000036', lang: 'en', concern: 'Neonatal circumcision slot booking and pediatrician consultation', deptCode: 'CIRCUMCISION', sourceCode: 'DOCTOR_REFERRAL', status: 'appointment_booked', priority: 'hot', ownerId: t1.id, timing: 'upcoming' },
    { name: 'മനോജ് നമ്പൂതിരി', mobile: '+919800000037', lang: 'ml', concern: 'മാനസിക സമ്മർദ്ദവും ഡിപ്രഷനും കാരണമുള്ള കൗൺസിലിംഗ് സെഷൻ', deptCode: 'PSYCHOLOGICAL_COUNSELING', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id, timing: 'today' },
    { name: 'Divya Unnikrishnan', mobile: '+919800000038', lang: 'en', concern: 'Post-pregnancy back pain relief and herbal dietary advice', deptCode: 'POST_NATAL_CARE', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'റാഫി മുഹമ്മദ്', mobile: '+919800000039', lang: 'ml', concern: 'ഷുഗർ കൂടിയതുകാരണം ഉണ്ടായ കാൽ മരവിപ്പിന് റിഫ്ലെക്സോളജി', deptCode: 'DE_ADDICTION_REFLEXOLOGY', sourceCode: 'GOOGLE_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id, timing: 'overdue' },
    { name: 'Arun Chandran', mobile: '+919800000040', lang: 'en', concern: 'Acupuncture therapy for facial nerve paralysis (Bells palsy)', deptCode: 'HIJAMA_ACUPUNCTURE', sourceCode: 'PATIENT_REFERRAL', status: 'contacted', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'സാവിത്രി അമ്മ', mobile: '+919800000041', lang: 'ml', concern: 'മുട്ടിലെ തേയ്മാനം മൂലം ഇരിക്കാനും എഴുന്നേൽക്കാനും പ്രയാസം', deptCode: 'TRADITIONAL_AYURVEDA', sourceCode: 'WALK_IN', status: 'appointment_booked', priority: 'warm', ownerId: t2.id, timing: 'upcoming' },
    { name: 'Rahul V.S', mobile: '+919800000042', lang: 'en', concern: 'Comprehensive blood scan panel and thyroid profile booking', deptCode: 'LABS_SCANS', sourceCode: 'PHONE_CALL', status: 'new', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'മുജീബ് റഹ്മാൻ', mobile: '+919800000043', lang: 'ml', concern: 'കാലിലെ വെരിക്കോസ് ഞരമ്പുകൾ മുഴച്ചുനിൽക്കുന്നത് നീക്കം ചെയ്യാൻ', deptCode: 'DIABETIC_VARICOSE', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t2.id, timing: 'today' },
    { name: 'Suma Cherian', mobile: '+919800000044', lang: 'en', concern: 'Weight loss yoga and natural detox diet package inquiry', deptCode: 'YOGA_WELLNESS', sourceCode: 'WEBSITE', status: 'contacted', priority: 'cold', ownerId: t1.id, timing: 'overdue' },
    { name: 'ഗിരീഷ് ബാബു', mobile: '+919800000045', lang: 'ml', concern: 'തോൾ സന്ധിയിലെ വേദന (ഫ്രോസൺ ഷോൾഡർ) ഫിസിയോതെറാപ്പി', deptCode: 'PHYSIOTHERAPY_NATUROPATHY', sourceCode: 'GOOGLE_ADS', status: 'qualified', priority: 'hot', ownerId: t2.id, timing: 'today' },
    { name: 'Anita Philip', mobile: '+919800000046', lang: 'en', concern: 'Post-delivery traditional massage and rejuvenation package', deptCode: 'POST_NATAL_CARE', sourceCode: 'DOCTOR_REFERRAL', status: 'new', priority: 'warm', ownerId: t1.id, timing: 'today' },
    { name: 'ഹസ്സൻ കുട്ടി', mobile: '+919800000047', lang: 'ml', concern: 'മദ്യപാനം നിർത്തുന്നതിനായുള്ള കൗൺസിലിംഗും ഡി-അഡിക്ഷൻ ചികിത്സയും', deptCode: 'DE_ADDICTION_REFLEXOLOGY', sourceCode: 'PHONE_CALL', status: 'new', priority: 'warm', ownerId: t2.id, timing: 'overdue' },
    { name: 'Siddharth M', mobile: '+919800000048', lang: 'en', concern: 'Lower back marma therapy for sciatica nerve compression', deptCode: 'MARMA_BONE_ALIGNMENT', sourceCode: 'META_ADS', status: 'new', priority: 'hot', ownerId: t1.id, timing: 'today' },
    { name: 'സുബൈദ ബീഗം', mobile: '+919800000049', lang: 'ml', concern: 'തലവേദനയ്ക്കും പിരടിവേദനയ്ക്കും ഡ്രൈ കപ്പിംഗ് (ഹിജാമ) ചികിത്സ', deptCode: 'HIJAMA_ACUPUNCTURE', sourceCode: 'WEBSITE', status: 'new', priority: 'warm', ownerId: t2.id, timing: 'today' },
  ];

  const now = new Date();
  let createdLeadsCount = 0;
  let createdTasksCount = 0;

  for (const sLead of syntheticLeadDefs) {
    const dept = depts.find((d) => d.code === sLead.deptCode) || depts[0];
    const src = sources.find((s) => s.code === sLead.sourceCode) || sources[0];

    // SLA calculation: Ad leads get 5m, others get 15m
    const isAd = src.code === 'META_ADS' || src.code === 'GOOGLE_ADS';
    const slaMin = isAd ? 5 : 15;
    
    let firstResponseDueAt = new Date(now.getTime() + slaMin * 60 * 1000);
    let taskDueAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins from now (today)

    if (sLead.timing === 'overdue') {
      firstResponseDueAt = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago
      taskDueAt = new Date(now.getTime() - 90 * 60 * 1000);
    } else if (sLead.timing === 'upcoming') {
      firstResponseDueAt = new Date(now.getTime() + 24 * 3600 * 1000); // Tomorrow
      taskDueAt = new Date(now.getTime() + 25 * 3600 * 1000);
    }

    const leadId = parseInt(sLead.mobile.slice(-4), 10);

    const lead = await prisma.lead.upsert({
      where: { id: leadId },
      update: {
        name: sLead.name,
        concern: sLead.concern,
        status: sLead.status,
        priority: sLead.priority,
        ownerId: sLead.ownerId,
        departmentId: dept.id,
        sourceId: src.id,
        firstResponseDueAt,
        slaBreached: sLead.timing === 'overdue',
        consentCalls: true,
        consentWhatsapp: true,
        consentSms: true,
        leadType: 'treatment',
      },
      create: {
        id: leadId,
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
        slaBreached: sLead.timing === 'overdue',
        consentCalls: true,
        consentWhatsapp: true,
        consentSms: true,
        consentSource: 'seed_synthetic',
        consentDate: now,
        leadType: 'treatment',
      },
    });
    createdLeadsCount++;

    // Create an active follow-up / calling task for active leads
    if (['new', 'contacted', 'qualified'].includes(sLead.status)) {
      const existingTask = await prisma.task.findFirst({
        where: { leadId: lead.id, status: 'open' },
      });

      if (!existingTask) {
        await prisma.task.create({
          data: {
            title: `Inquiry Call: ${sLead.name} (${dept.labelEn})`,
            type: 'call',
            dueAt: taskDueAt,
            priority: sLead.priority,
            status: 'open',
            ownerId: sLead.ownerId,
            leadId: lead.id,
          },
        });
        createdTasksCount++;
      } else {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            dueAt: taskDueAt,
            ownerId: sLead.ownerId,
            priority: sLead.priority,
          },
        });
      }
    }
  }

  console.log(`✓ Seeded ${createdLeadsCount} treatment leads and verified ${createdTasksCount} calling tasks.`);

  // Also seed product catalog and product leads
  try {
    await seedProductModule();
    console.log('✓ Product module successfully seeded');
  } catch (err: any) {
    console.warn('Note on seedProductModule:', err.message);
  }

  console.log('--- Synthetic Treatment Leads & Tasks Seed Complete ---');
}
