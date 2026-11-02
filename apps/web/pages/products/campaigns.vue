<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink
            to="/products"
            class="text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
          >
            ← Product Catalog
          </NuxtLink>
        </div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Product Marketing Campaigns</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ campaigns.length }} Campaigns
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track ad channels, lead generation efficiency, cost per lead (CPL), and campaign product attribution
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2.5">
        <button
          v-if="canManageCampaigns"
          type="button"
          @click="openCreateCampaignDrawer"
          class="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
        >
          <span class="text-base leading-none">+</span>
          <span>New Campaign</span>
        </button>
      </div>
    </div>

    <!-- Aggregate Performance KPI Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Ad Spend</div>
        <div class="text-2xl font-semibold text-slate-900 dark:text-white">
          ₹{{ totalSpent.toLocaleString() }}
        </div>
        <div class="text-[11px] text-slate-500">Across {{ campaigns.length }} campaigns</div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Product Leads</div>
        <div class="text-2xl font-semibold text-teal-600 dark:text-teal-400">
          {{ totalLeadsCount }}
        </div>
        <div class="text-[11px] text-slate-500">Inbound campaign inquiries</div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Average Cost Per Lead</div>
        <div class="text-2xl font-semibold text-slate-900 dark:text-white">
          ₹{{ overallCpl }}
        </div>
        <div class="text-[11px] text-emerald-600 font-semibold">CPL (Spend ÷ Leads)</div>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
        <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</div>
        <div class="text-2xl font-semibold text-emerald-600">
          {{ activeCampaignsCount }}
        </div>
        <div class="text-[11px] text-slate-500">Currently generating leads</div>
      </div>
    </div>

    <!-- Campaigns Table -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2 text-teal-600">⟳</span>
        <p class="text-xs font-semibold">Loading marketing campaigns...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="campaigns.length === 0" class="p-12 text-center text-slate-400 text-xs">
        No product marketing campaigns created yet. Click "+ New Campaign" to start tracking inbound ad leads.
      </div>

      <!-- Table View -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-850/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th class="py-3 px-4">Campaign Name &amp; Key</th>
              <th class="py-3 px-4">Channel</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Budget / Spent</th>
              <th class="py-3 px-4 text-center">Leads</th>
              <th class="py-3 px-4 text-center">Cost / Lead (CPL)</th>
              <th class="py-3 px-4">Featured Products</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
            <tr
              v-for="c in campaigns"
              :key="c.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
            >
              <!-- Name & Key -->
              <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-900 dark:text-slate-100">
                  {{ c.name }}
                </div>
                <div class="text-[11px] font-mono text-slate-400">
                  key: {{ c.campaignKey }}
                </div>
              </td>

              <!-- Channel -->
              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-normal uppercase text-slate-700 dark:text-slate-300">
                  {{ c.channel }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    c.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : c.status === 'paused'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  ]"
                >
                  {{ c.status }}
                </span>
              </td>

              <!-- Budget vs Spent -->
              <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-900 dark:text-white">
                  ₹{{ Number(c.spent || 0).toLocaleString() }}
                </div>
                <div class="text-[10px] text-slate-400">
                  Budget: ₹{{ Number(c.budget || 0).toLocaleString() }}
                </div>
              </td>

              <!-- Leads Count -->
              <td class="py-3.5 px-4 text-center font-semibold text-teal-600 dark:text-teal-400">
                {{ c._count?.leads || 0 }}
              </td>

              <!-- CPL -->
              <td class="py-3.5 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                ₹{{ calcCpl(c) }}
              </td>

              <!-- Linked Products -->
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1 max-w-xs">
                  <span
                    v-for="cp in (c.campaignProducts || []).slice(0, 3)"
                    :key="cp.id"
                    class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 font-mono"
                  >
                    {{ cp.product?.sku }}
                  </span>
                  <span
                    v-if="(c.campaignProducts || []).length > 3"
                    class="text-[10px] text-slate-400"
                  >
                    +{{ c.campaignProducts.length - 3 }} more
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditCampaignDrawer(c)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Edit Campaign"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Campaign Drawer -->
    <div
      v-if="showCampaignDrawer"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
    >
      <div class="bg-white dark:bg-slate-800 w-full max-w-lg h-full shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right duration-200">
        <!-- Header -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              {{ editingCampaignId ? 'Edit Campaign' : 'Create Marketing Campaign' }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Configure attribution parameters and featured product bundles
            </p>
          </div>
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            @click="showCampaignDrawer = false"
          >
            ✕
          </button>
        </div>

        <!-- Form Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Campaign Name *</label>
            <input
              v-model="campaignForm.name"
              type="text"
              placeholder="e.g., Monsoon Immunity Booster 2026"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              @input="onNameInput"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Campaign Key / Tag *</label>
              <input
                v-model="campaignForm.campaignKey"
                type="text"
                placeholder="monsoon-immunity-2026"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-mono font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Marketing Channel *</label>
              <select
                v-model="campaignForm.channel"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="meta_ads">Meta (Facebook &amp; Instagram)</option>
                <option value="google_ads">Google Search &amp; Display</option>
                <option value="youtube">YouTube Video</option>
                <option value="whatsapp_broadcast">WhatsApp Broadcast</option>
                <option value="print">Print / Newspaper</option>
                <option value="tv_radio">TV / Radio</option>
                <option value="other">Other / Referral</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Budget (₹)</label>
              <input
                v-model.number="campaignForm.budget"
                type="number"
                min="0"
                placeholder="50000"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Actual Spent (₹)</label>
              <input
                v-model.number="campaignForm.spent"
                type="number"
                min="0"
                placeholder="15000"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select
              v-model="campaignForm.status"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
            >
              <option value="active">Active (Currently Live)</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <!-- Featured Products Multi-Select -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Featured Campaign Formulations</label>
            <div class="max-h-48 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
              <label
                v-for="prod in allProducts"
                :key="prod.id"
                class="py-1.5 px-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-750 rounded cursor-pointer select-none"
              >
                <div>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">{{ prod.name }}</span>
                  <span class="text-[10px] font-mono text-slate-400 ml-1">({{ prod.sku }})</span>
                </div>
                <input
                  type="checkbox"
                  :value="prod.id"
                  v-model="campaignForm.productIds"
                  class="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
              </label>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Internal Notes</label>
            <textarea
              v-model="campaignForm.notes"
              rows="2"
              placeholder="Target demographic, ad copy angle, promotional bundle codes..."
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            @click="showCampaignDrawer = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!campaignForm.name || !campaignForm.campaignKey || isSubmittingCampaign"
            @click="saveCampaign"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingCampaign" class="animate-spin text-xs">⟳</span>
            <span>{{ editingCampaignId ? 'Save Changes' : 'Launch Campaign' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const canManageCampaigns = computed(() => authStore.hasPermission('product_campaign.manage'));

const campaigns = ref<any[]>([]);
const allProducts = ref<any[]>([]);
const isLoading = ref(true);

// KPIs
const totalSpent = computed(() => {
  return campaigns.value.reduce((sum, c) => sum + Number(c.spent || 0), 0);
});

const totalLeadsCount = computed(() => {
  return campaigns.value.reduce((sum, c) => sum + (c._count?.leads || 0), 0);
});

const overallCpl = computed(() => {
  if (totalLeadsCount.value === 0) return '0.0';
  return (totalSpent.value / totalLeadsCount.value).toFixed(1);
});

const activeCampaignsCount = computed(() => {
  return campaigns.value.filter((c) => c.status === 'active').length;
});

const calcCpl = (c: any) => {
  const leads = c._count?.leads || 0;
  if (leads === 0) return '0.0';
  return (Number(c.spent || 0) / leads).toFixed(1);
};

// Drawer state
const showCampaignDrawer = ref(false);
const editingCampaignId = ref<number | null>(null);
const isSubmittingCampaign = ref(false);

const campaignForm = ref({
  name: '',
  campaignKey: '',
  channel: 'meta_ads',
  budget: 0,
  spent: 0,
  status: 'active',
  productIds: [] as number[],
  notes: '',
});

const onNameInput = () => {
  if (!editingCampaignId.value) {
    campaignForm.value.campaignKey = campaignForm.value.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

const fetchCampaigns = async () => {
  isLoading.value = true;
  try {
    const res = await fetch(`${apiBase}/product-campaigns`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      campaigns.value = data.campaigns || [];
    }
  } catch (err) {
    console.error('Failed to load campaigns', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchProducts = async () => {
  try {
    const res = await fetch(`${apiBase}/products?pageSize=100`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      allProducts.value = data.products || [];
    }
  } catch (err) {
    console.error('Failed to load products', err);
  }
};

const openCreateCampaignDrawer = () => {
  editingCampaignId.value = null;
  campaignForm.value = {
    name: '',
    campaignKey: '',
    channel: 'meta_ads',
    budget: 50000,
    spent: 0,
    status: 'active',
    productIds: [],
    notes: '',
  };
  showCampaignDrawer.value = true;
};

const openEditCampaignDrawer = (camp: any) => {
  editingCampaignId.value = camp.id;
  campaignForm.value = {
    name: camp.name,
    campaignKey: camp.campaignKey,
    channel: camp.channel,
    budget: Number(camp.budget || 0),
    spent: Number(camp.spent || 0),
    status: camp.status,
    productIds: (camp.campaignProducts || []).map((cp: any) => cp.productId),
    notes: camp.notes || '',
  };
  showCampaignDrawer.value = true;
};

const saveCampaign = async () => {
  isSubmittingCampaign.value = true;
  try {
    const url = editingCampaignId.value
      ? `${apiBase}/product-campaigns/${editingCampaignId.value}`
      : `${apiBase}/product-campaigns`;
    const method = editingCampaignId.value ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(campaignForm.value),
    });

    if (res.ok) {
      showCampaignDrawer.value = false;
      fetchCampaigns();
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to save campaign');
    }
  } catch (err) {
    console.error('Save campaign error', err);
  } finally {
    isSubmittingCampaign.value = false;
  }
};

onMounted(() => {
  fetchCampaigns();
  fetchProducts();
});
</script>
