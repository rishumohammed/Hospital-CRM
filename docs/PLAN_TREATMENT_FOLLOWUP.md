# Implementation Plan: Treatment Follow-up Desk (Milestones F0–F6)

## 1. Overview & Goal
The **Treatment Follow-up Desk** is the 4th operational desk in the hospital CRM (alongside Support, Admission, and Aftercare). It provides a unified command center to:
1. **Follow up outpatient / procedure cases (`setting = opd`)**: Remind patients before visits, track attendance, recover missed sessions quickly, detect dropout risk early, and alert doctors.
2. **Follow up in-patient cases during hospital stay (`setting = inpatient`)**: Regular bedside or phone check-ins, verify scheduled therapies are delivered as planned, capture comfort/diet/billing concerns, and escalate issues rapidly to the ward nurse in-charge and treating doctor.
3. **Structured Care Journey Transitions & Handovers**: Seamless handovers from Admission Desk to Treatment Follow-up, from Doctor consultation to OPD schedules, and from Treatment Follow-up to Aftercare upon treatment completion with full audit trails in `case_handovers`.

---

## 2. Monorepo Files to Touch & Create

### Shared Package (`packages/shared`)
- `packages/shared/src/enums/index.ts`:
  - Roles: `TREATMENT_FOLLOWUP_EXECUTIVE = 'treatment_followup_executive'`, `FRONT_OFFICE = 'front_office'`.
  - Teams: `TREATMENT_FOLLOWUP = 'treatment_followup'`.
  - Permissions:
    - `SCHEDULE_VIEW = 'schedule.view'`
    - `SCHEDULE_MANAGE = 'schedule.manage'`
    - `SCHEDULE_APPROVE_EXTENSION = 'schedule.approve_extension'`
    - `VISIT_VIEW = 'visit.view'`
    - `VISIT_MARK = 'visit.mark'`
    - `CHECKIN_CREATE = 'checkin.create'`
    - `FOLLOWUP_REPORT = 'followup.report'`
  - Enums:
    - `ScheduleSetting = { OPD: 'opd', INPATIENT: 'inpatient' }`
    - `FrequencyType = { DAILY: 'daily', ALTERNATE_DAYS: 'alternate_days', WEEKLY: 'weekly', EVERY_N_DAYS: 'every_n_days', CUSTOM_WEEKDAYS: 'custom_weekdays', CUSTOM_DATES: 'custom_dates' }`
    - `ScheduleStatus = { ACTIVE: 'active', PAUSED: 'paused', COMPLETED: 'completed', CANCELLED: 'cancelled' }`
    - `VisitStatus = { PLANNED: 'planned', REMINDED: 'reminded', ATTENDED: 'attended', MISSED: 'missed', RESCHEDULED: 'rescheduled', CANCELLED: 'cancelled', EXCUSED: 'excused' }`
    - `AdherenceRisk = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }`
    - `CheckinChannel = { CALL: 'call', BEDSIDE: 'bedside' }`
    - `PatientCondition = { COMFORTABLE: 'comfortable', UNCOMFORTABLE: 'uncomfortable', UNWELL: 'unwell' }`
    - `TherapiesPlannedStatus = { YES: 'yes', PARTLY: 'partly', NO: 'no' }`
    - `EscalationType = { CLINICAL_RED_FLAG: 'clinical_red_flag', ADHERENCE: 'adherence', INPATIENT_CONCERN: 'inpatient_concern' }`
    - `ExtensionRequestStatus = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' }`
  - Interaction Types:
    - `VISIT_REMINDER = 'visit_reminder'`, `VISIT_RECOVERY = 'visit_recovery'`, `TREATMENT_CHECKIN = 'treatment_checkin'`
- `packages/shared/src/schemas/index.ts`:
  - Schemas for `visitScheduleSchema`, `createVisitScheduleSchema`, `updateVisitScheduleSchema`, `pauseScheduleSchema`, `resumeScheduleSchema`
  - Schemas for `extensionRequestSchema`, `createExtensionRequestSchema`, `decideExtensionRequestSchema`
  - Schemas for `scheduledVisitSchema`, `markVisitAttendanceSchema`, `rescheduleVisitSchema`, `shiftVisitsSchema`, `addExtraVisitSchema`
  - Schemas for `treatmentCheckinSchema`, `createTreatmentCheckinSchema`
  - Schemas for `treatmentCompletedHandoverSchema`, `caseHandoverSchema`
  - Schemas for `treatmentFollowupReportQuerySchema`, `adherenceReportQuerySchema`, `missedReasonsReportQuerySchema`

