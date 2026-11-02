import { z } from 'zod';
import {
  Roles,
  Teams,
  Scopes,
  LeadStatuses,
  LeadPriorities,
  CaseStages,
  CareTypes,
  TaskTypes,
  TaskStatuses,
  InteractionTypes,
  AppointmentStatuses,
  EscalationStatuses,
  EscalationTypes,
  TestimonialChannels,
  TestimonialTypes,
  ScheduleSettings,
  FrequencyTypes,
  ScheduleStatuses,
  VisitStatuses,
  AdherenceRisks,
  CheckinChannels,
  PatientConditions,
  TherapiesPlannedStatuses,
  ExtensionRequestStatuses,
} from '../enums/index';
import { normalizePhoneNumber } from '../utils/phone';

// Custom validator for mobile phone numbers that normalizes them
export const phoneSchema = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .refine((val) => normalizePhoneNumber(val) !== null, {
    message: 'Invalid phone number format',
  })
  .transform((val) => normalizePhoneNumber(val)!);

export const optionalPhoneSchema = z
  .string()
  .nullish()
  .transform((val) => (val ? normalizePhoneNumber(val) : null));

// Auth Schemas
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyMfaSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

// Lead Schemas
export const quickCreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  mobile: phoneSchema,
  altMobile: optionalPhoneSchema,
  language: z.enum(['en', 'ml']).default('en'),
  concern: z.string().max(1000).optional().default(''),
  departmentId: z.number().int().positive('Department is required').optional(),
  department_id: z.number().int().positive().optional(),
  sourceId: z.number().int().positive('Source is required').optional(),
  source_id: z.number().int().positive().optional(),
  branchId: z.number().int().positive('Branch is required').optional(),
  branch_id: z.number().int().positive().optional(),
  campaignText: z.string().max(100).optional().nullable(),
  campaign_text: z.string().max(100).optional().nullable(),
  referrerText: z.string().max(100).optional().nullable(),
  referrer_text: z.string().max(100).optional().nullable(),
  leadType: z.enum(['treatment', 'product']).default('treatment').optional(),
  lead_type: z.enum(['treatment', 'product']).optional(),
  campaignId: z.coerce.number().int().positive().optional().nullable(),
  campaign_id: z.coerce.number().int().positive().optional().nullable(),
  productIds: z.array(z.coerce.number().int().positive()).optional(),
  product_ids: z.array(z.coerce.number().int().positive()).optional(),
  consentCalls: z.boolean().default(true),
  consentWhatsapp: z.boolean().default(false),
  consentSms: z.boolean().default(false),
  overrideDuplicate: z.boolean().default(false),
  overrideReason: z.string().max(500).optional(),
});

export const leadFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  sourceId: z.coerce.number().int().positive().optional(),
  source_id: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  owner_id: z.coerce.number().int().positive().optional(),
  leadType: z.enum(['treatment', 'product']).optional(),
  lead_type: z.enum(['treatment', 'product']).optional(),
  campaignId: z.coerce.number().int().positive().optional(),
  campaign_id: z.coerce.number().int().positive().optional(),
  productId: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  stockAffected: z.coerce.boolean().optional(),
  stock_affected: z.coerce.boolean().optional(),
  priority: z.enum(['hot', 'warm', 'cold']).optional(),
  language: z.enum(['en', 'ml']).optional(),
  search: z.string().optional(),
  testimonials: z.enum(['sent', 'not_sent']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  altMobile: optionalPhoneSchema,
  language: z.enum(['en', 'ml']).optional(),
  concern: z.string().max(1000).optional(),
  departmentId: z.number().int().positive().optional(),
  priority: z.enum(['hot', 'warm', 'cold']).optional(),
  consentCalls: z.boolean().optional(),
  consentWhatsapp: z.boolean().optional(),
  consentSms: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
  testimonialsSent: z.boolean().optional(),
});

export const assignLeadSchema = z.object({
  ownerId: z.number().int().positive('Owner ID is required'),
});

export const intakeLeadSchema = z.object({
  name: z.string().min(1).max(100),
  mobile: phoneSchema,
  altMobile: optionalPhoneSchema,
  language: z.enum(['en', 'ml']).default('en'),
  concern: z.string().max(1000).optional().default(''),
  departmentCode: z.string().optional(),
  branchCode: z.string().default('MAIN'),
  campaignText: z.string().max(100).optional().nullable(),
  referrerText: z.string().max(100).optional().nullable(),
  campaignKey: z.string().optional().nullable(),
  campaign_key: z.string().optional().nullable(),
  productSkus: z.array(z.string()).optional(),
  product_skus: z.array(z.string()).optional(),
  leadType: z.enum(['treatment', 'product']).optional(),
  lead_type: z.enum(['treatment', 'product']).optional(),
});

export const importLeadRowSchema = z.object({
  name: z.string().min(1).max(100),
  mobile: z.string(),
  altMobile: z.string().optional().nullable(),
  language: z.string().optional().default('en'),
  concern: z.string().optional().default(''),
  departmentCode: z.string().optional(),
  sourceCode: z.string().optional(),
  branchCode: z.string().optional().default('MAIN'),
  priority: z.enum(['hot', 'warm', 'cold']).optional().default('warm'),
});

