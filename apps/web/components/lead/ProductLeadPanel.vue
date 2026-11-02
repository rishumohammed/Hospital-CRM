<template>
  <div class="space-y-6">
    <!-- 1. Permanent Compliance Advisory Banner -->
    <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-2xs">
      <span class="text-xl shrink-0">⚠️</span>
      <div class="space-y-0.5 text-xs">
        <span class="font-semibold block">Ayurvedic Formulations Calling Protocol:</span>
        <p class="text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
          Do not give medical advice or diagnose health conditions. Refer any diagnostic or treatment questions to a doctor. Quote only official catalog prices without unauthorized discounts.
        </p>
      </div>
    </div>

    <!-- 2. Price Change Alert Banner (if catalog price changed from locked price) -->
    <div
      v-if="priceChangedItems.length > 0"
      class="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start justify-between gap-4 shadow-2xs"
    >
      <div class="flex items-start gap-3 text-xs">
        <span class="text-xl shrink-0">🔔</span>
        <div class="space-y-1">
          <span class="font-semibold block">Catalog Price Revision Notice</span>
          <p class="text-slate-600 dark:text-slate-300">
            Catalog price for <strong class="font-semibold">{{ priceChangedItems[0].product?.name }}</strong> is now
            <strong class="text-blue-700 dark:text-blue-300">₹{{ Number(priceChangedItems[0].product?.price).toFixed(2) }}</strong>
            (locked at ₹{{ Number(priceChangedItems[0].unitPriceAtTime).toFixed(2) }}).
          </p>
        </div>
      </div>
      <button
        type="button"
        @click="updateToCatalogPrice(priceChangedItems[0])"
        class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs whitespace-nowrap shadow-2xs"
      >
        Update to Current Price
      </button>
    </div>

    <!-- 3. Out of Stock Warning Banner (if any interested item is OOS) -->
    <div
      v-if="oosItems.length > 0"
      class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
    >
      <div class="flex items-start gap-3 text-xs">
        <span class="text-xl shrink-0">📦</span>
        <div>
          <span class="font-semibold block">Item Currently Out of Stock</span>
          <p class="text-slate-600 dark:text-slate-300">
            <strong class="font-semibold">{{ oosItems[0].product?.name }}</strong> is temporarily out of stock. You can waitlist the customer or suggest alternative formulations.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          @click="waitlistProduct(oosItems[0].product?.id)"
          class="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 font-semibold text-xs hover:bg-rose-50"
        >
          Waitlist Customer
        </button>
        <button
          type="button"
          @click="openSuggestions(oosItems[0].product?.id)"
          class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-2xs"
        >
          View Curated Substitutes
        </button>
      </div>
    </div>

    <!-- 4. Products Panel Table Card -->
    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-2xs space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-700/70">
        <div>
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🌿</span>
            <span>Customer Formulations &amp; Products</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold">
              {{ productLines.length }} lines
            </span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Add inquired products, adjust quantities, verify prescriptions, and record customer purchase decisions
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Suggested Products Sheet Trigger -->
          <button
            type="button"
            @click="openSuggestions(productLines[0]?.productId)"
            :disabled="productLines.length === 0"
            class="px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>✨</span>
            <span>Suggested with this Product</span>
          </button>
        </div>
      </div>

      <!-- Add Product Typeahead Search Bar -->
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3">
        <div class="relative flex-1 w-full">
          <input
            v-model="productSearchQuery"
            type="text"
            placeholder="Search catalog by product name or SKU to add line..."
            class="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            @focus="showProductDropdown = true"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

          <!-- Dropdown Results -->
          <div
            v-if="showProductDropdown && filteredCatalog.length > 0"
            class="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 divide-y divide-slate-100 dark:divide-slate-700"
          >
            <div
              v-for="catProd in filteredCatalog"
              :key="catProd.id"
              class="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-between cursor-pointer text-xs"
              @click="addProductLine(catProd.id)"
            >
              <div>
                <span class="font-semibold text-slate-900 dark:text-white">{{ catProd.name }}</span>
                <span class="text-[10px] text-slate-400 font-mono ml-1.5">({{ catProd.sku }})</span>
                <span v-if="catProd.prescriptionRequired" class="ml-1 px-1 rounded text-[9px] bg-rose-100 text-rose-700">Rx</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    catProd.stockStatus === 'in_stock' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  ]"
                >
                  {{ catProd.stockStatus === 'in_stock' ? 'In Stock' : 'Out of Stock' }}
                </span>
                <span class="font-semibold text-slate-800 dark:text-slate-200">₹{{ Number(catProd.price).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Lines Table -->
      <div v-if="productLines.length === 0" class="py-10 text-center text-slate-400 text-xs">
        No product formulations added to this lead yet. Use the search bar above or check campaigns to add interested items.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-850/50">
              <th class="py-3 px-3">Product</th>
              <th class="py-3 px-3">Unit Price</th>
              <th class="py-3 px-3 text-center">Qty</th>
              <th class="py-3 px-3">Line Status</th>
              <th class="py-3 px-3 text-right">Line Total</th>
              <th class="py-3 px-3 text-center">Rx Compliance</th>
              <th class="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
            <tr v-for="line in productLines" :key="line.id" class="hover:bg-slate-50/60 transition-colors">
              <!-- Name & SKU -->
              <td class="py-3 px-3">
                <div class="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{{ line.product?.name }}</span>
                  <span
                    v-if="line.product?.stockStatus === 'out_of_stock'"
                    class="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-semibold"
                  >
                    OOS
                  </span>
                </div>
                <div class="text-[10px] font-mono text-slate-400">
                  SKU: {{ line.product?.sku }}
                </div>
              </td>

              <!-- Unit Price -->
              <td class="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                ₹{{ Number(line.unitPriceAtTime).toFixed(2) }}
              </td>

              <!-- Quantity Stepper -->
              <td class="py-3 px-3 text-center">
                <div class="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    :disabled="line.quantity <= 1"
                    @click="updateQuantity(line, line.quantity - 1)"
                    class="px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                  >
                    -
                  </button>
                  <span class="px-2.5 py-0.5 font-semibold text-xs text-slate-900 dark:text-white">
                    {{ line.quantity }}
                  </span>
                  <button
                    type="button"
                    @click="updateQuantity(line, line.quantity + 1)"
                    class="px-2 py-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </td>

              <!-- Line Status Dropdown -->
              <td class="py-3 px-3">
                <select
                  :value="line.status"
                  @change="updateLineStatus(line, ($event.target as HTMLSelectElement).value)"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all',
                    line.status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : line.status === 'offered'
                      ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                      : line.status === 'declined'
                      ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-400'
                      : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                  ]"
                >
                  <option value="interested">Interested</option>
                  <option value="offered">Offered</option>
                  <option value="accepted">Accepted (Purchasing)</option>
                  <option value="declined">Declined</option>
                </select>
              </td>

              <!-- Total -->
              <td class="py-3 px-3 text-right font-semibold text-slate-900 dark:text-white">
                ₹{{ (Number(line.unitPriceAtTime) * line.quantity).toFixed(2) }}
              </td>

              <!-- Prescription Verified Checkbox / Badge -->
              <td class="py-3 px-3 text-center">
                <div v-if="line.product?.prescriptionRequired" class="flex items-center justify-center gap-1.5">
                  <label class="inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="line.prescriptionVerified"
                      @change="toggleRxVerified(line, ($event.target as HTMLInputElement).checked)"
                      class="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span :class="line.prescriptionVerified ? 'text-emerald-600 font-semibold' : 'text-rose-600'">
                      {{ line.prescriptionVerified ? 'Verified' : 'Rx Pending' }}
                    </span>
                  </label>
                </div>
                <span v-else class="text-[10px] text-slate-400">OTC</span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-3 text-right">
                <button
                  type="button"
                  @click="removeLine(line)"
                  class="text-slate-400 hover:text-rose-600 p-1 rounded"
                  title="Remove line"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <!-- Order Summary Footer -->
          <tfoot>
            <tr class="border-t-2 border-slate-200 dark:border-slate-700 font-semibold text-xs bg-slate-50/70 dark:bg-slate-850/50">
              <td colspan="4" class="py-3 px-3 text-right text-slate-600 dark:text-slate-400">
                Accepted Order Subtotal:
              </td>
              <td class="py-3 px-3 text-right text-base text-teal-700 dark:text-teal-300 font-semibold">
                ₹{{ acceptedTotal.toFixed(2) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Action Buttons: Confirm Sale & Refer to Treatment Desk -->
      <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60 flex-wrap gap-3">
        <!-- Refer to Treatment Desk -->
        <button
          type="button"
          @click="showReferModal = true"
          class="px-4 py-2.5 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-semibold text-xs hover:bg-sky-100 transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <span>🏥</span>
          <span>Refer to Treatment Desk</span>
        </button>

        <!-- Confirm Sale -->
        <button
          type="button"
          @click="openConfirmSaleModal"
          :disabled="acceptedLines.length === 0"
          :class="[
            'px-5 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20',
            acceptedLines.length > 0
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
          ]"
        >
          <span>✓</span>
          <span>Confirm Product Sale (₹{{ acceptedTotal.toFixed(2) }})</span>
        </button>
      </div>
    </div>

    <!-- 5. Suggested with this Product Drawer / Bottom Sheet -->
    <div
      v-if="showSuggestionsDrawer"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
    >
      <div class="bg-white dark:bg-slate-800 w-full max-w-lg h-full shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right duration-200">
        <!-- Drawer Header -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>✨</span>
              <span>Suggested Product Recommendations</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              4-tier suggestion engine: curated cross-sells, substitutes, and category bundles
            </p>
          </div>
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            @click="showSuggestionsDrawer = false"
          >
            ✕
          </button>
        </div>

        <!-- Suggestions Content -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <div v-if="isLoadingSuggestions" class="py-12 text-center text-slate-400 text-xs">
            <span class="inline-block animate-spin text-xl mb-1 text-teal-600">⟳</span>
            <p>Analyzing formulations &amp; curated cross-sells...</p>
          </div>

          <div v-else-if="suggestionsList.length === 0" class="py-12 text-center text-slate-400 text-xs">
            No specific suggestions found for the selected formulation.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="sug in suggestionsList"
              :key="sug.id"
              class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-xs text-slate-900 dark:text-white">{{ sug.name }}</span>
                    <span class="px-2 py-0.2 rounded text-[10px] font-semibold uppercase bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {{ formatRelationTier(sug.tier) }}
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-slate-400 mt-0.5">
                    SKU: {{ sug.sku }} • ₹{{ Number(sug.price).toFixed(2) }}
                  </div>
                </div>

                <!-- Action Button -->
                <button
                  type="button"
                  @click="addSuggestedProduct(sug.id)"
                  class="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-2xs whitespace-nowrap"
                >
                  + Add to Lead
                </button>
              </div>

              <!-- Talking Points Script -->
              <div v-if="sug.talkingPoints" class="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                💬 Pitch: "{{ sug.talkingPoints }}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Confirm Sale Modal -->
    <div
      v-if="showConfirmSaleModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span class="text-emerald-600">✓</span>
            <span>Confirm Product Order &amp; Dispatch</span>
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1"
            @click="showConfirmSaleModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Accepted Summary -->
        <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <span class="font-semibold text-slate-700 dark:text-slate-300 block">Order Lines to Finalize:</span>
          <div class="space-y-1">
            <div
              v-for="line in acceptedLines"
              :key="line.id"
              class="flex items-center justify-between text-slate-600 dark:text-slate-300"
            >
              <span>{{ line.quantity }}x {{ line.product?.name }}</span>
              <span class="font-semibold">₹{{ (Number(line.unitPriceAtTime) * line.quantity).toFixed(2) }}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-semibold text-slate-900 dark:text-white">
            <span>Total Payable:</span>
            <span class="text-sm text-teal-600">₹{{ acceptedTotal.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Prescription Gate Check -->
        <div
          v-if="hasRxItems"
          class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2"
        >
          <div class="flex items-start gap-2.5">
            <input
              id="confirmRx"
              v-model="saleForm.prescriptionVerified"
              type="checkbox"
              class="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-amber-400"
            />
            <label for="confirmRx" class="text-xs font-semibold cursor-pointer select-none leading-snug">
              Doctor Prescription Verified Gate *
              <span class="block font-normal text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                One or more products require prescription. By checking this, you confirm that a registered doctor's prescription has been verified on file.
              </span>
            </label>
          </div>
        </div>

        <!-- Order Reference Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Billing / Dispatch Order Reference *
          </label>
          <input
            v-model="saleForm.orderReference"
            type="text"
            required
            placeholder="e.g., ORD-2026-8841 or POS-INV-492"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-mono font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <!-- Sale Amount Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Confirmed Sale Amount (₹) *
          </label>
          <input
            v-model.number="saleForm.saleAmount"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <p class="text-[10px] text-slate-400">
            Auto-schedules a refill reminder task for caller 5 days before the product supply expires.
          </p>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="showConfirmSaleModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!saleForm.orderReference || (hasRxItems && !saleForm.prescriptionVerified) || isSubmittingSale"
            @click="submitSaleConfirmation"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingSale" class="animate-spin text-xs">⟳</span>
            <span>Finalize Order &amp; Convert Lead</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 7. Refer to Treatment Desk Modal -->
    <div
      v-if="showReferModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🏥</span>
            <span>Refer Patient to Treatment Desk</span>
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1"
            @click="showReferModal = false"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-500 leading-relaxed">
          Customer described clinical medical symptoms requiring hospital doctor consultation. Creates a linked Treatment Lead while retaining this product interaction.
        </p>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Clinical Symptoms / Doctor Notes *</label>
          <textarea
            v-model="referralConcern"
            rows="3"
            required
            placeholder="Describe customer's symptoms, duration of illness, and recommended clinical department..."
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          ></textarea>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="showReferModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!referralConcern.trim() || isSubmittingReferral"
            @click="submitReferral"
            class="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingReferral" class="animate-spin text-xs">⟳</span>
            <span>Create Linked Treatment Lead</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  lead: any;
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const productLines = computed(() => props.lead?.productInterests || []);
const catalog = ref<any[]>([]);
const productSearchQuery = ref('');
const showProductDropdown = ref(false);

const filteredCatalog = computed(() => {
  if (!productSearchQuery.value.trim()) return catalog.value.slice(0, 10);
  const q = productSearchQuery.value.toLowerCase().trim();
  return catalog.value
    .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    .slice(0, 10);
});

// Price changed items
const priceChangedItems = computed(() => {
  return productLines.value.filter(
    (line: any) => line.product && Number(line.product.price) !== Number(line.unitPriceAtTime)
  );
});

// Out of stock items
const oosItems = computed(() => {
  return productLines.value.filter(
    (line: any) => line.product && line.product.stockStatus === 'out_of_stock'
  );
});

// Accepted lines
const acceptedLines = computed(() => {
  return productLines.value.filter((line: any) => line.status === 'accepted');
});

const acceptedTotal = computed(() => {
  return acceptedLines.value.reduce(
    (sum: number, line: any) => sum + Number(line.unitPriceAtTime) * line.quantity,
    0
  );
});

const hasRxItems = computed(() => {
  return acceptedLines.value.some((line: any) => line.product?.prescriptionRequired);
});

// Suggestions Drawer state
const showSuggestionsDrawer = ref(false);
const isLoadingSuggestions = ref(false);
const suggestionsList = ref<any[]>([]);

// Sale confirmation modal
const showConfirmSaleModal = ref(false);
const isSubmittingSale = ref(false);
const saleForm = ref({
  orderReference: '',
  saleAmount: 0,
  prescriptionVerified: false,
});

// Refer to treatment desk modal
const showReferModal = ref(false);
const isSubmittingReferral = ref(false);
const referralConcern = ref('');

const formatRelationTier = (tier: string) => {
  switch (tier) {
    case 'curated_cross_sell': return 'Cross-Sell';
    case 'curated_substitute': return 'Substitute';
    case 'frequently_together': return 'Bundle';
    default: return 'Suggested';
  }
};

const fetchCatalog = async () => {
  try {
    const res = await fetch(`${apiBase}/products?pageSize=100`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      catalog.value = data.products || [];
    }
  } catch (err) {
    console.error('Failed to load catalog', err);
  }
};

const addProductLine = async (productId: number) => {
  showProductDropdown.value = false;
  productSearchQuery.value = '';
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Add product line error', err);
  }
};

const updateQuantity = async (line: any, qty: number) => {
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products/${line.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ quantity: qty }),
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Quantity update error', err);
  }
};

const updateLineStatus = async (line: any, status: string) => {
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products/${line.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Line status error', err);
  }
};

const toggleRxVerified = async (line: any, isVerified: boolean) => {
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products/${line.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ prescriptionVerified: isVerified }),
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Rx verified error', err);
  }
};

