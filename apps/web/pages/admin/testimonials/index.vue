<template>
  <div class="space-y-6">
    <!-- Breadcrumb / Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
          <NuxtLink to="/admin" class="hover:text-teal-600">Admin</NuxtLink>
          <span>/</span>
          <span>Testimonials</span>
        </div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>📜</span>
          <span>{{ t('testimonials.library_admin') }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-semibold">
            {{ testimonials.length }} Total
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage the approved library of patient recovery experiences and clinical cases.
        </p>
      </div>

      <!-- Add Testimonial Button -->
      <div>
        <button
          type="button"
          @click="openAddModal"
          class="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
        >
          <span>+</span>
          <span>{{ t('testimonials.library_add') }}</span>
        </button>
      </div>
    </div>

    <!-- Plain Rule Banner -->
    <div class="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs">
      <span class="text-xl">⚖️</span>
      <div class="flex-1">
        <strong class="font-semibold">{{ t('testimonials.library_rule') }}</strong>
        <p class="text-xs text-teal-800 dark:text-teal-300 font-normal mt-0.5">
          {{ t('testimonials.pii_hint') }}
        </p>
      </div>
    </div>

    <!-- Filters Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- Search Input -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by title, summary, or reference..."
          class="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
        />
        <span class="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
      </div>

      <!-- Language Filter -->
      <div>
        <select
          v-model="filterLanguage"
          class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Languages</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <select
          v-model="filterStatus"
          class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Deactivated Only</option>
        </select>
      </div>
    </div>

    <!-- Testimonials List Table -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2">⟳</span>
        <p class="text-sm font-medium">Loading library items...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredItems.length === 0" class="p-12 text-center space-y-3">
        <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
          📜
        </div>
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">No testimonials found</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Add an approved testimonial with verified patient consent to populate the library.
        </p>
        <button
          type="button"
          @click="openAddModal"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
        >
          + Add First Testimonial
        </button>
      </div>

      <!-- Table Body -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
              <th class="py-3.5 px-4">Type & Title</th>
              <th class="py-3.5 px-4">Language</th>
              <th class="py-3.5 px-4">Department</th>
              <th class="py-3.5 px-4">Consent Reference</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors"
            >
              <td class="py-3.5 px-4 max-w-xs">
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ getTypeIcon(item.type) }}</span>
                  <div class="truncate">
                    <a
                      :href="item.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 truncate block"
                    >
                      {{ item.title }} ↗
                    </a>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {{ item.summary }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded font-mono font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {{ item.language }}
                </span>
              </td>
              <td class="py-3.5 px-4">
                <span v-if="item.department" class="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium">
                  {{ item.department.labelEn }}
                </span>
                <span v-else class="text-slate-400">All</span>
              </td>
              <td class="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                {{ item.consentReference }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                    item.active
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  ]"
                >
                  {{ item.active ? 'Active' : 'Deactivated' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <button
                  type="button"
                  @click="openEditModal(item)"
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
                >
                  Edit
                </button>
                <button
                  v-if="item.active"
                  type="button"
                  @click="deactivateItem(item.id)"
                  class="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                >
                  Deactivate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="closeModal" />

      <div class="flex min-h-full items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">
              {{ editingId ? t('testimonials.library_edit') : t('testimonials.library_add') }}
            </h3>
            <button type="button" @click="closeModal" class="text-slate-400 hover:text-slate-600 text-xl leading-none">
              &times;
            </button>
          </div>

          <!-- PII Real-time Warning Banner -->
          <div
            v-if="hasPiiWarning"
            class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold"
          >
            ⚠️ Privacy Violation: Phone number pattern detected in title or summary. Please remove it before saving.
          </div>

          <form @submit.prevent="submitForm" class="space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ t('testimonials.item_title') }} *
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Knee Osteoarthritis Ayurvedic Recovery"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {{ t('testimonials.item_type') }} *
                </label>
                <select
                  v-model="form.type"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="video">Video (🎥)</option>
                  <option value="text">Text (📝)</option>
                  <option value="pdf">PDF (📄)</option>
                  <option value="image">Image (🖼️)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {{ t('testimonials.item_language') }} *
                </label>
                <select
                  v-model="form.language"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="en">English (EN)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ t('testimonials.item_url') }} *
              </label>
              <input
                v-model="form.url"
                type="url"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 font-mono"
                placeholder="https://cdn.hospital.test/testimonials/knee-recovery.mp4"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ t('testimonials.item_department') }}
              </label>
              <select
                v-model="form.departmentId"
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              >
                <option :value="null">All Departments</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">
                  {{ d.labelEn }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ t('testimonials.item_summary') }} *
              </label>
              <textarea
                v-model="form.summary"
                rows="3"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 leading-relaxed"
                placeholder="Short summary for the telecaller describing recovery highlights. No patient names or phone numbers."
              ></textarea>
              <span class="text-[11px] text-slate-400 mt-0.5 block">
                {{ t('testimonials.pii_hint') }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ t('testimonials.item_consent_reference') }} *
              </label>
              <input
                v-model="form.consentReference"
                type="text"
                required
                class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 font-mono"
                placeholder="e.g. CONSENT-FORM-2026-089"
              />
            </div>

            <!-- Mandatory Consent Confirmation Checkbox -->
            <div class="pt-2">
              <label class="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.consentConfirmed"
                  required
                  class="mt-0.5 h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span class="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  I confirm that the patient has provided written, documented consent to share this feedback publicly.
                </span>
              </label>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                @click="closeModal"
                class="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || hasPiiWarning || !form.consentConfirmed || !form.consentReference.trim()"
                class="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-2"
              >
                <span v-if="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ editingId ? 'Update Testimonial' : 'Save Testimonial' }}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { containsPhoneNumber } from '@hospital-crm/shared';
