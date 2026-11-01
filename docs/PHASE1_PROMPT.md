# Phase 1 Build Prompt: Telecalling Module (Hospital CRM)

**How to use this file:** open an empty repository in your AI coding tool (for example Claude Code), paste everything below the line into the first message, and let it work milestone by milestone. Review each milestone before telling it to continue. Keep this file in the repo as `docs/PHASE1_PROMPT.md` so the tool can re-read it.

**Things I assumed (change them before you paste if wrong):**
- Three work teams, not two: (1) Support team for new leads, (2) Admission team for patients who finished a consultation and were advised admission, (3) Aftercare team for patients who finished treatment.
- No telephony or WhatsApp integration in Phase 1. Calls start from a phone link, and the telecaller logs the outcome by hand. WhatsApp opens a prefilled chat link and is logged by hand. Adapters are left ready for Phase 2.
- Consultation and treatment outcomes are recorded inside this system for now, because the booking and in-patient apps do not exist yet.
- Phone numbers default to India (+91). The interface supports English and Malayalam.

---

# PROMPT (paste from here)

You are a senior full-stack engineer. Build **Phase 1 of an in-house hospital CRM: the Telecalling module.** Work in small milestones, test as you go, and keep the code clean and documented. Do not add features outside this scope.

## 1. Goal

Telecallers and specialists at a multi-branch hospital group need one system to contact people at three points of the patient journey:

1. **Support Desk (new leads):** the support team contacts every new enquiry fast, qualifies it, and books an appointment.
2. **Admission Desk:** a specialist team or doctor contacts patients who **completed a consultation and were advised admission**, to answer questions, share the estimate, and convert them to an admission.
3. **Aftercare Desk:** a specialist team or doctor contacts patients who **completed treatment and left**, for follow-up calls after treatment, to catch problems early and book reviews.

Everything is driven by **tasks with due times**, **mandatory next actions**, and **cadences** (automatic follow-up schedules). Many users with **roles and team scopes** use it, across several branches.

## 2. Tech stack (fixed)

