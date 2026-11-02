import { prisma } from '../../database/client';
import { UserContext } from '../rbac/scope';
import { recordAuditLog } from '../audit/audit.service';
import {
  PHONE_NUMBER_PATTERN,
  ProductStatuses,
  StockStatuses,
} from '@hospital-crm/shared';

export interface RawImportRow {
  sku?: string;
  name?: string;
  price?: number | string;
  usage_description?: string;
  usageDescription?: string;
  category_id?: number | string;
  categoryId?: number | string;
  category_name?: string;
  short_description?: string;
  shortDescription?: string;
  pack_size?: string;
  packSize?: string;
  how_to_use?: string;
  howToUse?: string;
  ingredients?: string;
  precautions?: string;
  prescription_required?: boolean | string;
  prescriptionRequired?: boolean | string;
  refill_days?: number | string;
  refillDays?: number | string;
  image_url?: string;
  imageUrl?: string;
  internal_note?: string;
  internalNote?: string;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split on commas respecting basic quotes
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    rows.push(rowObj);
  }

  return rows;
}

export async function previewProductImport(rawInput: string | RawImportRow[]) {
  const rawRows: RawImportRow[] = typeof rawInput === 'string' ? parseCsv(rawInput) : rawInput;

  const categories = await prisma.productCategory.findMany({
    where: { archivedAt: null },
  });
  const defaultCategory = categories.find((c) => c.slug === 'uncategorized') || categories[0];

  const categoryMapByName = new Map<string, number>();
  const categoryMapById = new Map<number, number>();
  categories.forEach((c) => {
    categoryMapByName.set(c.name.toLowerCase().trim(), c.id);
    categoryMapById.set(c.id, c.id);
  });

  const errors: Array<{ row: number; sku?: string; field: string; message: string }> = [];
  const previewRows: any[] = [];
  const seenSkusInFile = new Set<string>();

  let createCount = 0;
  let updateCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 1;
    const rawSku = (r.sku || '').trim().toUpperCase();

    // 1. SKU validation
    if (!rawSku || rawSku.length < 3 || rawSku.length > 40) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'sku',
        message: 'SKU is required and must be between 3 and 40 characters',
      });
      continue;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(rawSku)) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'sku',
        message: 'SKU can only contain letters, numbers, hyphens, and underscores',
      });
      continue;
    }

    if (seenSkusInFile.has(rawSku)) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'sku',
        message: `Duplicate SKU '${rawSku}' found in the import file`,
      });
      continue;
    }
    seenSkusInFile.add(rawSku);

    // 2. Name validation
    const name = (r.name || '').trim();
    if (!name || name.length < 2 || name.length > 150) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'name',
        message: 'Name is required and must be between 2 and 150 characters',
      });
      continue;
    }

    // 3. Price validation
    const rawPrice = r.price !== undefined ? parseFloat(String(r.price)) : NaN;
    if (isNaN(rawPrice) || rawPrice < 0) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'price',
        message: 'Price must be a valid number equal to or greater than zero',
      });
      continue;
    }

    // 4. Usage description validation
    const usageDesc = (r.usage_description || r.usageDescription || '').trim();
    if (!usageDesc || usageDesc.length < 10 || usageDesc.length > 1000) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'usage_description',
        message: 'Usage description is required and must be between 10 and 1000 characters',
      });
      continue;
    }

    if (PHONE_NUMBER_PATTERN.test(usageDesc)) {
      errors.push({
        row: rowNum,
        sku: rawSku,
        field: 'usage_description',
        message: 'Usage description must not contain contact numbers or personal data',
      });
      continue;
    }

    // 5. Category resolution
    let categoryId = defaultCategory ? defaultCategory.id : 1;
    const rawCatId = r.category_id || r.categoryId;
    if (rawCatId && categoryMapById.has(parseInt(String(rawCatId), 10))) {
      categoryId = parseInt(String(rawCatId), 10);
    } else if (r.category_name) {
      const match = categoryMapByName.get(r.category_name.toLowerCase().trim());
      if (match) categoryId = match;
    }

    // 6. Check existing product in DB
    const existing = await prisma.product.findUnique({
      where: { sku: rawSku },
      include: { category: true },
    });

    const isUpdate = !!existing;
    if (isUpdate) {
      updateCount++;
    } else {
      createCount++;
    }

    const shortDesc =
      (r.short_description || r.shortDescription || '').trim() ||
      usageDesc.substring(0, 160).trim();

    const rxReq =
      r.prescription_required === true ||
      r.prescriptionRequired === true ||
      String(r.prescription_required).toLowerCase() === 'true' ||
      String(r.prescriptionRequired).toLowerCase() === 'true';

    const refillDays = r.refill_days || r.refillDays ? parseInt(String(r.refill_days || r.refillDays), 10) : null;

    previewRows.push({
      row: rowNum,
      action: isUpdate ? 'update' : 'create',
      sku: rawSku,
      name,
      price: rawPrice,
      usageDescription: usageDesc,
      categoryId,
      categoryName: categories.find((c) => c.id === categoryId)?.name || 'Uncategorized',
      shortDescription: shortDesc,
      packSize: (r.pack_size || r.packSize || '').trim() || null,
      howToUse: (r.how_to_use || r.howToUse || '').trim() || null,
      ingredients: (r.ingredients || '').trim() || null,
      precautions: (r.precautions || '').trim() || null,
      prescriptionRequired: rxReq,
      refillDays: refillDays && !isNaN(refillDays) ? refillDays : null,
      imageUrl: (r.image_url || r.imageUrl || '').trim() || null,
      internalNote: (r.internal_note || r.internalNote || '').trim() || null,
      existingProduct: existing
        ? {
            id: existing.id,
            name: existing.name,
            currentPrice: existing.price,
            currentStatus: existing.status,
          }
        : null,
    });
  }

  return {
    totalRows: rawRows.length,
    validCount: previewRows.length,
    errorCount: errors.length,
    createCount,
    updateCount,
    errors,
    previewRows,
  };
}