export const importLeadsPreviewSchema = z.object({
  rows: z.array(importLeadRowSchema),
});

export const importLeadsCommitSchema = z.object({
  rows: z.array(importLeadRowSchema),
});

export const closeLeadSchema = z.object({
  closedReasonId: z.number().int().positive('Closed reason is required'),
  note: z.string().max(500).optional(),
});

export const emergencyRedirectSchema = z.object({
  note: z.string().min(1, 'Emergency reason is required').max(500),
});

// Appointment Booking
export const bookAppointmentSchema = z.object({
  leadId: z.number().int().positive().optional().nullable(),
  caseId: z.number().int().positive().optional().nullable(),
  branchId: z.number().int().positive().optional(),
  doctorName: z.string().min(1, 'Doctor name is required').max(100),
  startsAt: z.string().datetime({ message: 'Valid ISO datetime required' }),
  note: z.string().max(500).optional(),
});

export const convertLeadSchema = z.object({
  patientCode: z.string().max(50).optional(),
  dateOfBirth: z.string().optional().nullable(),
  treatingDoctorId: z.number().int().positive().optional().nullable(),
  departmentId: z.number().int().positive().optional().nullable(),
  note: z.string().max(500).optional(),
});

// Case Schemas
export const caseFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  stage: z.string().optional(),
  careType: z.string().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  treatingDoctorId: z.coerce.number().int().positive().optional(),
  team: z.string().optional(),
  search: z.string().optional(),
});

export const consultationOutcomeSchema = z.object({
  careType: z.enum([
    CareTypes.CONSULTATION_ONLY,
    CareTypes.OPD_COURSE,
    CareTypes.IN_PATIENT,
    CareTypes.PROCEDURE,
  ]),
  departmentId: z.number().int().positive().optional(),
  treatingDoctorId: z.number().int().positive().optional().nullable(),
  estimatedAmount: z.number().nonnegative().optional().nullable(),
  planNote: z.string().max(2000).optional().default(''),
});

export const updateCaseSchema = z.object({
  careType: z
    .enum([
      CareTypes.CONSULTATION_ONLY,
      CareTypes.OPD_COURSE,
      CareTypes.IN_PATIENT,
      CareTypes.PROCEDURE,
    ])
    .optional(),
  departmentId: z.number().int().positive().optional(),
  treatingDoctorId: z.number().int().positive().optional().nullable(),
  estimatedAmount: z.number().nonnegative().optional().nullable(),
  emergencyAdmission: z.boolean().optional(),
  emergencyReason: z.string().max(500).optional().nullable(),
  notStartedReasonId: z.number().int().positive().optional().nullable(),
  closureCodeId: z.number().int().positive().optional().nullable(),
  ownerId: z.number().int().positive().optional().nullable(),
});

export const advanceCaseStageSchema = z.object({
  stage: z.enum([
    CaseStages.VISITED,
    CaseStages.PLAN_GIVEN,
    CaseStages.COUNSELING_ESTIMATE,
    CaseStages.PLAN_ACCEPTED,
    CaseStages.IN_TREATMENT,
    CaseStages.AFTERCARE_FOLLOW_UP,
    CaseStages.COMPLETED,
    CaseStages.NOT_STARTED,
    CaseStages.DROPPED_OUT,
  ]),
  estimatedAmount: z.number().nonnegative().optional().nullable(),
  estimateSharedAt: z.string().datetime().optional().nullable(),
  depositReceived: z.boolean().optional(),
  depositAmount: z.number().nonnegative().optional().nullable(),
  expectedAdmissionDate: z.string().datetime().optional().nullable(),
  admissionDate: z.string().datetime().optional().nullable(),
  emergencyAdmission: z.boolean().optional().default(false),
  emergencyReason: z.string().max(500).optional().nullable(),
  notStartedReasonId: z.number().int().positive().optional().nullable(),
  closureCodeId: z.number().int().positive().optional().nullable(),
  note: z.string().max(500).optional(),
});

export const treatmentCompletedSchema = z.object({
  treatmentCompletedAt: z.string().datetime({ message: 'Valid ISO datetime required' }),
  dischargeDate: z.string().datetime().optional().nullable(),
  note: z.string().max(500).optional(),
});

