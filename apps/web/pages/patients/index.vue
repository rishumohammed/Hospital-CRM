<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Patients Directory
          </h1>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            All Patients
          </span>
        </div>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete list of registered patients, their treatment history, and doctor notes.
        </p>
      </div>

      <div v-if="canSeeCases" class="flex items-center gap-2">
        <NuxtLink
          to="/cases"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 min-h-[40px] shadow-2xs"
        >
          <UIcon name="i-heroicons-queue-list" class="w-4 h-4 text-teal-600" />
          <span>Clinical Stage Pipeline</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Search & Filters Bar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
      <div class="flex flex-col md:flex-row gap-3">
        <!-- Search Input -->
        <div class="flex-1 relative">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            class="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            placeholder="Search by Patient Name, Patient Code (PAT-XXXX), or Mobile Number..."
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 absolute left-3 top-3 text-slate-400" />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''; handleSearch()"
            class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Care Status Filter Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            v-for="st in statusFilters"
            :key="st.key"
            type="button"
            @click="selectedCareStatus = st.key; page = 1; fetchPatients()"
            :class="[
              'px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[44px]',
              selectedCareStatus === st.key
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            ]"
          >
            {{ st.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Patients Directory List -->
    <div class="space-y-3">
      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-slate-500">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
        <p class="text-sm font-medium">Loading patients directory...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="patients.length === 0"
        class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
          <UIcon name="i-heroicons-user-group" class="w-8 h-8" />
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
          No Registered Patients Found
        </h3>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {{ searchQuery ? 'No patient records matched your search query.' : 'Patients will automatically appear here once they complete their initial doctor consultation.' }}
        </p>
      </div>

      <!-- Patient Cards -->
      <div
        v-else
        v-for="p in patients"
        :key="p.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <!-- Patient Identity & Clinical History -->
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-xs">
            {{ p.name ? p.name.charAt(0).toUpperCase() : 'P' }}
          </div>

          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="`/patients/${p.id}`"
                class="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer"
              >
                {{ p.name }}
              </NuxtLink>

              <span class="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {{ p.patientCode }}
              </span>

              <!-- Active vs Completed Badge -->
              <span
                v-if="p.activeCase"
                class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                In Treatment: {{ formatStage(p.activeCase.stage) }}
              </span>
              <span
                v-else
                class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              >
                Treatment Completed
              </span>
            </div>

            <!-- Sub Details: Mobile, Branch, Last Doctor Visit -->
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span class="flex items-center gap-1 font-mono">
                <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5" />
                {{ p.mobile }}
              </span>
              <span>&bull;</span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5" />
                {{ p.branch?.name || 'Main Centre' }}
              </span>
              <span v-if="p.latestCase">&bull;</span>
              <span v-if="p.latestCase" class="text-slate-700 dark:text-slate-300">
                Last doctor: <strong>Dr. {{ p.latestCase.doctor }}</strong> ({{ p.latestCase.department }})
              </span>
              <span>&bull;</span>
              <span class="text-teal-700 dark:text-teal-400 font-semibold">
                {{ p.totalCasesCount }} {{ p.totalCasesCount === 1 ? 'Visit' : 'Visits' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right Side Actions -->
        <div class="flex items-center gap-2 self-end md:self-center">
          <NuxtLink
            :to="`/patients/${p.id}`"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 min-h-[40px] shadow-xs cursor-pointer"
          >
            <span>View Patient File</span>
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="pagination.totalPages > 1"
      class="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs"
    >
      <span class="text-slate-500">
        Showing Page {{ pagination.page }} of {{ pagination.totalPages }} (Total: {{ pagination.total }} patients)
      </span>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="pagination.page <= 1"
          @click="page--; fetchPatients()"
          class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          :disabled="pagination.page >= pagination.totalPages"
          @click="page++; fetchPatients()"
          class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const canSeeCases = computed(() => {
  const role = ((authStore.user as any)?.roleCode || (authStore.user as any)?.role?.code || authStore.user?.role || '').toString().toLowerCase();
  if (['support_telecaller', 'caller'].includes(role)) return false;
  return authStore.hasPermission('case.view');
});

const patients = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedCareStatus = ref<'all' | 'active' | 'completed'>('all');
const page = ref(1);

const pagination = reactive({
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
});

const statusFilters = [
  { key: 'all' as const, label: 'All Patients' },
  { key: 'active' as const, label: 'Currently in Treatment' },
  { key: 'completed' as const, label: 'Treatment Completed' },
];

let debounceTimer: any = null;

const handleSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchPatients();
  }, 350);
};

const formatStage = (stage: string) => {
  if (!stage) return 'In Progress';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const fetchPatients = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      pageSize: '20',
    });

    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim());
    }

    if (selectedCareStatus.value !== 'all') {
      params.append('careStatus', selectedCareStatus.value);
    }

    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/patients?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      patients.value = data.patients || [];
      if (data.pagination) {
        Object.assign(pagination, data.pagination);
      }
    }
  } catch (err) {
    console.error('Failed to load patients directory', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPatients();
});
</script>
