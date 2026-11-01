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



