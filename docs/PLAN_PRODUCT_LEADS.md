# PLAN_PRODUCT_LEADS.md: Product Leads Module Implementation Plan

## Executive Summary
This document specifies the technical design, architectural changes, data contracts, and milestone plan for implementing the **Product Leads** module in the Hospital CRM.

---

## 1. Architectural Design & Boundaries

### 1.1 Separation of Concerns
- **Treatment Leads vs. Product Leads**: Stored in the unified `leads` table with a distinguishing `lead_type` (`treatment` vs `product`, default `treatment`).
- **Strict Role & Data Isolation**:
  - Treatment telecallers and clinicians cannot view or access product leads.
  - Product sales executives cannot view or access treatment leads.
  - Direct URL access across boundaries returns HTTP 403 Forbidden with security audit logging (`lead.unauthorized_access`).
  - RBAC scoping (`scopeWhere`) rigorously enforces `lead_type` based on user permissions.
- **No Medical Claims**:
  - Catalog descriptions must strictly avoid cure guarantees or clinical diagnosis claims.
  - Prescription-required products require caller verification before sale confirmation.
  - Callers have an action to refer medical inquiries to the Treatment Desk (creating a linked treatment lead).
- **No Stock Ledger / Invoicing**:
  - Module tracks binary `stock_status` (`in_stock` / `out_of_stock`), price history, customer interest, and order reference confirmations.
  - Does not manage physical warehouse bins, payment gateways, or shipping logistics.

---

## 2. Database Schema Changes (`apps/api/prisma/schema.prisma`)

### 2.1 Existing Model Modifications
1. **`Team`**:
   - Seed `product_sales` team.
2. **`Lead`**:
   - `leadType`: `String @default("treatment") @map("lead_type") @db.VarChar(20)` (`treatment` | `product`)
   - `campaignId`: `Int? @map("campaign_id") @db.UnsignedInt`
   - `saleConfirmedAt`: `DateTime? @map("sale_confirmed_at")`
   - `saleAmount`: `Decimal? @map("sale_amount") @db.Decimal(12, 2)`
   - `orderReference`: `String? @map("order_reference") @db.VarChar(100)`
   - `referredFromLeadId`: `Int? @map("referred_from_lead_id") @db.UnsignedInt`
   - Relations: `campaign`, `referredFromLead`, `referredLeads`, `productInterests`, `waitlistEntries`
   - Indexes: `@@index([leadType])`, `@@index([campaignId])`
3. **`CallOutcome`**:
   - `scope`: `String @default("treatment") @db.VarChar(20)` (`treatment` | `product` | `both`)

### 2.2 New Models
1. **`ProductCategory`** (`product_categories`):
   - `id`, `name`, `slug` (unique), `parentId` (self-relation, max 2 levels), `sort`, `active`, `description`, timestamps, `archivedAt`.
2. **`Product`** (`products`):
   - `id`, `sku` (unique uppercase, 3-40 chars), `name` (2-150 chars), `price` (decimal 10,2, >=0), `usageDescription` (10-1000 chars), `categoryId`, `shortDescription` (up to 160 chars), `packSize`, `howToUse`, `ingredients`, `precautions`, `prescriptionRequired` (boolean), `refillDays` (int), `imageUrl`, `internalNote`, `status` (`draft` | `approved` | `archived`), `stockStatus` (`in_stock` | `out_of_stock`), `stockUpdatedAt`, `stockUpdatedById`, `stockNote`, `approvedById`, `approvedAt`, `createdById`, timestamps, `archivedAt`.
3. **`ProductPriceHistory`** (`product_price_history`):
   - `id`, `productId`, `oldPrice`, `newPrice`, `changedById`, `reason`, `createdAt`.
4. **`ProductStockHistory`** (`product_stock_history`):
   - `id`, `productId`, `status`, `changedById`, `note`, `createdAt`.
5. **`ProductRelation`** (`product_relations`):
   - `id`, `productId`, `relatedProductId`, `relationType` (`cross_sell` | `upsell` | `frequently_together` | `substitute`), `talkingPoint` (text), `sort`, `active`, timestamps, `archivedAt`.
   - `@@unique([productId, relatedProductId, relationType])`
6. **`ProductCampaign`** (`product_campaigns`):
   - `id`, `name`, `campaignKey` (unique), `channel` (`meta_ads` | `google_ads` | `whatsapp` | `sms` | `email` | `website` | `camp` | `other`), `startDate`, `endDate`, `budget`, `spent`, `ownerId`, `status` (`draft` | `active` | `paused` | `ended`), `notes`, timestamps, `archivedAt`.
