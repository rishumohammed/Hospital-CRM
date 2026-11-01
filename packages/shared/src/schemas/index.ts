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
  departmentId: z.number().int().positive('Department is required'),
  sourceId: z.number().int().positive('Source is required'),
  branchId: z.number().int().positive('Branch is required'),
  campaignText: z.string().max(100).optional().nullable(),
  referrerText: z.string().max(100).optional().nullable(),
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
  branchId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  priority: z.enum(['hot', 'warm', 'cold']).optional(),
  language: z.enum(['en', 'ml']).optional(),
  search: z.string().optional(),
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
  branchId: z.number().int().positive(),
  doctorName: z.string().min(1, 'Doctor name is required').max(100),
  startsAt: z.string().datetime({ message: 'Valid ISO datetime required' }),
  note: z.string().max(500).optional(),
});

// Case Schemas
export const consultationOutcomeSchema = z.object({
  careType: z.enum([
    CareTypes.CONSULTATION_ONLY,
    CareTypes.OPD_COURSE,
    CareTypes.IN_PATIENT,
    CareTypes.PROCEDURE,
  ]),
  departmentId: z.number().int().positive(),
  treatingDoctorId: z.number().int().positive().optional().nullable(),
  estimatedAmount: z.number().nonnegative().optional().nullable(),
  planNote: z.string().max(2000).optional().default(''),
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
});

export const logAftercareCallSchema = z.object({
  caseId: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  note: z.string().max(2000).optional().default(''),
  details: aftercareDetailsSchema,
  overrideReason: z.string().max(500).optional().nullable(),
  nextAction: nextActionSchema.optional().nullable(),
  closureCodeId: z.number().int().positive().optional().nullable(),
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
