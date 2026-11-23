<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
  >
    <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700 my-8 max-h-[90vh] flex flex-col justify-between overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xl font-bold shadow-inner">
            🏥
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
              Clinical Arrival & Consultation Decision
            </h3>
            <p v-if="lead" class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {{ lead.name }} <span class="text-slate-400">&bull;</span> {{ lead.mobile }}
              <span v-if="lead.department?.labelEn" class="text-teal-600 dark:text-teal-400 font-semibold ml-1">
                ({{ lead.department.labelEn }})
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="close"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable Content Body -->
      <div class="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
        <!-- Treating Doctor Selector -->
        <div>
          <label class="block font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
            Treating Doctor <span class="text-rose-500">*</span>
          </label>
          <select
            v-model="convertDoctorId"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 min-h-[42px] font-medium"
          >
            <option :value="null">-- Select Treating Doctor --</option>
            <option v-for="doc in convertDoctors" :key="doc.id" :value="doc.id">
              {{ (doc.role?.code === 'doctor' || (doc.role?.name || '').toLowerCase().includes('doctor') || doc.name.startsWith('Dr')) ? (doc.name.startsWith('Dr') ? doc.name : `Dr. ${doc.name}`) : doc.name }} ({{ doc.designation || doc.role?.name || 'Doctor' }})
            </option>
          </select>
        </div>

        <!-- Decision Options (3 Cards) -->
        <div>
          <label class="block font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
            Clinical Outcome & Pathway <span class="text-rose-500">*</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- 1. In-Patient Admission Required -->
            <div
              @click="convertDecision = 'in_patient'"
              :class="[
                'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2',
                convertDecision === 'in_patient'
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
              ]"
            >
              <div class="flex items-center space-x-2">
                <span class="text-xl">🛏️</span>
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Admission Required
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Patient advised hospital stay for intensive in-patient care.
              </p>
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 self-start">
                Routes to Admission Desk
              </span>
            </div>

            <!-- 2. Consultation Only -->
            <div
              @click="convertDecision = 'consultation_only'"
              :class="[
                'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2',
                convertDecision === 'consultation_only'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
              ]"
            >
              <div class="flex items-center space-x-2">
                <span class="text-xl">🩺</span>
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Consultation Only
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Prescription & advice given. Completed visit, no hospital admission.
              </p>
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 self-start">
                Routes to Aftercare Desk
              </span>
            </div>

            <!-- 3. Periodic OPD Treatment -->
            <div
              @click="convertDecision = 'opd_course'"
              :class="[
                'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2',
                convertDecision === 'opd_course'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
              ]"
            >
              <div class="flex items-center space-x-2">
                <span class="text-xl">🌿</span>
                <div class="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Periodic Treatment
                </div>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Outpatient therapy course (Panchakarma, Physio, Hijama, etc.)
              </p>
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start">
                Routes to Treatment Desk
              </span>
            </div>
          </div>
        </div>

        <!-- Dynamic Informational Panel based on Selected Pathway -->
        <!-- A. In-Patient Admission Required -->
        <div v-if="convertDecision === 'in_patient'" class="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs">
          <p class="text-[11px] text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <span class="text-base">🛏️</span>
            <span>Patient file will be routed to <strong>Admission Desk</strong> under stage <strong>Counseling & Estimate</strong> for bed allocation, counseling, and advance deposit.</span>
          </p>
        </div>

        <!-- B. Consultation Only Extra Info -->
        <div v-if="convertDecision === 'consultation_only'" class="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 text-xs">
          <p class="text-[11px] text-teal-800 dark:text-teal-200 flex items-start gap-2">
            <span class="text-base">🩺</span>
            <span>Patient consultation is marked completed. Patient file is routed to <strong>Aftercare Desk</strong> for medicine adherence, post-consultation recovery, and check-in calls.</span>
          </p>
        </div>

        <!-- C. Periodic OPD Treatment Info -->
        <div v-if="convertDecision === 'opd_course'" class="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs">
          <p class="text-[11px] text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
            <span class="text-base">🌿</span>
            <span>Patient is advised periodic outpatient therapies. Patient file is routed to <strong>Treatment Desk</strong> for therapy coordination and day-care session management.</span>
          </p>
        </div>

        <!-- Doctor Advice & Clinical Notes -->
        <div>
          <label class="block font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
            Doctor's Consultation Advice / Notes (Optional)
          </label>
          <textarea
            v-model="convertNote"
            rows="2"
            placeholder="e.g. Advised 14-day Panchakarma course; dietary restrictions prescribed..."
            class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
          ></textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
        <button
          type="button"
          @click="close"
          class="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="isSubmittingConvert || !convertDoctorId"
          @click="submitConvert"
          class="min-h-[40px] px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-md shadow-teal-500/20 cursor-pointer flex items-center gap-2"
        >
          <UIcon v-if="isSubmittingConvert" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ isSubmittingConvert ? 'Processing Decision...' : 'Confirm & Complete Visit' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead?: any;
  task?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'converted', data: any): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const rawApi = config.public.apiBase || '/api/v1';