import { useAuthStore } from '~/stores/auth';

const { t, locale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const testimonials = ref<any[]>([]);
const departments = ref<any[]>([]);
const isLoading = ref(true);
const isSubmitting = ref(false);

const searchQuery = ref('');
const filterLanguage = ref('');
const filterStatus = ref('');

const isModalOpen = ref(false);
const editingId = ref<number | null>(null);

const form = ref({
  title: '',
  type: 'video',
  url: '',
  language: 'en',
  departmentId: null as number | null,
  summary: '',
  consentConfirmed: true,
  consentReference: '',
});

const hasPiiWarning = computed(() => {
  return containsPhoneNumber(form.value.title) || containsPhoneNumber(form.value.summary);
});

const filteredItems = computed(() => {
  return testimonials.value.filter((item) => {
    if (filterLanguage.value && item.language !== filterLanguage.value) return false;
    if (filterStatus.value === 'active' && !item.active) return false;
    if (filterStatus.value === 'inactive' && item.active) return false;

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.consentReference.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return '🎥';
    case 'pdf': return '📄';
    case 'image': return '🖼️';
    default: return '📝';
  }
}

async function fetchTestimonials() {
  isLoading.value = true;
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;
    const res = await fetch(`${apiBase}/testimonials`, { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      testimonials.value = data.testimonials || [];
    }
  } catch (err) {
    console.error('Failed to load testimonials', err);
  } finally {
    isLoading.value = false;
  }
}

async function fetchDepartments() {
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;
    const res = await fetch(`${apiBase}/picklists/departments`, { headers, credentials: 'include' });
    if (res.ok) {
      departments.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load departments', err);
  }
}

onMounted(() => {
  fetchTestimonials();
  fetchDepartments();
});

function openAddModal() {
  editingId.value = null;
  form.value = {
    title: '',
    type: 'video',
    url: '',
    language: 'en',
    departmentId: null,
    summary: '',
    consentConfirmed: true,
    consentReference: '',
  };
  isModalOpen.value = true;
}

function openEditModal(item: any) {
  editingId.value = item.id;
  form.value = {
    title: item.title,
    type: item.type,
    url: item.url,
    language: item.language,
    departmentId: item.departmentId,
    summary: item.summary,
    consentConfirmed: item.consentConfirmed,
    consentReference: item.consentReference,
  };
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
}

async function submitForm() {
  if (hasPiiWarning.value || !form.value.consentConfirmed || !form.value.consentReference.trim()) {
    return;
  }

  isSubmitting.value = true;
  try {
    const url = editingId.value
      ? `${apiBase}/testimonials/${editingId.value}`
      : `${apiBase}/testimonials`;

    const method = editingId.value ? 'PATCH' : 'POST';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: JSON.stringify(form.value),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to save testimonial');
    }

    closeModal();
    fetchTestimonials();
  } catch (err: any) {
    alert(err.message || 'Save failed');
  } finally {
    isSubmitting.value = false;
  }
}

async function deactivateItem(id: number) {
  if (!confirm('Are you sure you want to deactivate this testimonial? It will no longer be available for telecallers to send.')) {
    return;
  }

  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/testimonials/${id}/deactivate`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      fetchTestimonials();
    }
  } catch (err) {
    console.error('Failed to deactivate', err);
  }
}
</script>
