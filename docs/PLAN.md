# Hospital CRM: Telecalling Module (Phase 1) - Implementation Plan

## 1. Project Overview & Architecture
An in-house hospital CRM for multi-branch telecalling operations across three desks:
1. **Support Desk (New Leads):** Rapid response, qualification, appointment booking, SLA tracking.
2. **Admission Desk:** Follow-up for consultation-completed patients advised admission, estimate counseling, deposit tracking.
3. **Aftercare Desk:** Post-treatment & post-discharge follow-ups (days 2, 7, 30, 90), red-flag clinical escalations, feedback tracking.

### Tech Stack:
- **Repo Structure:** pnpm monorepo:
  - `apps/web`: Nuxt 3 (Vue 3, TypeScript, Pinia, Tailwind CSS + Nuxt UI), `@nuxtjs/i18n` (en, ml), PWA.
  - `apps/api`: Node.js 20+, TypeScript, Fastify, Prisma ORM, zod, pino (with PII redaction), argon2, `@fastify/cookie`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/swagger`, `node-cron`, `libphonenumber-js`.
  - `packages/shared`: Zod schemas, TypeScript types/interfaces, permission definitions, enums, telephone & validation helpers.
- **Database:** MySQL 8 (`utf8mb4` with `utf8mb4_unicode_ci` for Malayalam support). All timestamps stored in UTC, presented in `Asia/Kolkata`.

---

## 2. Milestone Roadmap

### Milestone 0: Foundation (M0)
- Monorepo setup (`pnpm-workspace.yaml`, root `package.json`, TypeScript configs).
- `packages/shared` package initialization.
- `apps/api` Fastify skeleton with health check (`/api/v1/health`), Swagger documentation (`/docs`), helmet, cors, cookie, error formatting, pino logger with PII redaction.
- `apps/web` Nuxt 3 skeleton with Nuxt UI, Pinia, Tailwind CSS, `@nuxtjs/i18n` with English and Malayalam locales.
- Docker Compose for MySQL 8 with `utf8mb4_unicode_ci`.
- Prisma schema baseline and initial setup.
- CI / test setup with Vitest.
- Documentation: `.env.example`, `DECISIONS.md`, `README.md`.

### Milestone 1: Auth & RBAC (M1)
- User, Role, Team, Branch, RolePermission, PermissionGrant models in Prisma.
- Argon2id password hashing, login rate limiting (5 attempts / 15 min lockout), session tokens in httpOnly secure sameSite=strict cookies, refresh token handling.
- TOTP MFA foundation behind configurable setting.
- `scopeWhere(user, resource)` reusable data scoping filter (`own`, `team`, `branch`, `all`).
- Permission & scope authorization middleware in Fastify.
- Audit logging service for logins, failures, data access, grants, reassignments.
- Admin screens in Nuxt for user & role management.
- Unit and integration tests for RBAC, scope enforcement, and direct ID access prevention (403 audit).

### Milestone 2: Picklists, Settings & Phone Utilities (M2)
- Picklist tables: Sources, Departments, Call Outcomes, Lost Reasons, Decline Reasons, Closure Codes (with `label_en` and `label_ml`).
- Settings table (calling hours, SLA business minutes, contact soft-limits, quiet hours).
- Phone normalization module using `libphonenumber-js` (defaulting to India +91, E.164 output, formatting, masking helper for last 3 digits).
- Comprehensive unit tests for phone normalization, masking, and validation.
- Database seed script (`pnpm seed`) baseline.

### Milestone 3: Support Desk - Lead Management (M3)
- Lead data model & relations (name, normalized mobile, language, department, source, priority, consent, status, SLA fields).
- Lead APIs: Quick create, list with filtering and search (supporting Malayalam text), detail, duplicate check, public intake API (`POST /api/intake/:sourceKey`), CSV import with preview.
- Assignment engine: round-robin within branch/team, rule prioritization.
- First-response SLA timer engine (5 min for Google/Meta Ads, 15 min for others during branch business hours).
- Nuxt UI: Quick Create drawer with live duplicate alerts, Leads list with filters and saved views, Lead detail view.

### Milestone 4: Tasks, Interactions & Cadence Engine (M4)
- Task and Interaction data models.
- Cadence engine: Event-driven cadence transitions (`lead.no_answer`, `lead.interested_not_ready`, `lead.information_given`, `appointment.reminders`, `appointment.missed`, etc.), cancelling previous open cadence tasks and scheduling new steps.
- Interaction logging API: `POST /interactions/call` requiring outcome AND next action/due time in the same request.
- Soft contact rules: Warning on second call same day or 4th attempt in cycle; override reason required.
- Calling hours validation (09:00 - 20:00 local) with override reason.
- Emergency redirect flow: sets flag, creates high-priority notification to `duty_nurse`.
- Appointment booking flow: creates 24h & 2h reminders, and +1h missed-recovery task.
- Cron jobs for SLA breaches and overdue tasks.
- Nuxt UI: **My Work** dashboard with "New Leads" tab, overdue/today/upcoming cards, click-to-call, WhatsApp click-to-chat with template, call logging drawer.

### Milestone 5: Conversion & Patient Cases (M5)
- "Mark Visited" flow: Converts lead to `Patient` and `Case`, marks lead `converted`.
- Case data model with stages (`visited`, `plan_given`, `counseling_estimate`, `plan_accepted`, `in_treatment`, `aftercare_follow_up`, `completed`, `not_started`, `dropped_out`).
- Consultation outcome recording (care type: consultation_only, opd_course, in_patient, procedure; treating doctor; department; estimated amount; plan notes).
- Doctor view in Nuxt: my cases, consultation outcome form, escalations queue.

### Milestone 6: Admission Desk (M6)
- In-patient case routing: Consultation outcome with `care_type = in_patient` triggers `advised_admission = true`, moves to `plan_given`, schedules `case.admission_advised` cadence (24h, day 3, day 7).
- Admission Desk queue and stage advancement:
  - Counseling & estimate recording -> `counseling_estimate`.
  - Family agreement & deposit tracking (50% estimate flag & amount) -> `plan_accepted`.
  - Admission confirmation -> `in_treatment` (strictly gated by deposit received, unless emergency admission flag with reason).
  - Decline handling with lost reasons -> `not_started`.
- Admission Desk manager dashboard (advised, contacted within 24h, counseling booked, accepted, admitted, declined reasons).
- Nuxt UI: Admission Desk board/list, case detail workflow.

### Milestone 7: Aftercare Desk (M7)
- Treatment completion flow: Treatment completed date (and discharge date for in-patients) transitions case to `aftercare_follow_up`.
- Aftercare cadence generator: In-patient (days 2, 7, 30, 90 post-discharge) vs OPD/procedure (days 7, 30, 90 post-treatment).
- Aftercare call form: General condition, medicine adherence, new/worsening symptoms, diet/rest, review visit booking, feedback score (0-10).
- Automatic triggers:
  - Feedback score <= 6 creates manager callback task within 24 hours.
  - Clinical red flag escalation: "Escalate to doctor" creates `escalation` with 1-hour SLA for duty doctor decision; automated escalation alerts to Telecaller Manager (1h) and Center Head (2h).
- Case closure codes: Improved, No Change, Referred, Discontinued, Lost to Follow-up.
- Aftercare Desk dashboard & Nuxt UI screens.

### Milestone 8: Reports, Exports, Polish & Completion (M8)
- Management Dashboards (Support, Admission, Aftercare, Lost Reasons, Source Quality) with branch and date filters.
- Secure Export system: Request export, role-based approval, watermarked CSV download (user, timestamp).
- Audit log viewer screen with filtering.
- PWA manifest, service worker setup, mobile touch targets (>=44px), Malayalam UI translation verification.
- Phase 2 seams: `TelephonyProvider`, `MessagingProvider`, `EventPublisher` (with `outbox_events`).
- Comprehensive acceptance test suite verification.
- User guide (`docs/USER_GUIDE.md`) and setup instructions (`README.md`).

---

## 3. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **PII Leakage in Logs** | Pino logger configured with strict redaction paths (`mobile`, `name`, `concern`, `password`, `*.mobile`, etc.) and a dedicated automated test. |
| **Data Scope Bypass** | Centralized `scopeWhere(user, resource)` used in every query; integration tests verify 403 and audit log on ID tampering. |
| **Timezone & Business Hour Bugs** | Strict rule: DB stores all timestamps in UTC; business hours calculations use `date-fns-tz` or `Intl` with `Asia/Kolkata`. |
| **Mandatory Next Action Dropped** | Enforced at the API level within database transactions: a lead or case cannot have its open state or call logged without a valid task or closure reason. |
| **PowerShell / Windows Execution Policy** | Use explicit `.cmd` or `cmd /c` invocations to avoid script authorization errors. |
