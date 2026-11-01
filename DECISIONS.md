# Architecture & Engineering Decisions Log (DECISIONS.md)

This log records design decisions, assumptions, and architectural trade-offs made during the development of the Hospital CRM Telecalling Module (Phase 1).

---

### Decision 001: Monorepo Structure & Package Management
- **Context:** The prompt specifies a pnpm monorepo with `apps/web` (Nuxt 3), `apps/api` (Fastify), and `packages/shared` (Zod schemas, types, phone utilities).
- **Decision:** Use pnpm workspaces (`pnpm-workspace.yaml`). Root scripts will delegate commands (lint, typecheck, test, build, dev) to respective workspaces using pnpm filters (`--filter`).
- **Rationale:** Keeps dependencies cleanly separated while enabling 100% type sharing between backend and frontend without publishing packages.

---

### Decision 002: Character Encoding & Collation for Malayalam Support
- **Context:** Malayalam text (Unicode script `\u0D00`-\u0D7F`) must be supported in notes, concern fields, and picklist translations (`label_ml`), including search.
- **Decision:** MySQL 8 database, tables, and text columns will use `utf8mb4` charset and `utf8mb4_unicode_ci` collation.
- **Rationale:** Ensures full Unicode coverage and accurate case/accent insensitive sorting and substring searching in Malayalam.

---

### Decision 003: Timezone Handling
- **Context:** Hospital branches operate in India (`Asia/Kolkata` - UTC+05:30), but business hours and SLA tracking must remain reliable.
- **Decision:** All timestamps in the MySQL database will be stored in UTC (`DateTime`). Conversions to `Asia/Kolkata` will occur in business logic for opening hours, day offsets (e.g. 10:00 AM local task scheduling), and UI presentation.
- **Rationale:** Industry standard: Prevents DST anomalies and simplifies multi-branch expansion if branches exist across different timezones in the future.

---

### Decision 004: Mandatory Next Action & Call Completion Atomic Enforcement
- **Context:** An open lead or case cannot be saved without a next action task and due time. Call completion must atomically record the outcome and schedule the next action (or close the record).
- **Decision:** Implement this rule inside database transactions (`prisma.$transaction`). The endpoint `POST /interactions/call` will take both the interaction payload (outcome, notes, duration) and next action payload (due time, title, priority, assignee) or closure reason in a single atomic request.
- **Rationale:** Avoids split-brain or orphaned states where a call is logged but network failure prevents scheduling the next action.

---

### Decision 005: PII Redaction in Logs
- **Context:** Section 11 specifies logs must never contain phone numbers, names, concerns, or passwords.
- **Decision:** Configure Fastify's Pino logger with redaction paths covering: `req.body.mobile`, `req.body.altMobile`, `req.body.password`, `req.body.name`, `req.body.concern`, `mobile`, `name`, `concern`, `password`, `mfaSecret`, `email`, and wildcard paths (`*.mobile`, `*.name`, `*.concern`, `*.password`). Add a dedicated Vitest test validating that logging an object with sensitive fields redacts them to `[REDACTED]`.
- **Rationale:** Guarantees HIPAA/NABH compliance and prevents accidental privacy breaches in application telemetry.

---

### Decision 006: Phase 2 Seams Implementation
- **Context:** Section 10 requires building interfaces and no-op/manual implementations for TelephonyProvider, MessagingProvider, and EventPublisher.
- **Decision:** Define TypeScript interfaces in `apps/api/src/modules/integrations/` and provide `ManualTelephonyProvider` (which produces `tel:` links and records manual call logs), `ManualMessagingProvider` (which generates `wa.me` links with URL-encoded templates), and `OutboxEventPublisher` (which inserts events into the `outbox_events` table within the same transaction as state changes).
- **Rationale:** Clean decoupling: Phase 2 telephony (Exotel/Knowlarity) and WhatsApp Business API (Interakt/Gupshup) can be plugged in by swapping provider bindings without changing CRM domain logic.

---

### Decision 007: RBAC & Scope Filtering Architecture
- **Context:** Permission codes have scopes: `own`, `team`, `branch`, `all`. Client parameters must never be trusted for scope.
- **Decision:** Centralize query filtering in `scopeWhere(user, resource)`. This utility generates Prisma `where` filter objects based on the user's role permissions and active temporary permission grants. Direct ID access (e.g., `GET /leads/:id`) executes `prisma.lead.findFirst({ where: { id, ...scopeWhere(user, 'lead') } })`. If not found, a 403 Forbidden is returned and an audit log entry is written.
- **Rationale:** Guarantees bulletproof multi-tenant and branch isolation that cannot be bypassed by querying IDs directly.

---

### Decision 008: Master Picklists & System Settings Architecture
- **Context:** Picklists (departments, sources, call outcomes, lost reasons, decline reasons, closure codes) and system settings (calling hours, SLAs, contact rules) need to be dynamically managed, bilingual, and auditable while providing instant fallback defaults.
- **Decision:** Picklists are stored in dedicated Prisma models with `code`, `labelEn`, `labelMl`, `sort`, and `isActive` flags. System settings are stored as JSON blobs in a `Setting` table, accessed via a typed service with hardcoded fallback constants. Any setting changes by admins are recorded in `AuditLog` with `SETTING_UPDATED`.
- **Rationale:** Guarantees uptime even if a setting row is temporarily missing, gives admins full autonomy to configure operational parameters, and maintains an unalterable audit trail.

---

### Decision 009: Round-Robin Lead Assignment & Telecaller Attribution
- **Context:** New leads arriving via website forms, ad forms (Meta/Google), or CSV imports must be evenly distributed among available support team telecallers in the corresponding branch without burdening management roles.
- **Decision:** Round-robin selection filters strictly for users with `status: 'active'`, `available: true`, and role `support_telecaller` linked to the branch. Selection chooses the user with the lowest count of open leads (`_count.ownedLeads`), breaking ties by the user whose last lead assignment was least recent. When an active telecaller uses the Quick Create Lead drawer directly, they are assigned ownership directly since they are already engaged with the caller.
- **Rationale:** Prevents managerial roles (Owner, Admin, Center Head) from receiving telecalling queues and ensures equitable load balancing among frontline telecallers.

---

### Decision 010: First-Response SLA Business Hours Calculation
- **Context:** Acceptance Test 3 dictates that Meta Ads leads receive a 5-minute first-response SLA and Website/other leads receive a 15-minute SLA, calculated strictly during branch business hours.
- **Decision:** The calculation evaluates creation time in `Asia/Kolkata` (UTC+05:30) against branch calling hours (default 09:00 - 20:00). If created during business hours, the timer is set to `createdAt + SLA minutes`. If created after closing or before opening, the timer begins at 09:00 AM on the next business day plus SLA minutes.
- **Rationale:** Protects telecallers from SLA penalties outside legitimate operating hours while guaranteeing immediate compliance alarms during active shifts.

---

### Decision 011: E.164 Duplicate Detection & Override Mechanics
- **Context:** Acceptance Test 2 requires that creating a lead with an existing mobile number (in any format, e.g. `98765 43210` or `+919876543210`) returns the duplicate and prevents creating a second lead without an explicit override reason.
- **Decision:** Phone numbers are normalized to E.164 (`mobileNorm` and `altMobileNorm`). The quick create endpoint and duplicate check endpoint query for active leads matching either field. If found and `overrideDuplicate !== true`, the API rejects with 409 Conflict returning the existing lead's details (`id`, masked mobile, name, status, owner). If `overrideDuplicate === true` and `overrideReason` is supplied, creation proceeds and the override rationale is captured in the audit log.
- **Rationale:** Prevents fragmented duplicate records for the same patient while accommodating legitimate multi-patient family lines sharing a single household phone.

---

### Decision 012: Atomic Call Interaction Logging & Mandatory Next Action Protocol
- **Date:** 2026-11-01
- **Context:** Acceptance Test 4 mandates that an open lead cannot be saved or have a call logged without a next action and due time (unless closing with a reason or converting).
- **Decision:** Combined call outcome logging and next action task creation into an atomic transactional endpoint (`POST /api/v1/interactions/call`). If a call log request omits `nextAction` on an open lead and does not trigger an auto-cadence outcome (or specify a closure reason), the API rejects the request with HTTP 400 `NEXT_ACTION_REQUIRED`.
- **Rationale:** Prevents telecallers from leaving open leads without an active follow-up commitment, ensuring zero leads fall through the cracks.

---

### Decision 013: Event-Driven Cadence Transition & Automatic Task Cancellation
- **Date:** 2026-11-01
- **Context:** Acceptance Test 5 requires that logging outcome `Interested Not Ready` creates tasks at day 2, 7, 14, and 30, and subsequent appointment booking cancels those tasks and creates appointment reminders (24h, 2h) plus missed recovery (+1h).
- **Decision:** Implemented a unified Cadence Engine (`applyCadence` and `cancelOpenCadenceTasks`). Transitioning a cadence or booking an appointment automatically cancels all existing open tasks linked to that lead/case before generating the new cadence steps. Day offsets are computed relative to `Asia/Kolkata` local time, standardizing follow-up calls to 10:00 AM IST.
- **Rationale:** Prevents duplicate or conflicting tasks from piling up when patient intent progresses through the funnel.

---

### Decision 014: Soft Contact Rules & Calling Hours Preflight Checks
- **Date:** 2026-11-01
- **Context:** Acceptance Test 6 requires warning telecallers when placing a second call on the same day or a fourth attempt in a cycle, enforcing a saved `overrideReason`. Calling outside business hours (09:00–20:00 local) also requires an override reason.
- **Decision:** Provided `GET /api/v1/interactions/check-limits` for real-time frontend alert banners and enforced validation in `logCallInteraction`. If limits are exceeded without a non-empty `overrideReason`, the API responds with HTTP 422 `OVERRIDE_REASON_REQUIRED`. When supplied, the reason is persisted in `interactions.override_reason`.
- **Rationale:** Protects patient goodwill and privacy from over-calling while providing operational flexibility when patients explicitly request immediate callbacks.

---

### Decision 015: Lead Conversion & Patient Case Pipeline ("Mark Visited")
- **Date:** 2026-11-01
- **Context:** When a patient visits the clinic for their appointment or as a walk-in, the lead must be marked visited and converted to an active `Patient` and `Case` record without orphaned tasks.
- **Decision:** Implemented an atomic transaction in `POST /api/v1/leads/:id/convert`. If an existing patient with matching `mobileNorm` exists in the branch, they are linked; otherwise, a unique medical record code (`PAT-YYYYMM-XXXX`) is assigned. All previous open tasks on the lead are marked `cancelled`, booked appointments are transitioned to `visited` and linked to the case, and a visit interaction and audit log are recorded.
- **Rationale:** Guarantees a clean boundary transition between pre-visit marketing lead tracking and post-visit clinical case management with zero dangling tasks.

---

### Decision 016: In-Patient Consultation Outcome & Admission Cadence Routing (Acceptance Test 7)
- **Date:** 2026-11-01
- **Context:** Acceptance Test 7 requires that saving a consultation outcome with care type `in_patient` puts the case in the Admission Desk queue, assigned round-robin, with a first task due within 24 hours.
- **Decision:** Implemented in `recordConsultationOutcome` (`POST /api/v1/cases/:id/consultation-outcome`). When `careType === 'in_patient'`, the system sets `advisedAdmission = true`, stage to `plan_given`, team to `admission`, assigns the specialist with lowest open case volume via `assignCaseRoundRobin`, and triggers `applyCadence(..., 'case.admission_advised')`, creating the initial follow-up task due in 24 hours plus Day 3 and Day 7 counseling checkpoints. If `careType === 'consultation_only'`, the case stage moves to `completed`.
- **Rationale:** Fully automates the transition from doctor consultation to specialist admission counseling without manual handoffs.

---

### Decision 017: Admission Deposit Gate & Emergency Override (Acceptance Test 8)
- **Date:** 2026-11-01
- **Context:** Acceptance Test 8 requires that advancing a case to `in_treatment` is blocked if `careType === 'in_patient'` and `depositReceived !== true`, unless `emergencyAdmission === true` with a mandatory medical justification reason.
- **Decision:** Enforced strictly in `advanceCaseStage` (`POST /api/v1/cases/:id/advance-stage`). If an in-patient case attempts to transition to `in_treatment` without `depositReceived = true` and `emergencyAdmission = false`, the API rejects with HTTP 422 `DEPOSIT_REQUIRED`. If `emergencyAdmission` is enabled, an `emergencyReason` string must be non-empty; otherwise HTTP 422 `EMERGENCY_REASON_REQUIRED` is thrown. Advancing to `in_treatment` cancels remaining open admission cadence tasks. Transitioning to `not_started` requires a valid `notStartedReasonId` (picklist decline reason).
- **Rationale:** Protects hospital financial exposure and ensures admissions follow standard advance deposit protocols while preserving clinical agility for urgent emergency admissions.

---

### Decision 018: Admission Desk Pipeline Reporting & Conversion Funnel Analytics
- **Date:** 2026-11-01
- **Context:** Admission managers and center heads require real-time visibility into cases advised admission, 24-hour first contact compliance, pipeline conversion rates, and cases overdue for counseling.
- **Decision:** Implemented `GET /api/v1/reports/admission` scoped by user branch permissions. Aggregates cases advised admission, cases contacted within 24 hours of advice, overall contact rate percentage, conversion stages (`counseling_estimate`, `plan_accepted`, `in_treatment`), decline reason distribution, and overdue follow-up cases (>24 hours with no logged contact).
- **Rationale:** Provides operational leadership with actionable insights to reduce admission leakage and track specialist counseling performance.

---

### Decision 019: Aftercare Follow-Up Cadences & In-Patient Discharge Gate (Acceptance Test 9)
- **Date:** 2026-11-01
- **Context:** Acceptance Test 9 specifies that marking treatment completed on an in-patient case requires a discharge date and schedules cadence calls on Day 2, Day 7, Day 30, and Day 90. For OPD cases, follow-up calls are scheduled on Day 7, Day 30, and Day 90.
- **Decision:** Implemented in `POST /api/v1/cases/:id/treatment-completed`. In-patient cases reject with HTTP 422 `DISCHARGE_DATE_REQUIRED` if `dischargeDate` is omitted. Transitions stage to `aftercare_follow_up`, sets team to `aftercare`, executes round-robin assignment among active aftercare executives in the branch, cancels previous open tasks, and schedules `case.aftercare_inpatient` (Day 2, 7, 30, 90) or `case.aftercare_opd` (Day 7, 30, 90). Closure of active cases is supported via `POST /api/v1/cases/:id/close` with picklist `closureCodeId`.
- **Rationale:** Ensures continuous clinical follow-up post discharge to monitor recovery and prevent complications.

---

### Decision 020: Clinical Red Flag Escalation & 1-Hour Duty Doctor SLA (Acceptance Test 10)
- **Date:** 2026-11-01
- **Context:** Acceptance Test 10 requires that clinical red flags logged during aftercare calls (e.g. fever, acute pain, bleeding, general condition worsening) escalate to a duty doctor with a strict 1-hour SLA. If unanswered, alerts escalate to the Telecaller Manager at 1 hour and Center Head at 2 hours. Doctor resolution generates a hot callback task for the aftercare telecaller.
- **Decision:** Implemented `POST /api/v1/interactions/aftercare-call` and `POST /api/v1/escalations/:id/decision`. Red flag condition or `escalateToDoctor: true` creates an `Escalation` with `dueAt = now + 1 hour` assigned to the case's treating doctor or branch duty doctor. Cron job `checkUnansweredEscalations` monitors pending escalations, dispatching notifications at 1 hour (manager) and 2 hours (center head). When doctor records a decision, status updates to `decided` and a hot callback task is automatically created for the aftercare executive.
- **Rationale:** Safeguards patient safety through rapid medical escalation workflows while automating notification chains for overdue clinical reviews.

---

### Decision 021: Low Feedback Score (≤ 6/10) Manager Callback Trigger (Acceptance Test 11)
- **Date:** 2026-11-01
- **Context:** Acceptance Test 11 requires that aftercare call interactions recording a patient feedback rating of 6/10 or below automatically alert and schedule a 24-hour callback task for the Telecaller Manager.
- **Decision:** Implemented in `logAftercareCallInteraction`. When `feedbackScore <= 6`, the system finds active telecaller managers in the branch (or center head/admin fallback) and creates a priority callback task titled `Manager Callback: Low Patient Feedback (${score}/10)` due within 24 hours, alongside an immediate in-app notification.
- **Rationale:** Provides rapid service recovery for dissatisfied patients before negative word-of-mouth or complaints escalate.

---

### Decision 022: Multi-Branch Executive Management Reports & Performance Analytics
- **Date:** 2026-11-01
- **Context:** Milestone 8 requires operational and executive reporting across all three desks (Support, Admission, Aftercare) as well as analytical reports on lost reasons and marketing source quality.
- **Decision:** Implemented `report.service.ts` and `report.routes.ts` providing 5 endpoints:
  1. `GET /api/v1/reports/support`: Total leads, first-response SLA compliance %, conversion rate, status breakdown, source distribution, and telecaller productivity.
  2. `GET /api/v1/reports/admission`: Advised admissions, 24h contact rate, counseling accepted/admitted rates, decline reasons, and overdue follow-up alerts.
  3. `GET /api/v1/reports/aftercare`: Cadence call on-time completion rates, patient satisfaction average (CSAT), low score count, clinical red-flag escalation resolution metrics, and case closure code distribution.
  4. `GET /api/v1/reports/lost-reasons`: Categorical loss breakdowns for Support Desk leads and Admission Desk patient cases.
  5. `GET /api/v1/reports/source-quality`: Funnel conversion analysis (contact %, booking %, visit %, treatment %) and revenue attribution by marketing source (Meta Ads, Website, Referrals, Walk-ins).
- **Rationale:** Gives clinic administrators and department heads actionable visibility into SLA bottlenecks, marketing ROI, and care continuum health.

---

### Decision 023: Dual-Approval Watermarked CSV Data Exports (Anti-Data-Leakage Forensics)
- **Date:** 2026-11-01
- **Context:** Medical and lead contact information requires strict protection against bulk exfiltration while supporting lawful audits and management exports.
- **Decision:** Implemented `Export` entity in Prisma with request, approve/reject, and download lifecycle:
  - Telecallers submit an export request (`POST /api/v1/exports`) which enters `pending` status.
  - Telecaller Managers, Center Heads, or Owners review and approve/reject (`POST /api/v1/exports/:id/approve`).
  - Downloads (`GET /api/v1/exports/:id/download`) produce watermarked CSV files containing:
    1. A cryptographic header banner recording Export ID, requester identity, branch scope, UTC & `Asia/Kolkata` timestamps, and unique watermark signature.
    2. An audit column on every data row embedding the watermark audit tag.
    3. Immutable forensic logging in `audit_logs` at request, decision, and download stages.
- **Rationale:** Eliminates anonymous data leaks by guaranteeing that any exported file can be forensically attributed back to the exact requesting employee and supervisor who approved it.

---

### Decision 024: Data Subject Rights (DSR) & Privacy Compliance Architecture
- **Date:** 2026-11-01
- **Context:** Healthcare compliance (GDPR, India DPDP Act) mandates honoring data subject access and retention requests.
- **Decision:** Implemented `privacy.service.ts` exposing `findDataSubjectRecords(mobileNorm)` and `applyDataRetentionPolicy()`. The service resolves phone numbers into E.164 format and queries all related entities (leads, patients, cases, interactions, appointments, tasks) into a portable bundle. Automated retention routines flag records exceeding statutory medical record keeping periods for archiving or PII redaction.
- **Rationale:** Guarantees patient privacy rights and legal compliance across digital CRM repositories.

---

### Decision 025: Progressive Web App (PWA) & Mobile Touch Telecalling Standards
- **Date:** 2026-11-01
- **Context:** Hospital executives and on-the-move telecallers require rapid access from tablets, laptops, and mobile phones.
- **Decision:** Configured Nuxt 3 with PWA manifest (`apps/web/public/manifest.json`), teal theme branding (`#0f766e`), custom SVG app icons, and full mobile viewport meta tags. Enforced a minimum touch target size of 44px on all interactive buttons, select dropdowns, and pagination controls. Provided click-to-call (`tel:`) and click-to-chat WhatsApp (`wa.me`) integration seams for frictionless 1-tap patient communication.
- **Rationale:** Maximizes telecaller productivity on touch devices while enabling standalone app installation without requiring separate native app store deployments.

