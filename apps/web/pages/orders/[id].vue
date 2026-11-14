<template>
  <div class="space-y-6 max-w-6xl mx-auto pb-12">
    <!-- Breadcrumb & Back Button -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2 text-xs text-slate-500">
        <NuxtLink to="/orders" class="hover:text-teal-600 font-semibold flex items-center gap-1">
          <span>← Back to Orders</span>
        </NuxtLink>
        <span>/</span>
        <span class="font-mono text-slate-700 dark:text-slate-300 font-semibold">{{ order?.orderNumber || 'Order' }}</span>
      </div>

      <!-- Action Buttons -->
      <div v-if="order" class="flex items-center gap-2">
        <button
          v-if="order.status === 'order_received'"
          @click="showPackModal = true"
          class="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
        >
          <span>🏷️ Pack Order</span>
        </button>

        <button
          v-if="order.status === 'order_received'"
          @click="showOutOfStockModal = true"
          class="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
        >
          <span>⚠️ Out of Stock</span>
        </button>

        <button
          v-if="order.status === 'packed'"
          @click="showDispatchModal = true"
          class="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
        >
          <span>🚚 Dispatch with Courier</span>
        </button>

        <button
          v-if="order.status === 'dispatched'"
          @click="showDeliverModal = true"
          class="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
        >
          <span>✅ Mark as Delivered</span>
        </button>

        <button
          v-if="order.status === 'out_of_stock'"
          @click="showPackModal = true"
          class="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
        >
          <span>📦 Restocked & Pack</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 flex flex-col items-center justify-center space-y-2">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
      <span class="text-xs text-slate-500">Loading order details...</span>
    </div>

    <div v-else-if="!order" class="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
      <p class="text-sm text-slate-500">Order not found.</p>
    </div>

    <!-- Order Content -->
    <div v-else class="space-y-6">
      <!-- Order Header Card -->
      <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex items-center space-x-3">
              <h1 class="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {{ order.orderNumber }}
              </h1>
              <span
                :class="[
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border',
                  getStatusBadgeClass(order.status)
                ]"
              >
                <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(order.status)" />
                <span>{{ formatStatusLabel(order.status) }}</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Placed on {{ formatDate(order.createdAt) }}
              <span v-if="order.createdBy"> • Created by {{ order.createdBy.name }}</span>
            </p>
          </div>

          <div class="text-right">
            <div class="text-xs text-slate-400">Total Order Value</div>
            <div class="text-2xl font-bold text-teal-600">
              ₹{{ formatCurrency(order.totalAmount) }}
            </div>
            <div class="text-xs font-semibold text-slate-500 uppercase mt-0.5">
              {{ order.paymentMethod }} • {{ order.paymentStatus }}
            </div>
          </div>
        </div>

        <!-- Fulfillment Stepper -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-700">
          <div class="grid grid-cols-4 gap-2 text-center text-xs">
            <!-- Step 1: Received -->
            <div class="p-2.5 rounded-xl border bg-amber-50/70 border-amber-300 dark:bg-amber-950/40">
              <div class="font-bold text-amber-800 dark:text-amber-200">1. Order Received</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ formatDateOnly(order.createdAt) }}</div>
            </div>

            <!-- Step 2: Packed -->
            <div
              :class="[
                'p-2.5 rounded-xl border transition-colors',
                order.packedAt
                  ? 'bg-blue-50/70 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800'
              ]"
            >
              <div>2. Packed</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ order.packedAt ? formatDateOnly(order.packedAt) : 'Pending' }}</div>
            </div>

            <!-- Step 3: Dispatched -->
            <div
              :class="[
                'p-2.5 rounded-xl border transition-colors',
                order.dispatchedAt
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800'
              ]"
            >
              <div>3. Dispatched</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ order.dispatchedAt ? formatDateOnly(order.dispatchedAt) : 'Pending' }}</div>
            </div>

            <!-- Step 4: Delivered -->
            <div
              :class="[
                'p-2.5 rounded-xl border transition-colors',
                order.deliveredAt
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800'
              ]"
            >
              <div>4. Delivered</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ order.deliveredAt ? formatDateOnly(order.deliveredAt) : 'Pending' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Out of Stock Warning Banner (if applicable) -->
      <div
        v-if="order.status === 'out_of_stock'"
        class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-2xs space-y-2"
      >
        <div class="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
          <span>⚠️ Awaiting Stock / Out of Stock</span>
        </div>
        <p class="text-xs text-rose-700 dark:text-rose-300">
          Reason: {{ order.outOfStockNote || 'Stock shortage at warehouse' }}
        </p>
        <div class="flex items-center gap-4 text-xs font-semibold text-rose-800 dark:text-rose-300">
          <span>📅 Expected Arrival: {{ order.backInStockDueAt ? formatDateOnly(order.backInStockDueAt) : 'Unspecified' }}</span>
          <span>•</span>
          <span>{{ order.customerInformed ? '✓ Customer informed via phone' : '⚠️ Customer not informed yet' }}</span>
        </div>
      </div>

      <!-- Two Column Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Column 1 & 2: Items & Pricing -->
        <div class="md:col-span-2 space-y-6">
          <!-- Items Table Card -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
            <div class="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-sm text-slate-900 dark:text-slate-100">
              Ordered Items ({{ order.items?.length || 0 }})
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-sm">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs font-semibold uppercase">
                    <th class="py-3 px-4">Product Name & SKU</th>
                    <th class="py-3 px-4 text-center">Refill Interval</th>
                    <th class="py-3 px-4 text-right">Price</th>
                    <th class="py-3 px-4 text-center">Qty</th>
                    <th class="py-3 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                  <tr v-for="item in order.items" :key="item.id">
                    <td class="py-3.5 px-4">
                      <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.product.name }}</div>
                      <div class="text-[11px] font-mono text-slate-400">{{ item.product.sku }}</div>
                    </td>
                    <td class="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">
                      {{ item.refillDays || item.product.refillDays || 30 }} days
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono">
                      ₹{{ formatCurrency(item.unitPrice) }}
                    </td>
                    <td class="py-3.5 px-4 text-center font-bold">
                      x{{ item.quantity }}
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      ₹{{ formatCurrency(item.totalPrice) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pricing Breakdown Footer -->
            <div class="p-4 bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-xs space-y-1.5">
              <div class="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span class="font-mono">₹{{ formatCurrency(order.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Shipping Fee</span>
                <span class="font-mono">₹{{ formatCurrency(order.shippingCharge) }}</span>
              </div>
              <div v-if="Number(order.discount) > 0" class="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span class="font-mono">-₹{{ formatCurrency(order.discount) }}</span>
              </div>
              <div class="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>Total Amount</span>
                <span class="font-mono text-teal-600">₹{{ formatCurrency(order.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- Automated Replenishment & Refill Schedule Card -->
          <div
            v-if="order.status === 'delivered' && order.nextRefillDate"
            class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-2xs space-y-3"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl">🔄</span>
              <div>
                <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Automated Refill Engine Active</h3>
                <p class="text-xs text-slate-500">Scheduled replenishment reminder for telecallers</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-700">
              <div>
                <span class="text-slate-400">Delivered Date:</span>
                <div class="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {{ formatDateOnly(order.deliveredAt) }}
                </div>
              </div>
              <div>
                <span class="text-slate-400">Next Refill Expected:</span>
                <div class="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {{ formatDateOnly(order.nextRefillDate) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Customer & Shipping & Courier Info -->
        <div class="space-y-6">
          <!-- Customer & Delivery Address Card -->
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer & Shipping</h3>
            
            <div>
              <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {{ order.recipientName }}
              </div>
              <div class="text-xs text-slate-500 mt-0.5">
                📞 {{ order.phoneNumber }}
              </div>
              <div v-if="order.secondaryPhone" class="text-xs text-slate-400">
                Alt: {{ order.secondaryPhone }}
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
              <span class="text-slate-400 block mb-1">Delivery Address:</span>
              <p class="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {{ order.shippingAddress }}<br />
                {{ order.city }}{{ order.state ? `, ${order.state}` : '' }} {{ order.pincode ? `- ${order.pincode}` : '' }}
              </p>
            </div>

            <div v-if="order.customerId" class="pt-2 border-t border-slate-100 dark:border-slate-700">
              <NuxtLink
                :to="`/customers/${order.customerId}`"
                class="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
              >
                <span>View Full Customer Profile →</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Courier & Tracking Card -->
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Shipping Partner & AWB</h3>

            <div v-if="order.trackingNumber" class="space-y-2">
              <div>
                <span class="text-xs text-slate-400">Carrier:</span>
                <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {{ order.courierName || 'Standard Courier' }}
                </div>
              </div>

              <div>
                <span class="text-xs text-slate-400">AWB Tracking Number:</span>
                <div class="font-mono font-bold text-sm text-indigo-600 mt-0.5">
                  {{ order.trackingNumber }}
                </div>
              </div>

              <div v-if="order.trackingUrl" class="pt-2">
                <a
                  :href="order.trackingUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 w-full justify-center px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors"
                >
                  <span>Track Package Online</span>
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div v-else class="text-xs text-slate-400 italic">
              Package has not been dispatched yet.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals Reuse -->
    <!-- PACK MODAL -->
    <div v-if="showPackModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">🏷️ Confirm Order Packed</h3>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          Confirm that items are verified and packed into shipment box.
        </p>
        <input
          v-model="packNotes"
          type="text"
          placeholder="Packing notes (optional)"
          class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
        />
        <div class="flex justify-end gap-2 pt-2">
          <button @click="showPackModal = false" class="px-4 py-2 rounded-xl text-xs">Cancel</button>
          <button @click="executePack" class="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold">Confirm Packed</button>
        </div>
      </div>
    </div>

    <!-- DISPATCH MODAL -->
    <div v-if="showDispatchModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">🚚 Dispatch Shipment</h3>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold mb-1">Courier Partner</label>
            <select v-model="dispatchCourierId" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs">
              <option v-for="c in couriers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block font-semibold mb-1">AWB Tracking #</label>
            <input v-model="dispatchAwb" type="text" placeholder="AWB Number" class="w-full min-h-[40px] px-3 py-2 rounded-xl border font-mono text-xs uppercase" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="showDispatchModal = false" class="px-4 py-2 rounded-xl text-xs">Cancel</button>
          <button @click="executeDispatch" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Confirm Dispatch</button>
        </div>
      </div>
    </div>

    <!-- DELIVER MODAL -->
    <div v-if="showDeliverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">✅ Confirm Delivery</h3>
        <p class="text-xs text-slate-600">Confirm delivery to customer and schedule automatic 30-day refill reminder timer.</p>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="showDeliverModal = false" class="px-4 py-2 rounded-xl text-xs">Cancel</button>
          <button @click="executeDeliver" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Confirm Delivered</button>
        </div>
      </div>
    </div>

    <!-- OUT OF STOCK MODAL -->
    <div v-if="showOutOfStockModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">⚠️ Flag Out of Stock</h3>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold mb-1">Stock Note</label>
            <input v-model="oosNote" type="text" placeholder="Reason" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs" />
          </div>
          <div>
            <label class="block font-semibold mb-1">Expected Restock Date</label>
            <input v-model="oosDate" type="date" class="w-full min-h-[40px] px-3 py-2 rounded-xl border text-xs" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button @click="showOutOfStockModal = false" class="px-4 py-2 rounded-xl text-xs">Cancel</button>
          <button @click="executeOutOfStock" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold">Save & Set Reminder</button>
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

const orderId = route.params.id as string;
const loading = ref(false);
const order = ref<any>(null);
const couriers = ref<any[]>([]);

// Modals
const showPackModal = ref(false);
const packNotes = ref('');

const showDispatchModal = ref(false);
const dispatchCourierId = ref<number | null>(null);
const dispatchAwb = ref('');

const showDeliverModal = ref(false);

const showOutOfStockModal = ref(false);
const oosNote = ref('');
const oosDate = ref('');

const getAuthHeaders = (): Record<string, string> => {
  const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const fetchOrderDetails = async () => {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/orders/${orderId}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    order.value = res;
  } catch (err: any) {
    console.error('Failed to load order:', err);
  } finally {
    loading.value = false;
  }
};

const fetchCouriers = async () => {
  try {
    const res = await $fetch<any>(`${apiBase}/couriers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    couriers.value = res.couriers || (Array.isArray(res) ? res : []);
    if (couriers.value.length > 0) {
      dispatchCourierId.value = couriers.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load couriers:', err);
  }
};

const executePack = async () => {
  try {
    await $fetch<any>(`${apiBase}/orders/${orderId}/pack`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: { packingNotes: packNotes.value },
    });
    showPackModal.value = false;
    await fetchOrderDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to pack order');
  }
};

const executeDispatch = async () => {
  if (!dispatchAwb.value.trim()) {
    alert('Please provide an AWB Tracking Number');
    return;
  }
  try {
    await $fetch<any>(`${apiBase}/orders/${orderId}/dispatch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        courierPartnerId: dispatchCourierId.value || undefined,
        trackingNumber: dispatchAwb.value.trim(),
      },
    });
    showDispatchModal.value = false;
    await fetchOrderDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to dispatch order');
  }
};

const executeDeliver = async () => {
  try {
    await $fetch<any>(`${apiBase}/orders/${orderId}/deliver`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {},
    });
    showDeliverModal.value = false;
    await fetchOrderDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to deliver order');
  }
};

const executeOutOfStock = async () => {
  try {
    await $fetch<any>(`${apiBase}/orders/${orderId}/out-of-stock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        note: oosNote.value.trim() || undefined,
        customerInformed: true,
        backInStockDueAt: oosDate.value || undefined,
      },
    });
    showOutOfStockModal.value = false;
    await fetchOrderDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to mark out of stock');
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
    case 'cancelled': return 'Cancelled';
    default: return st;
  }
};

const getStatusBadgeClass = (st: string) => {
  switch (st) {
    case 'order_received': return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300';
    case 'packed': return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300';
    case 'dispatched': return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300';
    case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'out_of_stock': return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusDotClass = (st: string) => {
  switch (st) {
    case 'order_received': return 'bg-amber-500';
    case 'packed': return 'bg-blue-500';
    case 'dispatched': return 'bg-indigo-500';
    case 'delivered': return 'bg-emerald-500';
    case 'out_of_stock': return 'bg-rose-500';
    default: return 'bg-slate-400';
  }
};

onMounted(() => {
  fetchOrderDetails();
  fetchCouriers();
});
</script>