export const closeCaseSchema = z.object({
  closureCodeId: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

// Task Schemas
export const nextActionSchema = z.object({
  type: z.enum([
    TaskTypes.CALL,
    TaskTypes.WHATSAPP,
    TaskTypes.REMINDER,
    TaskTypes.REVIEW,
    TaskTypes.ESCALATION_CALLBACK,
  ]),
  title: z.string().min(1).max(200),
  dueAt: z.string().datetime({ message: 'Valid ISO datetime required' }),
  priority: z.enum(['hot', 'warm', 'cold']).default('warm'),
  ownerId: z.number().int().positive().optional().nullable(),
});

export const createTaskSchema = z.object({
  type: z.enum([
    TaskTypes.CALL,
    TaskTypes.WHATSAPP,
    TaskTypes.REMINDER,
    TaskTypes.REVIEW,
    TaskTypes.ESCALATION_CALLBACK,
  ]),
  title: z.string().min(1).max(200),
  dueAt: z.string().datetime(),
  priority: z.enum(['hot', 'warm', 'cold']).default('warm'),
  ownerId: z.number().int().positive(),
  leadId: z.number().int().positive().optional().nullable(),
  caseId: z.number().int().positive().optional().nullable(),
  cadenceKey: z.string().optional().nullable(),
  cadenceStep: z.number().int().optional().nullable(),
});

export const snoozeTaskSchema = z.object({
  newDueAt: z.string().datetime(),
  reason: z.string().min(1, 'Reason is required').max(500),
});

// Call Interaction Schema (Atomic: Outcome + Next Action OR Closure)
export const logCallInteractionSchema = z.object({
  leadId: z.number().int().positive().optional().nullable(),
  caseId: z.number().int().positive().optional().nullable(),
  outcomeId: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  note: z.string().max(2000).optional().default(''),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  overrideReason: z.string().max(500).optional().nullable(),
  // Mandatory Next Action OR Closure
  nextAction: nextActionSchema.optional().nullable(),
  closedReasonId: z.number().int().positive().optional().nullable(),
  notStartedReasonId: z.number().int().positive().optional().nullable(),
  closureCodeId: z.number().int().positive().optional().nullable(),
});

// Aftercare Call Details Schema
export const aftercareDetailsSchema = z.object({
  generalCondition: z.enum(['better', 'same', 'worse']),
  medicinesTaken: z.enum(['yes', 'partly', 'no']),
  symptoms: z.string().max(500).default('none'),
  dietRestFollowed: z.boolean().default(true),
  reviewVisitBooked: z.boolean().default(false),
  reviewVisitDate: z.string().datetime().optional().nullable(),
  complaints: z.string().max(500).optional().nullable(),
  feedbackScore: z.number().int().min(0).max(10).optional().nullable(),
  escalateToDoctor: z.boolean().optional().default(false),
  escalationReason: z.string().max(1000).optional().nullable(),
});

export const logAftercareCallSchema = z.object({
  caseId: z.number().int().positive(),
  taskId: z.number().int().positive().optional().nullable(),
  outcomeId: z.number().int().positive().optional().nullable(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  note: z.string().max(2000).optional().default(''),
  details: aftercareDetailsSchema,
  overrideReason: z.string().max(500).optional().nullable(),
  nextAction: nextActionSchema.optional().nullable(),
  closureCodeId: z.number().int().positive().optional().nullable(),
  escalateToDoctor: z.boolean().optional().default(false),
  escalationReason: z.string().max(1000).optional().nullable(),
});

// Escalation Schemas
export const createEscalationSchema = z.object({
  caseId: z.number().int().positive(),
  reason: z.string().min(1, 'Escalation reason is required').max(1000),
});

export const decideEscalationSchema = z.object({
  decision: z.string().min(1, 'Clinical decision is required').max(2000),
  callbackDueAt: z.string().datetime().optional().nullable(),
});

// User Management Schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  mobile: phoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.number().int().positive(),
  branchIds: z.array(z.number().int().positive()).min(1, 'At least one branch required'),
  teamCodes: z.array(z.enum([Teams.SUPPORT, Teams.ADMISSION, Teams.AFTERCARE])),
  language: z.enum(['en', 'ml']).default('en'),
  dutyNurse: z.boolean().default(false),
  dutyDoctor: z.boolean().default(false),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

// Export Schemas
export const requestExportSchema = z.object({
  resource: z.enum(['leads', 'cases', 'interactions', 'audit_logs']),
  branchId: z.number().int().positive().optional(),
  format: z.enum(['csv']).default('csv'),
  filters: z.record(z.any()).optional(),
});

export type RequestExportInput = z.infer<typeof requestExportSchema>;

export const approveExportSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().max(255).optional(),
});

export type ApproveExportInput = z.infer<typeof approveExportSchema>;

// Anti-PII phone number detector for library items
export const phonePatternRegex = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}|\b\d{7,14}\b/;

export function containsPhoneNumber(text: string | null | undefined): boolean {
  if (!text) return false;
  return phonePatternRegex.test(text);
}

// Testimonial Library Schemas
export const createTestimonialSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200)
    .refine((val) => !containsPhoneNumber(val), {
      message: 'Title must not contain patient phone numbers or contact identifiers',
    }),
  type: z.enum([
    TestimonialTypes.VIDEO,
    TestimonialTypes.TEXT,
    TestimonialTypes.IMAGE,
    TestimonialTypes.PDF,
  ]),
  url: z.string().min(1, 'URL or file reference is required').max(500),
  language: z.enum(['en', 'ml', 'other']).default('en'),
  departmentId: z.number().int().positive().optional().nullable(),
  summary: z
    .string()
    .min(1, 'Summary is required')
    .max(2000)
    .refine((val) => !containsPhoneNumber(val), {
      message: 'Summary must not contain patient phone numbers or contact identifiers',
    }),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Patient consent must be confirmed to save testimonial' }),
  }),
  consentReference: z
    .string()
    .min(1, 'Consent reference (e.g. consent form number or archive ID) is strictly required')
    .max(200),
  active: z.boolean().default(true),
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;

