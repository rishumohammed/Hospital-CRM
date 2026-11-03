<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="close"
    ></div>

    <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
      <div
        class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200 dark:border-slate-800"
      >
        <!-- Modal Header -->
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-teal-50/60 dark:bg-teal-950/20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg font-semibold">
              📅
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tasks.book_appointment') }}
              </h3>
              <p v-if="lead" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {{ lead.name }} <span class="text-slate-400">&bull;</span> {{ lead.mobile }}
                <span v-if="lead.department?.labelEn" class="text-teal-600 dark:text-teal-400 ml-1 font-semibold">
                  ({{ lead.department.labelEn }})
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            @click="close"
          >
            <span class="sr-only">Close</span>
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitAppointment" class="p-6 space-y-4">
          <!-- Department Selector -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Department <span class="text-rose-500">*</span>
              </label>
              <span v-if="lead?.department?.labelEn" class="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                Lead's assigned department
              </span>
            </div>
            <select
              v-model="selectedDepartmentId"
              class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px]"
              @change="onDepartmentChange"
            >
              <option :value="0">All Departments</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.labelEn }} {{ dept.labelMl ? `(${dept.labelMl})` : '' }}
              </option>
            </select>
          </div>

          <!-- Doctor Selection / Custom Name -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Doctor <span class="text-rose-500">*</span>
              </label>
              <button
                type="button"
                @click="toggleCustomDoctor"
                class="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                {{ isCustomDoctor ? '← Select from list' : '+ Custom / Visiting Doctor' }}
              </button>
            </div>

            <!-- Mode A: Dropdown from Department's Doctors -->
            <div v-if="!isCustomDoctor" class="space-y-2">
              <select
                v-model="selectedDoctorId"
                required
                class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px]"
                @change="onDoctorSelect"
              >
                <option :value="null" disabled>-- Choose Doctor --</option>
                <option v-for="doc in departmentDoctors" :key="doc.id" :value="doc.id">
                  {{ doc.name }} &bull; {{ doc.qualification }} ({{ doc.opdTiming }})
                </option>
              </select>

              <!-- Selected Doctor Info Card -->
              <div
                v-if="selectedDoctor"
                class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 text-xs space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <div class="font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <span>👨‍⚕️</span>
                    <span>{{ selectedDoctor.name }}</span>
                    <span class="text-[11px] font-normal text-teal-700 dark:text-teal-300">
                      ({{ selectedDoctor.designation }})
                    </span>
                  </div>
                  <span
                    v-if="selectedDoctor.consultationFee"
                    class="font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 text-[11px]"
                  >
                    ₹{{ selectedDoctor.consultationFee }} OPD Fee
                  </span>
                </div>
                <div class="text-slate-600 dark:text-slate-300 text-[11px] flex flex-wrap gap-x-3 gap-y-1">
                  <span>🎓 {{ selectedDoctor.qualification }}</span>
                  <span v-if="selectedDoctor.roomNo">📍 {{ selectedDoctor.roomNo }}</span>
                  <span>🕒 {{ selectedDoctor.opdTiming }}</span>
                </div>
              </div>

              <!-- Empty state when no doctor in this department -->
              <div
                v-else-if="departmentDoctors.length === 0"
                class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between"
              >
                <span>No doctors assigned to this department yet.</span>
                <button
                  type="button"
                  @click="isCustomDoctor = true"
                  class="font-semibold underline ml-2"
                >
                  Type custom doctor
                </button>
              </div>
            </div>

            <!-- Mode B: Custom Doctor Input -->
            <div v-else>
              <input
                v-model="customDoctorName"
                type="text"
                required
                class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px]"
                placeholder="e.g. Dr. Ramesh Babu (Visiting Specialist)"
              />
              <p class="text-[11px] text-slate-500 mt-1">
                Enter name and title for visiting or outside consulting doctor.
              </p>
            </div>
          </div>

          <!-- Appointment Starts At -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ t('tasks.starts_at') }} <span class="text-rose-500">*</span>
              </label>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="setAppointmentDayOffset(1, 10)"
                  class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  Tomorrow 10 AM
                </button>
                <button
                  type="button"
                  @click="setAppointmentDayOffset(2, 11)"
                  class="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                >
                  In 2 Days 11 AM
                </button>
              </div>
            </div>
            <input
              v-model="startsAt"
              type="datetime-local"
              required
              class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px]"
            />
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Schedules automated patient reminders (24h & 2h before) and missed recovery check (+1h).
            </p>
          </div>

          <!-- Notes -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Appointment Notes
            </label>
            <textarea
              v-model="notes"
              rows="2"
              class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              placeholder="e.g. Patient arriving by bus from Kozhikode; prefers afternoon slot."
            ></textarea>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="errorMessage" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {{ errorMessage }}
          </div>

          <!-- Form Actions -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] transition-colors"
              @click="close"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              <span v-if="isSubmitting" class="flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ t('common.loading') }}</span>
              </span>
              <span v-else>{{ t('tasks.book_appointment') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'booked', data: any): void;
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const rawApi = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApi.endsWith('/api/v1') ? rawApi : `${rawApi}/api/v1`;

const departments = ref<any[]>([]);
const allDoctors = ref<any[]>([]);
const selectedDepartmentId = ref<number>(0);
const selectedDoctorId = ref<number | null>(null);
const isCustomDoctor = ref(false);
const customDoctorName = ref('');

const startsAt = ref('');
const notes = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

// Filter doctors based on selected department
const departmentDoctors = computed(() => {
  if (!selectedDepartmentId.value || selectedDepartmentId.value === 0) {
    return allDoctors.value.filter((d) => d.active !== false);
  }
  return allDoctors.value.filter(
    (d) => d.departmentId === selectedDepartmentId.value && d.active !== false
  );
});

// Currently selected doctor object
const selectedDoctor = computed(() => {
  if (isCustomDoctor.value || !selectedDoctorId.value) return null;
  return allDoctors.value.find((d) => d.id === selectedDoctorId.value) || null;
});

// Format to local YYYY-MM-DDTHH:mm
const formatToLocalDateTime = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getDefaultSlot = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(11, 0, 0, 0);
  return formatToLocalDateTime(d);
};