const removeLine = async (line: any) => {
  if (!confirm(`Remove ${line.product?.name} from this lead?`)) return;
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products/${line.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Delete line error', err);
  }
};

const updateToCatalogPrice = async (line: any) => {
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/products/${line.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ unitPriceAtTime: Number(line.product.price) }),
    });
    if (res.ok) {
      emit('updated');
    }
  } catch (err) {
    console.error('Update price error', err);
  }
};

const waitlistProduct = async (productId: number) => {
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/waitlist-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ productId }),
    });
    if (res.ok) {
      alert('Lead added to out-of-stock waitlist! You will be alerted when stock arrives.');
      emit('updated');
    }
  } catch (err) {
    console.error('Waitlist error', err);
  }
};

const openSuggestions = async (productId?: number) => {
  if (!productId) return;
  showSuggestionsDrawer.value = true;
  isLoadingSuggestions.value = true;
  try {
    const res = await fetch(`${apiBase}/products/${productId}/suggestions?lead_id=${props.lead.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      suggestionsList.value = data.suggestions || [];
    }
  } catch (err) {
    console.error('Failed to load suggestions', err);
  } finally {
    isLoadingSuggestions.value = false;
  }
};

const addSuggestedProduct = async (productId: number) => {
  await addProductLine(productId);
  showSuggestionsDrawer.value = false;
};

const openConfirmSaleModal = () => {
  saleForm.value = {
    orderReference: '',
    saleAmount: acceptedTotal.value,
    prescriptionVerified: !hasRxItems.value,
  };
  showConfirmSaleModal.value = true;
};

const submitSaleConfirmation = async () => {
  isSubmittingSale.value = true;
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/confirm-sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(saleForm.value),
    });
    if (res.ok) {
      showConfirmSaleModal.value = false;
      emit('updated');
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Sale confirmation rejected');
    }
  } catch (err) {
    console.error('Sale confirmation error', err);
  } finally {
    isSubmittingSale.value = false;
  }
};

const submitReferral = async () => {
  isSubmittingReferral.value = true;
  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/refer-to-treatment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ concern: referralConcern.value.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      showReferModal.value = false;
      alert(`Successfully referred to treatment desk! Created linked Treatment Lead #${data.treatmentLead?.id}`);
      emit('updated');
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Referral rejected');
    }
  } catch (err) {
    console.error('Referral error', err);
  } finally {
    isSubmittingReferral.value = false;
  }
};

onMounted(() => {
  fetchCatalog();
});
</script>