7. **`CampaignProduct`** (`campaign_products`):
   - `id`, `campaignId`, `productId`, `sort`.
   - `@@unique([campaignId, productId])`
8. **`LeadProductInterest`** (`lead_product_interests`):
   - `id`, `leadId`, `productId`, `quantity` (default 1), `unitPriceAtTime`, `status` (`interested` | `offered` | `accepted` | `declined`), `origin` (`selected` | `cross_sell` | `campaign`), `prescriptionVerified` (boolean), `declinedReason`, `waitlisted` (boolean), `note`, `addedById`, timestamps.
9. **`ProductWaitlist`** (`product_waitlist`):
   - `id`, `leadId`, `productId`, `notifiedAt`, `createdAt`.
   - `@@unique([leadId, productId])`

---

## 3. RBAC & Permission Matrix

### 3.1 Roles & Scopes
| Permission | owner | admin | center_head | telecaller_manager | product_manager | product_sales_executive | pharmacy_store | auditor |
|---|---|---|---|---|---|---|---|---|
| `product.view` | all | all | all | all | all | all (approved, active only) | all | all (read) |
| `product.create / edit` | all | all | none | none | all | none | none | none |
| `product.approve` | all | none | none | none | all | none | none | none |
| `product.archive` | all | all | none | none | all | none | none | none |
| `product.stock_update` | all | none | none | none | all | none | all | none |
| `product.import` | all | all | none | none | all | none | none | none |
| `product_category.manage` | all | all | none | none | all | none | none | none |
| `product_relation.manage` | all | none | none | none | all | none | none | none |
| `product_campaign.manage` | all | none | branch | none | all | none | none | none |
| `product_lead.view` | all | none | branch | none | all | own | none | all (read) |
| `product_lead.create / edit` | all | none | branch | none | all | own | none | none |
| `product_lead.reassign` | all | none | branch | none | all | none | none | none |
| `product_report.view` | all | none | branch | none | all | own | none | all |

---

## 4. Cross-Sell & Suggestion Engine Specification

`GET /api/v1/products/:id/suggestions?lead_id=:leadId`
Return maximum 6 suggestions in strictly ordered priority:
1. **Tier 1 (Curated in-stock)**: Active `cross_sell`, `upsell`, `frequently_together` relations where `stock_status = 'in_stock'`, ordered by `sort ASC`.
2. **Tier 2 (Alternative for Out-of-Stock)**: If the subject product is `out_of_stock`, active `substitute` relations that are `in_stock`, labeled `"Alternative"`.
3. **Tier 3 (Same-category Popularity)**: In-stock products in the same category ranked by acceptance count on product leads in the last 90 days.
4. **Tier 4 (Curated out-of-stock)**: Curated relations that are `out_of_stock`, greyed and labeled `"Out of stock"`.
- **Exclusions**: Archived products, drafts (unless user has catalog edit rights), and products already on the lead (`lead_product_interests`).

---

## 5. Automation & Background Jobs

1. **Restock Alert & Task Generator**:
   - Triggered when product stock is switched from `out_of_stock` &rarr; `in_stock`.
   - Iterates through unnotified waitlist entries (`notified_at IS NULL`).
   - Checks `do_not_contact` and communication consents.
   - Generates priority task `"[Product] is back in stock"` for lead owner (due in 2 hours).
   - Sets `notified_at = NOW()`, adds interaction timeline note, sends in-app notification.
2. **Out-of-Stock Notification**:
   - Triggered when product stock becomes `out_of_stock`.
   - Flags active lines on open leads.
   - Alerts lead owners via notification.
3. **Refill Reminders**:
   - When order is confirmed (`confirm-sale`), for each accepted product with `refill_days`, schedules task `Refill Reminder: [Product]` at `refill_days - 5` days.
4. **Product Cadences**:
   - `product.no_answer` (same day evening, day 2 final)
   - `product.interested_not_ready` (day 2, day 7, day 14)
   - `product.price_concern` (day 3, day 10)
   - `product.refill` (driven by refill days)

---

## 6. Files to Create and Modify

### 6.1 Database & Shared (`packages/shared`, `apps/api/prisma`)
- [x] `apps/api/prisma/schema.prisma` - Add models and relations
- [x] `packages/shared/src/enums/index.ts` - Roles, Teams, Permissions, LeadTypes, ProductStatuses, RelationTypes
- [x] `packages/shared/src/schemas/index.ts` - Zod schemas for Product, Category, Relation, Campaign, LeadProduct, ConfirmSale

