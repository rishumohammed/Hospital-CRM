export const Roles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  CENTER_HEAD: 'center_head',
  TELECALLER_MANAGER: 'telecaller_manager',
  SUPPORT_TELECALLER: 'support_telecaller',
  ADMISSION_SPECIALIST: 'admission_specialist',
  AFTERCARE_EXECUTIVE: 'aftercare_executive',
  TREATMENT_FOLLOWUP_EXECUTIVE: 'treatment_followup_executive',
  FRONT_OFFICE: 'front_office',
  DOCTOR: 'doctor',
  AUDITOR: 'auditor',
  PRODUCT_SALES_EXECUTIVE: 'product_sales_executive',
  PRODUCT_MANAGER: 'product_manager',
  PHARMACY_STORE: 'pharmacy_store',
} as const;

export type RoleCode = (typeof Roles)[keyof typeof Roles];

export const Teams = {
  SUPPORT: 'support',
  ADMISSION: 'admission',
  AFTERCARE: 'aftercare',
  TREATMENT_FOLLOWUP: 'treatment_followup',
  PRODUCT_SALES: 'product_sales',
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
  TESTIMONIAL_SEND: 'testimonial.send',
  TESTIMONIAL_VOID: 'testimonial.void',
  TESTIMONIAL_MANAGE: 'testimonial.manage',
  TESTIMONIAL_VIEW: 'testimonial.view',
  SCHEDULE_VIEW: 'schedule.view',
  SCHEDULE_MANAGE: 'schedule.manage',
  SCHEDULE_APPROVE_EXTENSION: 'schedule.approve_extension',
  VISIT_VIEW: 'visit.view',
  VISIT_MARK: 'visit.mark',
  CHECKIN_CREATE: 'checkin.create',
  FOLLOWUP_REPORT: 'followup.report',
  // Product Module Permissions
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_EDIT: 'product.edit',
  PRODUCT_APPROVE: 'product.approve',
  PRODUCT_ARCHIVE: 'product.archive',
  PRODUCT_STOCK_UPDATE: 'product.stock_update',
  PRODUCT_IMPORT: 'product.import',
  PRODUCT_CATEGORY_MANAGE: 'product_category.manage',
  PRODUCT_RELATION_MANAGE: 'product_relation.manage',
  PRODUCT_CAMPAIGN_MANAGE: 'product_campaign.manage',
  PRODUCT_LEAD_VIEW: 'product_lead.view',
  PRODUCT_LEAD_CREATE: 'product_lead.create',
  PRODUCT_LEAD_EDIT: 'product_lead.edit',
  PRODUCT_LEAD_REASSIGN: 'product_lead.reassign',
  PRODUCT_REPORT_VIEW: 'product_report.view',
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const LeadTypes = {
  TREATMENT: 'treatment',
  PRODUCT: 'product',
} as const;

export type LeadType = (typeof LeadTypes)[keyof typeof LeadTypes];

export const ProductStatuses = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  ARCHIVED: 'archived',
} as const;

export type ProductStatus = (typeof ProductStatuses)[keyof typeof ProductStatuses];

export const StockStatuses = {
  IN_STOCK: 'in_stock',
  OUT_OF_STOCK: 'out_of_stock',
} as const;

export type StockStatus = (typeof StockStatuses)[keyof typeof StockStatuses];

export const ProductRelationTypes = {
  CROSS_SELL: 'cross_sell',
  UPSELL: 'upsell',
  FREQUENTLY_TOGETHER: 'frequently_together',
  SUBSTITUTE: 'substitute',
} as const;

export type ProductRelationType = (typeof ProductRelationTypes)[keyof typeof ProductRelationTypes];

export const CampaignChannels = {
  META_ADS: 'meta_ads',
  GOOGLE_ADS: 'google_ads',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  WEBSITE: 'website',
  CAMP: 'camp',
  OTHER: 'other',
} as const;

export type CampaignChannel = (typeof CampaignChannels)[keyof typeof CampaignChannels];

