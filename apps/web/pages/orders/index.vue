<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Orders</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ totalOrders }} Total
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Process customer orders, packaging, courier dispatch, out-of-stock callbacks, and auto-refills
        </p>
      </div>

      <!-- Actions Toolbar -->
      <div class="flex items-center flex-wrap gap-2.5">
        <NuxtLink
          to="/customers"
          class="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-teal-600" />
          <span>Customers</span>
        </NuxtLink>

        <button
          type="button"
          @click="openCreateOrderModal"
          class="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5 active:scale-95"
        >
          <span class="text-base leading-none">+</span>
          <span>New Order</span>
        </button>
      </div>
    </div>

    <!-- Status KPI Metrics Banner -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        @click="filterStatus = 'all'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'all'
            ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">All Orders</div>
        <div class="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{{ counters.all || 0 }}</div>
      </div>

      <div
        @click="filterStatus = 'order_received'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'order_received'
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <span>📦 Received</span>
        </div>
        <div class="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{{ counters.order_received || 0 }}</div>
      </div>

      <div
        @click="filterStatus = 'packed'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'packed'
            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
          <span>🏷️ Packed</span>
        </div>
        <div class="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{{ counters.packed || 0 }}</div>
      </div>

      <div
        @click="filterStatus = 'dispatched'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'dispatched'
            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
          <span>🚚 Dispatched</span>
        </div>
        <div class="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-1">{{ counters.dispatched || 0 }}</div>
      </div>

      <div
        @click="filterStatus = 'delivered'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'delivered'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
          <span>✅ Delivered</span>
        </div>
        <div class="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{{ counters.delivered || 0 }}</div>
      </div>

      <div
        @click="filterStatus = 'out_of_stock'"
        :class="[
          'p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs',
          filterStatus === 'out_of_stock'
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
        ]"
      >
        <div class="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
          <span>⚠️ Out of Stock</span>
        </div>
        <div class="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">{{ counters.out_of_stock || 0 }}</div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div class="relative sm:col-span-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by Order #, Customer Name, Mobile, or AWB tracking..."
            class="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            @keyup.enter="applyFilters"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <!-- Payment Method Filter -->
        <div>
          <select
            v-model="filterPaymentMethod"
            @change="applyFilters"
            class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Payment Types</option>
            <option value="cod">Cash on Delivery (COD)</option>
            <option value="prepaid">Online / UPI Prepaid</option>
          </select>
        </div>

        <!-- Clear / Refresh button -->
        <div class="flex items-center gap-2">
          <button
            @click="applyFilters"
            class="flex-1 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1"
          >
            <UIcon name="i-heroicons-funnel" class="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
          <button
            @click="resetFilters"
            title="Reset Filters"
            class="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs"
          >
            ↺
          </button>
        </div>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 flex flex-col items-center justify-center space-y-2">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
        <span class="text-xs text-slate-500">Loading orders...</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="py-16 text-center space-y-3">
        <div class="text-4xl">📦</div>
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-200">No orders found</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          No product orders match the current status or search filter.
        </p>
        <button
          @click="openCreateOrderModal"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-colors"
        >
          <span>+ Create Order</span>
        </button>
      </div>

      <!-- Orders List -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50/80 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
              <th class="py-3 px-4">Order # & Date</th>
              <th class="py-3 px-4">Customer & Delivery</th>
              <th class="py-3 px-4">Items & Refill Interval</th>
              <th class="py-3 px-4">Amount & Payment</th>
              <th class="py-3 px-4">Fulfillment Status</th>
              <th class="py-3 px-4">Tracking / Restock Note</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="order in orders" :key="order.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
              <!-- Order # & Date -->
              <td class="py-3.5 px-4 align-top">
                <NuxtLink
                  :to="`/orders/${order.id}`"
                  class="font-mono font-bold text-teal-600 dark:text-teal-400 hover:underline block text-xs"
                >
                  {{ order.orderNumber }}
                </NuxtLink>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  {{ formatDate(order.createdAt) }}
                </div>
                <div v-if="order.lead" class="text-[10px] text-slate-400 mt-0.5">
                  Lead #{{ order.lead.id }}
                </div>
              </td>

              <!-- Customer Details -->
              <td class="py-3.5 px-4 align-top">
                <div class="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                  {{ order.recipientName }}
                </div>
                <div class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span>📞 {{ order.phoneNumber }}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1 max-w-[200px] truncate" :title="order.shippingAddress">
                  📍 {{ order.shippingAddress }}{{ order.city ? `, ${order.city}` : '' }}
                </div>
              </td>

              <!-- Items Summary -->
              <td class="py-3.5 px-4 align-top">
                <div class="space-y-1">
                  <div
                    v-for="item in order.items"
                    :key="item.id"
                    class="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2"
                  >
                    <span class="truncate max-w-[160px] font-medium">{{ item.product.name }}</span>
                    <span class="text-[11px] font-mono text-slate-500 shrink-0">x{{ item.quantity }}</span>
                  </div>
                </div>
                <div v-if="order.nextRefillDate" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  🔄 Refill due: {{ formatDateOnly(order.nextRefillDate) }}
                </div>
              </td>

              <!-- Amount & Payment -->
              <td class="py-3.5 px-4 align-top">
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  ₹{{ formatCurrency(order.totalAmount) }}
                </div>
                <div class="flex items-center gap-1 mt-1">
                  <span
                    :class="[
                      'text-[10px] font-semibold px-2 py-0.5 rounded uppercase',
                      order.paymentMethod === 'cod'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    ]"
                  >
                    {{ order.paymentMethod }}
                  </span>
                  <span
                    :class="[
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      order.paymentStatus === 'paid'
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-slate-500 bg-slate-100'
                    ]"
                  >
                    {{ order.paymentStatus }}
                  </span>
                </div>
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4 align-top">
                <span
                  :class="[
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                    getStatusBadgeClass(order.status)
                  ]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(order.status)" />
                  <span>{{ formatStatusLabel(order.status) }}</span>
                </span>
                <div v-if="order.packedAt && order.status === 'packed'" class="text-[10px] text-slate-400 mt-1">
                  Packed {{ formatTimeAgo(order.packedAt) }}
                </div>
                <div v-if="order.dispatchedAt && order.status === 'dispatched'" class="text-[10px] text-slate-400 mt-1">
                  Dispatched {{ formatTimeAgo(order.dispatchedAt) }}
                </div>
                <div v-if="order.deliveredAt && order.status === 'delivered'" class="text-[10px] text-slate-400 mt-1">
                  Delivered {{ formatDateOnly(order.deliveredAt) }}
                </div>
              </td>

              <!-- Tracking / Out of Stock Details -->
              <td class="py-3.5 px-4 align-top">
                <!-- If Dispatched / Delivered with Tracking -->
                <div v-if="order.trackingNumber" class="space-y-1">
                  <div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {{ order.courierName || 'Courier' }}
                  </div>
                  <a
                    v-if="order.trackingUrl"
                    :href="order.trackingUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 font-mono text-[11px] text-teal-600 dark:text-teal-400 hover:underline bg-teal-50/60 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800"
                    title="Click to track on courier website"
                  >
                    <span>AWB: {{ order.trackingNumber }}</span>
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                  </a>
                  <span v-else class="font-mono text-[11px] text-slate-500">
                    AWB: {{ order.trackingNumber }}
                  </span>
                </div>

                <!-- If Out of Stock -->
                <div v-else-if="order.status === 'out_of_stock'" class="space-y-1">
                  <div v-if="order.outOfStockNote" class="text-xs text-rose-600 dark:text-rose-400 italic">
                    "{{ order.outOfStockNote }}"
                  </div>
                  <div v-if="order.backInStockDueAt" class="text-[10px] text-slate-500 font-semibold">
                    📅 Arrival: {{ formatDateOnly(order.backInStockDueAt) }}
                  </div>
                  <span
                    :class="[
                      'inline-block text-[10px] font-semibold px-2 py-0.5 rounded',
                      order.customerInformed
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    ]"
                  >
                    {{ order.customerInformed ? '✓ Customer Informed' : '⚠️ Call Pending' }}
                  </span>
                </div>

                <div v-else class="text-xs text-slate-400 italic">
                  {{ order.customerNotes || '—' }}
                </div>
              </td>

              <!-- Quick Actions -->
              <td class="py-3.5 px-4 align-top text-right">
                <div class="flex flex-col items-end gap-1.5">
                  <!-- Action: Pack -->
                  <button
                    v-if="order.status === 'order_received'"
                    type="button"
                    @click="openPackModal(order)"
                    class="min-h-[32px] px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>🏷️ Pack</span>
                  </button>

                  <!-- Action: Out of Stock -->
                  <button
                    v-if="order.status === 'order_received'"
                    type="button"
                    @click="openOutOfStockModal(order)"
                    class="min-h-[28px] px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                  >
                    <span>Out of Stock</span>
                  </button>

                  <!-- Action: Dispatch -->
                  <button
                    v-if="order.status === 'packed'"
                    type="button"
                    @click="openDispatchModal(order)"
                    class="min-h-[32px] px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>🚚 Dispatch</span>
                  </button>

                  <!-- Action: Deliver -->
                  <button
                    v-if="order.status === 'dispatched'"
                    type="button"
                    @click="openDeliverModal(order)"
                    class="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>✅ Deliver</span>
                  </button>

                  <!-- Action: Back in Stock (for OOS orders) -->
                  <button
                    v-if="order.status === 'out_of_stock'"
                    type="button"
                    @click="openPackModal(order)"
                    class="min-h-[32px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>📦 Restocked & Pack</span>
                  </button>

                  <!-- View Details -->
                  <NuxtLink
                    :to="`/orders/${order.id}`"
                    class="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mt-1"
                  >
                    View Details →
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
        <span class="text-slate-500">
          Showing page {{ currentPage }} of {{ totalPages }} ({{ totalOrders }} orders)
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

    <!-- ==================== MODALS ==================== -->

    <!-- MODAL 1: PACK ORDER -->
    <div v-if="showPackModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🏷️ Pack Order</span>
            <span class="text-xs font-mono text-teal-600">{{ activeOrder?.orderNumber }}</span>
          </h3>
          <button @click="showPackModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="text-xs text-slate-600 dark:text-slate-300">
          Confirm that the products are verified against the order, packaged securely in cartons/bubble wrap, and ready for courier pickup.
        </div>

        <div class="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div class="font-semibold text-slate-700 dark:text-slate-200">Items inside package:</div>
          <div v-for="item in activeOrder?.items" :key="item.id" class="text-slate-600 dark:text-slate-400">
            • {{ item.product.name }} (Quantity: {{ item.quantity }})
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Packaging Notes (Optional)</label>
          <input
            v-model="packNotes"
            type="text"
            placeholder="e.g. Boxed with fragile sticker, tamper seal applied"
            class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showPackModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitPackOrder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Confirm Packed</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: DISPATCH ORDER (COURIER & AWB) -->
    <div v-if="showDispatchModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🚚 Dispatch Shipment</span>
            <span class="text-xs font-mono text-indigo-600">{{ activeOrder?.orderNumber }}</span>
          </h3>
          <button @click="showDispatchModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div v-if="dispatchError" class="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {{ dispatchError }}
        </div>

        <div class="space-y-3">
          <!-- Courier Partner Dropdown -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Courier Partner <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="dispatchForm.courierPartnerId"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
            >
              <option :value="null">-- Select Courier Partner --</option>
              <option v-for="c in courierPartners" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.code }})
              </option>
            </select>
          </div>

          <!-- AWB Tracking Number -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tracking Number / AWB # <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="dispatchForm.trackingNumber"
              type="text"
              placeholder="e.g. DTDC12345678, 1421098765432"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono font-semibold uppercase focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <!-- Live Tracking Link Preview -->
          <div v-if="previewTrackingUrl" class="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] space-y-1">
            <div class="font-semibold text-indigo-700 dark:text-indigo-300">Live Tracking Link Preview:</div>
            <div class="font-mono text-slate-600 dark:text-slate-300 truncate">{{ previewTrackingUrl }}</div>
          </div>

          <!-- Dispatch Notes -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dispatch Notes</label>
            <input
              v-model="dispatchForm.dispatchNotes"
              type="text"
              placeholder="e.g. Handed over to courier pickup executive"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showDispatchModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitDispatchOrder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Confirm Dispatch</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: MARK DELIVERED & AUTO-REFILL ENGINE -->
    <div v-if="showDeliverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>✅ Confirm Delivery</span>
            <span class="text-xs font-mono text-emerald-600">{{ activeOrder?.orderNumber }}</span>
          </h3>
          <button @click="showDeliverModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div class="text-xs text-slate-600 dark:text-slate-300">
          Confirm that the shipment has been safely delivered to <strong>{{ activeOrder?.recipientName }}</strong>.
        </div>

        <!-- Refill Engine Alert Banner -->
        <div class="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
          <div class="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <span>🔄 Automated Refill Follow-up</span>
          </div>
          <p class="text-slate-600 dark:text-slate-300 text-[11px]">
            The system will calculate the expected consumption finish date and automatically schedule a telecaller replenishment reminder 5 days before the product runs out.
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Confirmation Notes</label>
          <input
            v-model="deliveryNotes"
            type="text"
            placeholder="e.g. Verified OTP / Received by customer Deepak"
            class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showDeliverModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitDeliverOrder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Confirm Delivery & Schedule Refill</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 4: OUT OF STOCK & RESTOCK FOLLOW-UP -->
    <div v-if="showOutOfStockModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>⚠️ Out of Stock Flag</span>
            <span class="text-xs font-mono text-rose-600">{{ activeOrder?.orderNumber }}</span>
          </h3>
          <button @click="showOutOfStockModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300">
          Flag this order as awaiting stock. The system will create an automated follow-up task to call the customer as soon as the fresh batch arrives.
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Warehouse / Stock Explanation Note
            </label>
            <input
              v-model="outOfStockForm.note"
              type="text"
              placeholder="e.g. Tonic 500ml batch arriving from factory on Thursday"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Restock Date (Promised to customer)
            </label>
            <input
              v-model="outOfStockForm.backInStockDueAt"
              type="date"
              class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div class="flex items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
            <input
              v-model="outOfStockForm.customerInformed"
              type="checkbox"
              id="customerInformedCheck"
              class="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <label for="customerInformedCheck" class="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              I have already informed the customer via phone call about the delay
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showOutOfStockModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitOutOfStockOrder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Save Out of Stock & Set Reminder</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 5: CREATE NEW ORDER -->
    <div v-if="showCreateOrderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📦 Create Product Order</span>
          </h3>
          <button @click="showCreateOrderModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div v-if="createOrderError" class="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {{ createOrderError }}
        </div>

        <div class="space-y-4">
          <!-- Recipient & Contact -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Name <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="createOrderForm.recipientName"
                type="text"
                placeholder="Full Name"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="createOrderForm.phoneNumber"
                type="tel"
                placeholder="10-digit mobile number"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <!-- Shipping Address -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Shipping Address <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="createOrderForm.shippingAddress"
              rows="2"
              placeholder="Door / Flat No, Building, Street, Landmark"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input
                v-model="createOrderForm.city"
                type="text"
                placeholder="City"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
              <input
                v-model="createOrderForm.state"
                type="text"
                placeholder="Kerala"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
              <input
                v-model="createOrderForm.pincode"
                type="text"
                placeholder="682001"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <!-- Items Selection -->
          <div class="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Order Items</span>
              <button
                type="button"
                @click="addOrderItemRow"
                class="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                + Add Another Product
              </button>
            </div>

            <div
              v-for="(row, idx) in createOrderForm.items"
              :key="idx"
              class="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl"
            >
              <select
                v-model="row.productId"
                @change="onProductSelect(row)"
                class="flex-1 min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option :value="null">-- Select Product --</option>
                <option v-for="p in catalogProducts" :key="p.id" :value="p.id">
                  {{ p.name }} (₹{{ p.price }})
                </option>
              </select>

              <div class="w-20">
                <input
                  v-model.number="row.quantity"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  class="w-full min-h-[36px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                />
              </div>

              <div class="w-24 text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                ₹{{ ((row.unitPrice || 0) * (row.quantity || 1)).toFixed(2) }}
              </div>

              <button
                v-if="createOrderForm.items.length > 1"
                @click="removeOrderItemRow(idx)"
                class="text-rose-500 hover:text-rose-700 p-1"
                title="Remove Item"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Payment and Charges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-700 pt-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                v-model="createOrderForm.paymentMethod"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="prepaid">Online / Prepaid</option>
                <option value="upi">Direct UPI</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Shipping Fee (₹)</label>
              <input
                v-model.number="createOrderForm.shippingCharge"
                type="number"
                min="0"
                class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div class="flex flex-col justify-end">
              <span class="text-[11px] text-slate-400">Total Order Amount:</span>
              <span class="text-lg font-bold text-teal-600">
                ₹{{ computedOrderTotal.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            @click="showCreateOrderModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            @click="submitCreateOrder"
            :disabled="actionLoading"
            class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <UIcon v-if="actionLoading" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            <span>Generate Order</span>
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
const apiBase = config.public.apiBase;

// Filters and state
const loading = ref(false);
const actionLoading = ref(false);
const orders = ref<any[]>([]);
const courierPartners = ref<any[]>([]);
const catalogProducts = ref<any[]>([]);
const totalOrders = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);

const filterStatus = ref('all');
const searchQuery = ref('');
const filterPaymentMethod = ref('');
const counters = ref<Record<string, number>>({});

// Modal states
const activeOrder = ref<any>(null);
const showPackModal = ref(false);
const packNotes = ref('');

const showDispatchModal = ref(false);
const dispatchError = ref('');
const dispatchForm = ref({
  courierPartnerId: null as number | null,
  trackingNumber: '',
  dispatchNotes: '',
});

const showDeliverModal = ref(false);
const deliveryNotes = ref('');

const showOutOfStockModal = ref(false);
const outOfStockForm = ref({
  note: '',
  backInStockDueAt: '',
  customerInformed: false,
});

const showCreateOrderModal = ref(false);
const createOrderError = ref('');
const createOrderForm = ref({
  recipientName: '',
  phoneNumber: '',
  shippingAddress: '',
  city: '',
  state: 'Kerala',
  pincode: '',
  paymentMethod: 'cod',
  shippingCharge: 0,
  customerNotes: '',
  items: [
    { productId: null as number | null, quantity: 1, unitPrice: 0, refillDays: 30 }
  ],
});

const getAuthHeaders = (): Record<string, string> => {
  const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

// Computed live preview for tracking URL
const previewTrackingUrl = computed(() => {
  if (!dispatchForm.value.courierPartnerId || !dispatchForm.value.trackingNumber.trim()) return '';
  const courier = courierPartners.value.find((c) => c.id === dispatchForm.value.courierPartnerId);
  if (!courier || !courier.trackingUrlTemplate) return '';
  return courier.trackingUrlTemplate.replace('{TRACKING_NUMBER}', encodeURIComponent(dispatchForm.value.trackingNumber.trim()));
});

// Computed total for new order modal
const computedOrderTotal = computed(() => {
  const subtotal = createOrderForm.value.items.reduce((sum, item) => {
    return sum + (item.unitPrice || 0) * (item.quantity || 1);
  }, 0);
  return subtotal + (Number(createOrderForm.value.shippingCharge) || 0);
});

// Fetch Orders
const fetchOrders = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filterStatus.value && filterStatus.value !== 'all') {
      params.append('status', filterStatus.value);
    }
    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim());
    }
    if (filterPaymentMethod.value) {
      params.append('paymentMethod', filterPaymentMethod.value);
    }
    params.append('page', String(currentPage.value));
    params.append('limit', '20');

    const res = await $fetch<any>(`${apiBase}/orders?${params.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    orders.value = res.orders || [];
    totalOrders.value = res.pagination?.total || 0;
    totalPages.value = res.pagination?.pages || 1;
    counters.value = res.counters || {};
  } catch (err: any) {
    console.error('Failed to load orders:', err);
  } finally {
    loading.value = false;
  }
};

// Fetch Couriers & Products for Modals
const fetchSupportData = async () => {
  try {
    const courierRes = await $fetch<any>(`${apiBase}/couriers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    courierPartners.value = courierRes.couriers || (Array.isArray(courierRes) ? courierRes : []);

    const productRes = await $fetch<any>(`${apiBase}/products?limit=100`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    catalogProducts.value = productRes.products || [];
  } catch (err) {
    console.error('Failed to load support data:', err);
  }
};

