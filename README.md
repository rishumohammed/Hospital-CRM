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