### API Package (`apps/api`)
- `apps/api/prisma/schema.prisma`:
  - New Models:
    - `VisitSchedule` (`visit_schedules`)
    - `ScheduleExtensionRequest` (`schedule_extension_requests`)
    - `ScheduledVisit` (`scheduled_visits`)
    - `Therapy` (`therapies`)
    - `MissedReason` (`missed_reasons`)
    - `TreatmentCheckin` (`treatment_checkins`)
    - `CaseHandover` (`case_handovers`)
  - Updates to existing models:
    - `Case`: `attendance_rate`, `consecutive_missed`, `last_attended_at`, `next_visit_at`, `adherence_risk`, `expected_discharge_date`, `setting`
    - `Escalation`: `escalation_type`, `ward_notified`
    - `User`: relations to created/marked schedules, visits, check-ins, handovers
    - `Branch`: relations and branch holiday lookups
- `apps/api/src/modules/rbac/scope.ts`:
  - Scope configuration for `schedule`, `visit`, `checkin` resources.
  - Front office role scope: restricted strictly to branch today's visits board (`visit.view`, `visit.mark`), 403 on case/lead details.
  - Admin role scope: blocked from reading clinical/case content without logged temporary grant.
- `apps/api/src/modules/treatment-followup/`:
  - `schedule.engine.ts`: Pure functions for frequency date generation, closed-day and holiday shifting, 150-session cap, preview calculation, edit regeneration (future only), pause/resume, and extension requests.
  - `schedule.engine.test.ts`: Unit tests covering all frequency rules, holiday handling, edits, and pause/resume logic.
  - `schedule.service.ts` & `schedule.routes.ts`: CRUD for schedules, pause, resume, extend, preview, complete, cancel.
  - `visit.service.ts` & `visit.routes.ts`: Today's visits board, marking attendance, single-visit rescheduling, shifting later visits, adding extra visits, and automatic adherence risk calculations.
  - `treatment-checkin.service.ts` & `treatment-checkin.routes.ts`: In-patient check-in handling, discharge gating, escalation creation (`inpatient_concern`).
  - `handover.service.ts` & `handover.routes.ts`: Handover history, Treatment Completed action (transitions case to `aftercare_follow_up`, initiates aftercare cadence, cancels remaining treatment tasks).
  - `treatment-followup.jobs.ts`: Cron jobs (5-min unmarked visit check, 1-min escalation notification/escalation cascade, 15-min adherence risk recomputation, nightly 00:30 reminder generation & holiday shifts).
  - `treatment-followup.report.service.ts` & `treatment-followup.report.routes.ts`: Operational and management reporting endpoints.
  - `treatment-followup.api.test.ts`: Integration and acceptance test suite for Milestone F1–F6.
- `apps/api/src/modules/cases/case.service.ts` & `case.routes.ts`:
  - Hook into stage advance: In-patient moving to `in_treatment` enters Treatment Follow-up with `setting = inpatient`.
  - OPD course/procedure reaching `plan_accepted` enters Treatment Follow-up with `setting = opd`.
- `apps/api/src/modules/cadence/cadence.engine.ts`:
  - Add cadences: `visit.reminder`, `visit.missed_recovery`, `visit.second_miss_escalation`, `course.midpoint_check`, `course.end_prepare`, `inpatient.checkin`, `inpatient.discharge_prepare`.
  - Adjust daily call limit to 2 for treatment follow-up patients.
- `apps/api/src/modules/escalations/escalation.service.ts`:
  - Support `adherence` and `inpatient_concern` escalations with duty doctor and ward nurse notifications.
