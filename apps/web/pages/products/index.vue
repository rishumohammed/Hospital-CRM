<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>Product Catalog</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ pagination.total }} Products
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage formulations, real-time stock toggles, pricing history, and prescription compliance
        </p>
      </div>

      <!-- Actions Toolbar -->
      <div class="flex items-center flex-wrap gap-2.5">
        <NuxtLink
          to="/products/categories"
          class="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <UIcon name="i-heroicons-rectangle-stack" class="w-4 h-4 text-teal-600" />
          <span>Categories</span>
        </NuxtLink>

        <NuxtLink
          to="/products/campaigns"
          class="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <UIcon name="i-heroicons-megaphone" class="w-4 h-4 text-teal-600" />
          <span>Campaigns</span>
        </NuxtLink>

        <NuxtLink
          to="/reports/products"
          class="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        >
          <UIcon name="i-heroicons-chart-pie" class="w-4 h-4 text-teal-600" />
          <span>Product Analytics</span>
        </NuxtLink>

        <!-- Bulk Stock Update Modal Trigger -->
        <button
          v-if="canUpdateStock"
          type="button"
          @click="showBulkModal = true"
          :disabled="selectedProductIds.length === 0"
          :class="[
            'min-h-[40px] px-3.5 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 border shadow-2xs',
            selectedProductIds.length > 0
              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'
          ]"
        >
          <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
          <span>Bulk Stock ({{ selectedProductIds.length }})</span>
        </button>

        <!-- Add Product Button -->
        <button
          v-if="canCreateProduct"
          type="button"
          @click="openAddDrawer"
          class="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
        >
          <span class="text-base leading-none">+</span>
          <span>Add Product</span>
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2 relative">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search by name, SKU, or keyword..."
            class="w-full px-3.5 py-2 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
            @input="debounceSearch"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <!-- Category Dropdown -->
        <div>
          <select
            v-model="filters.categoryId"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            @change="fetchProducts"
          >
            <option :value="''">All Categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Stock Status Filter -->
        <div>
          <select
            v-model="filters.stockStatus"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            @change="fetchProducts"
          >
            <option value="">All Stock Statuses</option>
            <option value="in_stock">In Stock Only</option>
            <option value="out_of_stock">Out of Stock Only</option>
          </select>
        </div>

        <!-- Lifecycle Status Filter -->
        <div>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            @change="fetchProducts"
          >
            <option value="">All Statuses (Active)</option>
            <option value="approved">Approved Only</option>
            <option value="draft">Drafts Only</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <!-- Secondary Quick Filter Pills -->
      <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded-lg text-xs font-semibold transition-all border',
              filters.prescriptionRequired === ''
                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            ]"
            @click="setRxFilter('')"
          >
            All Types
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1',
              filters.prescriptionRequired === 'true'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            ]"
            @click="setRxFilter('true')"
          >
            <span>💊</span>
            <span>Rx Required</span>
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1',
              filters.prescriptionRequired === 'false'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            ]"
            @click="setRxFilter('false')"
          >
            <span>🌿</span>
            <span>Over-the-Counter (OTC)</span>
          </button>
        </div>

        <div class="text-xs text-slate-400 font-normal">
          Showing {{ products.length }} of {{ pagination.total }} items
        </div>
      </div>
    </div>

    <!-- Products Table (Desktop) & Cards (Mobile) -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2 text-teal-600">⟳</span>
        <p class="text-xs font-semibold">Loading product catalog...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="products.length === 0" class="p-12 text-center text-slate-500 space-y-3">
        <UIcon name="i-heroicons-inbox" class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">No products found</p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          No formulations match your selected filters. Try resetting the search or category filters.
        </p>
      </div>

      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-850/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th class="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  class="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="py-3 px-4">Product &amp; SKU</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Price</th>
              <th class="py-3 px-4 text-center">Stock Status</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Pack / Usage</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
            <tr
              v-for="p in products"
              :key="p.id"
              class="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
            >
              <!-- Checkbox -->
              <td class="py-3 px-4">
                <input
                  type="checkbox"
                  :value="p.id"
                  v-model="selectedProductIds"
                  class="rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                />
              </td>

              <!-- Product Info -->
              <td class="py-3 px-4">
                <NuxtLink :to="`/products/${p.id}`" class="group block">
                  <div class="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors flex items-center gap-1.5">
                    <span>{{ p.name }}</span>
                    <span
                      v-if="p.prescriptionRequired"
                      class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                      title="Doctor Prescription Required"
                    >
                      Rx
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-slate-400 group-hover:text-slate-500">
                    SKU: {{ p.sku }}
                  </div>
                </NuxtLink>
              </td>

              <!-- Category -->
              <td class="py-3 px-4 text-slate-600 dark:text-slate-300">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-normal">
                  {{ p.category?.name || 'Uncategorized' }}
                </span>
              </td>

              <!-- Price -->
              <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                ₹{{ Number(p.price).toFixed(2) }}
              </td>

              <!-- Real-time Stock Toggle Button -->
              <td class="py-3 px-4 text-center">
                <button
                  type="button"
                  :disabled="isTogglingStock === p.id || !canUpdateStock"
                  @click="toggleStock(p)"
                  :class="[
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border shadow-2xs',
                    p.stockStatus === 'in_stock'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                  ]"
                  :title="canUpdateStock ? 'Click to toggle stock status' : 'Stock status'"
                >
                  <span
                    :class="[
                      'w-2 h-2 rounded-full',
                      p.stockStatus === 'in_stock' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    ]"
                  ></span>
                  <span>{{ p.stockStatus === 'in_stock' ? 'In Stock' : 'Out of Stock' }}</span>
                  <span v-if="isTogglingStock === p.id" class="animate-spin text-[10px]">⟳</span>
                </button>
              </td>

              <!-- Lifecycle Status -->
              <td class="py-3 px-4">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    p.status === 'approved'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                      : p.status === 'draft'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  ]"
                >
                  {{ p.status }}
                </span>
              </td>

              <!-- Pack & Refill -->
              <td class="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                <div v-if="p.packSize">{{ p.packSize }}</div>
                <div v-if="p.refillDays" class="text-[10px] text-teal-600 dark:text-teal-400">
                  Refill: {{ p.refillDays }}d
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                <NuxtLink
                  :to="`/products/${p.id}`"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-block"
                  title="View Details"
                >
                  <UIcon name="i-heroicons-eye" class="w-4 h-4" />
                </NuxtLink>
                <button
                  v-if="canEditProduct"
                  type="button"
                  @click="openEditDrawer(p)"
                  class="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Edit Product"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <div>
          Page {{ pagination.page }} of {{ pagination.totalPages || 1 }}
        </div>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Stock Update Modal -->
    <div
      v-if="showBulkModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-teal-600" />
            <span>Bulk Stock Update</span>
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            @click="showBulkModal = false"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">
          Updating stock status for <strong class="text-teal-600">{{ selectedProductIds.length }}</strong> selected products simultaneously.
        </p>

        <!-- Target Status -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Target Stock Status</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              :class="[
                'p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all',
                bulkTargetStatus === 'in_stock'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              ]"
            >
              <input type="radio" value="in_stock" v-model="bulkTargetStatus" class="sr-only" />
              <span>✓ In Stock</span>
            </label>
            <label
              :class="[
                'p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all',
                bulkTargetStatus === 'out_of_stock'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600'
              ]"
            >
              <input type="radio" value="out_of_stock" v-model="bulkTargetStatus" class="sr-only" />
              <span>✕ Out of Stock</span>
            </label>
          </div>
        </div>

        <!-- Note / Reason -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Adjustment Note / Reason</label>
          <input
            v-model="bulkNote"
            type="text"
            placeholder="e.g., Weekly warehouse inventory reconciliation"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            @click="showBulkModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSubmittingBulk"
            @click="submitBulkStock"
            class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingBulk" class="animate-spin text-xs">⟳</span>
            <span>Apply to {{ selectedProductIds.length }} Items</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Product Drawer -->
    <div
      v-if="showProductDrawer"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
    >
      <div class="bg-white dark:bg-slate-800 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-right duration-200">
        <!-- Drawer Header -->
        <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              {{ editingProductId ? 'Edit Product' : 'Add New Product' }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ editingProductId ? 'Update pricing, dosage instructions, and catalog data' : 'Register a new proprietary or classical formulation' }}
            </p>
          </div>
          <button
            type="button"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="showProductDrawer = false"
          >
            ✕
          </button>
        </div>

        <!-- Form Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- SKU & Name -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU Code *</label>
              <input
                v-model="productForm.sku"
                type="text"
                :disabled="!!editingProductId"
                placeholder="e.g., MED-OIL-01"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 disabled:bg-slate-100"
              />
              <span v-if="editingProductId" class="text-[10px] text-slate-400 mt-0.5 block">SKU cannot be changed once created</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
              <input
                v-model="productForm.name"
                type="text"
                placeholder="e.g., Ksheerabala Thailam 101"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <!-- Category & Price -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              <select
                v-model="productForm.categoryId"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option :value="null" disabled>Select category</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (₹) *</label>
              <input
                v-model.number="productForm.price"
                type="number"
                min="0"
                step="0.01"
                placeholder="450.00"
                class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <!-- Price Change Reason if Editing -->
          <div v-if="editingProductId && isPriceChanged" class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1">
            <label class="block text-xs font-semibold text-amber-900 dark:text-amber-200">Price Change Reason (Logged to Audit)</label>
            <input
              v-model="productForm.priceChangeReason"
              type="text"
              placeholder="e.g., Raw herb market price revised"
              class="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <!-- Usage Description -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clinical Usage Description *</label>
            <textarea
              v-model="productForm.usageDescription"
              rows="3"
              placeholder="Indications, key active botanicals, and primary health benefits..."
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            ></textarea>
          </div>

          <!-- Pack Size & Shelf Life & Refill Days -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pack Size</label>
              <input
                v-model="productForm.packSize"
                type="text"
                placeholder="e.g., 200ml / 60 caps"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Shelf Life (Months)</label>
              <input
                v-model.number="productForm.shelfLifeMonths"
                type="number"
                min="1"
                placeholder="24"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Refill Cycle (Days)</label>
              <input
                v-model.number="productForm.refillDays"
                type="number"
                min="1"
                placeholder="30"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <!-- How to Use & Contraindications -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">How to Use / Dosage</label>
              <textarea
                v-model="productForm.howToUse"
                rows="2"
                placeholder="e.g., 2 tablets twice daily after meals with warm water"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
              ></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraindications</label>
              <textarea
                v-model="productForm.contraindications"
                rows="2"
                placeholder="e.g., Not recommended during pregnancy or for infants"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
              ></textarea>
            </div>
          </div>

          <!-- Prescription Checkbox -->
          <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-850/60 flex items-center justify-between">
            <div class="space-y-0.5">
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Prescription Required (Rx)</span>
              <span class="text-[11px] text-slate-500 block">Requires doctor verification before callers can confirm sale</span>
            </div>
            <input
              v-model="productForm.prescriptionRequired"
              type="checkbox"
              class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
          </div>

          <!-- Approval Confirmation Gate (Product Manager) -->
          <div v-if="canApprove" class="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/40 space-y-2">
            <div class="flex items-start gap-2.5">
              <input
                id="approvalGate"
                v-model="productForm.approvalConfirmed"
                type="checkbox"
                class="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-teal-300"
              />
              <label for="approvalGate" class="text-xs text-teal-900 dark:text-teal-200 leading-snug cursor-pointer select-none">
                <span class="font-semibold block mb-0.5">Compliance Approval Declaration</span>
                "The description uses only approved wording. It makes no claim to cure, guarantee, or replace a doctor's advice."
              </label>
            </div>
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            @click="showProductDrawer = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSavingProduct"
            @click="saveProduct"
            class="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <span v-if="isSavingProduct" class="animate-spin text-xs">⟳</span>
            <span>{{ editingProductId ? 'Save Changes' : 'Create Product' }}</span>
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