export const updateTestimonialSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .refine((val) => !containsPhoneNumber(val), {
      message: 'Title must not contain patient phone numbers or contact identifiers',
    })
    .optional(),
  type: z
    .enum([
      TestimonialTypes.VIDEO,
      TestimonialTypes.TEXT,
      TestimonialTypes.IMAGE,
      TestimonialTypes.PDF,
    ])
    .optional(),
  url: z.string().min(1).max(500).optional(),
  language: z.enum(['en', 'ml', 'other']).optional(),
  departmentId: z.number().int().positive().optional().nullable(),
  summary: z
    .string()
    .min(1)
    .max(2000)
    .refine((val) => !containsPhoneNumber(val), {
      message: 'Summary must not contain patient phone numbers or contact identifiers',
    })
    .optional(),
  consentConfirmed: z.boolean().optional(),
  consentReference: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.active === true || data.consentConfirmed === true) {
      if (data.consentConfirmed === false) return false;
      if (data.consentReference !== undefined && data.consentReference.trim() === '') return false;
    }
    return true;
  },
  { message: 'Testimonial cannot be activated or saved without confirmed consent and reference' }
);

export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;

// Lead Testimonial Send Schemas
export const sendTestimonialsSchema = z
  .object({
    channel: z.enum([
      TestimonialChannels.WHATSAPP,
      TestimonialChannels.SMS,
      TestimonialChannels.EMAIL,
      TestimonialChannels.CALL_READOUT,
      TestimonialChannels.OTHER,
    ]),
    testimonial_ids: z.array(z.number().int().positive()).optional(),
    testimonialIds: z.array(z.number().int().positive()).optional(),
    note: z.string().max(1000).optional().nullable(),
    sent_at: z.string().optional().nullable(),
    sentAt: z.string().optional().nullable(),
    override_reason: z.string().max(500).optional().nullable(),
    overrideReason: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) =>
      (data.testimonial_ids && data.testimonial_ids.length > 0) ||
      (data.testimonialIds && data.testimonialIds.length > 0),
    { message: 'Select at least one testimonial to send' }
  );

export type SendTestimonialsInput = z.infer<typeof sendTestimonialsSchema>;

export const editTestimonialSendSchema = z.object({
  note: z.string().max(1000).optional().nullable(),
  sent_at: z.string().optional().nullable(),
  sentAt: z.string().optional().nullable(),
});

export type EditTestimonialSendInput = z.infer<typeof editTestimonialSendSchema>;

export const voidTestimonialSendSchema = z.object({
  reason: z.string().min(1, 'Reason for voiding is required').max(500),
});

export type VoidTestimonialSendInput = z.infer<typeof voidTestimonialSendSchema>;

export const testimonialReportQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type TestimonialReportQuery = z.infer<typeof testimonialReportQuerySchema>;

// ==========================================
// Treatment Follow-up Desk Schemas
// ==========================================

