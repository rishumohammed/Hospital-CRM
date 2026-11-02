<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {{ t('cases.title') }}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t('desks.admission_desc') }}
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <UButton
          v-if="isDoctor"
          to="/doctor"
          icon="i-heroicons-user-plus"
          color="teal"
          variant="soft"
          class="min-h-[44px]"
        >
          {{ t('cases.doctor_desk') }}
        </UButton>
      </div>
    </div>

    <!-- Stage Pipeline Tabs -->
    <div class="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin">
      <button
        v-for="stg in stageTabs"
        :key="stg.key"
        type="button"
        @click="selectedStage = stg.key; fetchCases()"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px]',
          selectedStage === stg.key
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        ]"
      >
        {{ stg.label }}
      </button>
    </div>

    <!-- Filters & Search Bar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3">
      <!-- Search -->
      <div class="flex-1 relative">
        <input
          v-model="searchQuery"
          @keyup.enter="fetchCases"
          type="text"
          :placeholder="t('common.search')"
          class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''; fetchCases()"
          type="button"
          class="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Care Type Filter -->
      <select
        v-model="selectedCareType"
        @change="fetchCases"
        class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[44px]"
      >
        <option value="">{{ t('cases.care_type') }}: All</option>
        <option value="consultation_only">{{ t('cases.consultation_only') }}</option>
        <option value="opd_course">{{ t('cases.opd_course') }}</option>
        <option value="in_patient">{{ t('cases.in_patient') }}</option>
        <option value="procedure">{{ t('cases.procedure') }}</option>
      </select>

      <UButton
        @click="fetchCases"
        color="teal"
        icon="i-heroicons-magnifying-glass"
        class="min-h-[44px] justify-center"
      >
        {{ t('common.search') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="cases.length === 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
        <UIcon name="i-heroicons-briefcase" class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">
        {{ t('tasks.no_tasks') }}
      </h3>
      <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        No patient cases found matching your filters.
      </p>
    </div>

    <!-- Cases List Table / Cards -->
    <div v-else class="space-y-3">
      <div
        v-for="c in cases"
        :key="c.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <!-- Patient & Case Info -->
        <div class="flex items-start space-x-4">
          <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 font-semibold text-lg">
            {{ c.patient?.name ? c.patient.name.charAt(0).toUpperCase() : 'P' }}
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="`/cases/${c.id}`"
                class="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors text-base"
              >
                {{ c.patient?.name }}
              </NuxtLink>

              <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {{ c.patient?.patientCode }}
              </span>

              <!-- Stage Badge -->
              <span
                :class="[
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full',
                  getStageBadgeClass(c.stage)
                ]"
              >
                {{ formatStage(c.stage) }}
              </span>

              <!-- Advised Admission Badge -->
              <span
                v-if="c.advisedAdmission"
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1"
              >
                <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                {{ t('cases.advised_admission') }}
              </span>
            </div>

            <!-- Sub details -->
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5" />
                {{ c.patient?.mobileNorm }}
              </span>
              <span>•</span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5" />
                {{ c.department ? c.department.labelEn : 'Department' }}
              </span>
              <span v-if="c.treatingDoctor">•</span>
              <span v-if="c.treatingDoctor" class="flex items-center gap-1">
                <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
                Dr. {{ c.treatingDoctor.name }}
              </span>
              <span v-if="c.estimatedAmount">•</span>
              <span v-if="c.estimatedAmount" class="font-semibold text-teal-600 dark:text-teal-400">
                ₹{{ Number(c.estimatedAmount).toLocaleString('en-IN') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right Side Actions & Badges -->
        <div class="flex items-center space-x-2 self-end md:self-center">
          <NuxtLink
            :to="`/cases/${c.id}`"
            class="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <span>View Case</span>
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

const { t, locale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const isDoctor = computed(() => authStore.user?.role?.code === 'doctor');

const cases = ref<any[]>([]);
const loading = ref(false);
const selectedStage = ref('');
const selectedCareType = ref('');
const searchQuery = ref('');

const stageTabs = computed(() => [
  { key: '', label: t('cases.all_stages') },
  { key: 'visited', label: t('cases.stages.visited') },
  { key: 'plan_given', label: t('cases.stages.plan_given') },
  { key: 'counseling_estimate', label: t('cases.stages.counseling_estimate') },
  { key: 'plan_accepted', label: t('cases.stages.plan_accepted') },
  { key: 'in_treatment', label: t('cases.stages.in_treatment') },
  { key: 'aftercare_follow_up', label: t('cases.stages.aftercare_follow_up') },
  { key: 'completed', label: t('cases.stages.completed') },
]);

function getStageBadgeClass(stage: string) {
  switch (stage) {
    case 'visited':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
    case 'plan_given':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'counseling_estimate':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    case 'plan_accepted':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'in_treatment':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'aftercare_follow_up':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300';
    case 'completed':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  }
}

function formatStage(stage: string) {
  return t(`cases.stages.${stage}`, stage);
}

async function fetchCases() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedStage.value) params.append('stage', selectedStage.value);
    if (selectedCareType.value) params.append('careType', selectedCareType.value);
    if (searchQuery.value.trim()) params.append('search', searchQuery.value.trim());

    const res = await $fetch<{ cases: any[]; total: number }>(
      `${config.public.apiBase}/cases?${params.toString()}`,
      {
        headers: { authorization: `Bearer ${authStore.token}` },
      }
    );
    cases.value = res.cases || [];
  } catch (err) {
    console.error('Failed to load cases:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchCases();
});
</script>