// Permissions
const canCreateProduct = computed(() => authStore.hasPermission('product.create'));
const canEditProduct = computed(() => authStore.hasPermission('product.edit'));
const canUpdateStock = computed(() => authStore.hasPermission('product.stock_update'));
const canApprove = computed(() => authStore.hasPermission('product.approve'));

// State
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const isLoading = ref(false);
const isTogglingStock = ref<number | null>(null);
const selectedProductIds = ref<number[]>([]);

const pagination = ref({
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
});

const filters = ref({
  search: '',
  categoryId: '',
  stockStatus: '',
  status: '',
  prescriptionRequired: '',
});

// Bulk Stock Modal
const showBulkModal = ref(false);
const bulkTargetStatus = ref('in_stock');
const bulkNote = ref('');
const isSubmittingBulk = ref(false);

// Add / Edit Product Drawer
const showProductDrawer = ref(false);
const editingProductId = ref<number | null>(null);
const originalPrice = ref<number | null>(null);
const isSavingProduct = ref(false);

const productForm = ref({
  sku: '',
  name: '',
  categoryId: null as number | null,
  price: 0,
  usageDescription: '',
  packSize: '',
  shelfLifeMonths: 24,
  refillDays: 30,
  howToUse: '',
  contraindications: '',
  prescriptionRequired: false,
  approvalConfirmed: false,
  priceChangeReason: '',
});