- **Frontend:** Nuxt 3 (Vue 3, TypeScript, Pinia, Tailwind CSS with Nuxt UI), `@nuxtjs/i18n` with English (`en`) and Malayalam (`ml`), mobile-first responsive design, installable as a PWA.
- **Backend:** Node.js 20+, TypeScript, **Fastify**, **Prisma ORM**, **zod** for validation, `pino` for logs with redaction, `argon2` for passwords, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cookie`, `@fastify/cors`, `@fastify/swagger` for API docs, `node-cron` for scheduled jobs, `libphonenumber-js` for phone numbers.
- **Database:** MySQL 8, `utf8mb4` with `utf8mb4_unicode_ci` (Malayalam text must work), all timestamps stored in UTC and shown in `Asia/Kolkata`.
- **Repo:** pnpm monorepo: `apps/web` (Nuxt), `apps/api` (Fastify), `packages/shared` (zod schemas, enums, types shared by both).
- **Tooling:** ESLint, Prettier, Vitest (unit and API tests with Supertest or Fastify `inject`), Docker Compose for MySQL, `.env.example`, a `README.md` with setup steps, and a `DECISIONS.md` where you record every choice you made when something was unclear.

If a library choice is a problem, pick a close alternative and record it in `DECISIONS.md`.

## 3. Users, roles, and teams

### Roles (seed these)

| Role code | Who | Teams |
|---|---|---|
| `owner` | Managing Director | all |
| `admin` | IT administrator | all (no access to lead content by default) |
| `center_head` | Branch manager | all, own branch |
| `telecaller_manager` | Patient Experience Lead | all, own branch or all branches |
| `support_telecaller` | Support team member | support |
| `admission_specialist` | Admission specialist or doctor | admission |
| `aftercare_executive` | Aftercare nurse or doctor | aftercare |
| `doctor` | Treating doctor | none (sees own patients and escalations) |
| `auditor` | Quality or external auditor | read-only, all |

A user can belong to one or more **teams**: `support`, `admission`, `aftercare`. A user can have one role and one or more branches.

### Permissions and data scope

Implement permissions as codes with a **scope** for each: `own`, `team`, `branch`, `all`. Store them in `role_permissions(role_id, permission, scope)`. Write one reusable function `scopeWhere(user, resource)` that returns the database filter for the user's scope, and use it in **every** list and detail query. Never trust the client for scope.

Permission codes (at least): `lead.view`, `lead.create`, `lead.edit`, `lead.reassign`, `lead.close`, `lead.merge`, `case.view`, `case.edit`, `case.reassign`, `task.view`, `task.manage`, `interaction.create`, `escalation.create`, `escalation.decide`, `report.view`, `export.request`, `export.approve`, `import.run`, `settings.manage`, `user.manage`, `role.manage`, `audit.view`, `cadence.manage`, `assignment_rule.manage`.

Starter matrix (implement as seed data):

| Permission | owner | admin | center_head | telecaller_manager | support_telecaller | admission_specialist | aftercare_executive | doctor | auditor |
|---|---|---|---|---|---|---|---|---|---|
| lead.view | all | none | branch | team/branch | own | none | none | none | all (read) |
| lead.create / edit | all | none | branch | branch | own | none | none | none | none |
| lead.reassign / merge | all | none | branch | branch | none | none | none | none | none |
| case.view | all | none | branch | branch | own (read) | own | own | own | all (read) |
| case.edit | all | none | branch | branch | none | own | own | own (notes) | none |
| task.view / manage | all | none | branch | branch | own | own | own | own | all (read) |
| interaction.create | all | none | branch | branch | own | own | own | own | none |
| escalation.create | yes | none | yes | yes | yes | yes | yes | none | none |
| escalation.decide | none | none | none | none | none | none | none | own | none |
| report.view | all | none | branch | branch | own | own | own | none | all |
| export.approve | all | none | branch | none | none | none | none | none | none |
| settings, user, role, cadence, assignment rules | all | all | cadence and rules: branch | cadence and rules: branch | none | none | none | none | none |
| audit.view | all | all | branch | none | none | none | none | none | all |

The `admin` role cannot read lead or case content unless the owner grants a temporary, logged, time-limited permission (build a simple `permission_grants` table with an end time and reason).

### Rules

- **No hard deletes** for leads, cases, tasks, interactions. Use `archived_at`.
- **Mask phone numbers** for any role flagged `mask_phone` (show only the last 3 digits). Build the masking helper now, even though no seeded role uses it yet.
- Every login, failed login, role change, reassignment, export, merge, lead or case open, and permission grant is written to `audit_logs` with user, action, record, before and after values, IP, and time.

## 4. The three sections (work queues)

### 4.1 Support Desk: new leads

**Who:** `support_telecaller` (team `support`). Managers see the whole queue.

**Lead sources:** Google Ads, Meta Ads, Doctor Referral, Patient Referral, Website, Walk-in, Camp or Event, WhatsApp, Phone Call, Other.

**Lead statuses:** `new`, `contacted`, `qualified`, `appointment_booked`, `not_reachable`, `not_interested`, `junk`, `converted`.

**Flow:**
1. A lead is created by quick create (name, mobile, language, concern, department, source), by CSV import, or by a public intake API (`POST /api/intake/:sourceKey` with an API key) for website forms and ad lead forms.
2. The system normalizes the mobile number to E.164 (default `+91`), checks for duplicates, assigns the lead by the assignment rules, and starts the **first-response timer**.
3. The telecaller opens **My Work > New Leads**, sees the lead with a countdown, taps **Call**, and after the call logs the **outcome** and sets the **next action**.
4. Booking an appointment sets the lead status to `appointment_booked` and creates reminder tasks (24 hours and 2 hours before) and a missed-appointment recovery task (due 1 hour after the appointment time if not marked visited).
5. When the patient visits, the front desk or telecaller marks **Visited**. This **converts** the lead: it creates a `patient` and a `case` (see 4.2), and closes the lead as `converted`.

**Call outcomes (seed):** Appointment Booked, Callback Requested, Interested Not Ready, Information Given, No Answer, Switched Off or Busy, Wrong Number, Not Interested, Emergency Redirected, Complaint.

**Lost reasons (seed):** Price, Distance, Chose Another Center, Not Ready, No Response, Wrong Number, Not Suitable, Other.

**Rules:**
- An open lead **cannot be saved without a next action (task) and due time.** The only exceptions are closing it with a reason, or converting it.
- **First-response SLA:** due 5 minutes after creation for leads from Google Ads or Meta Ads, 15 minutes for others, counted in business hours (a branch has opening hours; outside them, the timer starts at opening time). A scheduled job (every minute) marks breaches and notifies the Telecaller Manager.
- **Contact rules (soft limits):** warn when placing a second call to the same lead on the same day, and when logging a fourth attempt in one cycle. The user can continue only by typing an override reason, which is saved in the interaction.
- **Calling hours:** configurable (default 09:00 to 20:00 local). Outside them, warn and require a reason.
- **Emergency redirect:** outcome `Emergency Redirected` sets a flag, creates a high-priority notification to the users with a `duty_nurse` flag on their profile in that branch, and is counted in reports.
- **Duplicates:** match on normalized mobile and alternate mobile. If found, the quick create returns the existing record and offers to open it or continue anyway with a reason.
- **Priority:** `hot` (ad lead under 24 hours old, or asked for an appointment), `warm`, `cold` (no response after 3 attempts or older than 30 days). Compute it by rules and allow manual change.
- **Consent fields:** `consent_calls`, `consent_whatsapp`, `consent_sms`, each with date and source. Warn before a WhatsApp link opens if consent is not recorded. Honor a `do_not_contact` flag everywhere.

### 4.2 Admission Desk: consultation completed, admission advised

**Who:** `admission_specialist` (team `admission`), who may be a doctor.

**Concept:** a **case** (treatment plan) belongs to a patient. When the patient visits, the front desk (or the doctor) records the **consultation outcome**: completed, department, treating doctor, care type (`consultation_only`, `opd_course`, `in_patient`, `procedure`), estimated amount, and a short plan note. When `care_type = in_patient`, the case enters the **Admission Desk** queue automatically and is assigned by the assignment rules (round-robin among the team members of the case's branch).

**Case stages:** `visited`, `plan_given`, `counseling_estimate`, `plan_accepted`, `in_treatment`, `aftercare_follow_up`, `completed`, `not_started`, `dropped_out`.

**Flow:**
1. Consultation outcome saved with `care_type = in_patient` sets `advised_admission = true`, moves the case to `plan_given`, and creates the **admission cadence**: first contact within 24 hours, then day 3 and day 7.
2. The specialist calls to answer questions, offers a **pre-admission counseling slot**, and records the estimate shared (amount and date). Stage becomes `counseling_estimate`.
3. When the family agrees, the specialist records the **expected admission date** and marks the **deposit received** (50% of the estimate, a yes or no flag and an amount; real billing is a later app). Stage becomes `plan_accepted`.
4. The admission is confirmed by the Admission Coordinator or specialist: they enter the **admission date**. Stage becomes `in_treatment`.
5. If the family declines or goes quiet after the cadence, the specialist closes it as `not_started` with a **reason**: Cost, Distance, Family Decision, Chose Another Center, Not Ready, Not Suitable, Other.
6. Moving a case to `in_treatment` for an in-patient requires `deposit_received = true`, unless the user ticks **emergency admission** and enters a reason.

**Rules:**
- The same mandatory next action and contact rules as the Support Desk apply.
- Cases with `plan_given` and no contact within 24 hours go into the manager's **overdue admission follow-ups** list and trigger a notification.
- A doctor can open their own cases, add notes, and record the consultation outcome.

### 4.3 Aftercare Desk: treatment completed

**Who:** `aftercare_executive` (team `aftercare`), who may be a nurse or doctor.

**Flow:**
1. A user with `case.edit` marks **Treatment completed** with the **treatment completed date** (and **discharge date** for in-patients). The case moves to `aftercare_follow_up` and is assigned to the aftercare team by the assignment rules.
2. The system creates the **aftercare cadence:** for in-patients, calls on day 2, day 7, day 30, and day 90 after discharge; for OPD courses and procedures, day 7, day 30, and day 90 after the last session. Tasks are due at 10:00 local time on the due date.
3. The executive calls, using the **aftercare call form**: general condition (better, same, worse), medicines taken as prescribed (yes, partly, no), new or worsening symptoms (none or details), diet and rest followed, review visit booked (date), concerns or complaints, and a feedback score (0 to 10) on the day 7 call.
4. **Red flag escalation:** a button **Escalate to doctor** creates an `escalation` with the reason and notifies the duty doctor of that branch (users with the role `doctor` and a `duty_doctor` flag). The doctor opens the escalation and records a **decision**; the aftercare executive gets a callback task. A decision is due within **1 hour**; an unanswered escalation notifies the Telecaller Manager at 1 hour and the Center Head at 2 hours.
5. A feedback score of 6 or less creates a callback task for the Telecaller Manager within 24 hours.
6. After the last call, or when the person asks to stop, the executive closes the case with a **closure code**: Improved, No Change, Referred, Discontinued, Lost to Follow-up. The case moves to `completed`.

**Rules:** the same contact rules apply, except that aftercare calls to patients with `consent_calls = true` are the care relationship, and not marketing.

## 5. Tasks and cadences (the core engine)

- **Task** fields: type (`call`, `whatsapp`, `reminder`, `review`, `escalation_callback`), title, due time, priority, owner, linked lead or case, cadence key and step, status (`open`, `done`, `cancelled`, `snoozed`), snooze count, completed outcome.
- **Cadence** is a named list of steps with an offset (minutes, hours, or days) and an assignee rule. Provide a **cadence engine** in the API that, when a lead status or case stage changes, **cancels the open tasks of the previous cadence** and **creates the new cadence's tasks**. Day offsets create tasks at 10:00 local time; skip Sundays only if the branch setting says so.
- **Seed cadences (editable in the admin screen):**
  - `lead.no_answer`: attempt again the same day evening, then day 2 (final message), then close as not reachable.
  - `lead.interested_not_ready`: day 2, day 7, day 14, day 30, then monthly for 3 months.
  - `lead.information_given`: next day, day 3, day 7.
  - `appointment.reminders`: 24 hours before, 2 hours before.
  - `appointment.missed`: 1 hour after, day 1, day 3, day 7, then close.
  - `case.admission_advised`: within 24 hours, day 3, day 7.
  - `case.plan_given_not_accepted`: day 3, day 7, day 14, day 30.
  - `case.aftercare_inpatient`: day 2, day 7, day 30, day 90 after discharge.
  - `case.aftercare_opd`: day 7, day 30, day 90 after treatment completed.
- **Overdue handling:** a scheduled job marks tasks overdue, notifies the owner at the due time, and the Telecaller Manager after [2] hours.
- **Snooze or reschedule:** needs a reason; more than 2 times needs a manager's approval.
- **Completing a call task** opens the call outcome form. The task closes only after an outcome and a next action are saved (or the record is closed).

## 6. Screens (Nuxt)

Mobile-first. Large touch targets (at least 44 px). Every screen works in English and Malayalam. Malayalam search must work.

1. **Login:** email or mobile and password, with a one-time-code step (TOTP) built behind a setting, enabled for all users by default in production.
2. **My Work (home):** tabs shown by the user's teams: **New Leads**, **Admission Follow-ups**, **Aftercare Calls**. Each tab shows task cards grouped as **Overdue**, **Today**, **Upcoming**, with name, reason, due time, priority, channel buttons (**Call** using a `tel:` link, **WhatsApp** opening a `wa.me` link with the template text copied, **Log call**), and an SLA countdown for new leads.
3. **Quick Create Lead** (drawer): six fields, with live duplicate warning.
4. **Leads list:** filters (status, source, owner, branch, department, language, priority, next follow-up date), saved views, search by phone or name, bulk actions (assign, tag, status) with permission checks.
5. **Lead detail:** key fields on top, timeline (calls, messages logged, tasks, status changes, notes), next action, **Log call** drawer, **Book appointment**, **Mark visited and convert**, **Close with reason**, **Emergency redirect**.
6. **Admission Desk list and Case detail:** case board and list by stage, case detail with consultation outcome form, estimate shared, deposit flag, expected admission date, admission date, decline reason, timeline, tasks.
7. **Aftercare Desk list and Aftercare call form:** due calls by day (2, 7, 30, 90), the call form from 4.3, **Escalate to doctor**, closure.
8. **Doctor view:** my cases, consultation outcome form, escalations awaiting my decision.
9. **Manager dashboards:** (a) Support: new leads, first response time, SLA breaches, calls, appointments booked, conversion, lost reasons by source; (b) Admission: advised, contacted within 24 hours, counseling booked, accepted, admitted, declined with reasons; (c) Aftercare: calls due, made on time, escalations and decision times, feedback average, closures. Filter by branch and date range.
10. **Admin:** users, roles and permissions, teams, branches and business hours, lead sources, call outcomes, lost reasons, departments, cadences, assignment rules, import, audit log, notification settings.
11. **Notifications:** bell icon with unread count and a list, polling every [30] seconds in Phase 1.

## 7. Data model (MySQL via Prisma)

Create these tables (names are guidance; follow naming conventions, `snake_case` in the database). All have `id` (unsigned int, auto increment), `created_at`, `updated_at`, and where relevant `created_by`, `branch_id`, `archived_at`. Add indexes on the columns used for filters and queues.

- `branches` (code, name, type `own|partner`, business_hours json, timezone)
- `users` (name, email unique, mobile, password_hash, role_id, language, status, mfa_secret, available boolean, working_hours json, flags: `duty_nurse`, `duty_doctor`)
- `user_branches`, `teams` (code: `support|admission|aftercare`), `user_teams`
- `roles` (code, name, mask_phone), `role_permissions` (role_id, permission, scope), `permission_grants` (user_id, permission, scope, reason, starts_at, ends_at, granted_by)
- `sources`, `departments`, `call_outcomes`, `lost_reasons`, `decline_reasons`, `closure_codes` (all picklist tables with code, label_en, label_ml, active, sort)
- `leads` (name, mobile, mobile_norm indexed, alt_mobile, alt_mobile_norm, language, concern text, department_id, source_id, campaign_text, referrer_text, status, priority, owner_id, branch_id, consent_calls, consent_whatsapp, consent_sms with dates and sources, do_not_contact, emergency_flag, first_response_due_at, first_response_at, closed_reason_id, closed_at, converted_patient_id)
- `patients` (patient_code, name, mobile_norm, language, branch_id, date_of_birth nullable)
- `cases` (patient_id, lead_id nullable, branch_id, stage, care_type, department_id, treating_doctor_id nullable, consultation_completed_at, advised_admission, estimated_amount, estimate_shared_at, deposit_received, deposit_amount, expected_admission_date, admission_date, discharge_date, treatment_completed_at, emergency_admission, emergency_reason, not_started_reason_id, closure_code_id, owner_id, team)
- `appointments` (lead_id or case_id, branch_id, doctor_name text, starts_at, status `booked|visited|missed|cancelled`)
- `tasks` (type, title, due_at, priority, owner_id, lead_id nullable, case_id nullable, cadence_key, cadence_step, status, snooze_count, completed_at, completed_by)
- `interactions` (type `call|whatsapp_manual|note|status_change|visit|aftercare_call`, direction, user_id, lead_id nullable, case_id nullable, outcome_id nullable, duration_seconds nullable, note text, details json for the aftercare form fields, override_reason nullable, occurred_at)
- `escalations` (case_id, raised_by, reason, assigned_doctor_id nullable, decision text nullable, decided_by, decided_at, due_at, status)
- `cadences` (key, name, active), `cadence_steps` (cadence_id, step_no, offset_unit, offset_value, task_type, title_template, assignee_rule)
- `assignment_rules` (name, resource `lead|case_admission|case_aftercare`, priority_order, conditions json: branch, language, department, source; target_team, max_open_per_user, active)
- `notifications` (user_id, type, title, body, link, read_at)
- `audit_logs` (user_id, action, entity, entity_id, before json, after json, ip, user_agent, created_at)
- `imports` (user_id, filename, status, counts json, errors json)
- `settings` (key, value json) for calling hours, SLA minutes, contact rules, and quiet hours

## 8. API (REST, JSON, versioned `/api/v1`)

Use consistent error format `{ error: { code, message, details? } }`, pagination (`page`, `pageSize`, `total`), and Swagger docs. Every route validates input with zod and checks permission and scope. Return 403 for out-of-scope direct access and write an audit entry.

Minimum endpoints:

- Auth: `POST /auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/mfa/verify`, `GET /auth/me`
- Users and admin: CRUD for users, roles, role permissions, teams, branches; `POST /users/:id/deactivate` (with reassignment wizard data)
- Picklists: CRUD for sources, departments, call outcomes, lost reasons, decline reasons, closure codes
- Leads: `GET/POST /leads`, `GET/PATCH /leads/:id`, `POST /leads/:id/assign`, `/close`, `/emergency`, `/book-appointment`, `/convert`, `GET /leads/check-duplicate`, `POST /leads/import/preview`, `POST /leads/import/commit`, `POST /intake/:sourceKey`
- Cases: `GET /cases`, `GET/PATCH /cases/:id`, `POST /cases/:id/consultation-outcome`, `/advance-stage`, `/treatment-completed`, `/close`
- Tasks: `GET /tasks` (filters: team, status, due range, owner), `POST /tasks`, `POST /tasks/:id/complete`, `/snooze`, `/reschedule`, `/reassign`
- Interactions: `POST /interactions/call` (outcome and next action in the same request), `POST /interactions/note`, `POST /interactions/aftercare-call`, `GET` timeline for lead or case
- Escalations: `POST /escalations`, `GET /escalations?assigned_to=me`, `POST /escalations/:id/decision`
- Cadences and rules: CRUD for cadences, steps, and assignment rules; `POST /assignment-rules/test` to preview where a record would go
- Reports: `GET /reports/support`, `/reports/admission`, `/reports/aftercare`, `/reports/lost-reasons`, `/reports/source-quality`, with filters
- Notifications: `GET /notifications`, `POST /notifications/:id/read`
- Audit: `GET /audit-logs` with filters
- Exports: `POST /exports` (request), `POST /exports/:id/approve`, `GET /exports/:id/download` (watermarked with user and time)

## 9. Scheduled jobs (node-cron, every minute unless stated)

1. Mark SLA breaches and notify managers.
2. Mark overdue tasks and notify owners and managers.
3. Escalate unanswered escalations at 1 hour and 2 hours.
4. Create appointment reminder and missed-appointment tasks.
5. Update lead priority (hot, warm, cold) every [15] minutes.
6. Daily at 06:00 local: generate the day's task summary notification per user.

Make job logic functions pure and unit-tested, and keep the scheduler thin so it can move to a queue later.

## 10. Integration seams for Phase 2 (build interfaces only)

Create TypeScript interfaces and a no-op/manual implementation for: `TelephonyProvider` (click-to-call, webhooks for inbound, missed, ended calls, recording URL), `MessagingProvider` (send template, receive inbound, delivery status), and `EventPublisher` (publish events such as `lead.created`, `lead.status_changed`, `appointment.booked`, `lead.converted`, `emergency.redirected`, `task.overdue`). In Phase 1, `EventPublisher` writes to an `outbox_events` table.

## 11. Security and privacy requirements

- Passwords with Argon2id, login rate limiting, lockout after 5 failures for 15 minutes, session in **httpOnly, secure, sameSite=strict cookies**, short-lived access token plus refresh, CSRF protection for state-changing requests, and idle timeout of [30] minutes.
- Strict zod validation on every input, parameterized queries only (Prisma), output encoding in the UI, request size limits, CORS allowlist from env, `helmet` headers.
- **Logs must never contain phone numbers, names, concerns, or passwords.** Configure `pino` redaction and add a test for it.
- Phone masking by role. Exports need approval and are watermarked.
- Secrets only from environment variables. Seed data is **synthetic only**.
- Prepare for data subject requests: provide a service function that finds all data for one person by mobile number (no UI needed yet), and a retention setting per data type (archive job stub).
- No third-party scripts or trackers in the web app.

## 12. Seed data

Create `pnpm seed` that creates: one branch (`MAIN`), the roles and permission matrix above, three teams, picklists above, the 15 departments (Traditional Ayurveda, Integrated Medicine, Psychological Counseling, Yoga and Wellness, Hijama and Acupuncture, Physiotherapy and Naturopathy, Diabetic and Varicose Clinic, Electro Homeopathy, De-addiction and Reflexology, Pancha Karma and Spa, Infertility and Cosmetic Clinic, Marma and Bone Alignment, Post Natal Care, Labs and Scans, Circumcision) plus Other, the seed cadences, default assignment rules (round-robin per team and branch), default settings, and **demo users** (one per role, password printed once on seed in development only) with about 40 synthetic leads and 15 synthetic cases covering every stage.

## 13. Build order (milestones)

Work through these in order. After each, run lint, type checks, and tests, update the README, commit, and **stop to report** what you built, what you tested, and what you assumed.

- **M0 Foundation:** monorepo, Docker Compose MySQL, Prisma schema and first migration, Fastify app skeleton, Nuxt skeleton with layout, i18n (en, ml), health endpoint, CI scripts, `.env.example`, `DECISIONS.md`.
- **M1 Auth and RBAC:** users, roles, teams, branches, login and logout, refresh, MFA behind a setting, `scopeWhere`, permission middleware, audit logging, admin screens for users and roles, tests for scope enforcement (including direct access by id).
- **M2 Picklists and settings:** CRUD and admin screens, seed script, settings (hours, SLA, contact rules), phone normalization utilities with tests.
- **M3 Support Desk, part 1:** leads (quick create, list, detail, duplicate check, import with preview, intake API), assignment rules and round-robin, first-response timer, statuses, close with reason.
- **M4 Tasks and cadence engine:** tasks, call logging with mandatory next action, contact rules and override reasons, cadence engine with seed cadences, My Work for the Support Desk, appointment booking with reminder and missed tasks, SLA and overdue jobs, notifications.
- **M5 Convert and cases:** mark visited and convert to patient and case, consultation outcome form, case list and detail, stages, doctor view.
- **M6 Admission Desk:** admission cadence, queue, counseling and estimate fields, deposit flag, stage rules (including the deposit gate and emergency exception), decline reasons, dashboard for the Admission Desk.
- **M7 Aftercare Desk:** treatment completed flow, aftercare cadences, aftercare call form, feedback score rule, escalations to the duty doctor with timers, closure codes, dashboard for the Aftercare Desk.
- **M8 Reports, exports, polish:** all three dashboards plus lost reasons and source quality, export request and approval, audit screen, accessibility pass, PWA install, empty and error states, Malayalam review of all labels, end-to-end smoke test, performance check on lists (indexes), final README and API docs.

## 14. Acceptance tests (must pass)

1. A support telecaller cannot open another telecaller's lead by direct URL or API call (403, and an audit entry exists).
2. Creating a lead with an existing mobile number (in any format, for example `98765 43210` and `+919876543210`) returns the duplicate and does not create a second lead without an override reason.
3. A new lead from Meta Ads has a first-response due time of 5 minutes (in business hours); one from Website has 15 minutes; a breach creates a notification for the Telecaller Manager.
4. An open lead cannot be saved or have a call logged without a next action and due time.
5. Logging outcome `Interested Not Ready` creates tasks at day 2, 7, 14, and 30; changing the lead to `appointment_booked` cancels those tasks and creates the reminder tasks.
6. A second call to the same lead on the same day shows a warning, and proceeding needs an override reason that is saved.
7. Saving a consultation outcome with care type `in_patient` puts the case in the Admission Desk queue, assigned round-robin, with a first task due within 24 hours.
8. A case cannot move to `in_treatment` without `deposit_received`, unless `emergency_admission` is ticked with a reason.
9. Marking treatment completed with a discharge date creates aftercare tasks at day 2, 7, 30, and 90 after discharge, assigned to the aftercare team.
10. An escalation notifies the duty doctor; the doctor can record a decision; with no decision after 1 hour the Telecaller Manager is notified, and after 2 hours the Center Head.
11. A feedback score of 6 or lower creates a callback task for the Telecaller Manager due within 24 hours.
12. The `admin` role cannot read lead content; after an owner grants a temporary permission, access works until it ends and every access is logged.
13. Server logs from a full test run contain no phone numbers or names.
14. Malayalam text in the concern field saves, displays, and can be searched.
15. All list endpoints respect scope: counts and results for a telecaller never include another user's records.

## 15. Definition of done

- All milestones built, all acceptance tests passing, lint and type checks clean.
- `README.md` with setup steps (install, Docker Compose, migrate, seed, run), env variables, scripts, and a short architecture note.
- `DECISIONS.md` listing every assumption.
- Swagger docs available at `/docs` in development.
- A short `docs/USER_GUIDE.md` for telecallers and specialists (how to work each desk), in English.

## 16. Rules for how you work

1. Read this whole prompt first, then write a **short plan** (milestones and risks) before coding, and keep it in `docs/PLAN.md`.
2. Build one milestone at a time. Do not start the next until the current one passes its tests, and report at the end of each milestone.
3. Prefer the simplest approach that meets the requirement. Do not build WhatsApp, telephony, billing, or in-patient features.
4. If something is unclear, choose the simplest sensible option, record it in `DECISIONS.md`, and keep going. Ask me only if a decision would be expensive to reverse.
5. Write tests for the cadence engine, the SLA calculation, scope enforcement, phone normalization, duplicate detection, and the stage rules as you build them.
6. Never include real patient data or real credentials anywhere in the repo.
7. Keep the code readable: small functions, clear names, and comments only where the reason is not obvious.
