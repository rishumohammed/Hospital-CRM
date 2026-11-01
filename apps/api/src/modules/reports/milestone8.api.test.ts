import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { prisma } from '../../database/client';
import { findDataSubjectRecords } from '../privacy/privacy.service';
import {
  defaultTelephonyProvider,
  defaultMessagingProvider,
  defaultEventPublisher,
} from '../integrations/index';

describe('Milestone 8: Reports, Watermarked CSV Exports, Privacy DSR & AT 15 Scoping', () => {
  let app: FastifyInstance;
  let telecaller1Token: string;
  let telecaller1Id: number;
  let telecaller2Token: string;
  let telecaller2Id: number;
  let managerToken: string;
  let managerId: number;
  let centerheadToken: string;
  let branchId: number;
  let deptId: number;
  let sourceId: number;
  let lead1Id: number;
  let lead2Id: number;
  let exportId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Fetch Users
    const [t1, t2, mgr, ch] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { email: 'telecaller1@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'telecaller2@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'manager@hospital.test' } }),
      prisma.user.findUniqueOrThrow({ where: { email: 'centerhead@hospital.test' } }),
    ]);

    telecaller1Id = t1.id;
    telecaller2Id = t2.id;
    managerId = mgr.id;

    // 2. Log in and acquire JWT tokens
    const loginT1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller1@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller1Token = JSON.parse(loginT1.payload).accessToken;

    const loginT2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'telecaller2@hospital.test', password: 'HospitalCRM@2026' },
    });
    telecaller2Token = JSON.parse(loginT2.payload).accessToken;

    const loginMgr = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'manager@hospital.test', password: 'HospitalCRM@2026' },
    });
    managerToken = JSON.parse(loginMgr.payload).accessToken;

    const loginCH = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'centerhead@hospital.test', password: 'HospitalCRM@2026' },
    });
    centerheadToken = JSON.parse(loginCH.payload).accessToken;

    // 3. Resolve Branch, Dept, Source
    const branch = await prisma.branch.findUniqueOrThrow({ where: { code: 'MAIN' } });
    branchId = branch.id;

    const dept = await prisma.department.findFirstOrThrow({ where: { code: 'AYURVEDA' } });
    deptId = dept.id;

    const source = await prisma.source.findFirstOrThrow({ where: { code: 'WEBSITE' } });
    sourceId = source.id;

    // 4. Create distinct leads for Telecaller 1 and Telecaller 2
    const lead1 = await prisma.lead.create({
      data: {
        name: 'M8 Scoping Lead Telecaller 1',
        mobile: '+919111122221',
        mobileNorm: '+919111122221',
        concern: 'Knee arthritis consultation',
        branchId,
        departmentId: deptId,
        sourceId,
        ownerId: telecaller1Id,
        status: 'new',
        priority: 'warm',
      },
    });
    lead1Id = lead1.id;

    const lead2 = await prisma.lead.create({
      data: {
        name: 'M8 Scoping Lead Telecaller 2',
        mobile: '+919111122222',
        mobileNorm: '+919111122222',
        concern: 'Panchakarma wellness query',
        branchId,
        departmentId: deptId,
        sourceId,
        ownerId: telecaller2Id,
        status: 'new',
        priority: 'warm',
      },
    });
    lead2Id = lead2.id;
  });

  afterAll(async () => {
    // Clean up created records
    if (lead1Id) await prisma.lead.delete({ where: { id: lead1Id } }).catch(() => {});
    if (lead2Id) await prisma.lead.delete({ where: { id: lead2Id } }).catch(() => {});
    if (exportId) await prisma.export.delete({ where: { id: exportId } }).catch(() => {});
    await app.close();
  });

  // -------------------------------------------------------------------------
  // Acceptance Test 15: List scoping test
  // -------------------------------------------------------------------------
  it('Acceptance Test 15: Support telecaller list leads count never includes another telecaller leads', async () => {
    // 1. Telecaller 1 lists leads
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.leads).toBeDefined();

    // Verify Telecaller 1's list contains lead1 but NEVER lead2
    const t1ContainsLead1 = body1.leads.some((l: any) => l.id === lead1Id);
    const t1ContainsLead2 = body1.leads.some((l: any) => l.id === lead2Id);
    expect(t1ContainsLead1).toBe(true);
    expect(t1ContainsLead2).toBe(false);

    // Verify every lead in t1's list is either owned by t1 or unassigned in their branch
    for (const lead of body1.leads) {
      if (lead.ownerId !== null) {
        expect(lead.ownerId).toBe(telecaller1Id);
      }
    }

    // 2. Telecaller 2 lists leads
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${telecaller2Token}` },
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.leads).toBeDefined();

    // Verify Telecaller 2's list contains lead2 but NEVER lead1
    const t2ContainsLead2 = body2.leads.some((l: any) => l.id === lead2Id);
    const t2ContainsLead1 = body2.leads.some((l: any) => l.id === lead1Id);
    expect(t2ContainsLead2).toBe(true);
    expect(t2ContainsLead1).toBe(false);

    // Verify every lead in t2's list is either owned by t2 or unassigned in their branch
    for (const lead of body2.leads) {
      if (lead.ownerId !== null) {
        expect(lead.ownerId).toBe(telecaller2Id);
      }
    }

    // 3. Manager lists leads -> Manager can see both lead1 and lead2
    const resMgr = await app.inject({
      method: 'GET',
      url: '/api/v1/leads',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(resMgr.statusCode).toBe(200);
    const bodyMgr = JSON.parse(resMgr.payload);
    const mgrContainsLead1 = bodyMgr.leads.some((l: any) => l.id === lead1Id);
    const mgrContainsLead2 = bodyMgr.leads.some((l: any) => l.id === lead2Id);
    expect(mgrContainsLead1).toBe(true);
    expect(mgrContainsLead2).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Management Reports
  // -------------------------------------------------------------------------
  it('GET /api/v1/reports/support returns lead metrics, SLA compliance, and telecaller stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/support',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.payload);
    expect(report.totalLeads).toBeGreaterThanOrEqual(2);
    expect(report.sla).toBeDefined();
    expect(typeof report.sla.complianceRate).toBe('number');
    expect(Array.isArray(report.statusBreakdown)).toBe(true);
    expect(Array.isArray(report.sourceBreakdown)).toBe(true);
    expect(Array.isArray(report.telecallerProductivity)).toBe(true);
  });

  it('GET /api/v1/reports/lost-reasons returns breakdown of lost leads and cases', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/lost-reasons',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.payload);
    expect(report.leadLostReasons).toBeDefined();
    expect(Array.isArray(report.leadLostReasons.breakdown)).toBe(true);
    expect(report.admissionDeclineReasons).toBeDefined();
    expect(Array.isArray(report.admissionDeclineReasons.breakdown)).toBe(true);
  });

  it('GET /api/v1/reports/source-quality returns conversion rates by marketing source', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/source-quality',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.payload);
    expect(report.sources).toBeDefined();
    expect(Array.isArray(report.sources)).toBe(true);
    expect(typeof report.totalLeads).toBe('number');
    expect(typeof report.overallRevenue).toBe('number');
    if (report.sources.length > 0) {
      const src = report.sources[0];
      expect(src.code).toBeDefined();
      expect(src.labelEn).toBeDefined();
      expect(typeof src.totalLeads).toBe('number');
      expect(typeof src.conversionRate).toBe('number');
    }
  });

  it('GET /api/v1/reports/admission returns stage breakdown and deposit metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/admission',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.payload);
    expect(typeof report.advised).toBe('number');
    expect(typeof report.conversionRate).toBe('number');
    expect(Array.isArray(report.declinedReasons)).toBe(true);
    expect(Array.isArray(report.overdueFollowUps)).toBe(true);
  });

  it('GET /api/v1/reports/aftercare returns follow-up completion and escalation stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/aftercare',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const report = JSON.parse(res.payload);
    expect(typeof report.totalCases).toBe('number');
    expect(report.calls).toBeDefined();
    expect(report.feedback).toBeDefined();
    expect(report.escalations).toBeDefined();
    expect(Array.isArray(report.closures)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Watermarked CSV Exports
  // -------------------------------------------------------------------------
  it('Export lifecycle: Request -> Approve -> Watermarked CSV download with audit headers and signatures', async () => {
    // 1. Telecaller 1 requests an export of leads
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/exports',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        resource: 'leads',
        format: 'csv',
        filters: { branchId },
      },
    });

    expect(reqRes.statusCode).toBe(201);
    const reqBody = JSON.parse(reqRes.payload);
    expect(reqBody.id).toBeDefined();
    expect(reqBody.resource).toBe('leads');
    expect(reqBody.status).toBe('pending');
    exportId = reqBody.id;

    // 2. Telecaller tries to download pending export -> 403 Forbidden
    const prematureDownload = await app.inject({
      method: 'GET',
      url: `/api/v1/exports/${exportId}/download`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });
    expect(prematureDownload.statusCode).toBe(403);

    // 3. Manager approves the export
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/exports/${exportId}/approve`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        approved: true,
      },
    });

    expect(approveRes.statusCode).toBe(200);
    const approvedBody = JSON.parse(approveRes.payload);
    expect(approvedBody.status).toBe('approved');
    expect(approvedBody.approvedBy).toBe(managerId);

    // 4. Telecaller downloads the approved watermarked CSV
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/exports/${exportId}/download`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });

    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.headers['content-type']).toContain('text/csv');
    const csvContent = downloadRes.payload;

    // Verify Header Watermark Banner
    expect(csvContent).toContain('# ==============================================================================');
    expect(csvContent).toContain('# HOSPITAL CRM - SECURE CONFIDENTIAL DATA EXPORT');
    expect(csvContent).toContain(`EXP-${String(exportId).padStart(5, '0')}`);
    expect(csvContent).toContain('telecaller1@hospital.test');
    expect(csvContent).toContain('Watermark Signature:');

    // Verify Columns include Watermark Audit Tag
    expect(csvContent).toContain('Watermark Audit Tag');
    expect(csvContent).toContain('Patient Name');
    expect(csvContent).toContain('Mobile Number');

    // Verify export audit log was registered
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'export',
        entityId: exportId,
        action: 'EXPORT_DOWNLOADED',
      },
    });
    expect(auditRecord).not.toBeNull();
  });

  it('Export lifecycle: Rejecting an export prevents download', async () => {
    // 1. Request export
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/exports',
      headers: { authorization: `Bearer ${telecaller1Token}` },
      payload: {
        resource: 'cases',
        format: 'csv',
      },
    });

    const exportRecord = JSON.parse(reqRes.payload);

    // 2. Manager rejects the export
    const rejectRes = await app.inject({
      method: 'POST',
      url: `/api/v1/exports/${exportRecord.id}/approve`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        approved: false,
        rejectionReason: 'Scope too broad for telecaller role',
      },
    });

    expect(rejectRes.statusCode).toBe(200);
    const rejectedBody = JSON.parse(rejectRes.payload);
    expect(rejectedBody.status).toBe('rejected');

    // 3. Attempt to download -> 403 Forbidden
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/exports/${exportRecord.id}/download`,
      headers: { authorization: `Bearer ${telecaller1Token}` },
    });
    expect(downloadRes.statusCode).toBe(403);

    // Clean up
    await prisma.export.delete({ where: { id: exportRecord.id } }).catch(() => {});
  });

  // -------------------------------------------------------------------------
  // Privacy Compliance / Data Subject Request (DSR) Service
  // -------------------------------------------------------------------------
  it('Privacy DSR Service: findDataSubjectRecords locates cross-entity records by phone number', async () => {
    const bundle = await findDataSubjectRecords('+91 91111 22221');

    expect(bundle).toBeDefined();
    expect(bundle.mobileNorm).toBe('+919111122221');
    expect(bundle.found).toBe(true);
    expect(bundle.leads.length).toBeGreaterThanOrEqual(1);
    expect(bundle.leads.some((l) => l.id === lead1Id)).toBe(true);
    expect(bundle.exportedAt).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Phase 2 Integration Seams
  // -------------------------------------------------------------------------
  it('Phase 2 Integration Seams: Telephony, Messaging, and Outbox Event publishing function correctly', async () => {
    // 1. Telephony Provider initiates call url
    const callResult = await defaultTelephonyProvider.initiateCall({
      fromNumber: '+919999900000',
      toNumber: '+919876543210',
      userId: telecaller1Id,
      leadId: lead1Id,
    });
    expect(callResult.status).toBe('initiated');
    expect(callResult.callUrl).toBe('tel:+919876543210');
    expect(callResult.sessionId).toBeDefined();

    // 2. Messaging Provider formats WhatsApp link
    const msgResult = await defaultMessagingProvider.sendTemplate({
      to: '+919876543210',
      templateName: 'appointment_reminder',
      language: 'en',
    });
    expect(msgResult.status).toBe('sent');
    expect(msgResult.linkUrl).toContain('wa.me/919876543210');

    // 3. Outbox Event Publisher records event in outbox_events table
    const outbox = await defaultEventPublisher.publish('lead.status_changed', {
      leadId: lead1Id,
      oldStatus: 'new',
      newStatus: 'contacted',
    });
    expect(outbox.eventId).toBeDefined();

    const dbEvent = await prisma.outboxEvent.findUnique({ where: { id: outbox.eventId } });
    expect(dbEvent).not.toBeNull();
    expect(dbEvent?.eventType).toBe('lead.status_changed');
    expect((dbEvent?.payload as any).leadId).toBe(lead1Id);

    // Clean up outbox event
    await prisma.outboxEvent.delete({ where: { id: outbox.eventId } }).catch(() => {});
  });
});
