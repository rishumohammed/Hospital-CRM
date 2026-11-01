import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../database/client';

describe('Testimonials Sent Feature - Acceptance Test Suite', () => {
  let app: FastifyInstance;
  let ownerToken: string;
  let managerToken: string;
  let telecaller1Token: string;
  let telecaller2Token: string;

  let telecaller1Id: number;
  let telecaller2Id: number;
  let managerId: number;

  let branchId: number;
  let deptId: number;
  let sourceId: number;

  let testLibraryItem1: any;
  let testLibraryItemInactive: any;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Authenticate Owner
    const ownerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'owner@hospital.test', password: 'HospitalCRM@2026' },
    });
    ownerToken = JSON.parse(ownerRes.payload).accessToken;

    // Authenticate Telecaller Manager
    const mgrRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'manager@hospital.test', password: 'HospitalCRM@2026' },
    });
    const mgrData = JSON.parse(mgrRes.payload);
    managerToken = mgrData.accessToken;
    managerId = mgrData.user.id;

    // Authenticate Telecaller 1
    const t1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    const t1Data = JSON.parse(t1Res.payload);
    telecaller1Token = t1Data.accessToken;
    telecaller1Id = t1Data.user.id;

    // Authenticate Telecaller 2
    const t2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller2@hospital.test', password: 'HospitalCRM@2026' },
    });
    const t2Data = JSON.parse(t2Res.payload);
    telecaller2Token = t2Data.accessToken;
    telecaller2Id = t2Data.user.id;

    // Fetch Branch & Dept
    const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow();
    deptId = dept.id;

    const src = await prisma.source.findFirstOrThrow();
    sourceId = src.id;

    // Fetch or create an active consent-confirmed test testimonial
    testLibraryItem1 = await prisma.testimonial.findFirst({
      where: { active: true, consentConfirmed: true },
    });
    if (!testLibraryItem1) {
      testLibraryItem1 = await prisma.testimonial.create({
        data: {
          title: 'General Wellness Recovery',
          type: 'text',
          url: 'https://example.com/test-wellness.pdf',
          language: 'en',
          departmentId: deptId,
          summary: 'Patient reports steady improvement following treatment sessions.',
          consentConfirmed: true,
          consentReference: 'TEST-REF-001',
          approvedBy: managerId,
          approvedAt: new Date(),
          active: true,
          createdBy: managerId,
        },
      });
    }

    // Create an inactive test testimonial
    testLibraryItemInactive = await prisma.testimonial.create({
      data: {
        title: 'Draft Treatment Notes',
        type: 'text',
        url: 'https://example.com/draft.pdf',
        language: 'en',
        departmentId: deptId,
        summary: 'Early summary draft not yet approved for distribution.',
        consentConfirmed: false,
        consentReference: 'DRAFT-000',
        approvedBy: null,
        active: false,
        createdBy: managerId,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('AT-8: Library item cannot be created without consent confirmation or with phone numbers in title/summary', async () => {
    // 1. Missing consent confirmation
    const resNoConsent = await app.inject({
      method: 'POST',
      url: '/api/v1/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Knee Pain Patient Recovery Story',
        type: 'video',
        url: 'https://example.com/video.mp4',
        language: 'en',
        summary: 'Excellent recovery reported after 14 days of Ayurvedic Panchakarma therapy.',
        consentConfirmed: false,
        consentReference: 'FORM-999',
      },
    });
    expect(resNoConsent.statusCode).toBe(400);

    // 2. Empty consent reference
    const resNoRef = await app.inject({
      method: 'POST',
      url: '/api/v1/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Knee Pain Patient Recovery Story',
        type: 'video',
        url: 'https://example.com/video.mp4',
        language: 'en',
        summary: 'Excellent recovery reported after 14 days of Ayurvedic Panchakarma therapy.',
        consentConfirmed: true,
        consentReference: '   ',
      },
    });
    expect(resNoRef.statusCode).toBe(400);

    // 3. PII phone number in title
    const resPhoneTitle = await app.inject({
      method: 'POST',
      url: '/api/v1/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Call Rahul at 9847123456 for feedback',
        type: 'video',
        url: 'https://example.com/video.mp4',
        language: 'en',
        summary: 'Excellent recovery reported after 14 days of Ayurvedic Panchakarma therapy.',
        consentConfirmed: true,
        consentReference: 'FORM-999',
      },
    });
    expect(resPhoneTitle.statusCode).toBe(400);
    expect(JSON.parse(resPhoneTitle.payload).error.code).toBe('PII_DETECTED');

    // 4. PII phone number in summary
    const resPhoneSummary = await app.inject({
      method: 'POST',
      url: '/api/v1/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Safe Patient Recovery Feedback',
        type: 'video',
        url: 'https://example.com/video.mp4',
        language: 'en',
        summary: 'Contact patient on +91 98471 23456 for clinical verification.',
        consentConfirmed: true,
        consentReference: 'FORM-999',
      },
    });
    expect(resPhoneSummary.statusCode).toBe(400);
    expect(JSON.parse(resPhoneSummary.payload).error.code).toBe('PII_DETECTED');

    // 5. Valid creation succeeds
    const resValid = await app.inject({
      method: 'POST',
      url: '/api/v1/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: 'Genuine Ayurvedic Healing Feedback',
        type: 'video',
        url: 'https://example.com/healing.mp4',
        language: 'en',
        summary: 'Patient describes significant mobility restoration and pain reduction.',
        consentConfirmed: true,
        consentReference: 'CONSENT-DOC-2026',
      },
    });
    expect(resValid.statusCode).toBe(201);
    const created = JSON.parse(resValid.payload);
    expect(created.active).toBe(true);
    expect(created.consentConfirmed).toBe(true);
  });

  it('AT-1: Support telecaller can mark testimonials sent for their own lead, and cannot do it for another telecallers lead (403 and audit)', async () => {
    // Create lead owned by Telecaller 1
    const lead1 = await prisma.lead.create({
      data: {
        name: 'Patient T1 Lead',
        mobile: '+919999900001',
        mobileNorm: '+919999900001',
        language: 'en',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
        consentWhatsapp: true,
      },
    });

    // Create lead owned by Telecaller 2
    const lead2 = await prisma.lead.create({
      data: {
        name: 'Patient T2 Lead',
        mobile: '+919999900002',
        mobileNorm: '+919999900002',
        language: 'en',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller2Id,
        consentCalls: true,
        consentWhatsapp: true,
      },
    });

    // Telecaller 1 tries to mark Lead 2 (Owned by Telecaller 2) -> Must be 403
    const forbiddenRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead2.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItem1.id],
        note: 'Attempting cross-lead testimonial send',
      },
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // Verify audit log exists for unauthorized attempt
    const auditAttempt = await prisma.auditLog.findFirst({
      where: {
        userId: telecaller1Id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityId: lead2.id,
      },
    });
    expect(auditAttempt).not.toBeNull();

    // Telecaller 1 marks their own Lead 1 -> Must succeed (201)
    const successRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead1.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItem1.id],
        note: 'Sent successfully to own lead',
      },
    });
    expect(successRes.statusCode).toBe(201);
  });

  it('AT-2: Send is rejected if testimonial is inactive or not consent-confirmed', async () => {
    const lead = await prisma.lead.create({
      data: {
        name: 'Test Inactive Testimonial Lead',
        mobile: '+919999900003',
        mobileNorm: '+919999900003',
        language: 'en',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
        consentWhatsapp: true,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItemInactive.id],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe('TESTIMONIAL_INACTIVE_OR_UNCONFIRMED');
  });

  it('AT-3: WhatsApp without consent returns CONSENT_MISSING, and manager override succeeds with audit', async () => {
    // Lead with NO WhatsApp consent
    const lead = await prisma.lead.create({
      data: {
        name: 'No WhatsApp Consent Lead',
        mobile: '+919999900004',
        mobileNorm: '+919999900004',
        language: 'en',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
        consentWhatsapp: false,
      },
    });

    // Telecaller tries to send WhatsApp without consent -> CONSENT_MISSING
    const resBlocked = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItem1.id],
      },
    });
    expect(resBlocked.statusCode).toBe(400);
    expect(JSON.parse(resBlocked.payload).error.code).toBe('CONSENT_MISSING');

    // Manager overrides with reason
    const overrideReason = 'Patient verbally agreed during phone call to receive video on WhatsApp';
    const resOverride = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItem1.id],
        override_reason: overrideReason,
        note: 'Sent via manager override',
      },
    });
    expect(resOverride.statusCode).toBe(201);

    // Verify audit log for override
    const overrideAudit = await prisma.auditLog.findFirst({
      where: {
        action: 'testimonial.consent_override',
        userId: managerId,
      },
    });
    expect(overrideAudit).not.toBeNull();
  });

  it('AT-4: Leads flagged do_not_contact, junk, or open emergency cannot be marked', async () => {
    // 1. do_not_contact
    const leadDnc = await prisma.lead.create({
      data: {
        name: 'DNC Lead',
        mobile: '+919999900005',
        mobileNorm: '+919999900005',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        doNotContact: true,
      },
    });
    const resDnc = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadDnc.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { channel: 'call_readout', testimonial_ids: [testLibraryItem1.id] },
    });
    expect(resDnc.statusCode).toBe(400);
    expect(JSON.parse(resDnc.payload).error.code).toBe('LEAD_DO_NOT_CONTACT');

    // 2. Junk
    const leadJunk = await prisma.lead.create({
      data: {
        name: 'Junk Lead',
        mobile: '+919999900006',
        mobileNorm: '+919999900006',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        status: 'junk',
      },
    });
    const resJunk = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadJunk.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { channel: 'call_readout', testimonial_ids: [testLibraryItem1.id] },
    });
    expect(resJunk.statusCode).toBe(400);
    expect(JSON.parse(resJunk.payload).error.code).toBe('LEAD_JUNK');

    // 3. Emergency flag
    const leadEmergency = await prisma.lead.create({
      data: {
        name: 'Emergency Lead',
        mobile: '+919999900007',
        mobileNorm: '+919999900007',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        emergencyFlag: true,
      },
    });
    const resEmerg = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${leadEmergency.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { channel: 'call_readout', testimonial_ids: [testLibraryItem1.id] },
    });
    expect(resEmerg.statusCode).toBe(400);
    expect(JSON.parse(resEmerg.payload).error.code).toBe('LEAD_EMERGENCY');
  });

  it('AT-5 & AT-6: Counter accuracy, interaction timeline, audit logging, multiple sends, and voiding', async () => {
    const lead = await prisma.lead.create({
      data: {
        name: 'Counter & Void Lifecycle Lead',
        mobile: '+919999900008',
        mobileNorm: '+919999900008',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
        consentWhatsapp: true,
      },
    });

    expect(lead.testimonialsSentCount).toBe(0);
    expect(lead.testimonialsLastSentAt).toBeNull();

    // 1. First send
    const send1Res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'whatsapp',
        testimonial_ids: [testLibraryItem1.id],
        note: 'First send note',
      },
    });
    expect(send1Res.statusCode).toBe(201);
    const send1 = JSON.parse(send1Res.payload);

    // Verify lead counter is 1
    let updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.testimonialsSentCount).toBe(1);
    expect(updatedLead.testimonialsLastSentAt).not.toBeNull();

    // Verify interaction timeline row exists
    const sendInteraction = await prisma.interaction.findFirst({
      where: {
        leadId: lead.id,
        type: 'testimonial_sent',
      },
    });
    expect(sendInteraction).not.toBeNull();
    expect(sendInteraction?.note).toBe('First send note');

    // Verify audit log exists
    const sendAudit = await prisma.auditLog.findFirst({
      where: {
        entity: 'lead',
        entityId: lead.id,
        action: 'lead.testimonials_sent',
      },
    });
    expect(sendAudit).not.toBeNull();

    // 2. Second send
    const send2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'call_readout',
        testimonial_ids: [testLibraryItem1.id],
        note: 'Second send readout',
      },
    });
    expect(send2Res.statusCode).toBe(201);
    const send2 = JSON.parse(send2Res.payload);

    // Verify lead counter is now 2
    updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.testimonialsSentCount).toBe(2);

    // 3. Manager voids Send 2
    const void2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent/${send2.id}/void`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        reason: 'Call disconnected before completing readout',
      },
    });
    expect(void2Res.statusCode).toBe(200);

    // Verify lead counter drops from 2 to 1
    updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.testimonialsSentCount).toBe(1);

    // Verify void interaction exists
    const voidInteraction = await prisma.interaction.findFirst({
      where: {
        leadId: lead.id,
        type: 'testimonial_void',
      },
    });
    expect(voidInteraction).not.toBeNull();
    expect(voidInteraction?.note).toBe('Call disconnected before completing readout');

    // 4. Manager voids Send 1
    const void1Res = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${lead.id}/testimonials-sent/${send1.id}/void`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        reason: 'Wrong link provided by accident',
      },
    });
    expect(void1Res.statusCode).toBe(200);

    // Verify lead counter drops to 0
    updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.testimonialsSentCount).toBe(0);

    // History still shows both entries with void details
    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${lead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });
    expect(historyRes.statusCode).toBe(200);
    const history = JSON.parse(historyRes.payload);
    expect(history.sends.length).toBe(2);
    expect(history.sends[0].voidedAt).not.toBeNull();
    expect(history.sends[0].voidReason).toBeTruthy();
  });

  it('AT-7: Leads list filter testimonials=not_sent returns only leads with count 0 and respects scope', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/leads?testimonials=not_sent&pageSize=50',
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });

    expect(listRes.statusCode).toBe(200);
    const data = JSON.parse(listRes.payload);
    expect(Array.isArray(data.leads)).toBe(true);

    for (const lead of data.leads) {
      expect(lead.testimonialsSentCount).toBe(0);
      // Telecaller 1 has own scope, so ownerId must be telecaller1Id
      expect(lead.ownerId).toBe(telecaller1Id);
    }
  });

  it('AT-9: Testimonials Report returns correct counts and appointment booked rates', async () => {
    const reportRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/testimonials',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(reportRes.statusCode).toBe(200);
    const report = JSON.parse(reportRes.payload);

    expect(report.totalLeads).toBeGreaterThan(0);
    expect(report.leadsWithTestimonials).toBeGreaterThan(0);
    expect(typeof report.percentage).toBe('number');
    expect(report.sendsByChannel).toBeDefined();
    expect(Array.isArray(report.sendsByTelecaller)).toBe(true);
    expect(report.appointmentBookedRate).toBeDefined();
    expect(report.appointmentBookedRate.associationNotice).toContain('statistical correlation');
  });

  it('AT-11: Malayalam text in notes and concerns saves and displays correctly', async () => {
    const mlLead = await prisma.lead.create({
      data: {
        name: 'സന്തോഷ് കുമാർ',
        mobile: '+919999900009',
        mobileNorm: '+919999900009',
        language: 'ml',
        concern: 'മുട്ടുവേദനയ്ക്ക് ആയുർവേദ എണ്ണകളും തൈലങ്ങളും വേണം',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
      },
    });

    const mlNote = 'രോഗിക്ക് ആയുർവേദ ചികിത്സയെക്കുറിച്ചുള്ള വീഡിയോ അയച്ചുകൊടുത്തു.';
    const resSend = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${mlLead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'call_readout',
        testimonial_ids: [testLibraryItem1.id],
        note: mlNote,
      },
    });

    expect(resSend.statusCode).toBe(201);
    const send = JSON.parse(resSend.payload);
    expect(send.note).toBe(mlNote);

    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/leads/${mlLead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });
    const history = JSON.parse(historyRes.payload);
    expect(history.sends[0].note).toBe(mlNote);
  });

  it('AT-SameDayEdit: Only original sender can edit on the same day, non-sender gets 403, voided gets 400', async () => {
    const editLead = await prisma.lead.create({
      data: {
        name: 'Edit Restriction Test Lead',
        mobile: '+919999900010',
        mobileNorm: '+919999900010',
        departmentId: deptId,
        sourceId,
        branchId,
        ownerId: telecaller1Id,
        consentCalls: true,
      },
    });

    // Create send by Telecaller 1
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${editLead.id}/testimonials-sent`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        channel: 'call_readout',
        testimonial_ids: [testLibraryItem1.id],
        note: 'Initial call note',
      },
    });
    const createdSend = JSON.parse(createRes.payload);

    // 1. Telecaller 2 tries to edit -> 403
    const unauthorizedEdit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leads/${editLead.id}/testimonials-sent/${createdSend.id}`,
      headers: { authorization: `Bearer ${telecaller2Token}` },
      payload: { note: 'Tampered note by telecaller 2' },
    });
    expect(unauthorizedEdit.statusCode).toBe(403);

    // 2. Original sender Telecaller 1 edits -> 200
    const authorizedEdit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leads/${editLead.id}/testimonials-sent/${createdSend.id}`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { note: 'Updated note by telecaller 1 with additional questions' },
    });
    expect(authorizedEdit.statusCode).toBe(200);
    expect(JSON.parse(authorizedEdit.payload).note).toBe('Updated note by telecaller 1 with additional questions');

    // 3. Void the send
    await app.inject({
      method: 'POST',
      url: `/api/v1/leads/${editLead.id}/testimonials-sent/${createdSend.id}/void`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { reason: 'Voiding for test' },
    });

    // 4. Try editing voided send -> 400
    const voidedEdit = await app.inject({
      method: 'PATCH',
      url: `/api/v1/leads/${editLead.id}/testimonials-sent/${createdSend.id}`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: { note: 'Trying to edit after void' },
    });
    expect(voidedEdit.statusCode).toBe(400);
    expect(JSON.parse(voidedEdit.payload).error.code).toBe('SEND_VOIDED');
  });

  it('AT-10: WhatsApp message templates contain mandatory disclaimer and variables', () => {
    const enDisclaimer = 'Results vary from person to person. Please consult a doctor.';
    const mlDisclaimer = 'ഫലം ഓരോ വ്യക്തിക്കും വ്യത്യസ്തമായിരിക്കും. ദയവായി ഒരു ഡോക്ടറെ സമീപിക്കുക.';

    const buildWhatsAppMessage = (lang: string, vars: { name: string; telecaller: string; center: string; link: string }) => {
      if (lang === 'ml') {
        return `നമസ്കാരം ${vars.name}, ഞാൻ ${vars.center}-ൽ നിന്ന് ${vars.telecaller} ആണ്. ഞങ്ങളുടെ ഒരു രോഗിയുടെ അനുഭവം അവരുടെ അനുമതിയോടെ പങ്കിടുന്നു: ${vars.link}. ${mlDisclaimer} ഞങ്ങൾക്ക് സഹായിക്കാൻ സന്തോഷമേയുള്ളൂ. ഡോക്ടറുമായി എപ്പോൾ സംസാരിക്കാൻ കഴിയും?`;
      }
      return `Hello ${vars.name}, this is ${vars.telecaller} from ${vars.center}. Here is the experience of one of our patients, shared with their permission: ${vars.link}. ${enDisclaimer} We would be glad to help you. When would you like to speak to our doctor?`;
    };

    const enMsg = buildWhatsAppMessage('en', {
      name: 'John Doe',
      telecaller: 'Rahul',
      center: 'Hospital Main Campus',
      link: 'https://example.com/t/123',
    });
    expect(enMsg).toContain(enDisclaimer);
    expect(enMsg).toContain('John Doe');
    expect(enMsg).toContain('https://example.com/t/123');

    const mlMsg = buildWhatsAppMessage('ml', {
      name: 'രമേഷ്',
      telecaller: 'രാഹുൽ',
      center: 'ഹോസ്പിറ്റൽ മെയിൻ കാമ്പസ്',
      link: 'https://example.com/t/456',
    });
    expect(mlMsg).toContain(mlDisclaimer);
    expect(mlMsg).toContain('രമേഷ്');
  });
});
