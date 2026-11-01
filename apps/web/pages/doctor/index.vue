<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-teal-500/20">
            Dr
          </span>
          <span>{{ t('cases.doctor_desk') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Consultation outcomes, treatment plans, and patient medical records
        </p>
      </div>
    </div>

    <!-- Stats Summary Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Patients</p>
        <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
          {{ myCases.length }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Outcome</p>
        <p class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
          {{ awaitingOutcomeCount }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advised Admission</p>
        <p class="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
          {{ advisedAdmissionCount }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Escalations</p>
        <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
          0
        </p>
      </div>
    </div>

    <!-- Queue Filters -->
    <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
      <button
        v-for="f in queueFilters"
        :key="f.key"
        type="button"
        @click="activeFilter = f.key"
        :class="[
          'px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px]',
          activeFilter === f.key
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        ]"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredCases.length === 0"
      class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
        <UIcon name="i-heroicons-user-group" class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        No patients in this queue
      </h3>
      <p class="text-xs text-slate-500 mt-1">
        All patients assigned to you are up to date.
      </p>
    </div>

    <!-- Cases List -->
    <div v-else class="space-y-3">
      <div
        v-for="c in filteredCases"
        :key="c.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex items-start space-x-4">
          <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {{ c.patient?.name ? c.patient.name.charAt(0).toUpperCase() : 'P' }}
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="`/cases/${c.id}`"
                class="font-black text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors text-base"
              >
                {{ c.patient?.name }}
              </NuxtLink>
              <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300">
                {{ c.patient?.patientCode }}
              </span>
              <span
                :class="[
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                  c.stage === 'visited' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                ]"
              >
                {{ c.stage.replace('_', ' ') }}
              </span>
              <span
                v-if="c.advisedAdmission"
                class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                In-Patient Advised
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span>Mobile: {{ c.patient?.mobileNorm }}</span>
              <span>•</span>
              <span>Dept: {{ c.department?.labelEn || 'Ayurveda' }}</span>
              <span v-if="c.estimatedAmount">•</span>
              <span v-if="c.estimatedAmount" class="font-bold text-teal-600">
                ₹{{ Number(c.estimatedAmount).toLocaleString('en-IN') }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-2 self-end md:self-center">
          <NuxtLink
            :to="`/cases/${c.id}`"
            class="px-4 py-2 rounded-xl text-sm font-bold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <span>Record / Edit Outcome</span>
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const myCases = ref<any[]>([]);
const loading = ref(true);
const activeFilter = ref('all');

const queueFilters = [
  { key: 'all', label: 'All Patients' },
  { key: 'awaiting', label: 'Awaiting Consultation Outcome' },
  { key: 'in_patient', label: 'Advised In-Patient' },
  { key: 'completed', label: 'Completed' },
];

const awaitingOutcomeCount = computed(() => {
  return myCases.value.filter((c) => c.stage === 'visited').length;
});

const advisedAdmissionCount = computed(() => {
  return myCases.value.filter((c) => c.advisedAdmission).length;
});

const filteredCases = computed(() => {
  if (activeFilter.value === 'awaiting') {
    return myCases.value.filter((c) => c.stage === 'visited');
  }
  if (activeFilter.value === 'in_patient') {
    return myCases.value.filter((c) => c.advisedAdmission);
  }
  if (activeFilter.value === 'completed') {
    return myCases.value.filter((c) => c.stage === 'completed');
  }
  return myCases.value;
});

async function fetchMyCases() {
  loading.value = true;
  try {
    const res = await $fetch<{ cases: any[] }>(`${config.public.apiBase}/cases?pageSize=50`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    myCases.value = res.cases || [];
  } catch (err) {
    console.error('Failed to load doctor cases:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchMyCases();
});
</script>