export const CampaignStatuses = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
} as const;

export type CampaignStatus = (typeof CampaignStatuses)[keyof typeof CampaignStatuses];

export const LeadProductInterestStatuses = {
  INTERESTED: 'interested',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const;

export type LeadProductInterestStatus = (typeof LeadProductInterestStatuses)[keyof typeof LeadProductInterestStatuses];

export const LeadProductInterestOrigins = {
  SELECTED: 'selected',
  CROSS_SELL: 'cross_sell',
  CAMPAIGN: 'campaign',
} as const;

export type LeadProductInterestOrigin = (typeof LeadProductInterestOrigins)[keyof typeof LeadProductInterestOrigins];

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
  TESTIMONIAL_SENT: 'testimonial_sent',
  TESTIMONIAL_VOID: 'testimonial_void',
  VISIT_REMINDER: 'visit_reminder',
  VISIT_RECOVERY: 'visit_recovery',
  TREATMENT_CHECKIN: 'treatment_checkin',
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

export const EscalationTypes = {
  CLINICAL_RED_FLAG: 'clinical_red_flag',
  ADHERENCE: 'adherence',
  INPATIENT_CONCERN: 'inpatient_concern',
} as const;

export type EscalationTypeCode = (typeof EscalationTypes)[keyof typeof EscalationTypes];

export const TestimonialChannels = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  CALL_READOUT: 'call_readout',
  OTHER: 'other',
} as const;

export type TestimonialChannelCode = (typeof TestimonialChannels)[keyof typeof TestimonialChannels];

export const TestimonialTypes = {
  VIDEO: 'video',
  TEXT: 'text',
  IMAGE: 'image',
  PDF: 'pdf',
} as const;

export type TestimonialTypeCode = (typeof TestimonialTypes)[keyof typeof TestimonialTypes];

export const ScheduleSettings = {
  OPD: 'opd',
  INPATIENT: 'inpatient',
} as const;

export type ScheduleSettingCode = (typeof ScheduleSettings)[keyof typeof ScheduleSettings];

export const FrequencyTypes = {
  DAILY: 'daily',
  ALTERNATE_DAYS: 'alternate_days',
  WEEKLY: 'weekly',
  EVERY_N_DAYS: 'every_n_days',
  CUSTOM_WEEKDAYS: 'custom_weekdays',
  CUSTOM_DATES: 'custom_dates',
} as const;

export type FrequencyTypeCode = (typeof FrequencyTypes)[keyof typeof FrequencyTypes];

export const ScheduleStatuses = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ScheduleStatusCode = (typeof ScheduleStatuses)[keyof typeof ScheduleStatuses];

export const VisitStatuses = {
  PLANNED: 'planned',
  REMINDED: 'reminded',
  ATTENDED: 'attended',
  MISSED: 'missed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
  EXCUSED: 'excused',
} as const;

export type VisitStatusCode = (typeof VisitStatuses)[keyof typeof VisitStatuses];

export const AdherenceRisks = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type AdherenceRiskCode = (typeof AdherenceRisks)[keyof typeof AdherenceRisks];

export const CheckinChannels = {
  CALL: 'call',
  BEDSIDE: 'bedside',
} as const;

export type CheckinChannelCode = (typeof CheckinChannels)[keyof typeof CheckinChannels];

export const PatientConditions = {
  COMFORTABLE: 'comfortable',
  UNCOMFORTABLE: 'uncomfortable',
  UNWELL: 'unwell',
} as const;

export type PatientConditionCode = (typeof PatientConditions)[keyof typeof PatientConditions];

export const TherapiesPlannedStatuses = {
  YES: 'yes',
  PARTLY: 'partly',
  NO: 'no',
} as const;

export type TherapiesPlannedStatusCode = (typeof TherapiesPlannedStatuses)[keyof typeof TherapiesPlannedStatuses];

export const ExtensionRequestStatuses = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ExtensionRequestStatusCode = (typeof ExtensionRequestStatuses)[keyof typeof ExtensionRequestStatuses];

