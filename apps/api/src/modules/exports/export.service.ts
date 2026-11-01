import { prisma } from '../../database/client';
import { UserContext, scopeWhere } from '../rbac/scope';
import { Permissions, RequestExportInput, ApproveExportInput, maskPhoneNumber } from '@hospital-crm/shared';
import { recordAuditLog } from '../audit/audit.service';

export async function requestExport(
  user: UserContext,
  input: RequestExportInput,
  ip?: string,
  userAgent?: string
) {
  const isAutoApproved =
    user.roleCode === 'owner' ||
    user.roleCode === 'admin' ||
    user.roleCode === 'center_head';

  const branchId = input.branchId || user.branchIds[0] || null;

  const exportRecord = await prisma.export.create({
    data: {
      userId: user.id,
      branchId,
      resource: input.resource,
      filterJson: input.filters || {},
      format: input.format || 'csv',
      status: isAutoApproved ? 'approved' : 'pending',
      approvedBy: isAutoApproved ? user.id : null,
      approvedAt: isAutoApproved ? new Date() : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approver: { select: { id: true, name: true, email: true } },
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'EXPORT_REQUESTED',
    entity: 'export',
    entityId: exportRecord.id,
    after: {
      resource: input.resource,
      status: exportRecord.status,
      autoApproved: isAutoApproved,
    },
    ip,
    userAgent,
  });

  return exportRecord;
}

export async function listExports(user: UserContext, query: { status?: string }) {
  const where: any = {};
  if (query.status) {
    where.status = query.status;
  }

  // Non-admins/managers only see their own exports
  if (
    user.roleCode !== 'owner' &&
    user.roleCode !== 'admin' &&
    user.roleCode !== 'center_head' &&
    user.roleCode !== 'telecaller_manager'
  ) {
    where.userId = user.id;
  } else if (user.roleCode === 'center_head' || user.roleCode === 'telecaller_manager') {
    if (user.branchIds.length > 0) {
      where.OR = [
        { userId: user.id },
        { branchId: { in: user.branchIds } },
      ];
    }
  }

  const exports = await prisma.export.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true, code: true } },
      approver: { select: { id: true, name: true, email: true } },
    },
  });

  return exports;
}