export async function commitProductImport(
  rows: any[],
  user: UserContext,
  ip?: string,
  userAgent?: string
) {
  if (!rows || rows.length === 0) {
    const error: any = new Error('No valid rows to commit');
    error.statusCode = 400;
    throw error;
  }

  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      const existing = await tx.product.findUnique({
        where: { sku: r.sku },
      });

      if (existing) {
        const hasPriceChange = Number(existing.price) !== Number(r.price);

        await tx.product.update({
          where: { id: existing.id },
          data: {
            name: r.name,
            price: r.price,
            usageDescription: r.usageDescription,
            categoryId: r.categoryId,
            shortDescription: r.shortDescription,
            packSize: r.packSize,
            howToUse: r.howToUse,
            ingredients: r.ingredients,
            precautions: r.precautions,
            prescriptionRequired: r.prescriptionRequired,
            refillDays: r.refillDays,
            imageUrl: r.imageUrl,
            internalNote: r.internalNote,
            // Imported products arrive as draft unless already approved
            status: ProductStatuses.DRAFT,
          },
        });

        if (hasPriceChange) {
          await tx.productPriceHistory.create({
            data: {
              productId: existing.id,
              oldPrice: existing.price,
              newPrice: r.price,
              changedById: user.id,
              reason: 'Bulk CSV import update',
            },
          });
        }
        updatedCount++;
      } else {
        const created = await tx.product.create({
          data: {
            sku: r.sku,
            name: r.name,
            price: r.price,
            usageDescription: r.usageDescription,
            categoryId: r.categoryId,
            shortDescription: r.shortDescription,
            packSize: r.packSize,
            howToUse: r.howToUse,
            ingredients: r.ingredients,
            precautions: r.precautions,
            prescriptionRequired: r.prescriptionRequired,
            refillDays: r.refillDays,
            imageUrl: r.imageUrl,
            internalNote: r.internalNote,
            status: ProductStatuses.DRAFT, // imported products arrive as draft
            stockStatus: StockStatuses.IN_STOCK,
            stockUpdatedAt: new Date(),
            stockUpdatedById: user.id,
            createdById: user.id,
          },
        });

        await tx.productStockHistory.create({
          data: {
            productId: created.id,
            status: StockStatuses.IN_STOCK,
            changedById: user.id,
            note: 'CSV import initial stock',
          },
        });

        createdCount++;
      }
    }
  });

  await recordAuditLog({
    userId: user.id,
    action: 'PRODUCT_IMPORT_COMMITTED',
    entity: 'product',
    entityId: 0,
    after: {
      totalCommitted: rows.length,
      createdCount,
      updatedCount,
    },
    ip,
    userAgent,
  });

  return {
    success: true,
    totalCommitted: rows.length,
    createdCount,
    updatedCount,
  };
}