### 6.2 API Core & Modules (`apps/api/src/modules`)
- [x] `apps/api/src/modules/rbac/scope.ts` - Add `lead_type` isolation in `scopeWhere`
- [x] `apps/api/src/database/seed.ts` - Seed teams, roles, categories, 20 products, relations, campaigns, product leads, waitlist
- [x] `apps/api/src/modules/products/`
  - `product.service.ts`
  - `product.routes.ts`
  - `product-category.service.ts`
  - `product-category.routes.ts`
  - `product-relation.service.ts`
  - `product-relation.routes.ts`
  - `product-campaign.service.ts`
  - `product-campaign.routes.ts`
  - `product.import.service.ts`
- [x] `apps/api/src/modules/leads/`
  - `lead.service.ts` - Support `lead_type` filtering, products integration, refer-to-treatment, confirm-sale
  - `lead.routes.ts` - Product interests subroutes
- [x] `apps/api/src/modules/reports/`
  - `product-report.service.ts` - Product lead metrics, cross-sell conversion, demand, catalog health
  - `product-report.routes.ts`
- [x] `apps/api/src/cron/jobs.ts` - Restock notifier and out-of-stock monitor
- [x] `apps/api/src/app.ts` - Register new route plugins

### 6.3 Web Frontend (`apps/web`)
- [x] `apps/web/layouts/default.vue` - Sidebar links for Product Catalog, Categories, Campaigns, Product Reports
- [x] `apps/web/pages/products/index.vue` - Products list (desktop table / mobile cards, stock switch, filters)
- [x] `apps/web/pages/products/[id].vue` - Product detail, price history, stock history, relations editor
- [x] `apps/web/pages/products/categories.vue` - Category hierarchy CRUD & move products dialog
- [x] `apps/web/pages/products/campaigns.vue` - Campaign management & conversion metrics
- [x] `apps/web/pages/leads/index.vue` - Treatment Leads | Product Leads toggle, product-specific filters
- [x] `apps/web/pages/leads/[id].vue` - Product Lead view: Products panel, Suggested Cross-Sell Sheet, Refer to Treatment modal, Confirm Sale modal with prescription gate
- [x] `apps/web/pages/index.vue` - Dashboard: Product Leads tab for product_sales team
- [x] `apps/web/components/product/`
  - `ProductDrawer.vue` (Add/Edit product drawer)
  - `BulkStockModal.vue` (Bulk stock update)
  - `ImportProductModal.vue` (CSV Preview & Commit)
  - `SuggestedProductsSheet.vue` (Cross-sell & alternatives bottom sheet)
  - `ConfirmSaleModal.vue` (Prescription gate & order reference)
  - `LogProductCallDrawer.vue` (Product call logging)
- [x] `apps/web/pages/reports/products.vue` - Product leads analytics & catalog health dashboard

---

## 7. Milestone Roadmap

| Milestone | Deliverables | Verification / Acceptance Tests |
|---|---|---|
| **P0** | Architectural plan, file list (`docs/PLAN_PRODUCT_LEADS.md`) | Plan complete and committed |
| **P1** | Schema migration, shared schemas, roles, teams, permissions, `lead_type` isolation in queries | Unit tests: Treatment vs Product lead isolation (AT 13, AT 14) |
| **P2** | Categories & Products CRUD, status approval, price/stock history, bulk stock, SKU validation, CSV import | Unit & API tests: Product validation, SKU uniqueness, Stock switch (AT 1, 2, 3, 4, 5, 6, 10, 15, 17) |
| **P3** | Relations editor & 4-tier Suggestion Engine | Unit & API tests: Suggestion ordering, exclusions, OOS alternatives (AT 9) |
| **P4** | Campaigns, Product Leads CRUD, Leads toggle, Products panel, Cross-sell sheet, Log Product Call, Confirm Sale with Prescription gate, Refill reminder | Unit & API tests: Confirm sale, prescription gate, refill task, refer treatment (AT 7, 11, 12, 14) |
| **P5** | Restock & OOS jobs, product cadences, product reports & dashboard | Integration tests: Restock waitlist notifier, catalog health metrics (AT 8, 16) |
| **P6** | Polish pass, mobile responsive checks, seed update, README update, end-to-end smoke test | All 18 Acceptance Tests passing, clean build, clean commit |