export const createVisitScheduleSchema = z
  .object({
    setting: z
      .enum([ScheduleSettings.OPD, ScheduleSettings.INPATIENT])
      .default(ScheduleSettings.OPD),
    therapy_id: z.number().int().positive().optional(),
    therapyId: z.number().int().positive().optional(),
    frequency_type: z
      .enum([
        FrequencyTypes.DAILY,
        FrequencyTypes.ALTERNATE_DAYS,
        FrequencyTypes.WEEKLY,
        FrequencyTypes.EVERY_N_DAYS,
        FrequencyTypes.CUSTOM_WEEKDAYS,
        FrequencyTypes.CUSTOM_DATES,
      ])
      .optional(),
    frequencyType: z
      .enum([
        FrequencyTypes.DAILY,
        FrequencyTypes.ALTERNATE_DAYS,
        FrequencyTypes.WEEKLY,
        FrequencyTypes.EVERY_N_DAYS,
        FrequencyTypes.CUSTOM_WEEKDAYS,
        FrequencyTypes.CUSTOM_DATES,
      ])
      .optional(),
    interval_n: z.number().int().positive().optional().nullable(),
    intervalN: z.number().int().positive().optional().nullable(),
    weekdays: z.array(z.union([z.number(), z.string()])).optional().nullable(),
    custom_dates: z.array(z.string()).optional().nullable(),
    customDates: z.array(z.string()).optional().nullable(),
    start_date: z.string().optional(),
    startDate: z.string().optional(),
    end_date: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    total_sessions: z.number().int().positive().max(150).optional().nullable(),
    totalSessions: z.number().int().positive().max(150).optional().nullable(),
    window_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM').default('09:00'),
    windowStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM').optional(),
    window_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM').default('11:00'),
    windowEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM').optional(),
    duration_minutes: z.number().int().positive().default(60),
    durationMinutes: z.number().int().positive().optional(),
    doctor_id: z.number().int().positive().optional().nullable(),
    doctorId: z.number().int().positive().optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (data) => data.therapy_id !== undefined || data.therapyId !== undefined,
    { message: 'Therapy / Visit Type is required' }
  )
  .refine(
    (data) => data.frequency_type !== undefined || data.frequencyType !== undefined,
    { message: 'Frequency type is required' }
  )
  .refine(
    (data) => data.start_date !== undefined || data.startDate !== undefined,
    { message: 'Start date is required' }
  )
  .refine(
    (data) =>
      data.end_date !== undefined ||
      data.endDate !== undefined ||
      data.total_sessions !== undefined ||
      data.totalSessions !== undefined ||
      (data.custom_dates && data.custom_dates.length > 0) ||
      (data.customDates && data.customDates.length > 0),
    { message: 'Either end date, total sessions, or custom dates must be provided' }
  );

export type CreateVisitScheduleInput = z.infer<typeof createVisitScheduleSchema>;

export const updateVisitScheduleSchema = z.object({
  therapy_id: z.number().int().positive().optional(),
  therapyId: z.number().int().positive().optional(),
  frequency_type: z.enum([
    FrequencyTypes.DAILY,
    FrequencyTypes.ALTERNATE_DAYS,
    FrequencyTypes.WEEKLY,
    FrequencyTypes.EVERY_N_DAYS,
    FrequencyTypes.CUSTOM_WEEKDAYS,
    FrequencyTypes.CUSTOM_DATES,
  ]).optional(),
  frequencyType: z.enum([
    FrequencyTypes.DAILY,
    FrequencyTypes.ALTERNATE_DAYS,
    FrequencyTypes.WEEKLY,
    FrequencyTypes.EVERY_N_DAYS,
    FrequencyTypes.CUSTOM_WEEKDAYS,
    FrequencyTypes.CUSTOM_DATES,
  ]).optional(),
  interval_n: z.number().int().positive().optional().nullable(),
  intervalN: z.number().int().positive().optional().nullable(),
  weekdays: z.array(z.union([z.number(), z.string()])).optional().nullable(),
  custom_dates: z.array(z.string()).optional().nullable(),
  customDates: z.array(z.string()).optional().nullable(),
  end_date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  total_sessions: z.number().int().positive().max(150).optional().nullable(),
  totalSessions: z.number().int().positive().max(150).optional().nullable(),
  window_start: z.string().optional(),
  windowStart: z.string().optional(),
  window_end: z.string().optional(),
  windowEnd: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  durationMinutes: z.number().int().positive().optional(),
  doctor_id: z.number().int().positive().optional().nullable(),
  doctorId: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateVisitScheduleInput = z.infer<typeof updateVisitScheduleSchema>;

export const pauseScheduleSchema = z.object({
  paused_until: z.string().optional(),
  pausedUntil: z.string().optional(),
  pause_reason: z.string().min(1, 'Reason for pause is required').max(500).optional(),
  pauseReason: z.string().min(1, 'Reason for pause is required').max(500).optional(),
}).refine(
  (data) => (data.paused_until || data.pausedUntil) && (data.pause_reason || data.pauseReason),
  { message: 'Resume date and pause reason are required' }
);

export type PauseScheduleInput = z.infer<typeof pauseScheduleSchema>;

export const createExtensionRequestSchema = z.object({
  additional_sessions: z.number().int().positive().max(150).optional().nullable(),
  additionalSessions: z.number().int().positive().max(150).optional().nullable(),
  new_end_date: z.string().optional().nullable(),
  newEndDate: z.string().optional().nullable(),
  reason: z.string().min(1, 'Reason for extension is required').max(500),
}).refine(
  (data) =>
    (data.additional_sessions !== undefined && data.additional_sessions !== null) ||
    (data.additionalSessions !== undefined && data.additionalSessions !== null) ||
    (data.new_end_date !== undefined && data.new_end_date !== null) ||
    (data.newEndDate !== undefined && data.newEndDate !== null),
  { message: 'Either additional sessions or new end date must be provided' }
);

export type CreateExtensionRequestInput = z.infer<typeof createExtensionRequestSchema>;

export const decideExtensionRequestSchema = z.object({
  decision: z.enum([ExtensionRequestStatuses.APPROVED, ExtensionRequestStatuses.REJECTED]),
  rejection_reason: z.string().max(500).optional().nullable(),
  rejectionReason: z.string().max(500).optional().nullable(),
});

export type DecideExtensionRequestInput = z.infer<typeof decideExtensionRequestSchema>;

export const markVisitAttendanceSchema = z.object({
  status: z.enum([VisitStatuses.ATTENDED, VisitStatuses.MISSED]),
  missed_reason_id: z.number().int().positive().optional().nullable(),
  missedReasonId: z.number().int().positive().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => {
    if (data.status === VisitStatuses.MISSED) {
      return data.missed_reason_id !== undefined || data.missedReasonId !== undefined;
    }
    return true;
  },
  { message: 'Missed reason is required when marking a visit as missed' }
);

export type MarkVisitAttendanceInput = z.infer<typeof markVisitAttendanceSchema>;

export const rescheduleVisitSchema = z.object({
  new_date: z.string().optional(),
  newDate: z.string().optional(),
  window_start: z.string().optional(),
  windowStart: z.string().optional(),
  window_end: z.string().optional(),
  windowEnd: z.string().optional(),
  reason: z.string().min(1, 'Reschedule reason is required').max(500),
}).refine(
  (data) => data.new_date !== undefined || data.newDate !== undefined,
  { message: 'New date is required' }
);

export type RescheduleVisitInput = z.infer<typeof rescheduleVisitSchema>;

export const shiftVisitsSchema = z.object({
  days: z.number().int().min(1, 'Must shift by at least 1 day').max(365),
  reason: z.string().min(1, 'Reason for shifting visits is required').max(500),
});

export type ShiftVisitsInput = z.infer<typeof shiftVisitsSchema>;

export const addExtraVisitSchema = z.object({
  scheduled_date: z.string().optional(),
  scheduledDate: z.string().optional(),
  window_start: z.string().optional(),
  windowStart: z.string().optional(),
  window_end: z.string().optional(),
  windowEnd: z.string().optional(),
  note: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.scheduled_date !== undefined || data.scheduledDate !== undefined,
  { message: 'Scheduled date is required' }
);

export type AddExtraVisitInput = z.infer<typeof addExtraVisitSchema>;

export const createTreatmentCheckinSchema = z.object({
  channel: z.enum([CheckinChannels.CALL, CheckinChannels.BEDSIDE]),
  contacted_who: z.string().min(1, 'Contacted person/role is required').max(100).optional(),
  contactedWho: z.string().min(1, 'Contacted person/role is required').max(100).optional(),
  condition: z.enum([
    PatientConditions.COMFORTABLE,
    PatientConditions.UNCOMFORTABLE,
    PatientConditions.UNWELL,
  ]),
  therapies_as_planned: z.enum([
    TherapiesPlannedStatuses.YES,
    TherapiesPlannedStatuses.PARTLY,
    TherapiesPlannedStatuses.NO,
  ]).optional(),
  therapiesAsPlanned: z.enum([
    TherapiesPlannedStatuses.YES,
    TherapiesPlannedStatuses.PARTLY,
    TherapiesPlannedStatuses.NO,
  ]).optional(),
  missed_therapies_note: z.string().max(1000).optional().nullable(),
  missedTherapiesNote: z.string().max(1000).optional().nullable(),
  concerns: z.string().max(2000).optional().nullable(),
  billing_concern: z.boolean().default(false).optional(),
  billingConcern: z.boolean().default(false).optional(),
  expected_discharge_date: z.string().optional().nullable(),
  expectedDischargeDate: z.string().optional().nullable(),
  next_checkin_at: z.string().optional().nullable(),
  nextCheckinAt: z.string().optional().nullable(),
  is_discharged: z.boolean().default(false).optional(),
  isDischarged: z.boolean().default(false).optional(),
  escalate: z.boolean().default(false).optional(),
  occurred_at: z.string().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
}).refine(
  (data) => data.contacted_who !== undefined || data.contactedWho !== undefined,
  { message: 'Contacted person is required' }
).refine(
  (data) => data.therapies_as_planned !== undefined || data.therapiesAsPlanned !== undefined,
  { message: 'Therapies planned status is required' }
).refine(
  (data) => {
    const isDischarged = data.is_discharged || data.isDischarged;
    const hasNext = data.next_checkin_at || data.nextCheckinAt;
    if (!isDischarged && !hasNext) {
      return false;
    }
    return true;
  },
  { message: 'A next check-in date is required unless the patient was discharged' }
);

export type CreateTreatmentCheckinInput = z.infer<typeof createTreatmentCheckinSchema>;

export const treatmentCompletedHandoverSchema = z.object({
  completion_date: z.string().optional(),
  completionDate: z.string().optional(),
  discharge_date: z.string().optional().nullable(),
  dischargeDate: z.string().optional().nullable(),
  note: z.string().min(1, 'Handover note is required').max(1000),
});

export type TreatmentCompletedHandoverInput = z.infer<typeof treatmentCompletedHandoverSchema>;

export const treatmentFollowupReportQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  doctor_id: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  therapy_id: z.coerce.number().int().positive().optional(),
  therapyId: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type TreatmentFollowupReportQuery = z.infer<typeof treatmentFollowupReportQuerySchema>;

export const adherenceReportQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  doctor_id: z.coerce.number().int().positive().optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  risk: z.enum([AdherenceRisks.LOW, AdherenceRisks.MEDIUM, AdherenceRisks.HIGH]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AdherenceReportQuery = z.infer<typeof adherenceReportQuerySchema>;

export const missedReasonsReportQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  therapy_id: z.coerce.number().int().positive().optional(),
  therapyId: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type MissedReasonsReportQuery = z.infer<typeof missedReasonsReportQuerySchema>;

// ==========================================
// Product Module Schemas
// ==========================================

export const PHONE_NUMBER_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}|\b\d{10}\b/;

export const skuSchema = z
  .string()
  .trim()
  .min(3, 'SKU must be at least 3 characters')
  .max(40, 'SKU cannot exceed 40 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'SKU must contain only letters, numbers, hyphens, and underscores')
  .transform((val) => val.toUpperCase());

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  parent_id: z.coerce.number().int().positive().optional().nullable(),
  sort: z.coerce.number().int().default(0).optional(),
  active: z.boolean().default(true).optional(),
  description: z.string().trim().max(500).optional().nullable(),
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;

export const updateProductCategorySchema = createProductCategorySchema.partial();
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;

export const moveCategoryProductsSchema = z.object({
  targetCategoryId: z.coerce.number().int().positive('Target category ID is required'),
  target_category_id: z.coerce.number().int().positive().optional(),
});

export const createProductSchema = z.object({
  sku: skuSchema,
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  price: z.coerce.number().min(0, 'Price must be zero or greater'),
  usageDescription: z
    .string()
    .trim()
    .min(10, 'Usage description must be at least 10 characters')
    .max(1000, 'Usage description cannot exceed 1000 characters')
    .refine((val) => !PHONE_NUMBER_PATTERN.test(val), {
      message: 'Product description must not contain contact numbers or personal data',
    }),
  usage_description: z.string().optional(),
  categoryId: z.coerce.number().int().positive('Category is required').optional(),
  category_id: z.coerce.number().int().positive().optional(),
  shortDescription: z.string().trim().max(160).optional().nullable(),
  short_description: z.string().trim().max(160).optional().nullable(),
  packSize: z.string().trim().max(100).optional().nullable(),
  pack_size: z.string().trim().max(100).optional().nullable(),
  howToUse: z.string().trim().max(2000).optional().nullable(),
  how_to_use: z.string().trim().max(2000).optional().nullable(),
  ingredients: z.string().trim().max(2000).optional().nullable(),
  precautions: z.string().trim().max(2000).optional().nullable(),
  prescriptionRequired: z.boolean().default(false).optional(),
  prescription_required: z.boolean().default(false).optional(),
  refillDays: z.coerce.number().int().positive().optional().nullable(),
  refill_days: z.coerce.number().int().positive().optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  image_url: z.string().url().max(500).optional().nullable().or(z.literal('')),
  internalNote: z.string().trim().max(2000).optional().nullable(),
  internal_note: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['draft', 'approved', 'archived']).default('draft').optional(),
  approvalConfirmed: z.boolean().optional(),
}).refine((data) => data.categoryId !== undefined || data.category_id !== undefined, {
  message: 'Category is required',
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  sku: skuSchema.optional(),
  name: z.string().trim().min(2).max(150).optional(),
  price: z.coerce.number().min(0).optional(),
  priceChangeReason: z.string().max(255).optional().nullable(),
  price_change_reason: z.string().max(255).optional().nullable(),
  usageDescription: z
    .string()
    .trim()
    .min(10)
    .max(1000)
    .refine((val) => !PHONE_NUMBER_PATTERN.test(val), {
      message: 'Product description must not contain contact numbers or personal data',
    })
    .optional(),
  usage_description: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  shortDescription: z.string().trim().max(160).optional().nullable(),
  short_description: z.string().trim().max(160).optional().nullable(),
  packSize: z.string().trim().max(100).optional().nullable(),
  pack_size: z.string().trim().max(100).optional().nullable(),
  howToUse: z.string().trim().max(2000).optional().nullable(),
  how_to_use: z.string().trim().max(2000).optional().nullable(),
  ingredients: z.string().trim().max(2000).optional().nullable(),
  precautions: z.string().trim().max(2000).optional().nullable(),
  prescriptionRequired: z.boolean().optional(),
  prescription_required: z.boolean().optional(),
  refillDays: z.coerce.number().int().positive().optional().nullable(),
  refill_days: z.coerce.number().int().positive().optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  image_url: z.string().max(500).optional().nullable().or(z.literal('')),
  internalNote: z.string().trim().max(2000).optional().nullable(),
  internal_note: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['draft', 'approved', 'archived']).optional(),
  approvalConfirmed: z.boolean().optional(),
  approval_confirmed: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const approveProductSchema = z.object({
  confirmed: z.boolean().optional(),
  confirmation: z.boolean().optional(),
  confirmApprovedWording: z.boolean().optional(),
  confirm_approved_wording: z.boolean().optional(),
}).refine(
  (data) =>
    data.confirmed === true ||
    data.confirmation === true ||
    data.confirmApprovedWording === true ||
    data.confirm_approved_wording === true,
  {
    message: 'The description uses only approved wording statement must be confirmed',
  }
);

export const updateProductStockSchema = z.object({
  stockStatus: z.enum(['in_stock', 'out_of_stock']).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock']).optional(),
  note: z.string().max(500).optional().nullable(),
}).refine((data) => data.stockStatus !== undefined || data.stock_status !== undefined, {
  message: 'Stock status is required',
});

export const bulkStockUpdateSchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one product').optional(),
  product_ids: z.array(z.coerce.number().int().positive()).optional(),
  stockStatus: z.enum(['in_stock', 'out_of_stock']).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock']).optional(),
  note: z.string().max(500).optional().nullable(),
}).refine((data) => (data.productIds && data.productIds.length > 0) || (data.product_ids && data.product_ids.length > 0), {
  message: 'Select at least one product',
}).refine((data) => data.stockStatus !== undefined || data.stock_status !== undefined, {
  message: 'Stock status is required',
});

export const createProductRelationSchema = z.object({
  relatedProductId: z.coerce.number().int().positive('Related product is required').optional(),
  related_product_id: z.coerce.number().int().positive().optional(),
  relationType: z.enum(['cross_sell', 'upsell', 'frequently_together', 'substitute']).optional(),
  relation_type: z.enum(['cross_sell', 'upsell', 'frequently_together', 'substitute']).optional(),
  talkingPoint: z.string().trim().min(3, 'Talking point is required').max(1000).refine((val) => !PHONE_NUMBER_PATTERN.test(val), {
    message: 'Talking points cannot contain contact numbers',
  }).optional(),
  talking_point: z.string().optional(),
  sort: z.coerce.number().int().default(0).optional(),
  active: z.boolean().default(true).optional(),
  mirror: z.boolean().default(false).optional(),
}).refine((data) => data.relatedProductId !== undefined || data.related_product_id !== undefined, {
  message: 'Related product is required',
}).refine((data) => data.relationType !== undefined || data.relation_type !== undefined, {
  message: 'Relation type is required',
});

export type CreateProductRelationInput = z.infer<typeof createProductRelationSchema>;

export const updateProductRelationSchema = z.object({
  relationType: z.enum(['cross_sell', 'upsell', 'frequently_together', 'substitute']).optional(),
  relation_type: z.enum(['cross_sell', 'upsell', 'frequently_together', 'substitute']).optional(),
  talkingPoint: z.string().trim().max(1000).optional(),
  talking_point: z.string().optional(),
  sort: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export const createProductCampaignSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(150),
  campaignKey: z.string().trim().min(2, 'Campaign key is required').max(100).optional(),
  campaign_key: z.string().trim().min(2).max(100).optional(),
  channel: z.enum(['meta_ads', 'google_ads', 'whatsapp', 'sms', 'email', 'website', 'camp', 'other']),
  startDate: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).optional().nullable(),
  spent: z.coerce.number().min(0).default(0).optional(),
  ownerId: z.coerce.number().int().positive().optional().nullable(),
  owner_id: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('draft').optional(),
  notes: z.string().max(2000).optional().nullable(),
  productIds: z.array(z.coerce.number().int().positive()).optional(),
  product_ids: z.array(z.coerce.number().int().positive()).optional(),
});

export type CreateProductCampaignInput = z.infer<typeof createProductCampaignSchema>;

export const updateProductCampaignSchema = createProductCampaignSchema.partial();

export const addLeadProductInterestSchema = z.object({
  productId: z.coerce.number().int().positive('Product ID is required').optional(),
  product_id: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().positive().default(1).optional(),
  unitPriceAtTime: z.coerce.number().min(0).optional(),
  unit_price_at_time: z.coerce.number().min(0).optional(),
  status: z.enum(['interested', 'offered', 'accepted', 'declined']).default('interested').optional(),
  origin: z.enum(['selected', 'cross_sell', 'campaign']).default('selected').optional(),
  prescriptionVerified: z.boolean().default(false).optional(),
  prescription_verified: z.boolean().default(false).optional(),
  declinedReason: z.string().max(255).optional().nullable(),
  declined_reason: z.string().max(255).optional().nullable(),
  waitlisted: z.boolean().default(false).optional(),
  note: z.string().max(1000).optional().nullable(),
}).refine((data) => data.productId !== undefined || data.product_id !== undefined, {
  message: 'Product ID is required',
});

export const updateLeadProductInterestSchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  status: z.enum(['interested', 'offered', 'accepted', 'declined']).optional(),
  prescriptionVerified: z.boolean().optional(),
  prescription_verified: z.boolean().optional(),
  declinedReason: z.string().max(255).optional().nullable(),
  declined_reason: z.string().max(255).optional().nullable(),
  waitlisted: z.boolean().optional(),
  note: z.string().max(1000).optional().nullable(),
  updatePriceToCurrent: z.boolean().optional(),
  update_price_to_current: z.boolean().optional(),
});

export const confirmSaleSchema = z.object({
  orderReference: z.string().trim().min(1, 'Order reference is required').max(100).optional(),
  order_reference: z.string().trim().min(1).max(100).optional(),
  saleAmount: z.coerce.number().min(0, 'Sale amount must be zero or greater').optional(),
  sale_amount: z.coerce.number().min(0).optional(),
  prescriptionVerifiedLines: z.array(z.coerce.number().int().positive()).optional(),
  prescription_verified_lines: z.array(z.coerce.number().int().positive()).optional(),
}).refine((data) => (data.orderReference && data.orderReference.length > 0) || (data.order_reference && data.order_reference.length > 0), {
  message: 'Order reference is required',
});

export const referToTreatmentSchema = z.object({
  concern: z.string().trim().min(5, 'Clinical concern details are required').max(1000),
  departmentId: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
});


