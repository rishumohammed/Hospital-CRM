# Hospital CRM - Telecalling Module (Phase 1)

In-house hospital CRM for telecallers, specialists, and treating doctors across multi-branch hospitals.

The system manages patients across three primary operational desks:
1. **Support Desk (New Leads):** Fast response, lead qualification, appointment booking, and SLA monitoring.
2. **Admission Desk:** Pre-admission counseling for patients advised in-patient care, estimate follow-ups, and deposit tracking.
3. **Aftercare Desk:** Post-treatment review calls (days 2, 7, 30, 90), recovery adherence monitoring, and clinical red-flag doctor escalations.

All patient touchpoints are governed by **tasks with due times**, **mandatory next actions**, and **automated cadences**.

---

## Architecture Overview

- **Monorepo:** pnpm workspaces:
  - `packages/shared`: Shared Zod schemas, TypeScript enums, and phone normalization/masking utilities (`libphonenumber-js`).
  - `apps/api`: Fastify backend (Node.js 20+, TypeScript), Prisma ORM, MySQL 8 (`utf8mb4_unicode_ci`), Argon2id password hashing, Pino logger with PII redaction, Swagger OpenAPI docs, and node-cron scheduled jobs.
  - `apps/web`: Nuxt 3 frontend (Vue 3, TypeScript, Pinia, Tailwind CSS + Nuxt UI), `@nuxtjs/i18n` with English (`en`) and Malayalam (`ml`), mobile-first responsive PWA.
- **Database:** MySQL 8 with `utf8mb4` charset and `utf8mb4_unicode_ci` collation (full Malayalam search and character support). Timestamps stored in UTC and presented in `Asia/Kolkata`.

---

## Setup & Getting Started

### Prerequisites
- Node.js 20+
- pnpm 11+
- Docker and Docker Compose (or a local MySQL 8 / MariaDB service)

### 1. Installation
Clone the repository and install dependencies:
```bash
pnpm install
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```
Ensure your MySQL credentials and database URL in `.env` are configured:
```env
DATABASE_URL="mysql://crm_user:crm_password@localhost:3306/hospital_crm?charset=utf8mb4"
```

### 3. Database Setup

#### Option A: Run MySQL with Docker Compose
```bash
pnpm docker:up
```

#### Option B: Use Local MySQL / MariaDB
Create the database:
```sql
CREATE DATABASE hospital_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Synchronize Schema & Generate Prisma Client
```bash
pnpm db:generate
pnpm db:migrate
# or for fast schema synchronization:
pnpm --filter @hospital-crm/api db:push
```

### 4. Seed Data
Seed demo users, branches, 15 departments, picklists, cadences, and synthetic test records:
```bash
pnpm seed
```

### 5. Running the Application
Run both backend and frontend concurrently:
```bash
pnpm dev
```
Or run individually:
- **API Server:** `pnpm dev:api` (Runs on `http://localhost:4000`)
- **Web App:** `pnpm dev:web` (Runs on `http://localhost:3000`)
- **Swagger API Docs:** Available at `http://localhost:4000/docs`

---

## Running Tests & Typechecks

Run all tests across all workspaces:
```bash
pnpm test
```

Run unit and API tests individually:
```bash
pnpm test:unit
pnpm test:api
```

Run TypeScript verification:
```bash
pnpm typecheck
```

---

## Milestone Progress