- `apps/api/src/logger/index.ts`: Redact check-in notes, concerns, and patient names.
- `apps/api/src/database/seed.ts`:
  - Seed new roles (`treatment_followup_executive`, `front_office`), team (`treatment_followup`), permissions matrix.
  - Seed 12 therapies and 9 missed reasons.
  - Seed system settings (`adherence_thresholds`, `daily_reminder_mode`, `inpatient_checkin_interval_days`, `followup_call_limit_per_day`, `unmarked_visit_grace_minutes`).
  - Seed synthetic test cases with schedules, visits, check-ins, high-risk cases, and pending extension requests.

### Web Package (`apps/web`)
- `apps/web/locales/en.json` & `apps/web/locales/ml.json`:
  - Comprehensive English & Malayalam translations for all new tabs, drawer forms, table columns, statuses, risk chips, and notifications.
- `apps/web/pages/my-work/index.vue` or `apps/web/pages/index.vue`:
  - 4th tab: "Treatment Follow-ups" with sub-sections: Today's visits, Unmarked, Missed recovery, Reminders due, In-patient check-ins due, Courses ending soon, Pending extensions.
- `apps/web/pages/front-office/index.vue` / Today's Visits Board:
  - Minimal branch view with large touch-friendly "Attended" and "Not attended" action buttons.
- `apps/web/pages/cases/[id].vue`:
  - New tab: "Treatment Schedule" with calendar / session list, adherence risk badge, and schedule management actions.
- `apps/web/components/treatment/`:
  - `ScheduleDrawer.vue`: Schedule builder with interactive date preview.
  - `InpatientCheckinDrawer.vue`: Bedside / phone check-in form with escalation triggers and mandatory next check-in or discharge date.
  - `MarkVisitModal.vue`: Quick attendance recording and missed reason selection.
  - `ExtensionRequestModal.vue`: Extension request and doctor approval modal.
  - `TreatmentCompletedModal.vue`: Treatment completion and handover notes dialog.
- `apps/web/pages/doctor/treatment.vue` / Doctor View:
  - Doctor dashboard for patient schedules, adherence risk queue, pending extension requests, and escalations.
- `apps/web/pages/reports/treatment-followup.vue`:
  - Manager dashboard with adherence rates, 24h recovery %, high-risk cohort, missed reasons breakdown, and check-in SLAs.
- `apps/web/pages/admin/treatment-followup/`:
  - Therapies & visit types CRUD, missed reasons CRUD, risk thresholds and schedule settings.

---

## 3. Milestones & Build Order

- **Milestone F0**: Architecture specification (`docs/PLAN_TREATMENT_FOLLOWUP.md`) and task breakdown.
- **Milestone F1**: Database migration (Prisma), shared schemas, teams, roles, permissions matrix, seed lists, `case_handovers`, handover from Admission to Treatment Follow-up.
- **Milestone F2**: Schedule engine (frequency generation, holiday & closed-day handling, preview, edit/regenerate, pause/resume, extensions, reschedule/shift) with unit test suite.
- **Milestone F3**: Visits & attendance: Today's visits board, attendance marking, Unmarked visits background job, derived case adherence metrics.
- **Milestone F4**: Cadence engine extensions & tasks (reminders, missed recovery, midpoint check, course end, in-patient check-ins) and My Work 4th tab.
- **Milestone F5**: In-patient check-in workflows, dual escalation types (`adherence`, `inpatient_concern`), ward/doctor notifications, doctor view.
- **Milestone F6**: Treatment completed handover to Aftercare, manager dashboard & reports, admin screens, bilingual i18n (`en`, `ml`), end-to-end integration tests, README update.

---

## 4. Key Architectural Safeguards
1. **Scope Enforced on Every Query**: `scopeWhere` is strictly applied on schedules, visits, check-ins, and handovers. Out-of-scope access emits HTTP 403 and an `UNAUTHORIZED_ACCESS_ATTEMPT` audit log.
2. **Privacy & Redaction**: Front-office users receive only patient name, time, branch, and therapy—zero clinical concerns or contact details. Pino redaction scrubs notes, concerns, and names.
3. **Sticky Case Assignment**: Treatment follow-up cases maintain executive continuity for patient comfort.
4. **Pure Function Scheduling Engine**: Generation, preview, and regeneration logic is isolated in pure functions with zero database side-effects for robust unit testability.
