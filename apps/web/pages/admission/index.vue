<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center text-sm font-semibold shadow-md shadow-teal-500/20">
            🏥
          </span>
          <span>{{ t('admission.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t('desks.admission_desc') }}
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <UButton
          @click="loadAllData"
          color="gray"
          variant="soft"
          icon="i-heroicons-arrow-path"
          class="min-h-[44px]"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Manager KPI Cards -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {{ t('admission.advised_cases') }}
        </p>
        <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
          {{ report?.advised || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {{ t('admission.contacted_24h') }}
        </p>
        <p class="text-2xl font-semibold text-blue-600 dark:text-blue-400 mt-1">
          {{ report?.contactRate || 0 }}%
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          In Counseling
        </p>
        <p class="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
          {{ report?.counselingBooked || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Deposit Paid
        </p>
        <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
          {{ report?.accepted || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Admitted
        </p>
        <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
          {{ report?.admitted || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Declined
        </p>
        <p class="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">
          {{ report?.declined || 0 }}
        </p>
      </div>
    </div>

    <!-- Overdue Follow-ups Alert Banner -->
    <div
      v-if="report?.overdueFollowUps && report.overdueFollowUps.length > 0"
      class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-2 shadow-sm"
    >
      <div class="flex items-center gap-2 font-semibold text-sm">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-rose-600 animate-pulse" />
        <span>Overdue Admission Follow-ups (>24h without contact): {{ report.overdueFollowUps.length }} Cases</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
        <div
          v-for="overdue in report.overdueFollowUps"
          :key="overdue.id"
          class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs flex items-center justify-between"
        >
          <div>
            <NuxtLink :to="`/cases/${overdue.id}`" class="font-semibold hover:underline">
              {{ overdue.patientName }} ({{ overdue.patientCode }})
            </NuxtLink>
            <p class="text-[10px] text-slate-500">Overdue by {{ overdue.hoursOverdue }}h</p>
          </div>
          <NuxtLink
            :to="`/cases/${overdue.id}`"
            class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[10px]"
          >
            Call Now
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stage Pipeline Tabs -->
    <div class="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin">
      <button
        v-for="stg in pipelineTabs"
        :key="stg.key"
        type="button"
        @click="selectedStage = stg.key; fetchCases()"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px]',
          selectedStage === stg.key
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-semibold'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        ]"
      >
        {{ stg.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loadingCases" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="cases.length === 0"
      class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
        <UIcon name="i-heroicons-inbox" class="w-8 h-8" />
      </div>
      <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">
        No cases in this stage
      </h3>
      <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        There are currently no in-patient cases in this queue.
      </p>
    </div>

    <!-- Cases List -->
    <div v-else class="space-y-3">
      <div
        v-for="c in cases"
        :key="c.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <!-- Info Column -->
        <div class="flex items-start space-x-4">
          <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-semibold text-lg flex-shrink-0">
            {{ c.patient?.name ? c.patient.name.charAt(0).toUpperCase() : 'P' }}
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLink
                :to="`/cases/${c.id}`"
                class="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors text-base"
              >
                {{ c.patient?.name }}
              </NuxtLink>
              <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                {{ c.patient?.patientCode }}
              </span>

              <span
                :class="[
                  'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                  getStageBadgeClass(c.stage)
                ]"
              >
                {{ formatStage(c.stage) }}
              </span>

              <span
                v-if="c.depositReceived"
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1"
              >
                <UIcon name="i-heroicons-check-circle" class="w-3.5 h-3.5" />
                Deposit Received
              </span>
              <span
                v-else-if="c.stage !== 'not_started' && c.stage !== 'completed'"
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              >
                Deposit Pending
              </span>

              <span
                v-if="c.emergencyAdmission"
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
              >
                Emergency Override
              </span>
            </div>

            <!-- Meta details -->
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-phone" class="w-3.5 h-3.5" />
                {{ c.patient?.mobileNorm }}
              </span>
              <span>•</span>
              <span>Specialist: {{ c.owner?.name || 'Unassigned' }}</span>
              <span v-if="c.treatingDoctor">•</span>
              <span v-if="c.treatingDoctor">Doctor: Dr. {{ c.treatingDoctor.name }}</span>
              <span v-if="c.estimatedAmount">•</span>
              <span v-if="c.estimatedAmount" class="font-semibold text-teal-600 dark:text-teal-400">
                Estimate: ₹{{ Number(c.estimatedAmount).toLocaleString('en-IN') }}
              </span>
              <span v-if="c.expectedAdmissionDate">•</span>
              <span v-if="c.expectedAdmissionDate" class="text-slate-700 dark:text-slate-300 font-semibold">
                Expected: {{ new Date(c.expectedAdmissionDate).toLocaleDateString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-2 self-end md:self-center flex-wrap gap-y-2">
          <a
            :href="`tel:${c.patient?.mobileNorm}`"
            class="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 min-h-[44px]"
          >
            <UIcon name="i-heroicons-phone" class="w-4 h-4" />
            <span>Call</span>
          </a>

          <UButton
            @click="openAdvanceModal(c)"
            color="primary"
            variant="solid"
            class="min-h-[44px]"
          >
            {{ t('admission.advance_stage') }}
          </UButton>

          <NuxtLink
            :to="`/cases/${c.id}`"
            class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1 min-h-[44px]"
          >
            <span>View</span>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Advance Stage Modal -->
    <UModal v-model="showAdvanceModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('admission.advance_stage') }}: {{ activeCase?.patient?.name }}
          </h3>
          <button @click="showAdvanceModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitAdvanceStage" class="space-y-4">
          <!-- Target Stage Selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Select Next Stage *
            </label>
            <select
              v-model="advanceForm.stage"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="counseling_estimate">{{ t('cases.stages.counseling_estimate') }}</option>
              <option value="plan_accepted">{{ t('cases.stages.plan_accepted') }} (Deposit Paid)</option>
              <option value="in_treatment">{{ t('cases.stages.in_treatment') }} (Admitted)</option>
              <option value="not_started">{{ t('cases.stages.not_started') }} (Declined)</option>
            </select>
          </div>

          <!-- Fields for Counseling / Estimate -->
          <div v-if="advanceForm.stage === 'counseling_estimate'" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Estimated Treatment Amount (₹)
              </label>
              <input
                v-model.number="advanceForm.estimatedAmount"
                type="number"
                min="0"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <!-- Fields for Plan Accepted (Deposit & Expected Date) -->
          <div v-if="advanceForm.stage === 'plan_accepted'" class="space-y-3">
            <div class="flex items-center space-x-2">
              <input
                id="depRec"
                v-model="advanceForm.depositReceived"
                type="checkbox"
                class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="depRec" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deposit Received (50% Advance)
              </label>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Deposit Amount (₹)
              </label>
              <input
                v-model.number="advanceForm.depositAmount"
                type="number"
                min="0"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Expected Admission Date
              </label>
              <input
                v-model.number="advanceForm.expectedAdmissionDate"
                type="date"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <!-- Fields for Admitted (In-Treatment) & Deposit Gate -->
          <div v-if="advanceForm.stage === 'in_treatment'" class="space-y-3">
            <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <p class="font-semibold flex items-center gap-1">
                <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-amber-600" />
                Admission Deposit Gate
              </p>
              <p class="mt-1">
                In-patient admission requires advance deposit received or an emergency override with medical reason.
              </p>
            </div>

            <div class="flex items-center space-x-2">
              <input
                id="admitDep"
                v-model="advanceForm.depositReceived"
                type="checkbox"
                class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="admitDep" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Advance Deposit Confirmed Received
              </label>
            </div>

            <!-- Emergency Admission Override -->
            <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div class="flex items-center space-x-2">
                <input
                  id="emgAdm"
                  v-model="advanceForm.emergencyAdmission"
                  type="checkbox"
                  class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <label for="emgAdm" class="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  🚨 Emergency Admission Override (Waive Deposit Gate)
                </label>
              </div>

              <div v-if="advanceForm.emergencyAdmission" class="mt-2">
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Emergency Justification Reason *
                </label>
                <textarea
                  v-model="advanceForm.emergencyReason"
                  rows="2"
                  required
                  placeholder="e.g. Acute life-threatening trauma / MD approved waiver"
                  class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Fields for Declined (Not Started) -->
          <div v-if="advanceForm.stage === 'not_started'" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Decline Reason *
              </label>
              <select
                v-model="advanceForm.notStartedReasonId"
                required
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              >
                <option :value="null" disabled>Select Reason</option>
                <option v-for="dr in declineReasons" :key="dr.id" :value="dr.id">
                  {{ dr.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- General Note -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Transition Note (Optional)
            </label>
            <input
              v-model="advanceForm.note"
              type="text"
              placeholder="e.g. Patient accepted counseling terms"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
            />
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3">
            <UButton
              type="button"
              @click="showAdvanceModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingAdvance"
              color="primary"
              class="min-h-[44px]"
            >
              Update Stage
            </UButton>
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const report = ref<any>(null);
const cases = ref<any[]>([]);
const declineReasons = ref<any[]>([]);
const loadingCases = ref(false);
const selectedStage = ref('plan_given');

const showAdvanceModal = ref(false);
const activeCase = ref<any>(null);
const submittingAdvance = ref(false);

const advanceForm = ref({
  stage: 'counseling_estimate',
  estimatedAmount: null as number | null,
  depositReceived: false,
  depositAmount: null as number | null,
  expectedAdmissionDate: '',
  emergencyAdmission: false,
  emergencyReason: '',
  notStartedReasonId: null as number | null,
  note: '',
});

const pipelineTabs = [
  { key: 'plan_given', label: 'Advised In-Patient' },
  { key: 'counseling_estimate', label: 'Counseling & Estimate' },
  { key: 'plan_accepted', label: 'Plan Accepted / Deposit Paid' },
  { key: 'in_treatment', label: 'Admitted (In Treatment)' },
  { key: 'not_started', label: 'Declined' },
];

function getStageBadgeClass(stage: string) {
  switch (stage) {
    case 'plan_given':
      return 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
    case 'counseling_estimate':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    case 'plan_accepted':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'in_treatment':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'not_started':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  }
}

function formatStage(stage: string) {
  return t(`cases.stages.${stage}`, stage);
}

async function fetchReport() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/reports/admission`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    report.value = res;
  } catch (err) {
    console.error('Failed to load admission report:', err);
  }
}

async function fetchCases() {
  loadingCases.value = true;
  try {
    const params = new URLSearchParams();
    params.append('team', 'admission');
    if (selectedStage.value) {
      params.append('stage', selectedStage.value);
    }

    const res = await $fetch<{ cases: any[] }>(
      `${config.public.apiBase}/cases?${params.toString()}`,
      {
        headers: { authorization: `Bearer ${authStore.token}` },
      }
    );
    cases.value = res.cases || [];
  } catch (err) {
    console.error('Failed to load admission cases:', err);
  } finally {
    loadingCases.value = false;
  }
}

async function fetchDeclineReasons() {
  try {
    const res = await $fetch<any[]>(`${config.public.apiBase}/picklists/decline_reasons`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    declineReasons.value = res || [];
  } catch (err) {
    console.error('Failed to load decline reasons:', err);
  }
}

function openAdvanceModal(c: any) {
  activeCase.value = c;
  advanceForm.value = {
    stage: c.stage === 'plan_given' ? 'counseling_estimate' : (c.stage === 'counseling_estimate' ? 'plan_accepted' : 'in_treatment'),
    estimatedAmount: c.estimatedAmount ? Number(c.estimatedAmount) : null,
    depositReceived: !!c.depositReceived,
    depositAmount: c.depositAmount ? Number(c.depositAmount) : (c.estimatedAmount ? Math.round(Number(c.estimatedAmount) * 0.5) : null),
    expectedAdmissionDate: '',
    emergencyAdmission: !!c.emergencyAdmission,
    emergencyReason: c.emergencyReason || '',
    notStartedReasonId: c.notStartedReasonId || null,
    note: '',
  };
  showAdvanceModal.value = true;
}

async function submitAdvanceStage() {
  if (!activeCase.value) return;
  submittingAdvance.value = true;
  try {
    const payload: any = {
      stage: advanceForm.value.stage,
      estimatedAmount: advanceForm.value.estimatedAmount,
      depositReceived: advanceForm.value.depositReceived,
      depositAmount: advanceForm.value.depositAmount,
      expectedAdmissionDate: advanceForm.value.expectedAdmissionDate ? new Date(advanceForm.value.expectedAdmissionDate).toISOString() : null,
      emergencyAdmission: advanceForm.value.emergencyAdmission,
      emergencyReason: advanceForm.value.emergencyReason || null,
      notStartedReasonId: advanceForm.value.notStartedReasonId,
      note: advanceForm.value.note || undefined,
    };

    await $fetch(`${config.public.apiBase}/cases/${activeCase.value.id}/advance-stage`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showAdvanceModal.value = false;
    await Promise.all([fetchReport(), fetchCases()]);
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to advance case stage');
  } finally {
    submittingAdvance.value = false;
  }
}

async function loadAllData() {
  await Promise.all([fetchReport(), fetchCases(), fetchDeclineReasons()]);
}

onMounted(() => {
  loadAllData();
});
</script>
