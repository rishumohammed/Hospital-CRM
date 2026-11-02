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
          <span>Product Categories</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ categories.length }} Categories
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          2-level Ayurvedic taxonomy hierarchy, product reassignment, and category management
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2.5">
        <button
          v-if="canManageCategories"
          type="button"
          @click="openAddCategoryModal()"
          class="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5"
        >
          <span class="text-base leading-none">+</span>
          <span>Add Category</span>
        </button>
      </div>
    </div>

    <!-- Category Tree Cards -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2 text-teal-600">⟳</span>
        <p class="text-xs font-semibold">Loading category hierarchy...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="rootCategories.length === 0" class="p-12 text-center text-slate-400 text-xs">
        No product categories defined yet.
      </div>

      <!-- Tree Hierarchy List -->
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-700/60">
        <div
          v-for="root in rootCategories"
          :key="root.id"
          class="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors"
        >
          <!-- Root Category Row -->
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold text-base flex items-center justify-center shrink-0">
                📁
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {{ root.name }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {{ root._count?.products || 0 }} products
                  </span>
                </div>
                <div class="text-[11px] font-mono text-slate-400">
                  slug: {{ root.slug }}
                </div>
              </div>
            </div>

            <!-- Root Actions -->
            <div class="flex items-center gap-2">
              <button
                v-if="canManageCategories"
                type="button"
                @click="openAddCategoryModal(root.id)"
                class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-[11px] font-semibold transition-colors flex items-center gap-1"
                title="Add Subcategory under this category"
              >
                <span>+</span>
                <span>Subcategory</span>
              </button>

              <button
                v-if="canManageCategories && (root._count?.products || 0) > 0"
                type="button"
                @click="openMoveProductsModal(root)"
                class="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                title="Move Products to another category"
              >
                <UIcon name="i-heroicons-arrows-right-left" class="w-3.5 h-3.5" />
                <span>Move Products</span>
              </button>

              <button
                v-if="canManageCategories"
                type="button"
                @click="openEditCategoryModal(root)"
                class="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                title="Edit Category"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Child Subcategories (Level 2) -->
          <div
            v-if="root.children && root.children.length > 0"
            class="mt-3 ml-12 pl-4 border-l-2 border-slate-100 dark:border-slate-700/80 space-y-2.5"
          >
            <div
              v-for="child in root.children"
              :key="child.id"
              class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-700/50"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">↳</span>
                <span class="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {{ child.name }}
                </span>
                <span class="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {{ child._count?.products || 0 }} products
                </span>
                <span class="text-[10px] font-mono text-slate-400">
                  ({{ child.slug }})
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  v-if="canManageCategories && (child._count?.products || 0) > 0"
                  type="button"
                  @click="openMoveProductsModal(child)"
                  class="px-2 py-0.5 rounded-md border border-amber-200 text-amber-800 bg-amber-50 dark:bg-amber-950/40 text-[10px] font-semibold"
                >
                  Move
                </button>
                <button
                  v-if="canManageCategories"
                  type="button"
                  @click="openEditCategoryModal(child)"
                  class="p-1 rounded text-slate-400 hover:text-teal-600"
                >
                  <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Modal (Add / Edit) -->
    <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            {{ editingCategory ? 'Edit Category' : 'Create Category' }}
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1"
            @click="showCategoryModal = false"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
            <input
              v-model="categoryForm.name"
              type="text"
              placeholder="e.g., Classical Oils & Ghritams"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              @input="onNameInput"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slug *</label>
            <input
              v-model="categoryForm.slug"
              type="text"
              placeholder="classical-oils-ghritams"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Parent Category (Optional)</label>
            <select
              v-model="categoryForm.parentId"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option :value="null">None (Top-Level Category)</option>
              <option
                v-for="c in rootCategories.filter((r) => !editingCategory || r.id !== editingCategory.id)"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sort Order</label>
            <input
              v-model.number="categoryForm.sort"
              type="number"
              min="0"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="showCategoryModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!categoryForm.name || isSubmittingCategory"
            @click="saveCategory"
            class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isSubmittingCategory" class="animate-spin text-xs">⟳</span>
            <span>{{ editingCategory ? 'Update' : 'Create' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Move Products Modal -->
    <div
      v-if="showMoveModal"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-amber-600" />
            <span>Move Products</span>
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 p-1"
            @click="showMoveModal = false"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-500">
          Reassign all <strong class="text-slate-800 dark:text-slate-200">{{ sourceCategory?._count?.products || 0 }} products</strong> from
          <strong class="text-teal-600">{{ sourceCategory?.name }}</strong> to a new destination category.
        </p>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Category *</label>
          <select
            v-model="targetCategoryId"
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option :value="null" disabled>Select target category</option>
            <option
              v-for="c in categories.filter((c) => c.id !== sourceCategory?.id)"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            @click="showMoveModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!targetCategoryId || isMovingProducts"
            @click="submitMoveProducts"
            class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <span v-if="isMovingProducts" class="animate-spin text-xs">⟳</span>
            <span>Move All Products</span>
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

const canManageCategories = computed(() => authStore.hasPermission('product_category.manage'));

const categories = ref<any[]>([]);
const isLoading = ref(true);

const rootCategories = computed(() => {
  return categories.value.filter((c) => !c.parentId);
});

// Category Modal state
const showCategoryModal = ref(false);
const editingCategory = ref<any>(null);
const isSubmittingCategory = ref(false);
const categoryForm = ref({
  name: '',
  slug: '',
  parentId: null as number | null,
  sort: 1,
});

// Move Products Modal state
const showMoveModal = ref(false);
const sourceCategory = ref<any>(null);
const targetCategoryId = ref<number | null>(null);
const isMovingProducts = ref(false);

const onNameInput = () => {
  if (!editingCategory.value) {
    categoryForm.value.slug = categoryForm.value.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

const fetchCategories = async () => {
  isLoading.value = true;
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
  } finally {
    isLoading.value = false;
  }
};

const openAddCategoryModal = (parentId: number | null = null) => {
  editingCategory.value = null;
  categoryForm.value = {
    name: '',
    slug: '',
    parentId,
    sort: 1,
  };
  showCategoryModal.value = true;
};

const openEditCategoryModal = (category: any) => {
  editingCategory.value = category;
  categoryForm.value = {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId || null,
    sort: category.sort || 1,
  };
  showCategoryModal.value = true;
};

const saveCategory = async () => {
  if (!categoryForm.value.name) return;
  isSubmittingCategory.value = true;
  try {
    const url = editingCategory.value
      ? `${apiBase}/product-categories/${editingCategory.value.id}`
      : `${apiBase}/product-categories`;
    const method = editingCategory.value ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(categoryForm.value),
    });

    if (res.ok) {
      showCategoryModal.value = false;
      fetchCategories();
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to save category');
    }
  } catch (err) {
    console.error('Save category error', err);
  } finally {
    isSubmittingCategory.value = false;
  }
};

const openMoveProductsModal = (cat: any) => {
  sourceCategory.value = cat;
  targetCategoryId.value = null;
  showMoveModal.value = true;
};

const submitMoveProducts = async () => {
  if (!sourceCategory.value || !targetCategoryId.value) return;
  isMovingProducts.value = true;
  try {
    const res = await fetch(
      `${apiBase}/product-categories/${sourceCategory.value.id}/move-products`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          targetCategoryId: targetCategoryId.value,
        }),
      }
    );

    if (res.ok) {
      showMoveModal.value = false;
      fetchCategories();
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to move products');
    }
  } catch (err) {
    console.error('Move products error', err);
  } finally {
    isMovingProducts.value = false;
  }
};

onMounted(() => {
  fetchCategories();
});
</script>