const apiBase = rawApi.endsWith('/api/v1') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api/v1`;

const convertNote = ref('');
const isSubmittingConvert = ref(false);
const convertDecision = ref<'in_patient' | 'consultation_only' | 'opd_course'>('consultation_only');
const convertDoctorId = ref<number | null>(null);
const convertEstimatedAmount = ref<number | null>(null);
const convertTherapyId = ref<number | null>(null);
const convertFrequency = ref<'daily' | 'weekly' | 'alternate_days' | 'custom_weekdays'>('daily');
const convertTotalSessions = ref<number>(7);
const convertStartDate = ref<string>(new Date().toISOString().split('T')[0]);
const convertWeekdays = ref<number[]>([1, 3, 5]);
const convertTherapies = ref<any[]>([]);
const convertDoctors = ref<any[]>([]);

function toggleConvertWeekday(day: number) {
  if (convertWeekdays.value.includes(day)) {
    if (convertWeekdays.value.length > 1) {
      convertWeekdays.value = convertWeekdays.value.filter((d) => d !== day);
    }
  } else {
    convertWeekdays.value.push(day);
  }
}

async function loadConvertPicklists() {
  try {
    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;

    const [therapiesRes, doctorsRes, staffRes] = await Promise.all([
      fetch(`${apiBase}/therapies`, { headers, credentials: 'include' }).then((r) => r.json()).catch(() => []),
      fetch(`${apiBase}/doctors?activeOnly=true`, { headers, credentials: 'include' }).then((r) => r.json()).catch(() => []),
      fetch(`${apiBase}/users/staff`, { headers, credentials: 'include' }).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);

    convertTherapies.value = therapiesRes?.data || therapiesRes?.items || (Array.isArray(therapiesRes) ? therapiesRes : []);

    // 1. First prioritize active clinical doctors from /doctors directory
    const docList = Array.isArray(doctorsRes) ? doctorsRes : (doctorsRes?.doctors || []);

    if (docList.length > 0) {
      convertDoctors.value = docList;
    } else {
      // 2. Fall back to staff users who have doctor role or duty doctor flag
      const allStaff = Array.isArray(staffRes?.items)
        ? staffRes.items
        : Array.isArray(staffRes?.data)
        ? staffRes.data
        : Array.isArray(staffRes)
        ? staffRes
        : [];

      const doctors = allStaff.filter(
        (u: any) => u.role?.code === 'doctor' || u.roleCode === 'doctor' || u.dutyDoctor || (u.role?.name || '').toLowerCase().includes('doctor')
      );
      convertDoctors.value = doctors;
    }

    // Check if lead or task has an appointment with a specific doctor to auto-select
    const appt = props.lead?.appointments?.[0] || props.task?.lead?.appointments?.[0] || props.task?.case?.appointments?.[0];
    const apptDoctorName = appt?.doctorName;
    if (apptDoctorName) {
      const cleanApptName = apptDoctorName.replace(/^Dr\.?\s*/i, '').trim().toLowerCase();
      const matchApptDoc = convertDoctors.value.find((d: any) => {
        const cleanDocName = (d.name || '').replace(/^Dr\.?\s*/i, '').trim().toLowerCase();
        return cleanDocName.includes(cleanApptName) || cleanApptName.includes(cleanDocName);
      });
      if (matchApptDoc) {
        convertDoctorId.value = matchApptDoc.id;
        return;
      }
    }

    // Filter by lead's department if available
    const leadDeptId = props.lead?.departmentId || props.lead?.department?.id;
    if (!convertDoctorId.value && leadDeptId && docList.length > 0) {
      const deptDoc = docList.find((d: any) => d.departmentId === leadDeptId);
      if (deptDoc) {
        convertDoctorId.value = deptDoc.id;
        return;
      }
    }

    // Default doctor to current user ONLY if current user is an actual doctor
    if (!convertDoctorId.value && convertDoctors.value.length > 0) {
      const matchMe = convertDoctors.value.find((d: any) => d.id === authStore.user?.id);
      if (matchMe) {
        convertDoctorId.value = matchMe.id;
      }
    }
  } catch (err) {
    console.warn('Failed to load convert picklists', err);
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      convertDecision.value = 'consultation_only';
      convertNote.value = '';
      convertEstimatedAmount.value = null;
      convertTherapyId.value = null;
      convertTotalSessions.value = 7;
      convertStartDate.value = new Date().toISOString().split('T')[0];
      loadConvertPicklists();
    }
  }
);

function close() {
  emit('close');
}

async function submitConvert() {
  if (!props.lead?.id) return;
  if (!convertDoctorId.value) {
    alert('Please select a Treating Doctor.');
    return;
  }

  isSubmittingConvert.value = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authStore.token || authStore.accessToken;
    if (token) headers['authorization'] = `Bearer ${token}`;

    const selectedDoc = convertDoctors.value.find((d: any) => d.id === convertDoctorId.value);
    const payload: any = {
      decision: convertDecision.value,
      treatingDoctorId: convertDoctorId.value,
      doctorName: selectedDoc?.name || undefined,
      departmentId: selectedDoc?.departmentId || props.lead?.departmentId || undefined,
      note: convertNote.value.trim() || undefined,
    };

    const res = await fetch(`${apiBase}/leads/${props.lead.id}/convert`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      emit('converted', data);
      close();

      // If called from a follow-up task, complete the task
      if (props.task?.id) {
        await $fetch(`${apiBase}/tasks/${props.task.id}/complete`, {
          method: 'POST',
          headers,
          credentials: 'include',
        }).catch(() => {});
      }

      // Auto-route to the appropriate desk or case file
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.case?.id) {
        router.push(`/cases/${data.case.id}`);
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error?.message || 'Failed to process consultation visit');
    }
  } catch (err: any) {
    console.error('Lead conversion failed', err);
    alert('An unexpected error occurred during consultation recording');
  } finally {
    isSubmittingConvert.value = false;
  }
}
</script>

