# Implementation Plan: Testimonials Sent Feature

## 1. Overview
The **Testimonials Sent** feature enables Support Desk telecallers to share approved, consent-confirmed patient testimonials with leads, track sending channels, and record compliance. Telecaller managers can audit sends, enforce consent restrictions (with supervisor overrides), void incorrect entries, filter uncontacted leads, and view conversion analytics.

---

## 2. Monorepo Files to Touch

### Shared Package (`packages/shared`)
- `packages/shared/src/enums/index.ts`:
  - Add `Permissions.TESTIMONIAL_SEND`, `TESTIMONIAL_VOID`, `TESTIMONIAL_MANAGE`, `TESTIMONIAL_VIEW`
  - Add `InteractionTypes.TESTIMONIAL_SENT = 'testimonial_sent'`, `TESTIMONIAL_VOID = 'testimonial_void'`
  - Add `TestimonialChannels = { WHATSAPP: 'whatsapp', SMS: 'sms', EMAIL: 'email', CALL_READOUT: 'call_readout', OTHER: 'other' }`
  - Add `TestimonialTypes = { VIDEO: 'video', TEXT: 'text', IMAGE: 'image', PDF: 'pdf' }`
- `packages/shared/src/schemas/index.ts`:
  - Add `testimonialSchema`, `createTestimonialSchema`, `updateTestimonialSchema` (anti-PII regex check for phone numbers)
  - Add `sendTestimonialsSchema`, `editTestimonialSendSchema`, `voidTestimonialSendSchema`
  - Add `testimonialReportQuerySchema`

### API Package (`apps/api`)
- `apps/api/prisma/schema.prisma`:
  - Add `Testimonial` model
  - Add `LeadTestimonialSend` model
  - Add `LeadTestimonialSendItem` model
  - Add `testimonialsSentCount Int @default(0)` and `testimonialsLastSentAt DateTime?` to `Lead` model with index
  - Relations to `User`, `Department`, and `Lead`
- `apps/api/src/modules/testimonials/testimonial.service.ts`:
  - Library CRUD (enforce consent_confirmed, consent_reference, anti-PII check)
  - Lead sends: `recordTestimonialsSent` (transaction: send, items, lead counter updates, interaction, audit log, optional 24h follow-up task)
  - Edit send: same-day sender edit for note and sentAt
  - Void send: `voidTestimonialsSend` (transaction: mark voided, recalculate lead counters, interaction, audit log)
  - Lead send history
  - Testimonials analytics report (`getTestimonialsReport`)
- `apps/api/src/modules/testimonials/testimonial.routes.ts`:
  - `GET /testimonials`
  - `POST /testimonials`, `PATCH /testimonials/:id`, `POST /testimonials/:id/deactivate`
  - `POST /leads/:id/testimonials-sent`
  - `PATCH /leads/:id/testimonials-sent/:sendId`
  - `POST /leads/:id/testimonials-sent/:sendId/void`
  - `GET /leads/:id/testimonials-sent`
  - `GET /reports/testimonials`
- `apps/api/src/modules/leads/lead.service.ts` & `apps/api/src/modules/leads/lead.routes.ts`:
  - Add `testimonials=sent|not_sent` filter and sorting by `testimonials_last_sent_at`
- `apps/api/src/app.ts`: Register testimonial routes
- `apps/api/src/database/seed.ts`:
  - Seed 3 synthetic testimonials (video, text, pdf)
  - Seed permissions for all roles
  - Seed testimonials sent for ~10 sample leads
- `apps/api/src/logger/index.ts`: Add `summary`, `note`, `voidReason`, `overrideReason` to redaction paths
- `apps/api/src/modules/testimonials/testimonial.api.test.ts`:
  - Acceptance tests for permissions, consent checking, override, voiding, lead counters, reports, anti-PII check

### Web Package (`apps/web`)
- `apps/web/locales/en.json` & `apps/web/locales/ml.json`:
  - Testimonial status chips, drawer labels, channel options, disclaimer, WhatsApp prefilled template, void modal, filter labels, library admin labels
- `apps/web/components/testimonials/MarkTestimonialDrawer.vue`:
  - Mobile bottom drawer / modal
  - Channel radio buttons, library picker with language/department default filter, disclaimer display, note, consent warning & supervisor override input
  - "Open WhatsApp" flow + confirmation sheet
- `apps/web/components/testimonials/TestimonialChip.vue`:
  - Reusable chip showing "Testimonials: Not sent" or "Sent, 1 Nov, WhatsApp"
- `apps/web/components/leads/LeadCard.vue` / `pages/my-work/index.vue`:
  - Integrate chip and 2-tap "Mark sent" action
- `apps/web/pages/leads/[id].vue`:
  - "Testimonials" history section with channel, items, notes, void status, and void action modal
- `apps/web/pages/leads/index.vue`:
  - Column with chip and last sent date
  - Filter control: All, Sent, Not sent
  - Saved view tab: "Not yet sent testimonials"
- `apps/web/pages/admin/testimonials/index.vue`:
  - Admin library management (list, add, edit, deactivate)
- `apps/web/pages/reports/index.vue` / Support Desk Dashboard:
  - Testimonials analytics card with appointment booking association rates

---

## 3. Step-by-Step Execution Sequence

1. **T0**: Plan document & directory preparation.
2. **T1**: Update `packages/shared` with enums and schemas, build shared package, update Prisma schema, run `prisma db push` and `prisma generate`, update `seed.ts`.
3. **T2**: Implement backend service, routes, audit logs, transactions, and API test suite.
4. **T3**: Build frontend components (drawer, chip, lead detail section, leads list filter, admin library).
5. **T4**: Implement WhatsApp link flow with confirm sheet, follow-up task setting, reports card, i18n (en/ml), DECISIONS.md and README.md updates.
6. **T5**: Verification of all Acceptance Tests (AT 1 to 15 + new Testimonial Acceptance Tests) and typechecks.