export async function approveExport(
  user: UserContext,
  exportId: number,
  input: ApproveExportInput,
  ip?: string,
  userAgent?: string
) {
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
    include: { user: true },
  });

  if (!exportRecord) {
    const err = new Error('Export request not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (exportRecord.status !== 'pending') {
    const err = new Error(`Export cannot be approved in '${exportRecord.status}' status`);
    (err as any).statusCode = 400;
    (err as any).code = 'INVALID_STATUS';
    throw err;
  }

  const updated = await prisma.export.update({
    where: { id: exportId },
    data: {
      status: input.approved ? 'approved' : 'rejected',
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason: input.approved ? null : input.rejectionReason || 'Rejected by supervisor',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: input.approved ? 'EXPORT_APPROVED' : 'EXPORT_REJECTED',
    entity: 'export',
    entityId: exportId,
    after: {
      approved: input.approved,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
    },
    ip,
    userAgent,
  });

  return updated;
}

export async function generateWatermarkedCsv(
  user: UserContext,
  exportId: number,
  ip?: string,
  userAgent?: string
): Promise<{ filename: string; csv: string }> {
  const exportRecord = await prisma.export.findUnique({
    where: { id: exportId },
    include: {
      user: true,
      branch: true,
    },
  });

  if (!exportRecord) {
    const err = new Error('Export not found');
    (err as any).statusCode = 404;
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  if (exportRecord.status !== 'approved' && exportRecord.status !== 'completed') {
    const err = new Error('Export request is not approved');
    (err as any).statusCode = 403;
    (err as any).code = 'EXPORT_NOT_APPROVED';
    throw err;
  }

  const now = new Date();
  const branchName = exportRecord.branch?.name || 'All Branches';
  const timestampUtc = now.toISOString();
  const timestampKolkata = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(now);

  const watermarkTag = `${user.id}_${user.email}_${now.getTime()}`;

  // Watermark Banner at Top of File
  const watermarkBanner = [
    `# ==============================================================================`,
    `# HOSPITAL CRM - SECURE CONFIDENTIAL DATA EXPORT`,
    `# Export ID: EXP-${String(exportRecord.id).padStart(5, '0')} | Resource: ${exportRecord.resource.toUpperCase()}`,
    `# Exported By: ${user.name} (${user.email}) | Role: ${user.roleCode}`,
    `# Branch Scope: ${branchName}`,
    `# Timestamp: ${timestampUtc} (Asia/Kolkata: ${timestampKolkata})`,
    `# Security Notice: Internal hospital use only. Recipient traceable via watermark tag.`,
    `# Watermark Signature: ${watermarkTag}`,
    `# ==============================================================================`,
  ].join('\r\n');

  let csvContent = '';

  if (exportRecord.resource === 'leads') {
    const leads = await prisma.lead.findMany({
      where: {
        archivedAt: null,
        ...(exportRecord.branchId ? { branchId: exportRecord.branchId } : {}),
        ...scopeWhere(user, 'lead', Permissions.EXPORT_REQUEST),
      },
      include: {
        department: { select: { labelEn: true } },
        source: { select: { labelEn: true } },
        owner: { select: { name: true } },
        branch: { select: { name: true } },
      },
      take: 1000,
    });

    const headers = [
      'Lead ID',
      'Patient Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Source',
      'Status',
      'Priority',
      'Owner',
      'Created At',
      'Watermark Audit Tag',
    ];

    const rows = leads.map((l) => [
      l.id,
      escapeCsv(l.name),
      escapeCsv(user.maskPhone ? maskPhoneNumber(l.mobileNorm) : l.mobileNorm),
      escapeCsv(l.branch?.name || ''),
      escapeCsv(l.department?.labelEn || ''),
      escapeCsv(l.source?.labelEn || ''),
      l.status,
      l.priority,
      escapeCsv(l.owner?.name || 'Unassigned'),
      l.createdAt.toISOString(),
      watermarkTag,
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else if (exportRecord.resource === 'cases') {
    const cases = await prisma.case.findMany({
      where: {
        archivedAt: null,
        ...(exportRecord.branchId ? { branchId: exportRecord.branchId } : {}),
        ...scopeWhere(user, 'case', Permissions.EXPORT_REQUEST),
      },
      include: {
        patient: { select: { name: true, patientCode: true, mobileNorm: true } },
        department: { select: { labelEn: true } },
        treatingDoctor: { select: { name: true } },
        owner: { select: { name: true } },
        branch: { select: { name: true } },
      },
      take: 1000,
    });

    const headers = [
      'Case ID',
      'Patient Code',
      'Patient Name',
      'Mobile Number',
      'Branch',
      'Stage',
      'Care Type',
      'Department',
      'Treating Doctor',
      'Desk Owner',
      'Estimated Amount',
      'Advised Admission',
      'Created At',
      'Watermark Audit Tag',
    ];

    const rows = cases.map((c) => [
      c.id,
      escapeCsv(c.patient?.patientCode || ''),
      escapeCsv(c.patient?.name || ''),
      escapeCsv(user.maskPhone && c.patient?.mobileNorm ? maskPhoneNumber(c.patient.mobileNorm) : c.patient?.mobileNorm || ''),
      escapeCsv(c.branch?.name || ''),
      c.stage,
      c.careType,
      escapeCsv(c.department?.labelEn || ''),
      escapeCsv(c.treatingDoctor?.name || 'Unassigned'),
      escapeCsv(c.owner?.name || 'Unassigned'),
      c.estimatedAmount ? Number(c.estimatedAmount) : 0,
      c.advisedAdmission ? 'YES' : 'NO',
      c.createdAt.toISOString(),
      watermarkTag,
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else if (exportRecord.resource === 'interactions') {
    const interactions = await prisma.interaction.findMany({
      where: {
        archivedAt: null,
      },
      include: {
        user: { select: { name: true } },
        outcome: { select: { labelEn: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 1000,
    });

    const headers = [
      'Interaction ID',
      'Type',
      'Lead ID',
      'Case ID',
      'Logged By',
      'Outcome',
      'Note',
      'Occurred At',
      'Watermark Audit Tag',
    ];

    const rows = interactions.map((i) => [
      i.id,
      i.type,
      i.leadId || '',
      i.caseId || '',
      escapeCsv(i.user?.name || ''),
      escapeCsv(i.outcome?.labelEn || ''),
      escapeCsv(i.note || ''),
      i.occurredAt.toISOString(),
      watermarkTag,
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  } else {
    // Audit logs
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const headers = ['Log ID', 'User', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Timestamp', 'Watermark Tag'];
    const rows = logs.map((l) => [
      l.id,
      escapeCsv(l.user?.name || 'System'),
      l.action,
      l.entity,
      l.entityId || '',
      l.ip || '',
      l.createdAt.toISOString(),
      watermarkTag,
    ]);

    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  // Update download audit and count
  await prisma.export.update({
    where: { id: exportId },
    data: {
      status: 'completed',
      downloadCount: { increment: 1 },
      lastDownloadedAt: now,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: 'EXPORT_DOWNLOADED',
    entity: 'export',
    entityId: exportId,
    after: {
      resource: exportRecord.resource,
      downloadCount: exportRecord.downloadCount + 1,
    },
    ip,
    userAgent,
  });

  const fullCsv = `${watermarkBanner}\r\n\r\n${csvContent}\r\n`;
  const filename = `hospital-crm-${exportRecord.resource}-EXP-${String(exportRecord.id).padStart(5, '0')}.csv`;

  return { filename, csv: fullCsv };
}

function escapeCsv(val: string): string {
  if (!val) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
