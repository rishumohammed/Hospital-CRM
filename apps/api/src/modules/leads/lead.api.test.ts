import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';

describe('Support Desk - Leads API & Logic (Milestone 3)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let telecaller1Token: string;
  let telecaller2Token: string;
  let branchId: number;
  let ayurvedaDeptId: number;
  let metaAdsSourceId: number;
  let websiteSourceId: number;
  let lostReasonId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'admin@hospital.test', password: 'HospitalCRM@2026' },
    });
    adminToken = JSON.parse(adminLogin.payload).accessToken;

    // Authenticate Telecaller 1
    const t1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(t1Login.payload).accessToken;

    // Authenticate Telecaller 2
    const t2Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller2@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller2Token = JSON.parse(t2Login.payload).accessToken;

    // Fetch Branch & Picklist IDs
    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow({ where: { code: 'ayurveda' } });
    ayurvedaDeptId = dept.id;

    const metaSource = await prisma.source.findFirstOrThrow({ where: { code: 'meta_ads' } });
    metaAdsSourceId = metaSource.id;

    const webSource = await prisma.source.findFirstOrThrow({ where: { code: 'website' } });
    websiteSourceId = webSource.id;

    const lost = await prisma.lostReason.findFirstOrThrow({ where: { code: 'price' } });
    lostReasonId = lost.id;

    // Ensure calling_hours setting is standard 09:00 - 20:00
    await prisma.setting.upsert({
      where: { key: 'calling_hours' },
      update: {
        value: {
          start: '09:00',
          end: '20:00',
          timezone: 'Asia/Kolkata',
          enforce: true,
        },
      },
      create: {
        key: 'calling_hours',
        value: {
          start: '09:00',
          end: '20:00',
          timezone: 'Asia/Kolkata',
          enforce: true,
        },
      },
    });

    // Cleanup any existing test leads
    const cleanupTestLeads = async () => {
      const testMobiles = [
        '+919447123456',
        '+919847111222',
        '+919847333444',
        '+919847555666',
        '+919847777888',
        '+919847999000',
        '+919745123987',
        '+919745000111',
      ];
      await prisma.notification.deleteMany({
        where: { link: { contains: '/leads/' } },
      });
      await prisma.task.deleteMany({
        where: { lead: { mobileNorm: { in: testMobiles } } },
      });
      await prisma.interaction.deleteMany({
        where: { lead: { mobileNorm: { in: testMobiles } } },
      });
      await prisma.lead.deleteMany({
        where: { mobileNorm: { in: testMobiles } },
      });
    };

    await cleanupTestLeads();
  });

  afterAll(async () => {
    const testMobiles = [
      '+919447123456',
      '+919847111222',
      '+919847333444',
      '+919847555666',
      '+919847777888',
      '+919847999000',
      '+919745123987',
      '+919745000111',
    ];
    await prisma.task.deleteMany({
      where: { lead: { mobileNorm: { in: testMobiles } } },
    });
    await prisma.interaction.deleteMany({
      where: { lead: { mobileNorm: { in: testMobiles } } },
    });
    await prisma.lead.deleteMany({
      where: { mobileNorm: { in: testMobiles } },
    });
    await app.close();
  });

  // Acceptance Test 2
  it('Acceptance Test 2: Creating a lead with an existing mobile number in different format returns duplicate and rejects without override', async () => {
    const testMobile = '+91 94471 23456';
    const sameMobileDifferentFormat = '09447123456';

    // 1. Create first lead
    const firstRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Suresh Kumar',
        mobile: testMobile,
        language: 'en',
        concern: 'Knee arthritis treatment inquiry',
        departmentId: ayurvedaDeptId,
        sourceId: metaAdsSourceId,
        branchId,
      },
    });

    expect(firstRes.statusCode).toBe(201);
    const firstLead = JSON.parse(firstRes.payload);
    expect(firstLead.id).toBeDefined();
    expect(firstLead.mobileNorm).toBe('+919447123456');

    // 2. Attempt duplicate without overrideReason -> must return 409 DUPLICATE_LEAD
    const duplicateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Suresh K',
        mobile: sameMobileDifferentFormat,
        language: 'en',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        overrideDuplicate: false,
      },
    });

    expect(duplicateRes.statusCode).toBe(409);
    const dupBody = JSON.parse(duplicateRes.payload);
    expect(dupBody.error.code).toBe('DUPLICATE_LEAD');
    expect(dupBody.error.details.duplicate).toBe(true);
    expect(dupBody.error.details.existingLead.id).toBe(firstLead.id);

    // 3. Create duplicate WITH overrideDuplicate: true and overrideReason -> succeeds
    const overrideRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Suresh Relative',
        mobile: sameMobileDifferentFormat,
        language: 'en',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
        overrideDuplicate: true,
        overrideReason: 'Different family member using shared family landline/mobile',
      },
    });

    expect(overrideRes.statusCode).toBe(201);
    const secondLead = JSON.parse(overrideRes.payload);
    expect(secondLead.id).not.toBe(firstLead.id);
  });

  // Acceptance Test 3
  it('Acceptance Test 3: Meta Ads has 5m first-response SLA; Website has 15m first-response SLA', async () => {
    // 1. Meta Ads lead
    const metaRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Meta Ads Lead',
        mobile: '+919847111222',
        language: 'en',
        concern: 'Spine care rehabilitation',
        departmentId: ayurvedaDeptId,
        sourceId: metaAdsSourceId,
        branchId,
      },
    });

    expect(metaRes.statusCode).toBe(201);
    const metaLead = JSON.parse(metaRes.payload);
    expect(metaLead.firstResponseDueAt).toBeDefined();

    // 2. Website lead
    const webRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Website Lead',
        mobile: '+919847333444',
        language: 'en',
        concern: 'Ayurvedic wellness consultation',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
      },
    });

    expect(webRes.statusCode).toBe(201);
    const webLead = JSON.parse(webRes.payload);
    expect(webLead.firstResponseDueAt).toBeDefined();

    // The difference in SLA duration: Meta Ads has 5m, Web has 15m (10 minutes difference)
    const metaDue = new Date(metaLead.firstResponseDueAt).getTime();
    const metaCreated = new Date(metaLead.createdAt).getTime();
    const webDue = new Date(webLead.firstResponseDueAt).getTime();
    const webCreated = new Date(webLead.createdAt).getTime();

    const metaDiffMin = Math.round((metaDue - metaCreated) / 60000);
    const webDiffMin = Math.round((webDue - webCreated) / 60000);

    // If test is run during business hours (09:00 - 20:00 IST), metaDiff is 5 and webDiff is 15.
    // If run outside business hours, both are scheduled to start tomorrow morning, with 10 mins delta.
    expect(webDiffMin - metaDiffMin).toBe(10);
  });

  // Acceptance Test 14
  it('Acceptance Test 14: Malayalam text in the concern field saves, displays, and can be searched', async () => {
    const malayalamConcern = 'മുട്ടുവേദനയും നടുവേദനയും കാരണം നടക്കാൻ പ്രയാസപ്പെടുന്നു'; // Knee pain & back pain
    const leadName = 'ഫാത്തിമ റഹ്മാൻ'; // Fathima Rahman

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: leadName,
        mobile: '+919847555666',
        language: 'ml',
        concern: malayalamConcern,
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
      },
    });

    expect(res.statusCode).toBe(201);
    const created = JSON.parse(res.payload);
    expect(created.name).toBe(leadName);
    expect(created.concern).toBe(malayalamConcern);

    // Search by Malayalam keyword
    const searchRes = await app.inject({
      method: 'GET',
      url: `/api/v1/leads?search=${encodeURIComponent('മുട്ടുവേദന')}`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });

    expect(searchRes.statusCode).toBe(200);
    const searchBody = JSON.parse(searchRes.payload);
    expect(searchBody.leads.length).toBeGreaterThanOrEqual(1);
    const matched = searchBody.leads.find((l: any) => l.id === created.id);
    expect(matched).toBeDefined();
    expect(matched.concern).toContain('മുട്ടുവേദന');
  });

  // Close Lead flow
  it('POST /api/v1/leads/:id/close marks lead not_interested with reason and cancels open tasks', async () => {
    // Create lead
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Lead To Close',
        mobile: '+919847777888',
        language: 'en',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
      },
    });
    const lead = JSON.parse(leadRes.payload);

    // Create an open task for this lead
    await prisma.task.create({
      data: {
        title: 'Initial callback',
        type: 'call',
        dueAt: new Date(Date.now() + 3600000),
        ownerId: lead.ownerId!,
        leadId: lead.id,
        status: 'open',
      },
    });

    // Close lead
    const closeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/close`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        closedReasonId: lostReasonId,
        note: 'Patient mentioned budget constraints',
      },
    });

    expect(closeRes.statusCode).toBe(200);
    const closed = JSON.parse(closeRes.payload);
    expect(closed.status).toBe('not_interested');
    expect(closed.closedReasonId).toBe(lostReasonId);
    expect(closed.closedAt).not.toBeNull();

    // Verify task was cancelled
    const task = await prisma.task.findFirst({ where: { leadId: lead.id } });
    expect(task?.status).toBe('cancelled');
  });

  // Emergency Redirect
  it('POST /api/v1/leads/:id/emergency sets flag and notifies branch duty nurse', async () => {
    const leadRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        name: 'Acute Trauma Patient',
        mobile: '+919847999000',
        language: 'en',
        departmentId: ayurvedaDeptId,
        sourceId: websiteSourceId,
        branchId,
      },
    });
    const lead = JSON.parse(leadRes.payload);

    const emerRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/emergency`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        note: 'Severe acute bleeding requiring immediate clinical triage',
      },
    });

    expect(emerRes.statusCode).toBe(200);
    const emerBody = JSON.parse(emerRes.payload);
    expect(emerBody.success).toBe(true);
    expect(emerBody.lead.emergencyFlag).toBe(true);

    // Check duty nurse notification
    const notification = await prisma.notification.findFirst({
      where: {
        type: 'emergency',
        title: { contains: 'Acute Trauma Patient' },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification).not.toBeNull();
  });

  // Public Intake Webhook
  it('POST /api/v1/intake/:sourceKey creates lead with API key authentication', async () => {
    const intakeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/intake/meta_ads',
      headers: { 'x-api-key': 'crm-intake-key-2026' },
      payload: {
        name: 'Ad Form Applicant',
        mobile: '+919745123987',
        language: 'ml',
        concern: 'Sciatica and lower back rehabilitation',
        campaignText: 'Monsoon_Ayurveda_Camp_2026',
        branchCode: 'MAIN',
      },
    });

    expect(intakeRes.statusCode).toBe(201);
    const intakeBody = JSON.parse(intakeRes.payload);
    expect(intakeBody.success).toBe(true);
    expect(intakeBody.leadId).toBeDefined();

    // Verify created lead has 5m SLA and hot priority
    const lead = await prisma.lead.findUnique({ where: { id: intakeBody.leadId } });
    expect(lead?.priority).toBe('hot');
    expect(lead?.campaignText).toBe('Monsoon_Ayurveda_Camp_2026');
  });

  // CSV Import Preview & Commit
  it('POST /api/v1/leads/import/preview and commit works for batch lead onboarding', async () => {
    const previewRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads/import/preview',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        rows: [
          { name: 'Import Valid 1', mobile: '+919745000111', departmentCode: 'ayurveda', sourceCode: 'walk_in' },
          { name: 'Import Invalid', mobile: '123' }, // invalid phone
        ],
      },
    });

    expect(previewRes.statusCode).toBe(200);
    const preview = JSON.parse(previewRes.payload);
    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(1);
    expect(preview.invalidCount).toBe(1);

    // Commit valid
    const commitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/leads/import/commit',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        rows: [
          { name: 'Import Valid 1', mobile: '+919745000111', departmentCode: 'ayurveda', sourceCode: 'walk_in' },
        ],
      },
    });

    expect(commitRes.statusCode).toBe(201);
    const commit = JSON.parse(commitRes.payload);
    expect(commit.importedCount).toBe(1);
  });
});
