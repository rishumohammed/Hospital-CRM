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

      <div
        @click="activeFilter = 'escalations'"
        class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-rose-400 transition-colors"
      >
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Escalations (1h SLA)</p>
        <p class="text-2xl font-black mt-1" :class="pendingEscalationsCount > 0 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-900 dark:text-slate-100'">
          {{ pendingEscalationsCount }}
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
        <span
          v-if="f.key === 'escalations' && pendingEscalationsCount > 0"
          class="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white font-bold"
        >
          {{ pendingEscalationsCount }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Escalations View -->
    <div v-else-if="activeFilter === 'escalations'" class="space-y-4">
      <div
        v-if="escalations.length === 0"
        class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
          <UIcon name="i-heroicons-shield-check" class="w-8 h-8 text-emerald-500" />
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
          No Clinical Escalations
        </h3>
        <p class="text-xs text-slate-500 mt-1">
          No clinical red flag alerts require your review at this time.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="esc in escalations"
          :key="esc.id"
          class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span
                :class="[
                  'text-[10px] font-black uppercase px-2.5 py-1 rounded-full',
                  esc.status === 'pending'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                ]"
              >
                {{ esc.status }}
              </span>

              <span
                :class="[
                  'text-xs font-mono font-bold',
                  isOverdue(esc.dueAt) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                ]"
              >
                1h SLA Due: {{ new Date(esc.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                <span v-if="isOverdue(esc.dueAt)" class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white">OVERDUE</span>
              </span>
            </div>

            <div>
              <h4 class="font-bold text-slate-900 dark:text-slate-100 text-base">
                <NuxtLink :to="`/cases/${esc.caseId}`" class="hover:text-teal-600 transition-colors">
                  {{ esc.case?.patient?.name }}
                </NuxtLink>
              </h4>
              <p class="text-xs text-slate-500 font-mono mt-0.5">
                📞 {{ esc.case?.patient?.mobileNorm }} &bull; Case #{{ esc.caseId }}
              </p>
            </div>

            <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p class="font-bold flex items-center gap-1">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-rose-600" />
                Red Flag Clinical Concern:
              </p>
              <p class="leading-relaxed">{{ esc.reason }}</p>
            </div>

            <div v-if="esc.decision" class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <p class="font-bold flex items-center gap-1">
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-emerald-600" />
                Doctor's Decision (Dr. {{ esc.decidedUser?.name }}):
              </p>
              <p class="leading-relaxed">{{ esc.decision }}</p>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">
              Raised by {{ esc.raisedUser?.name }} &bull; {{ new Date(esc.createdAt).toLocaleDateString() }}
            </span>

            <UButton
              v-if="esc.status === 'pending'"
              @click="openDecisionModal(esc)"
              color="rose"
              size="sm"
              icon="i-heroicons-clipboard-document-check"
              class="min-h-[38px]"
            >
              Record Decision
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State for Patient Queues -->
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

    <!-- Record Doctor Decision Modal -->
    <UModal v-model="showDecisionModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
            Record Clinical Decision
          </h3>
          <button @click="showDecisionModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <div v-if="selectedEscalation" class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
          <p class="font-bold text-slate-700 dark:text-slate-300">
            Patient: {{ selectedEscalation.case?.patient?.name }} ({{ selectedEscalation.case?.patient?.mobileNorm }})
          </p>
          <p class="text-rose-600 dark:text-rose-400">
            <strong>Concern:</strong> {{ selectedEscalation.reason }}
          </p>
        </div>

        <form @submit.prevent="submitDecision" class="space-y-4">
          <!-- Quick Decision Presets -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
              Quick Decision Templates
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="decisionForm.decision = 'Emergency Hospital Visit Advised. Ask patient to proceed to nearest casualty / hospital immediately.'"
                class="p-2 text-left rounded-xl border border-rose-200 hover:bg-rose-50 text-[11px] font-semibold text-rose-800 dark:border-rose-900 dark:text-rose-300 transition-colors"
              >
                🚨 Emergency Visit Advised
              </button>
              <button
                type="button"
                @click="decisionForm.decision = 'Adjust prescription: Discontinue current medication until review. Take prescribed SOS tablet.'"
                class="p-2 text-left rounded-xl border border-amber-200 hover:bg-amber-50 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:text-amber-300 transition-colors"
              >
                💊 Adjust Medication
              </button>
              <button
                type="button"
                @click="decisionForm.decision = 'Symptoms are mild / expected post-treatment reaction. Reassure patient, keep hydrated, and schedule review in 48 hours.'"
                class="p-2 text-left rounded-xl border border-emerald-200 hover:bg-emerald-50 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900 dark:text-emerald-300 transition-colors"
              >
                ✅ Reassure & Monitor
              </button>
              <button
                type="button"
                @click="decisionForm.decision = 'Doctor will call the patient directly within 30 minutes for telephonic evaluation.'"
                class="p-2 text-left rounded-xl border border-blue-200 hover:bg-blue-50 text-[11px] font-semibold text-blue-800 dark:border-blue-900 dark:text-blue-300 transition-colors"
              >
                📞 Doctor Direct Call
              </button>
            </div>
          </div>

          <!-- Decision Text -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Doctor's Clinical Instructions for Telecaller *
            </label>
            <textarea
              v-model="decisionForm.decision"
              rows="3"
              required
              placeholder="Clinical decision and instructions to relay back to the patient..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <!-- Alert explaining acceptance test 10 callback task -->
          <div class="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200">
            <p class="font-bold flex items-center gap-1">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-teal-600" />
              Hot Callback Notification
            </p>
            <p class="mt-0.5">
              Submitting this decision transitions the escalation to <strong>decided</strong> and creates an immediate high-priority hot callback task for the aftercare telecaller.
            </p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <UButton
              type="button"
              @click="showDecisionModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingDecision"
              color="teal"
              class="min-h-[44px]"
            >
              Submit Decision
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

const myCases = ref<any[]>([]);
const escalations = ref<any[]>([]);
const loading = ref(true);
const activeFilter = ref('all');

const showDecisionModal = ref(false);
const submittingDecision = ref(false);
const selectedEscalation = ref<any>(null);
const decisionForm = ref({
  decision: '',
});

const queueFilters = [
  { key: 'all', label: 'All Patients' },
  { key: 'awaiting', label: 'Awaiting Consultation Outcome' },
  { key: 'in_patient', label: 'Advised In-Patient' },
  { key: 'completed', label: 'Completed' },
  { key: 'escalations', label: 'Clinical Escalations (1h SLA)' },
];

const awaitingOutcomeCount = computed(() => {
  return myCases.value.filter((c) => c.stage === 'visited').length;
});

const advisedAdmissionCount = computed(() => {
  return myCases.value.filter((c) => c.advisedAdmission).length;
});

const pendingEscalationsCount = computed(() => {
  return escalations.value.filter((e) => e.status === 'pending').length;
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

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

function openDecisionModal(esc: any) {
  selectedEscalation.value = esc;
  decisionForm.value = {
    decision: '',
  };
  showDecisionModal.value = true;
}

async function submitDecision() {
  if (!selectedEscalation.value || !decisionForm.value.decision) return;
  submittingDecision.value = true;
  try {
    await $fetch(`${config.public.apiBase}/escalations/${selectedEscalation.value.id}/decision`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        decision: decisionForm.value.decision,
      },
    });

    showDecisionModal.value = false;
    await fetchEscalations();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to submit decision');
  } finally {
    submittingDecision.value = false;
  }
}

async function fetchMyCases() {
  try {
    const res = await $fetch<{ cases: any[] }>(`${config.public.apiBase}/cases?pageSize=50`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    myCases.value = res.cases || [];
  } catch (err) {
    console.error('Failed to load doctor cases:', err);
  }
}

async function fetchEscalations() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/escalations`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    escalations.value = res.data || [];
  } catch (err) {
    console.error('Failed to load escalations:', err);
  }
}

async function loadData() {
  loading.value = true;
  await Promise.all([fetchMyCases(), fetchEscalations()]);
  loading.value = false;
}

onMounted(() => {
  loadData();
});
</script>

