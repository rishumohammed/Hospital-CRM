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