const isPriceChanged = computed(() => {
  return originalPrice.value !== null && originalPrice.value !== productForm.value.price;
});

const isAllSelected = computed(() => {
  return products.value.length > 0 && selectedProductIds.value.length === products.value.length;
});

const toggleSelectAll = (e: any) => {
  if (e.target.checked) {
    selectedProductIds.value = products.value.map((p) => p.id);
  } else {
    selectedProductIds.value = [];
  }
};

let searchTimer: any = null;
const debounceSearch = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    pagination.value.page = 1;
    fetchProducts();
  }, 300);
};

const setRxFilter = (val: string) => {
  filters.value.prescriptionRequired = val;
  pagination.value.page = 1;
  fetchProducts();
};

const fetchCategories = async () => {
  try {
    const res = await fetch(`${apiBase}/product-categories`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      categories.value = data.data || [];
    }
  } catch (err) {
    console.error('Failed to load categories', err);
  }
};

const fetchProducts = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('page', String(pagination.value.page));
    params.set('pageSize', String(pagination.value.pageSize));

    if (filters.value.search) params.set('search', filters.value.search);
    if (filters.value.categoryId) params.set('categoryId', String(filters.value.categoryId));
    if (filters.value.stockStatus) params.set('stockStatus', filters.value.stockStatus);
    if (filters.value.status) params.set('status', filters.value.status);
    if (filters.value.prescriptionRequired !== '') {
      params.set('prescriptionRequired', filters.value.prescriptionRequired);
    }

    const res = await fetch(`${apiBase}/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });

    if (res.ok) {
      const data = await res.json();
      products.value = data.products || [];
      pagination.value = data.pagination || pagination.value;
      selectedProductIds.value = [];
    }
  } catch (err) {
    console.error('Failed to load products', err);
  } finally {
    isLoading.value = false;
  }
};

const changePage = (page: number) => {
  pagination.value.page = page;
  fetchProducts();
};

const toggleStock = async (product: any) => {
  isTogglingStock.value = product.id;
  const newStatus = product.stockStatus === 'in_stock' ? 'out_of_stock' : 'in_stock';
  try {
    const res = await fetch(`${apiBase}/products/${product.id}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        stockStatus: newStatus,
        note: `Quick toggle via catalog view`,
      }),
    });
    if (res.ok) {
      product.stockStatus = newStatus;
    }
  } catch (err) {
    console.error('Failed to toggle stock', err);
  } finally {
    isTogglingStock.value = null;
  }
};

