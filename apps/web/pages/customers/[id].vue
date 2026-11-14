<template>
  <div class="space-y-6 max-w-6xl mx-auto pb-12">
    <!-- Breadcrumb & Back Button -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2 text-xs text-slate-500">
        <NuxtLink to="/customers" class="hover:text-teal-600 font-semibold flex items-center gap-1">
          <span>← Back to Customers</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-700 dark:text-slate-300 font-semibold">{{ customer?.name || 'Customer' }}</span>
      </div>

      <div v-if="customer" class="flex items-center gap-2">
        <button
          @click="openReorderModal"
          class="min-h-[38px] px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <span>🔄 Place Re-order</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 flex flex-col items-center justify-center space-y-2">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
      <span class="text-xs text-slate-500">Loading customer dossier...</span>
    </div>

    <div v-else-if="!customer" class="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
      <p class="text-sm text-slate-500">Customer not found.</p>
    </div>

    <!-- Customer Dossier Content -->
    <div v-else class="space-y-6">
      <!-- Profile Header Card -->
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex items-center space-x-3">
              <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {{ customer.name }}
              </h1>
              <span
                :class="[
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold uppercase border',
                  customer.segment === 'buyer'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                ]"
              >
                <span>{{ customer.segment === 'buyer' ? '🛍️ Buyer' : '💬 Inquiry Only' }}</span>
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <div class="flex items-center gap-1">
                <span>📞 {{ customer.mobile }}</span>
                <a
                  :href="`https://wa.me/${customer.mobile.replace(/\D/g, '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-emerald-600 hover:text-emerald-700 ml-1 font-bold"
                  title="WhatsApp"
                >
                  💬 Chat
                </a>
              </div>
              <div v-if="customer.email">
                ✉️ {{ customer.email }}
              </div>
              <div v-if="customer.city || customer.state">
                📍 {{ customer.address ? `${customer.address}, ` : '' }}{{ customer.city }}{{ customer.city && customer.state ? ', ' : '' }}{{ customer.state }}
              </div>
            </div>
          </div>

          <!-- Customer Lifetime Value Metrics -->
          <div class="flex items-center gap-4 text-right">
            <div>
              <div class="text-[11px] text-slate-400 uppercase tracking-wider">Total Orders</div>
              <div class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {{ customer.ordersCount }}
              </div>
            </div>
            <div class="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <div class="text-[11px] text-slate-400 uppercase tracking-wider">Total Spend</div>
              <div class="text-2xl font-bold text-teal-600 mt-0.5">
                ₹{{ formatCurrency(customer.totalSpend) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Consumption & Refill Countdown Section -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🔄 Active Products In Consumption</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                {{ activeProducts.length }} active
              </span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Automated finish countdown based on delivery dates and product consumption durations
            </p>
          </div>
        </div>

        <div v-if="activeProducts.length === 0" class="p-6 text-center text-xs text-slate-400">
          No active products currently in consumption cycle.
        </div>

        <div v-else class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(prod, idx) in activeProducts"
            :key="idx"
            class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-bold text-sm text-slate-900 dark:text-slate-100">{{ prod.productName }}</div>
                <div class="text-xs text-slate-500">Pack size: {{ prod.packSize || 'Standard' }} • Refill cycle: {{ prod.refillDays }} days</div>
              </div>
              <span
                :class="[
                  'px-2.5 py-1 rounded-full text-xs font-bold border',
                  prod.daysRemaining <= 5
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                ]"
              >
                {{ prod.daysRemaining <= 0 ? 'Due for Refill!' : `${prod.daysRemaining} days left` }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              <div>
                <span class="text-slate-400">Delivered on:</span>
                <div class="font-semibold text-slate-800 dark:text-slate-200">{{ formatDateOnly(prod.deliveredAt) }}</div>
              </div>
              <div>
                <span class="text-slate-400">Runs out on:</span>
                <div class="font-semibold text-slate-800 dark:text-slate-200">{{ formatDateOnly(prod.estimatedFinishDate) }}</div>
              </div>
            </div>

            <div class="pt-1">
              <button
                @click="openReorderModal"
                class="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs"
              >
                <span>Call & Place Refill Order</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order History Section -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Order History ({{ customer.orders?.length || 0 }})
          </h2>
        </div>

        <div v-if="!customer.orders || customer.orders.length === 0" class="p-8 text-center text-xs text-slate-400">
          This customer has not placed any orders yet (Inquiry status).
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
                <th class="py-3 px-4">Order # & Date</th>
                <th class="py-3 px-4">Items</th>
                <th class="py-3 px-4">Total Amount</th>
                <th class="py-3 px-4">Fulfillment Status</th>
                <th class="py-3 px-4">Courier & Tracking</th>
                <th class="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              <tr v-for="order in customer.orders" :key="order.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                <td class="py-3.5 px-4 font-mono">
                  <NuxtLink :to="`/orders/${order.id}`" class="text-teal-600 font-bold hover:underline block">
                    {{ order.orderNumber }}
                  </NuxtLink>
                  <div class="text-[11px] text-slate-400 mt-0.5">{{ formatDate(order.createdAt) }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <div v-for="item in order.items" :key="item.id" class="text-slate-700 dark:text-slate-300">
                    • {{ item.product.name }} (x{{ item.quantity }})
                  </div>
                </td>
                <td class="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                  ₹{{ formatCurrency(order.totalAmount) }}
                  <div class="text-[10px] uppercase text-slate-400 font-normal">{{ order.paymentMethod }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
                      getStatusBadgeClass(order.status)
                    ]"
                  >
                    <span>{{ formatStatusLabel(order.status) }}</span>
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <div v-if="order.trackingNumber">
                    <span class="text-slate-500">{{ order.courierName }}: </span>
                    <a
                      v-if="order.trackingUrl"
                      :href="order.trackingUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-teal-600 font-mono font-semibold hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{{ order.trackingNumber }}</span>
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                    </a>
                    <span v-else class="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                      {{ order.trackingNumber }}
                    </span>
                  </div>
                  <span v-else class="text-slate-400 italic">—</span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <NuxtLink :to="`/orders/${order.id}`" class="text-xs font-semibold text-teal-600 hover:underline">
                    View Order →
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Lead Inquiries & Call Notes Section -->
      <div
        v-if="customer.leads && customer.leads.length > 0"
        class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden"
      >
        <div class="p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Inquiry & Telecaller Interactions
          </h2>
        </div>

        <div class="p-4 space-y-4">
          <div
            v-for="lead in customer.leads"
            :key="lead.id"
            class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3"
          >
            <div class="flex items-center justify-between text-xs">
              <div class="font-semibold text-slate-800 dark:text-slate-200">
                Lead #{{ lead.id }} • Status: <span class="capitalize text-teal-600 font-bold">{{ lead.status }}</span>
              </div>
              <div class="text-slate-400">Created: {{ formatDate(lead.createdAt) }}</div>
            </div>

            <!-- Products of interest -->
            <div v-if="lead.productInterests && lead.productInterests.length > 0" class="text-xs text-slate-600">
              <span class="font-semibold text-slate-700 dark:text-slate-300">Inquired Products: </span>
              <span v-for="pi in lead.productInterests" :key="pi.id" class="mr-2 inline-block bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200">
                {{ pi.product.name }}
              </span>
            </div>

            <!-- Call Interactions Timeline -->
            <div v-if="lead.interactions && lead.interactions.length > 0" class="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
              <div class="text-[11px] font-semibold text-slate-400 uppercase">Recent Call Logs:</div>
              <div
                v-for="interaction in lead.interactions"
                :key="interaction.id"
                class="text-xs p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1"
              >
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Logged by {{ interaction.user?.name || 'Telecaller' }}</span>
                  <span>{{ formatDate(interaction.occurredAt) }}</span>
                </div>
                <div class="text-slate-700 dark:text-slate-300 font-medium">{{ interaction.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- REORDER MODAL -->
    <div v-if="showReorderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          🔄 Place Re-order for {{ customer?.name }}
        </h3>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold mb-1">Product</label>
            <select v-model="reorderForm.productId" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs">
              <option v-for="p in catalogProducts" :key="p.id" :value="p.id">
                {{ p.name }} (₹{{ p.price }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold mb-1">Quantity</label>
              <input v-model.number="reorderForm.quantity" type="number" min="1" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs" />
            </div>
            <div>
              <label class="block font-semibold mb-1">Payment Method</label>
              <select v-model="reorderForm.paymentMethod" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs">
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="prepaid">Online Prepaid</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold mb-1">Delivery Address</label>
            <textarea v-model="reorderForm.shippingAddress" rows="2" class="w-full px-3 py-2 rounded-xl border text-xs"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button @click="showReorderModal = false" class="px-4 py-2 rounded-xl text-xs">Cancel</button>
          <button @click="submitReorder" class="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold">Place Re-order</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const customerId = route.params.id as string;
const loading = ref(false);
const customer = ref<any>(null);
const activeProducts = ref<any[]>([]);
const catalogProducts = ref<any[]>([]);

const showReorderModal = ref(false);
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

const fetchCustomerDetails = async () => {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/product-customers/${customerId}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    customer.value = res.customer;
    activeProducts.value = res.activeProducts || [];
  } catch (err: any) {
    console.error('Failed to load customer dossier:', err);
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

const openReorderModal = () => {
  reorderForm.value = {
    productId: catalogProducts.value[0]?.id || null,
    quantity: 1,
    paymentMethod: 'cod',
    shippingAddress: customer.value?.address || '',
  };
  showReorderModal.value = true;
};

const submitReorder = async () => {
  if (!reorderForm.value.productId) return;
  try {
    const res = await $fetch<any>(`${apiBase}/product-customers/${customerId}/reorder`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        items: [{ productId: reorderForm.value.productId, quantity: reorderForm.value.quantity }],
        paymentMethod: reorderForm.value.paymentMethod,
        shippingAddress: reorderForm.value.shippingAddress,
      },
    });
    alert(`Re-order ${res.order.orderNumber} placed successfully!`);
    showReorderModal.value = false;
    await fetchCustomerDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to place re-order');
  }
};

// Formatters
const formatCurrency = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? '0.00' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDateOnly = (val: any) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatStatusLabel = (st: string) => {
  switch (st) {
    case 'order_received': return 'Order Received';
    case 'packed': return 'Packed';
    case 'dispatched': return 'Dispatched';
    case 'delivered': return 'Delivered';
    case 'out_of_stock': return 'Out of Stock';
    default: return st;
  }
};

const getStatusBadgeClass = (st: string) => {
  switch (st) {
    case 'order_received': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'packed': return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'dispatched': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'out_of_stock': return 'bg-rose-50 text-rose-800 border-rose-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

onMounted(() => {
  fetchCustomerDetails();
  fetchProducts();
});
</script>