const applyFilters = () => {
  currentPage.value = 1;
  fetchOrders();
};

const resetFilters = () => {
  filterStatus.value = 'all';
  searchQuery.value = '';
  filterPaymentMethod.value = '';
  currentPage.value = 1;
  fetchOrders();
};

const changePage = (page: number) => {
  currentPage.value = page;
  fetchOrders();
};

// Pack Modal Handlers
const openPackModal = (order: any) => {
  activeOrder.value = order;
  packNotes.value = '';
  showPackModal.value = true;
};

const submitPackOrder = async () => {
  if (!activeOrder.value) return;
  actionLoading.value = true;
  try {
    await $fetch<any>(`${apiBase}/orders/${activeOrder.value.id}/pack`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: { packingNotes: packNotes.value },
    });
    showPackModal.value = false;
    await fetchOrders();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to pack order');
  } finally {
    actionLoading.value = false;
  }
};

// Dispatch Modal Handlers
const openDispatchModal = (order: any) => {
  activeOrder.value = order;
  dispatchError.value = '';
  dispatchForm.value = {
    courierPartnerId: courierPartners.value[0]?.id || null,
    trackingNumber: '',
    dispatchNotes: '',
  };
  showDispatchModal.value = true;
};

const submitDispatchOrder = async () => {
  if (!activeOrder.value) return;
  if (!dispatchForm.value.trackingNumber.trim()) {
    dispatchError.value = 'Please provide an AWB Tracking Number';
    return;
  }

  actionLoading.value = true;
  dispatchError.value = '';
  try {
    await $fetch<any>(`${apiBase}/orders/${activeOrder.value.id}/dispatch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        courierPartnerId: dispatchForm.value.courierPartnerId || undefined,
        trackingNumber: dispatchForm.value.trackingNumber.trim(),
        dispatchNotes: dispatchForm.value.dispatchNotes.trim() || undefined,
      },
    });
    showDispatchModal.value = false;
    await fetchOrders();
  } catch (err: any) {
    dispatchError.value = err.data?.error?.message || 'Failed to dispatch order';
  } finally {
    actionLoading.value = false;
  }
};

// Deliver Modal Handlers
const openDeliverModal = (order: any) => {
  activeOrder.value = order;
  deliveryNotes.value = '';
  showDeliverModal.value = true;
};

const submitDeliverOrder = async () => {
  if (!activeOrder.value) return;
  actionLoading.value = true;
  try {
    await $fetch<any>(`${apiBase}/orders/${activeOrder.value.id}/deliver`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: { deliveryNotes: deliveryNotes.value },
    });
    showDeliverModal.value = false;
    await fetchOrders();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to record delivery');
  } finally {
    actionLoading.value = false;
  }
};

// Out of Stock Modal Handlers
const openOutOfStockModal = (order: any) => {
  activeOrder.value = order;
  outOfStockForm.value = {
    note: '',
    backInStockDueAt: '',
    customerInformed: false,
  };
  showOutOfStockModal.value = true;
};

const submitOutOfStockOrder = async () => {
  if (!activeOrder.value) return;
  actionLoading.value = true;
  try {
    await $fetch<any>(`${apiBase}/orders/${activeOrder.value.id}/out-of-stock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        note: outOfStockForm.value.note.trim() || undefined,
        customerInformed: outOfStockForm.value.customerInformed,
        backInStockDueAt: outOfStockForm.value.backInStockDueAt || undefined,
      },
    });
    showOutOfStockModal.value = false;
    await fetchOrders();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to mark out of stock');
  } finally {
    actionLoading.value = false;
  }
};

