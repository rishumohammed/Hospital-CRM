<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink
            to="/reports"
            class="text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
          >
            ← General Reports
          </NuxtLink>
        </div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Product Sales &amp; Catalog Analytics</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Campaign ROI, curated cross-sell performance, unmet out-of-stock demand, and inventory health
        </p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-x-auto">
        <button
          v-for="tab in reportTabs"
          :key="tab.id"
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <span class="inline-block animate-spin text-3xl mb-3 text-teal-600">⟳</span>
      <p class="text-sm font-semibold">Compiling product analytics...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- TAB 1: Campaign Performance & Leads -->
      <div v-if="activeTab === 'leads'" class="space-y-6">
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Product Inquiries</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ leadsData?.kpis?.totalLeads || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Across product campaigns</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Confirmed Product Sales</div>
            <div class="text-3xl font-semibold text-teal-600 dark:text-teal-400">
              {{ leadsData?.kpis?.convertedLeads || 0 }}
            </div>
            <div class="text-[11px] text-emerald-600 font-semibold">
              Conversion: {{ leadsData?.kpis?.conversionRate || '0.0%' }}
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Confirmed Revenue</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              ₹{{ (leadsData?.kpis?.totalRevenue || 0).toLocaleString() }}
            </div>
            <div class="text-[11px] text-slate-500">From accepted orders</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ (leadsData?.campaigns || []).length }}
            </div>
            <div class="text-[11px] text-slate-500">Ad channels live</div>
          </div>
        </div>

        <!-- Campaign ROI Table -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden p-5 space-y-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Campaign Lead Volume &amp; Cost Per Lead (CPL)
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                  <th class="py-2.5 px-3">Campaign</th>
                  <th class="py-2.5 px-3">Channel</th>
                  <th class="py-2.5 px-3 text-center">Leads Generated</th>
                  <th class="py-2.5 px-3">Total Spend</th>
                  <th class="py-2.5 px-3 text-right">Cost Per Lead (CPL)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                <tr v-for="c in leadsData?.campaigns || []" :key="c.id" class="hover:bg-slate-50/50">
                  <td class="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{{ c.name }}</td>
                  <td class="py-2.5 px-3 uppercase text-[10px] text-slate-500">{{ c.channel }}</td>
                  <td class="py-2.5 px-3 text-center font-semibold text-teal-600">{{ c.leadsCount }}</td>
                  <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300">₹{{ c.spent.toLocaleString() }}</td>
                  <td class="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-white">₹{{ c.costPerLead }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: Curated Relations & Cross-Sell Conversion -->
      <div v-if="activeTab === 'cross_sell'" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Product Lines Added</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ crossSellData?.kpis?.totalInterests || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Across caller interactions</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Accepted Lines</div>
            <div class="text-3xl font-semibold text-emerald-600">
              {{ crossSellData?.kpis?.acceptedInterests || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Purchased formulations</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cross-Sell Conversion Rate</div>
            <div class="text-3xl font-semibold text-teal-600">
              {{ crossSellData?.kpis?.crossSellConversionRate || '0.0%' }}
            </div>
            <div class="text-[11px] text-emerald-600 font-semibold">Accepted ÷ Total Lines</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Curated Relations</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ crossSellData?.kpis?.activeRelationsCount || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Configured pairs</div>
          </div>
        </div>

        <!-- Relation Types Breakdown -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs p-5 space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Relations Network Distribution
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              v-for="rt in crossSellData?.relationTypes || []"
              :key="rt.relationType"
              class="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-1"
            >
              <div class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                {{ rt.relationType.replace('_', ' ') }}
              </div>
              <div class="text-2xl font-semibold text-teal-600">
                {{ rt.count }} pairs
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: Out-of-Stock Demand & Waitlist -->
      <div v-if="activeTab === 'demand'" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Waitlist Entries</div>
            <div class="text-3xl font-semibold text-amber-600">
              {{ demandData?.kpis?.totalWaitlisted || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">OOS patient requests</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Restock Alerts Sent</div>
            <div class="text-3xl font-semibold text-emerald-600">
              {{ demandData?.kpis?.notifiedWaitlisted || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Notified upon inventory arrival</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unmet Revenue Potential</div>
            <div class="text-3xl font-semibold text-rose-600">
              ₹{{ (demandData?.kpis?.estimatedLostRevenue || 0).toLocaleString() }}
            </div>
            <div class="text-[11px] text-slate-500">Demand blocked by stockout</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Out of Stock SKUs</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ demandData?.kpis?.outOfStockProductsCount || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Require supplier reorder</div>
          </div>
        </div>

        <!-- Top OOS Products Table -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs p-5 space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Formulations with Highest Blocked Demand
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                  <th class="py-2.5 px-3">Product Name &amp; SKU</th>
                  <th class="py-2.5 px-3">Price</th>
                  <th class="py-2.5 px-3 text-center">Waitlisted Patients</th>
                  <th class="py-2.5 px-3 text-right">Lost Revenue Value</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                <tr v-for="p in demandData?.topOosProducts || []" :key="p.id" class="hover:bg-slate-50/50">
                  <td class="py-2.5 px-3">
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ p.name }}</span>
                    <span class="text-[10px] font-mono text-slate-400 ml-1.5">({{ p.sku }})</span>
                  </td>
                  <td class="py-2.5 px-3 text-slate-600 dark:text-slate-300">₹{{ p.price.toFixed(2) }}</td>
                  <td class="py-2.5 px-3 text-center font-semibold text-amber-600">{{ p.waitlistCount }}</td>
                  <td class="py-2.5 px-3 text-right font-semibold text-rose-600">₹{{ p.lostRevenuePotential.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 4: Catalog Health & Stock Hygiene -->
      <div v-if="activeTab === 'health'" class="space-y-6">
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Approved Catalog</div>
            <div class="text-3xl font-semibold text-emerald-600">
              {{ healthData?.kpis?.activeApproved || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Live for telecaller sale</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Drafts Pending Review</div>
            <div class="text-3xl font-semibold text-amber-600">
              {{ healthData?.kpis?.draftPendingApproval || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Awaiting PM compliance signoff</div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stockout Rate</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ healthData?.kpis?.outOfStockRate || '0.0%' }}
            </div>
            <div class="text-[11px] text-slate-500">
              {{ healthData?.kpis?.outOfStock || 0 }} of {{ healthData?.kpis?.activeApproved || 0 }} OOS
            </div>
          </div>

          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Categories</div>
            <div class="text-3xl font-semibold text-slate-900 dark:text-white">
              {{ healthData?.kpis?.categoriesCount || 0 }}
            </div>
            <div class="text-[11px] text-slate-500">Ayurvedic classifications</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const reportTabs = [
  { id: 'leads', label: 'Campaign ROI & Leads' },
  { id: 'cross_sell', label: 'Cross-Sell Conversion' },
  { id: 'demand', label: 'Out-of-Stock Demand' },
  { id: 'health', label: 'Catalog Health' },
];

const activeTab = ref('leads');
const isLoading = ref(true);

const leadsData = ref<any>(null);
const crossSellData = ref<any>(null);
const demandData = ref<any>(null);
const healthData = ref<any>(null);

const fetchReports = async () => {
  isLoading.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const [leadsRes, crossSellRes, demandRes, healthRes] = await Promise.all([
      fetch(`${apiBase}/reports/product-leads`, { headers }),
      fetch(`${apiBase}/reports/cross-sell`, { headers }),
      fetch(`${apiBase}/reports/product-demand`, { headers }),
      fetch(`${apiBase}/reports/catalog-health`, { headers }),
    ]);

    if (leadsRes.ok) leadsData.value = await leadsRes.json();
    if (crossSellRes.ok) crossSellData.value = await crossSellRes.json();
    if (demandRes.ok) demandData.value = await demandRes.json();
    if (healthRes.ok) healthData.value = await healthRes.json();
  } catch (err) {
    console.error('Failed to load reports', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchReports();
});
</script>
