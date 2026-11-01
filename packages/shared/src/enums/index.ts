export const Roles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  CENTER_HEAD: 'center_head',
  TELECALLER_MANAGER: 'telecaller_manager',
  SUPPORT_TELECALLER: 'support_telecaller',
  ADMISSION_SPECIALIST: 'admission_specialist',
  AFTERCARE_EXECUTIVE: 'aftercare_executive',
  DOCTOR: 'doctor',
  AUDITOR: 'auditor',
} as const;

export type RoleCode = (typeof Roles)[keyof typeof Roles];

export const Teams = {
  SUPPORT: 'support',
  ADMISSION: 'admission',
  AFTERCARE: 'aftercare',
} as const;

export type TeamCode = (typeof Teams)[keyof typeof Teams];

export const Scopes = {
  OWN: 'own',
  TEAM: 'team',
  BRANCH: 'branch',
  ALL: 'all',
} as const;

export type Scope = (typeof Scopes)[keyof typeof Scopes];

export const Permissions = {
  LEAD_VIEW: 'lead.view',
  LEAD_CREATE: 'lead.create',
  LEAD_EDIT: 'lead.edit',
  LEAD_REASSIGN: 'lead.reassign',
  LEAD_CLOSE: 'lead.close',
  LEAD_MERGE: 'lead.merge',
  CASE_VIEW: 'case.view',
  CASE_EDIT: 'case.edit',
  CASE_REASSIGN: 'case.reassign',
  TASK_VIEW: 'task.view',
  TASK_MANAGE: 'task.manage',
  INTERACTION_CREATE: 'interaction.create',
  ESCALATION_CREATE: 'escalation.create',
  ESCALATION_DECIDE: 'escalation.decide',
  REPORT_VIEW: 'report.view',
  EXPORT_REQUEST: 'export.request',
  EXPORT_APPROVE: 'export.approve',
  IMPORT_RUN: 'import.run',
  SETTINGS_MANAGE: 'settings.manage',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  AUDIT_VIEW: 'audit.view',
  CADENCE_MANAGE: 'cadence.manage',
  ASSIGNMENT_RULE_MANAGE: 'assignment_rule.manage',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const LeadStatuses = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  APPOINTMENT_BOOKED: 'appointment_booked',
  NOT_REACHABLE: 'not_reachable',
  NOT_INTERESTED: 'not_interested',
  JUNK: 'junk',
  CONVERTED: 'converted',
} as const;

export type LeadStatusCode = (typeof LeadStatuses)[keyof typeof LeadStatuses];

export const LeadPriorities = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
} as const;

export type LeadPriorityCode = (typeof LeadPriorities)[keyof typeof LeadPriorities];

export const CaseStages = {
  VISITED: 'visited',
  PLAN_GIVEN: 'plan_given',
  COUNSELING_ESTIMATE: 'counseling_estimate',
  PLAN_ACCEPTED: 'plan_accepted',
  IN_TREATMENT: 'in_treatment',
  AFTERCARE_FOLLOW_UP: 'aftercare_follow_up',
  COMPLETED: 'completed',
  NOT_STARTED: 'not_started',
  DROPPED_OUT: 'dropped_out',
} as const;

export type CaseStageCode = (typeof CaseStages)[keyof typeof CaseStages];

export const CareTypes = {
  CONSULTATION_ONLY: 'consultation_only',
  OPD_COURSE: 'opd_course',
  IN_PATIENT: 'in_patient',
  PROCEDURE: 'procedure',
} as const;

export type CareTypeCode = (typeof CareTypes)[keyof typeof CareTypes];

export const TaskTypes = {
  CALL: 'call',
  WHATSAPP: 'whatsapp',
  REMINDER: 'reminder',
  REVIEW: 'review',
  ESCALATION_CALLBACK: 'escalation_callback',
} as const;

export type TaskTypeCode = (typeof TaskTypes)[keyof typeof TaskTypes];

export const TaskStatuses = {
  OPEN: 'open',
  DONE: 'done',
  CANCELLED: 'cancelled',
  SNOOZED: 'snoozed',
} as const;

export type TaskStatusCode = (typeof TaskStatuses)[keyof typeof TaskStatuses];

export const InteractionTypes = {
  CALL: 'call',
  WHATSAPP_MANUAL: 'whatsapp_manual',
  NOTE: 'note',
  STATUS_CHANGE: 'status_change',
  VISIT: 'visit',
  AFTERCARE_CALL: 'aftercare_call',
} as const;

export type InteractionTypeCode = (typeof InteractionTypes)[keyof typeof InteractionTypes];

export const AppointmentStatuses = {
  BOOKED: 'booked',
  VISITED: 'visited',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
} as const;

export type AppointmentStatusCode = (typeof AppointmentStatuses)[keyof typeof AppointmentStatuses];

export const EscalationStatuses = {
  PENDING: 'pending',
  DECIDED: 'decided',
  CANCELLED: 'cancelled',
} as const;

export type EscalationStatusCode = (typeof EscalationStatuses)[keyof typeof EscalationStatuses];