const setAppointmentDayOffset = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  startsAt.value = formatToLocalDateTime(d);
};

const fetchInitialData = async () => {
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const [deptRes, docRes] = await Promise.all([
      fetch(`${apiBase}/picklists/departments`, { headers }),
      fetch(`${apiBase}/doctors?activeOnly=true`, { headers }),
    ]);

    if (deptRes.ok) {
      departments.value = await deptRes.json();
    }
    if (docRes.ok) {
      allDoctors.value = await docRes.json();
    }
  } catch (err) {
    console.error('Error fetching departments or doctors:', err);
  }
};

onMounted(() => {
  fetchInitialData();
});

const onDepartmentChange = () => {
  // Reset selected doctor when department changes
  if (departmentDoctors.value.length > 0) {
    selectedDoctorId.value = departmentDoctors.value[0].id;
    isCustomDoctor.value = false;
  } else {
    selectedDoctorId.value = null;
  }
};

const onDoctorSelect = () => {
  isCustomDoctor.value = false;
};

const toggleCustomDoctor = () => {
  isCustomDoctor.value = !isCustomDoctor.value;
  if (isCustomDoctor.value) {
    selectedDoctorId.value = null;
  } else if (departmentDoctors.value.length > 0) {
    selectedDoctorId.value = departmentDoctors.value[0].id;
  }
};

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      errorMessage.value = '';
      notes.value = '';
      startsAt.value = getDefaultSlot();

      // Ensure lists are loaded
      if (departments.value.length === 0 || allDoctors.value.length === 0) {
        await fetchInitialData();
      }

      // Pre-select lead's department
      const leadDeptId = props.lead?.departmentId || props.lead?.department?.id;
      if (leadDeptId && departments.value.some((d) => d.id === leadDeptId)) {
        selectedDepartmentId.value = leadDeptId;
      } else if (departments.value.length > 0) {
        selectedDepartmentId.value = departments.value[0].id;
      } else {
        selectedDepartmentId.value = 0;
      }

      // Pre-select first doctor in department
      if (departmentDoctors.value.length > 0) {
        selectedDoctorId.value = departmentDoctors.value[0].id;
        isCustomDoctor.value = false;
        customDoctorName.value = '';
      } else {
        selectedDoctorId.value = null;
        isCustomDoctor.value = true;
        customDoctorName.value = '';
      }
    }
  }
);

const close = () => {
  emit('close');
};

const submitAppointment = async () => {
  let docName = '';
  if (isCustomDoctor.value) {
    docName = customDoctorName.value.trim();
  } else if (selectedDoctor.value) {
    docName = selectedDoctor.value.name;
  }

  if (!docName || !startsAt.value) {
    errorMessage.value = 'Doctor name and appointment time are required';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const res = await fetch(`${apiBase}/leads/${props.lead.id}/book-appointment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        doctorName: docName,
        startsAt: new Date(startsAt.value).toISOString(),
        note: notes.value,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      errorMessage.value = data.error?.message || 'Failed to book appointment';
      isSubmitting.value = false;
      return;
    }

    emit('booked', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error booking appointment';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
