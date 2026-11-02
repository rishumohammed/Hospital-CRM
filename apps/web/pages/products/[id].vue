<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Breadcrumb & Back button -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/products"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 shadow-2xs"
      >
        <span class="text-sm font-semibold">←</span>
        <span>Back to Product Catalog</span>
      </NuxtLink>

      <div v-if="product" class="flex items-center gap-2">
        <span
          :class="[
            'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            product.status === 'approved'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : product.status === 'draft'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
          ]"
        >
          ● {{ product.status }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <span class="inline-block animate-spin text-3xl mb-3 text-teal-600">⟳</span>
      <p class="text-sm font-semibold">Loading product formulation details...</p>
    </div>

    <!-- Main Content when Product is Loaded -->
    <div v-else-if="product" class="space-y-6">
      <!-- 1. Hero Product Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/20 dark:from-teal-900/40 dark:to-emerald-900/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold text-2xl flex items-center justify-center shrink-0 shadow-inner">
              🌿
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h1 class="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  {{ product.name }}
                </h1>
                <span
                  v-if="product.prescriptionRequired"
                  class="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                >
                  💊 Prescription Required
                </span>
                <span
                  v-else
                  class="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                >
                  🌿 Over-the-Counter (OTC)
                </span>
              </div>

              <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">SKU: {{ product.sku }}</span>
                <span>•</span>
                <span>📁 {{ product.category?.name || 'Uncategorized' }}</span>
                <span v-if="product.packSize">•</span>
                <span v-if="product.packSize">📦 {{ product.packSize }}</span>
                <span v-if="product.refillDays">•</span>
                <span v-if="product.refillDays">🔄 Refill: {{ product.refillDays }} days</span>
              </div>
            </div>
          </div>

          <!-- Stock Status Switcher & Price Display -->
          <div class="flex items-center gap-4 flex-wrap">
            <div class="text-right">
              <div class="text-[11px] text-slate-400 font-normal">Listed Retail Price</div>
              <div class="text-3xl font-semibold text-slate-900 dark:text-white">
                ₹{{ Number(product.price).toFixed(2) }}
              </div>
            </div>

            <!-- Stock Toggle Button -->
            <button
              type="button"
              :disabled="isTogglingStock || !canUpdateStock"
              @click="toggleStock"
              :class="[
                'px-4 py-2.5 rounded-xl font-semibold text-xs transition-all border shadow-2xs flex items-center gap-2',
                product.stockStatus === 'in_stock'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
              ]"
            >
              <span
                :class="[
                  'w-2.5 h-2.5 rounded-full',
                  product.stockStatus === 'in_stock' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                ]"
              ></span>
              <span>{{ product.stockStatus === 'in_stock' ? 'In Stock' : 'Out of Stock' }}</span>
              <span v-if="isTogglingStock" class="animate-spin text-xs">⟳</span>
            </button>
          </div>
        </div>

        <!-- Description & Clinical Guidelines -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          <div class="space-y-1">
            <span class="font-semibold text-slate-700 dark:text-slate-300">Usage &amp; Indications:</span>
            <p class="text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              {{ product.usageDescription }}
            </p>
          </div>
          <div class="space-y-2">
            <div v-if="product.howToUse">
              <span class="font-semibold text-slate-700 dark:text-slate-300">Dosage &amp; Timing:</span>
              <p class="text-slate-600 dark:text-slate-400 font-normal">
                {{ product.howToUse }}
              </p>
            </div>
            <div v-if="product.contraindications">
              <span class="font-semibold text-rose-700 dark:text-rose-400">Contraindications:</span>
              <p class="text-slate-600 dark:text-slate-400 font-normal">
                {{ product.contraindications }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Curated Relations & Cross-Sell Suggestions Editor -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-teal-600" />
              <span>Curated Product Relations &amp; Cross-Sell</span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              These relations feed the 4-tier recommendation engine during telecaller product calls.
            </p>
          </div>

          <button
            v-if="canManageRelations"
            type="button"
            @click="openAddRelationModal"
            class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add Related Product</span>
          </button>
        </div>

        <!-- Relations List Grouped -->
        <div v-if="relations.length === 0" class="py-8 text-center text-slate-400 text-xs">
          No curated relations configured yet for this product. Click "Add Related Product" to connect cross-sells, upsells, or substitutes.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="rel in relations"
            :key="rel.id"
            class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 flex items-start justify-between gap-3"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider',
                    rel.relationType === 'cross_sell'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : rel.relationType === 'upsell'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : rel.relationType === 'substitute'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  ]"
                >
                  {{ formatRelationType(rel.relationType) }}
                </span>
                <span class="font-semibold text-xs text-slate-900 dark:text-white">
                  {{ rel.toProduct?.name }}
                </span>
              </div>

              <div class="text-[11px] text-slate-500 font-mono">
                SKU: {{ rel.toProduct?.sku }} • ₹{{ Number(rel.toProduct?.price).toFixed(2) }}
              </div>

              <p v-if="rel.talkingPoints" class="text-xs text-slate-600 dark:text-slate-400 italic mt-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                💬 Pitch: "{{ rel.talkingPoints }}"
              </p>
            </div>

            <button
              v-if="canManageRelations"
              type="button"
              @click="deleteRelation(rel.id)"
              class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
              title="Remove Relation"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 3. Price History & Stock History Tabs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Price History -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon name="i-heroicons-currency-rupee" class="w-4 h-4 text-teal-600" />
            <span>Price Audit History</span>
          </h3>

          <div v-if="priceHistory.length === 0" class="text-xs text-slate-400 py-4 text-center">
            No price revisions recorded since product creation.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                  <th class="py-2">Old Price</th>
                  <th class="py-2">New Price</th>
                  <th class="py-2">Reason</th>
                  <th class="py-2">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
                <tr v-for="ph in priceHistory" :key="ph.id">
                  <td class="py-2 text-slate-500">₹{{ Number(ph.oldPrice).toFixed(2) }}</td>
                  <td class="py-2 font-semibold text-slate-900 dark:text-white">₹{{ Number(ph.newPrice).toFixed(2) }}</td>
                  <td class="py-2 text-slate-600 dark:text-slate-400">{{ ph.reason || 'Routine revision' }}</td>
                  <td class="py-2 text-[11px] text-slate-400">{{ formatDate(ph.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Stock History -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon name="i-heroicons-archive-box" class="w-4 h-4 text-teal-600" />
            <span>Stock Status History</span>
          </h3>

          <div v-if="stockHistory.length === 0" class="text-xs text-slate-400 py-4 text-center">
            No stock status changes logged yet.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                  <th class="py-2">Status</th>
                  <th class="py-2">Note</th>
                  <th class="py-2">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
                <tr v-for="sh in stockHistory" :key="sh.id">
                  <td class="py-2">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        sh.status === 'in_stock'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      ]"
                    >
                      {{ sh.status === 'in_stock' ? 'In Stock' : 'Out of Stock' }}
                    </span>
                  </td>
                  <td class="py-2 text-slate-600 dark:text-slate-400">{{ sh.note || '-' }}</td>
                  <td class="py-2 text-[11px] text-slate-400">{{ formatDate(sh.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Relation Modal -->
    <div
      v-if="showRelationModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Add Related Product
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1"
            @click="showRelationModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Target Product Select -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Target Product *</label>
          <select
            v-model="relationForm.toProductId"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option :value="null" disabled>Select target formulation</option>
            <option v-for="p in availableTargetProducts" :key="p.id" :value="p.id">
              {{ p.name }} (SKU: {{ p.sku }}) - ₹{{ Number(p.price).toFixed(2) }}
            </option>
          </select>
        </div>

        <!-- Relation Type -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Relation Type *</label>
          <select
            v-model="relationForm.relationType"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="cross_sell">Cross-Sell (Complementary remedy)</option>
            <option value="upsell">Upsell (Premium or higher-concentration formulation)</option>
            <option value="frequently_together">Frequently Together (Standard bundle)</option>
            <option value="substitute">Substitute (Alternative when out of stock)</option>
          </select>
        </div>

        <!-- Talking Points / Pitch Script -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Caller Pitch / Talking Points</label>
          <textarea
            v-model="relationForm.talkingPoints"
            rows="2"
            placeholder="e.g., 'Pairs with this oil to reduce joint stiffness 40% faster'"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
          ></textarea>
        </div>

        <!-- Mirror Checkbox -->
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div class="space-y-0.5">
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Bidirectional Mirroring</span>
            <span class="text-[11px] text-slate-500 block">Automatically create reverse relation on the target product</span>
          </div>
          <input
            v-model="relationForm.mirror"
            type="checkbox"
            class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="showRelationModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!relationForm.toProductId || isSubmittingRelation"
            @click="submitRelation"
            class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingRelation" class="animate-spin text-xs">⟳</span>
            <span>Add Relation</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const productId = computed(() => Number(route.params.id));

const canUpdateStock = computed(() => authStore.hasPermission('product.stock_update'));
const canManageRelations = computed(() => authStore.hasPermission('product_relation.manage'));

const product = ref<any>(null);
const relations = ref<any[]>([]);
const priceHistory = ref<any[]>([]);
const stockHistory = ref<any[]>([]);
const allProducts = ref<any[]>([]);
const isLoading = ref(true);
const isTogglingStock = ref(false);

// Modal state
const showRelationModal = ref(false);
const isSubmittingRelation = ref(false);
const relationForm = ref({
  toProductId: null as number | null,
  relationType: 'cross_sell',
  talkingPoints: '',
  mirror: true,
});

const availableTargetProducts = computed(() => {
  return allProducts.value.filter((p) => p.id !== productId.value);
});

const formatRelationType = (type: string) => {
  switch (type) {
    case 'cross_sell': return 'Cross-Sell';
    case 'upsell': return 'Upsell';
    case 'substitute': return 'Substitute';
    case 'frequently_together': return 'Frequently Together';
    default: return type;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const fetchProduct = async () => {
  isLoading.value = true;
  try {
    const res = await fetch(`${apiBase}/products/${productId.value}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      product.value = await res.json();
      relations.value = product.value.relationsFrom || [];
      priceHistory.value = product.value.priceHistory || [];
      stockHistory.value = product.value.stockHistory || [];
    }
  } catch (err) {
    console.error('Failed to load product details', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchAllProducts = async () => {
  try {
    const res = await fetch(`${apiBase}/products?pageSize=100`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      allProducts.value = data.products || [];
    }
  } catch (err) {
    console.error('Failed to load products list', err);
  }
};

const toggleStock = async () => {
  if (!product.value) return;
  isTogglingStock.value = true;
  const newStatus = product.value.stockStatus === 'in_stock' ? 'out_of_stock' : 'in_stock';
  try {
    const res = await fetch(`${apiBase}/products/${product.value.id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        stockStatus: newStatus,
        note: `Manual stock toggle on detail page`,
      }),
    });
    if (res.ok) {
      product.value.stockStatus = newStatus;
      // Refresh stock history
      fetchProduct();
    }
  } catch (err) {
    console.error('Failed stock toggle', err);
  } finally {
    isTogglingStock.value = false;
  }
};

const openAddRelationModal = () => {
  relationForm.value = {
    toProductId: null,
    relationType: 'cross_sell',
    talkingPoints: '',
    mirror: true,
  };
  showRelationModal.value = true;
};

const submitRelation = async () => {
  if (!relationForm.value.toProductId) return;
  isSubmittingRelation.value = true;
  try {
    const res = await fetch(`${apiBase}/products/${productId.value}/relations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(relationForm.value),
    });
    if (res.ok) {
      showRelationModal.value = false;
      fetchProduct();
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to add relation');
    }
  } catch (err) {
    console.error('Relation error', err);
  } finally {
    isSubmittingRelation.value = false;
  }
};

const deleteRelation = async (relationId: number) => {
  if (!confirm('Are you sure you want to remove this relation?')) return;
  try {
    const res = await fetch(`${apiBase}/products/relations/${relationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      fetchProduct();
    }
  } catch (err) {
    console.error('Delete relation error', err);
  }
};

onMounted(() => {
  fetchProduct();
  fetchAllProducts();
});
</script>