const submitBulkStock = async () => {
  if (selectedProductIds.value.length === 0) return;
  isSubmittingBulk.value = true;
  try {
    const res = await fetch(`${apiBase}/products/bulk-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        productIds: selectedProductIds.value,
        stockStatus: bulkTargetStatus.value,
        note: bulkNote.value || undefined,
      }),
    });
    if (res.ok) {
      showBulkModal.value = false;
      bulkNote.value = '';
      fetchProducts();
    }
  } catch (err) {
    console.error('Failed bulk stock update', err);
  } finally {
    isSubmittingBulk.value = false;
  }
};

const openAddDrawer = () => {
  editingProductId.value = null;
  originalPrice.value = null;
  productForm.value = {
    sku: '',
    name: '',
    categoryId: categories.value[0]?.id || null,
    price: 0,
    usageDescription: '',
    packSize: '',
    shelfLifeMonths: 24,
    refillDays: 30,
    howToUse: '',
    contraindications: '',
    prescriptionRequired: false,
    approvalConfirmed: false,
    priceChangeReason: '',
  };
  showProductDrawer.value = true;
};

const openEditDrawer = (product: any) => {
  editingProductId.value = product.id;
  originalPrice.value = Number(product.price);
  productForm.value = {
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    price: Number(product.price),
    usageDescription: product.usageDescription || '',
    packSize: product.packSize || '',
    shelfLifeMonths: product.shelfLifeMonths || 24,
    refillDays: product.refillDays || 30,
    howToUse: product.howToUse || '',
    contraindications: product.contraindications || '',
    prescriptionRequired: product.prescriptionRequired || false,
    approvalConfirmed: product.status === 'approved',
    priceChangeReason: '',
  };
  showProductDrawer.value = true;
};

const saveProduct = async () => {
  isSavingProduct.value = true;
  try {
    const url = editingProductId.value
      ? `${apiBase}/products/${editingProductId.value}`
      : `${apiBase}/products`;
    const method = editingProductId.value ? 'PUT' : 'POST';

    const payload: any = {
      ...productForm.value,
    };

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showProductDrawer.value = false;
      fetchProducts();
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to save product');
    }
  } catch (err) {
    console.error('Save product error', err);
  } finally {
    isSavingProduct.value = false;
  }
};

onMounted(() => {
  fetchCategories();
  fetchProducts();
});
</script>
