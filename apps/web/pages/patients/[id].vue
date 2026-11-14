<template>
  <div class="space-y-6">
    <!-- Top Bar with Back Button -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/patients"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        <span>Back to Patients</span>
      </NuxtLink>

      <span class="text-xs font-mono text-slate-400">
        Record ID: #{{ route.params.id }}
      </span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center text-slate-500">
      <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin mx-auto mb-3 text-teal-600" />
      <p class="text-base font-semibold text-slate-800 dark:text-slate-200">Loading Patient File...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
      <p class="text-rose-700 dark:text-rose-300 text-sm font-semibold">{{ errorMessage }}</p>
      <NuxtLink to="/patients" class="mt-3 inline-block text-xs font-bold text-rose-600 underline">
        Return to Patients
      </NuxtLink>
    </div>

    <div v-else-if="dossier" class="space-y-6">
      <!-- 1. Patient Master Profile Header -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-start gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center flex-shrink-0 font-bold text-2xl shadow-sm">
            {{ dossier.patient.name ? dossier.patient.name.charAt(0).toUpperCase() : 'P' }}
          </div>

          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {{ dossier.patient.name }}
              </h1>
              <span class="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                {{ dossier.patient.patientCode }}
              </span>
              <span
                v-if="dossier.metrics.activeCasesCount > 0"
                class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Currently in Treatment
              </span>
              <span
                v-else
                class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              >
                Treatment Completed
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span class="flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-slate-200">
                <UIcon name="i-heroicons-phone" class="w-4 h-4 text-teal-600" />
                {{ dossier.patient.mobile }}
              </span>
              <span v-if="dossier.patient.dateOfBirth">&bull;</span>
              <span v-if="dossier.patient.dateOfBirth">
                Age: {{ calculateAge(dossier.patient.dateOfBirth) }} yrs (DOB: {{ formatDate(dossier.patient.dateOfBirth) }})
              </span>
              <span>&bull;</span>
              <span class="flex items-center gap-1">
                <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
                {{ dossier.patient.branch?.name || 'Main Centre' }}
              </span>
              <span>&bull;</span>
              <span>
                Registered: {{ formatDate(dossier.patient.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Communication Actions -->
        <div class="flex flex-wrap items-center gap-2 self-start md:self-center">
          <a
            :href="`tel:${dossier.patient.mobileNorm}`"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors flex items-center gap-1.5 min-h-[40px]"
          >
            <UIcon name="i-heroicons-phone-arrow-up-right" class="w-4 h-4 text-emerald-600" />
            <span>Call Patient</span>
          </a>
          <a
            :href="`https://wa.me/${cleanPhone(dossier.patient.mobileNorm)}`"
            target="_blank"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 min-h-[40px]"
          >
            <span>💬 WhatsApp</span>
          </a>
        </div>
      </div>

      <!-- 2. Summary Metrics Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Doctor Consultations</span>
          <p class="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1">
            {{ dossier.metrics.totalCases }}
          </p>
          <span class="text-[11px] text-slate-400">Total visits</span>
        </div>

        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hospital Admissions</span>
          <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {{ dossier.metrics.inpatientAdmissions }}
          </p>
          <span class="text-[11px] text-slate-400">In-patient stays</span>
        </div>

        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed Treatments</span>
          <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {{ dossier.metrics.completedCases }}
          </p>
          <span class="text-[11px] text-slate-400">Finished care</span>
        </div>

        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">First Visit</span>
          <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2">
            {{ formatDate(dossier.metrics.firstVisitDate) }}
          </p>
          <span class="text-[11px] text-slate-400">Latest: {{ formatDate(dossier.metrics.lastVisitDate) }}</span>
        </div>
      </div>

      <!-- 3. Family Members Card (Shared Mobile) -->
      <div
        v-if="dossier.familyMembers && dossier.familyMembers.length > 0"
        class="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 p-5 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">👨‍👩‍👧</span>
            <h3 class="text-sm font-bold text-teal-950 dark:text-teal-200">
              Family Members (Same Phone Number) ({{ dossier.familyMembers.length }})
            </h3>
          </div>
          <span class="text-xs text-teal-700 dark:text-teal-300 font-medium">
            Same Contact: {{ dossier.patient.mobile }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <NuxtLink
            v-for="fm in dossier.familyMembers"
            :key="fm.id"
            :to="`/patients/${fm.id}`"
            class="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-teal-800/80 hover:border-teal-400 transition-all shadow-2xs flex items-center justify-between group cursor-pointer"
          >
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                {{ fm.name }}
              </p>
              <p class="text-[11px] font-mono text-slate-500">
                {{ fm.patientCode }}
              </p>
            </div>
            <span class="text-xs text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform">
              View &rarr;
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- 4. Visits & Treatments History -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5 text-teal-600" />
            <span>Visits & Treatments History ({{ dossier.cases.length }})</span>
          </h2>
          <span class="text-xs text-slate-400">History from newest to oldest</span>
        </div>

        <div v-if="dossier.cases.length === 0" class="p-8 bg-white dark:bg-slate-800 rounded-2xl text-center border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          No medical visits recorded yet.
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="(c, idx) in dossier.cases"
            :key="c.id"
            class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-2xs space-y-4"
          >
            <!-- Case Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div class="flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                  #{{ dossier.cases.length - idx }}
                </span>
                <div>
                  <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {{ c.department?.labelEn || 'General Medicine' }}
                  </h4>
                  <p class="text-xs text-slate-500">
                    Treating Doctor: <strong>Dr. {{ c.treatingDoctor?.name || 'Unassigned' }}</strong> &bull; Date: {{ formatDate(c.createdAt) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span :class="['text-xs font-bold px-2.5 py-1 rounded-full', getStageBadge(c.stage)]">
                  {{ formatStage(c.stage) }}
                </span>
                <NuxtLink
                  v-if="canSeeCases"
                  :to="`/cases/${c.id}`"
                  class="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  Case #{{ c.id }} Detail &rarr;
                </NuxtLink>
              </div>
            </div>

            <!-- Case Clinical Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 font-semibold block uppercase text-[10px]">Treatment Plan</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {{ formatCareType(c.careType) }}
                </span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 font-semibold block uppercase text-[10px]">Admission Status</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {{ c.advisedAdmission ? (c.admissionDate ? `Admitted on ${formatDate(c.admissionDate)}` : 'Advised In-Patient') : 'Consultation Only (OPD)' }}
                </span>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 font-semibold block uppercase text-[10px]">Discharge & Aftercare</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {{ c.dischargeDate ? `Discharged: ${formatDate(c.dischargeDate)}` : (c.stage === 'completed' ? 'Completed & Closed' : 'In Treatment') }}
                </span>
              </div>
            </div>

            <!-- Clinical Notes & Interactions from this Episode -->
            <div v-if="c.interactions && c.interactions.length > 0" class="pt-2">
              <p class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                <span>📝 Doctor &amp; Staff Notes:</span>
              </p>
              <div class="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                <div
                  v-for="inter in c.interactions"
                  :key="inter.id"
                  class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <span class="font-semibold text-slate-700 dark:text-slate-300">{{ inter.user?.name || 'Staff' }}:</span>
                    <span class="text-slate-600 dark:text-slate-400 ml-1">{{ inter.note || 'Interaction logged' }}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                    {{ formatDate(inter.occurredAt) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Original Inquiries (Lead History) -->
      <div v-if="dossier.inquiryHistory && dossier.inquiryHistory.length > 0" class="space-y-3 pt-2">
        <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span>📋</span>
          <span>Inquiry History ({{ dossier.inquiryHistory.length }})</span>
        </h3>
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 divide-y divide-slate-100 dark:divide-slate-700">
          <div
            v-for="lead in dossier.inquiryHistory"
            :key="lead.id"
            class="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          >
            <div>
              <span class="font-semibold text-slate-800 dark:text-slate-200">
                Inquiry #{{ lead.id }} &bull; {{ lead.department?.labelEn || 'General' }}
              </span>
              <p v-if="lead.concern" class="text-slate-500 mt-0.5">
                Concern: {{ lead.concern }}
              </p>
            </div>
            <div class="text-slate-400 text-right">
              <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold uppercase">
                Source: {{ lead.source?.labelEn || 'Direct' }}
              </span>
              <p class="text-[10px] font-mono mt-0.5">{{ formatDate(lead.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const canSeeCases = computed(() => {
  const role = ((authStore.user as any)?.roleCode || (authStore.user as any)?.role?.code || authStore.user?.role || '').toString().toLowerCase();
  if (['support_telecaller', 'caller'].includes(role)) return false;
  return authStore.hasPermission('case.view');
});

const dossier = ref<any | null>(null);
const loading = ref(true);
const errorMessage = ref('');

const calculateAge = (dob: string) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const cleanPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
};

const formatStage = (stage: string) => {
  if (!stage) return 'In Progress';
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatCareType = (careType: string) => {
  switch (careType) {
    case 'in_patient':
      return '🏥 In-Patient Admission';
    case 'opd_course':
      return '🌿 OPD Treatment Course';
    case 'procedure':
      return '🩺 Day Procedure';
    default:
      return '💬 Consultation Only';
  }
};

const getStageBadge = (stage: string) => {
  switch (stage) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'in_treatment':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
    case 'aftercare_follow_up':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300';
    case 'counseling_estimate':
    case 'plan_given':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
  }
};

const fetchDossier = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/patients/${route.params.id}`, {
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 404) {
        errorMessage.value = 'Patient record not found.';
      } else {
        errorMessage.value = 'Failed to load patient file.';
      }
      return;
    }

    const data = await res.json();
    dossier.value = data;
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error occurred while fetching patient file.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDossier();
});

watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      fetchDossier();
    }
  }
);
</script>

