<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Customers</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ totalCustomers }} Customers
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Directory of purchasers, inquirers who haven't bought yet, and upcoming product refills
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2.5">
        <NuxtLink
          to="/orders"
          class="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <UIcon name="i-heroicons-shopping-bag" class="w-4 h-4 text-teal-600" />
          <span>Orders Desk</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Segment Metrics Cards Banner -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Total Customers -->
      <div
        @click="switchTab('all')"
        :class="[
          'p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          activeTab === 'all'
            ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Customers</div>
        <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{{ metrics.totalCustomers || 0 }}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Buyers & Inquirers</div>
      </div>

      <!-- Buyers (Purchased) -->
      <div
        @click="switchTab('buyers')"
        :class="[
          'p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          activeTab === 'buyers'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
          <span>🛍️ Buyers</span>
        </div>
        <div class="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{{ metrics.totalBuyers || 0 }}</div>
        <div class="text-[11px] text-emerald-600/80 mt-0.5">Purchased at least once</div>
      </div>

      <!-- Inquiries (Not Purchased) -->
      <div
        @click="switchTab('inquiries')"
        :class="[
          'p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          activeTab === 'inquiries'
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <span>💬 Inquiries Only</span>
        </div>
        <div class="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{{ metrics.totalInquiries || 0 }}</div>
        <div class="text-[11px] text-amber-600/80 mt-0.5">Contacted, no purchase yet</div>
      </div>

      <!-- Refill Due Soon -->
      <div
        @click="switchTab('refill_due')"
        :class="[
          'p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          activeTab === 'refill_due'
            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
          <span>🔄 Refill Due Soon</span>
        </div>
        <div class="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{{ metrics.refillsDueSoon || 0 }}</div>
        <div class="text-[11px] text-blue-600/80 mt-0.5">Due within 7 days</div>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="relative flex-1 w-full">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search customers by name, mobile number, or city..."
            class="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            @keyup.enter="applySearch"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <button
          @click="applySearch"
          class="min-h-[40px] px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
        >
          <UIcon name="i-heroicons-funnel" class="w-3.5 h-3.5" />
          <span>Search</span>
        </button>

        <button
          @click="resetSearch"
          title="Reset Search"
          class="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 text-xs"
        >
          ↺
        </button>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 flex flex-col items-center justify-center space-y-2">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
        <span class="text-xs text-slate-500">Loading customers...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="customers.length === 0" class="py-16 text-center space-y-2">
        <div class="text-4xl">👥</div>
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No customers found</h3>
        <p class="text-xs text-slate-400">
          No records match the current tab filter or search query.
        </p>
      </div>

      <!-- Customers List -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
              <th class="py-3 px-4">Customer Name & Segment</th>
              <th class="py-3 px-4">Contact & Location</th>
              <th class="py-3 px-4 text-center">Orders & Spend</th>
              <th class="py-3 px-4">Last Activity</th>
              <th class="py-3 px-4">Next Refill Due</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="c in customers" :key="c.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
              <!-- Name & Segment -->
              <td class="py-3.5 px-4 align-top">
                <NuxtLink
                  :to="`/customers/${c.id}`"
                  class="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 block text-xs"
                >
                  {{ c.name }}
                </NuxtLink>
                <div class="mt-1">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                      c.segment === 'buyer'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                    ]"
                  >
                    <span>{{ c.segment === 'buyer' ? '🛍️ Buyer' : '💬 Inquiry Only' }}</span>
                  </span>
                </div>
              </td>

              <!-- Contact & Location -->
              <td class="py-3.5 px-4 align-top">
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📞 {{ c.mobile }}</span>
                  <a
                    :href="`https://wa.me/${c.mobile.replace(/\D/g, '')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-emerald-600 hover:text-emerald-700 text-[11px]"
                    title="Open WhatsApp chat"
                  >
                    💬
                  </a>
                </div>
                <div v-if="c.city || c.state" class="text-[11px] text-slate-400 mt-0.5">
                  📍 {{ c.city }}{{ c.city && c.state ? ', ' : '' }}{{ c.state }}
                </div>
              </td>

              <!-- Orders & Spend -->
              <td class="py-3.5 px-4 align-top text-center">
                <div class="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {{ c.ordersCount }} {{ c.ordersCount === 1 ? 'order' : 'orders' }}
                </div>
                <div class="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                  ₹{{ formatCurrency(c.totalSpend) }}
                </div>
              </td>

              <!-- Last Activity -->
              <td class="py-3.5 px-4 align-top text-xs text-slate-600 dark:text-slate-400">
                <div v-if="c.lastOrderAt">
                  <span class="font-semibold text-slate-800 dark:text-slate-200">Ordered:</span> {{ formatDate(c.lastOrderAt) }}
                </div>
                <div v-else class="text-slate-400 italic">
                  Inquired: {{ formatDate(c.createdAt) }}
                </div>
              </td>

              <!-- Next Refill Due -->
              <td class="py-3.5 px-4 align-top">
                <div v-if="c.nextRefillDueAt" class="space-y-0.5">
                  <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {{ formatDateOnly(c.nextRefillDueAt) }}
                  </div>
                  <span
                    :class="[
                      'inline-block text-[10px] font-bold px-2 py-0.5 rounded',
                      isRefillDueNow(c.nextRefillDueAt)
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    ]"
                  >
                    {{ getRefillDueLabel(c.nextRefillDueAt) }}
                  </span>
                </div>
                <span v-else class="text-xs text-slate-400 italic">—</span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 align-top text-right">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink
                    :to="`/customers/${c.id}`"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    View Dossier
                  </NuxtLink>
                  <button
                    v-if="c.segment === 'buyer'"
                    @click="openReorderModal(c)"
                    class="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    1-Click Re-order
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
        <span class="text-slate-500">
          Page {{ currentPage }} of {{ totalPages }} ({{ totalCustomers }} customers)
        </span>
        <div class="flex items-center space-x-1.5">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-semibold"
          >
            Previous
          </button>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 font-semibold"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- 1-CLICK REORDER MODAL -->
    <div v-if="showReorderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🔄 1-Click Re-order for {{ selectedCustomer?.name }}</span>
          </h3>
          <button @click="showReorderModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="text-xs text-slate-600 dark:text-slate-300">
          Instantly generate a repeat replenishment order for this returning customer.
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Product</label>
            <select
              v-model="reorderForm.productId"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option v-for="p in catalogProducts" :key="p.id" :value="p.id">
                {{ p.name }} (₹{{ p.price }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
              <input
                v-model.number="reorderForm.quantity"
                type="number"
                min="1"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                v-model="reorderForm.paymentMethod"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="prepaid">Online Prepaid</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Shipping Address</label>
            <textarea
              v-model="reorderForm.shippingAddress"
              rows="2"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            ></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showReorderModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitReorder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Place Re-order</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const loading = ref(false);
const actionLoading = ref(false);
const customers = ref<any[]>([]);
const catalogProducts = ref<any[]>([]);
const totalCustomers = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);

const activeTab = ref('all');
const searchQuery = ref('');
const metrics = ref<Record<string, number>>({});

// Reorder modal
const showReorderModal = ref(false);
const selectedCustomer = ref<any>(null);
const reorderForm = ref({
  productId: null as number | null,
  quantity: 1,
  paymentMethod: 'cod',
  shippingAddress: '',
});

const getAuthHeaders = (): Record<string, string> => {
  const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const fetchCustomers = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (activeTab.value && activeTab.value !== 'all') {
      params.append('tab', activeTab.value);
    }
    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim());
    }
    params.append('page', String(currentPage.value));
    params.append('limit', '20');

    const res = await $fetch<any>(`${apiBase}/product-customers?${params.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    customers.value = res.customers || [];
    totalCustomers.value = res.pagination?.total || 0;
    totalPages.value = res.pagination?.pages || 1;
    metrics.value = res.metrics || {};
  } catch (err: any) {
    console.error('Failed to load customers:', err);
  } finally {
    loading.value = false;
  }
};

const fetchProducts = async () => {
  try {
    const res = await $fetch<any>(`${apiBase}/products?limit=100`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    catalogProducts.value = res.products || [];
  } catch (err) {
    console.error('Failed to load products:', err);
  }
};

const switchTab = (tab: string) => {
  activeTab.value = tab;
  currentPage.value = 1;
  fetchCustomers();
};

const applySearch = () => {
  currentPage.value = 1;
  fetchCustomers();
};

const resetSearch = () => {
  searchQuery.value = '';
  activeTab.value = 'all';
  currentPage.value = 1;
  fetchCustomers();
};

const changePage = (page: number) => {
  currentPage.value = page;
  fetchCustomers();
};

const openReorderModal = (c: any) => {
  selectedCustomer.value = c;
  reorderForm.value = {
    productId: catalogProducts.value[0]?.id || null,
    quantity: 1,
    paymentMethod: 'cod',
    shippingAddress: c.address || '',
  };
  showReorderModal.value = true;
};

const submitReorder = async () => {
  if (!selectedCustomer.value || !reorderForm.value.productId) return;
  actionLoading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/product-customers/${selectedCustomer.value.id}/reorder`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        items: [
          { productId: reorderForm.value.productId, quantity: reorderForm.value.quantity }
        ],
        paymentMethod: reorderForm.value.paymentMethod,
        shippingAddress: reorderForm.value.shippingAddress,
      },
    });
    alert(`Re-order ${res.order.orderNumber} created successfully!`);
    showReorderModal.value = false;
    await fetchCustomers();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to generate re-order');
  } finally {
    actionLoading.value = false;
  }
};

// Formatters & helpers
const formatCurrency = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateOnly = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isRefillDueNow = (val: any) => {
  if (!val) return false;
  const diffDays = Math.ceil((new Date(val).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return diffDays <= 3;
};

const getRefillDueLabel = (val: any) => {
  if (!val) return '';
  const diffDays = Math.ceil((new Date(val).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today!';
  return `Due in ${diffDays}d`;
};

onMounted(() => {
  fetchCustomers();
  fetchProducts();
});
</script>