// Create Order Modal Handlers
const openCreateOrderModal = () => {
  createOrderError.value = '';
  createOrderForm.value = {
    recipientName: '',
    phoneNumber: '',
    shippingAddress: '',
    city: '',
    state: 'Kerala',
    pincode: '',
    paymentMethod: 'cod',
    shippingCharge: 0,
    customerNotes: '',
    items: [
      { productId: catalogProducts.value[0]?.id || null, quantity: 1, unitPrice: catalogProducts.value[0]?.price || 0, refillDays: 30 }
    ],
  };
  showCreateOrderModal.value = true;
};

const addOrderItemRow = () => {
  createOrderForm.value.items.push({
    productId: catalogProducts.value[0]?.id || null,
    quantity: 1,
    unitPrice: catalogProducts.value[0]?.price || 0,
    refillDays: 30,
  });
};

const removeOrderItemRow = (idx: number) => {
  if (createOrderForm.value.items.length > 1) {
    createOrderForm.value.items.splice(idx, 1);
  }
};

const onProductSelect = (row: any) => {
  const prod = catalogProducts.value.find((p) => p.id === row.productId);
  if (prod) {
    row.unitPrice = Number(prod.price) || 0;
    row.refillDays = prod.refillDays || 30;
  }
};

const submitCreateOrder = async () => {
  if (!createOrderForm.value.recipientName.trim()) {
    createOrderError.value = 'Recipient name is required';
    return;
  }
  if (!createOrderForm.value.phoneNumber.trim()) {
    createOrderError.value = 'Phone number is required';
    return;
  }
  if (!createOrderForm.value.shippingAddress.trim()) {
    createOrderError.value = 'Shipping address is required';
    return;
  }
  const validItems = createOrderForm.value.items.filter((i) => i.productId && i.quantity > 0);
  if (validItems.length === 0) {
    createOrderError.value = 'Please select at least one product';
    return;
  }

  actionLoading.value = true;
  createOrderError.value = '';

  try {
    await $fetch<any>(`${apiBase}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: {
        recipientName: createOrderForm.value.recipientName.trim(),
        phoneNumber: createOrderForm.value.phoneNumber.trim(),
        shippingAddress: createOrderForm.value.shippingAddress.trim(),
        city: createOrderForm.value.city.trim() || undefined,
        state: createOrderForm.value.state.trim() || undefined,
        pincode: createOrderForm.value.pincode.trim() || undefined,
        paymentMethod: createOrderForm.value.paymentMethod,
        shippingCharge: Number(createOrderForm.value.shippingCharge) || 0,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          refillDays: i.refillDays,
        })),
      },
    });
    showCreateOrderModal.value = false;
    await fetchOrders();
  } catch (err: any) {
    createOrderError.value = err.data?.error?.message || 'Failed to create order';
  } finally {
    actionLoading.value = false;
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

const formatTimeAgo = (val: any) => {
  if (!val) return '';
  const diff = Date.now() - new Date(val).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
    case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
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
  fetchOrders();
  fetchSupportData();
});
</script>