| Milestone | Description | Status |
|---|---|---|
| **M0** | Monorepo, Fastify, Nuxt 3, MySQL 8 Prisma baseline, PII redaction | ✅ Complete |
| **M1** | Auth, Argon2id, Session Cookies, RBAC with `scopeWhere`, Audit Logs | ✅ Complete |
| **M2** | Picklists (Depts, Sources, Outcomes), Settings, Phone Normalization | ✅ Complete |
| **M3** | Support Desk: Leads, Duplicates, Round-Robin, SLA, Intake API | ✅ Complete |
| **M4** | Tasks, Interactions, Cadences, My Work Dashboard, Appointments, Cron | ✅ Complete |
| **M5** | Conversion & Patient Cases ("Mark Visited", Consultation Outcome) | ✅ Complete |
| **M6** | Admission Desk (In-Patient queue, Estimate Counseling, Deposit Gate) | ✅ Complete |
| **M7** | Aftercare Desk (Post-treatment Cadences, Call Form, Doctor Escalations) | ✅ Complete |
| **M8** | Reports, Watermarked CSV Exports, PWA & Final Polish (AT 12-15) | ✅ Complete |
| **M9** | Testimonials Sent (Approved Library, Consent Enforcement, 2-Tap UX, Reports) | ✅ Complete |

---

## Acceptance Test Suite (AT 1 to 16)

All acceptance tests are implemented and verified green in the automated test suite:

- **AT 1**: Scope enforcement — Support telecaller 1 cannot open telecaller 2's lead by direct ID (HTTP 403 + forensic audit log written).
- **AT 2**: Duplicate detection — Submitting a phone number active in the last 30 days is blocked with 409 conflict unless explicitly overridden with reason.
- **AT 3**: Response SLAs — Meta Ads incoming leads receive a 5-minute first response SLA; Website inquiries receive a 15-minute SLA.
- **AT 4**: Contact soft limits — Enforces a maximum of 3 call attempts per patient per calendar day; 4th call attempt requires manager override reason.
- **AT 5**: Atomic call logging — Logging an interaction automatically schedules the next cadence action in a single database transaction.
- **AT 6**: Cadence termination — Reaching the patient or booking an appointment terminates open unanswered cadence steps.
- **AT 7**: Conversion to Patient & Case — Clicking "Mark Visited" converts lead into a permanent Patient and initial Case record with intact timeline.
- **AT 8**: Admission deposit gate — Advancing case to `admitted` stage requires deposit payment confirmation or emergency clinical override with logged justification.
- **AT 9**: Aftercare recovery cadences — In-patient discharge requires discharge date and triggers Day 2, 7, 30, and 90 follow-ups; OPD triggers Day 7, 30, and 90 follow-ups.
- **AT 10**: Clinical red-flag escalation — Reporting red-flag symptoms routes an escalation to the duty doctor with a strict 1-hour SLA, cascading to manager at 1 hour and center head at 2 hours.
- **AT 11**: Low CSAT alert — Feedback rating $\le 6/10$ schedules an automated 24-hour priority callback task for the Telecaller Manager.
- **AT 12**: Admin content restriction — IT admin cannot view clinical lead content; access requires a time-bounded permission grant from Owner, with all access audited.
- **AT 13**: PII log redaction — Pino logger automatically masks phone numbers, names, medical concerns, and passwords (`[REDACTED]`).
- **AT 14**: Malayalam Unicode support — Malayalam text in concern and name fields saves, displays, and searches correctly across the database.
- **AT 15**: Telecaller queue isolation — Telecaller lead list queries strictly return only own assigned leads (or unassigned in branch) and never another telecaller's leads.
- **AT 16 (Testimonials Sent)**: 
  - Own vs other lead scope enforcement on testimonial sends (403 Forbidden + audit entry).
  - Inactive / unconfirmed consent testimonials blocked.
  - WhatsApp/SMS/Email channel consent enforced (`CONSENT_MISSING`), overridable only by managers with reason.
  - Blocking sends on leads marked `do_not_contact`, `junk`, or with active `emergency_flag`.
  - Atomic send tracking: updates denormalized lead counters (`testimonials_sent_count`, `testimonials_last_sent_at`), writes `testimonial_sent` timeline interaction, and logs audit record.
  - Soft voiding with mandatory reason: decrements counters, maintains struck-through audit trail, and writes `testimonial_void` interaction.
  - Anti-PII phone check on testimonial title/summary creation.
  - Telecaller outcome association report with appointment booking comparative rates and prominent disclaimer.

