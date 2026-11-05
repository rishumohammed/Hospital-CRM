<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      @click="close"
    />

    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn"
      >
        <!-- Modal Header -->
        <div class="px-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <span class="text-xl">✏️</span>
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                Edit Lead Details
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Lead ID: #{{ lead?.id }} • {{ lead?.name }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="close"
          >
            <span class="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitUpdate" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"
          >
            {{ errorMessage }}
          </div>

          <!-- Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Patient / Customer Name *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g. Fathima Rahman"
            />
          </div>

          <!-- Phone Numbers -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Mobile *
              </label>
              <input
                v-model="form.mobile"
                type="tel"
                required
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="10-digit number"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alternate Phone
              </label>
              <input
                v-model="form.altMobile"
                type="tel"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="Optional secondary phone"
              />
            </div>
          </div>

          <!-- Age & Location -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age (Years)
              </label>
              <input
                v-model.number="form.age"
                type="number"
                min="0"
                max="120"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 35"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location / City
              </label>
              <input
                v-model="form.location"
                type="text"
                maxlength="150"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Kozhikode"
              />
            </div>
          </div>

          <!-- Department & Source -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                v-model.number="form.departmentId"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
              >
                <option v-for="d in departments" :key="d.id" :value="d.id">
                  {{ d.labelEn }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Acquisition Source
              </label>
              <select
                v-model.number="form.sourceId"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
              >
                <option v-for="s in sources" :key="s.id" :value="s.id">
                  {{ s.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- Priority -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                :class="[
                  'py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                  form.priority === 'hot'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                ]"
                @click="form.priority = 'hot'"
              >
                <span>🔥</span>
                <span>Hot</span>
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                  form.priority === 'warm'
                    ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                ]"
                @click="form.priority = 'warm'"
              >
                <span>⚡</span>
                <span>Warm</span>
              </button>
              <button
                type="button"
                :class="[
                  'py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5',
                  form.priority === 'cold'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 ring-2 ring-slate-400/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                ]"
                @click="form.priority = 'cold'"
              >
                <span>❄️</span>
                <span>Cold</span>
              </button>
            </div>
          </div>

          <!-- Medical Concern / Caller Notes -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Medical Concern / Caller Notes
            </label>
            <textarea
              v-model="form.concern"
              rows="3"
              class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
              placeholder="Clinical symptoms, patient requests, or case notes..."
            />
          </div>

          <!-- Action Buttons -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <span v-if="isSubmitting" class="animate-spin">⟳</span>
              <span>{{ isSubmitting ? 'Saving...' : 'Save Changes' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated', updatedLead: any): void;
}>();

const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const departments = ref<any[]>([]);
const sources = ref<any[]>([]);
const isSubmitting = ref(false);
const errorMessage = ref('');

const form = reactive({
  name: '',
  mobile: '',
  altMobile: '',
  age: null as number | null,
  location: '',
  departmentId: 1,
  sourceId: 1,
  priority: 'warm' as 'hot' | 'warm' | 'cold',
  concern: '',
});

const populateForm = () => {
  if (!props.lead) return;
  form.name = props.lead.name || '';
  form.mobile = props.lead.mobile || '';
  form.altMobile = props.lead.altMobile || '';
  form.age = props.lead.age !== undefined && props.lead.age !== null ? props.lead.age : null;
  form.location = props.lead.location || '';
  form.departmentId = props.lead.departmentId || props.lead.department?.id || 1;
  form.sourceId = props.lead.sourceId || props.lead.source?.id || 1;
  form.priority = props.lead.priority || 'warm';
  form.concern = props.lead.concern || '';
  errorMessage.value = '';
};

watch(
  () => [props.isOpen, props.lead],
  ([open]) => {
    if (open) {
      populateForm();
      fetchPicklists();
    }
  },
  { immediate: true }
);

const fetchPicklists = async () => {
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const [deptRes, srcRes] = await Promise.all([
      fetch(`${apiBase}/picklists/departments`, { headers }),
      fetch(`${apiBase}/picklists/sources`, { headers }),
    ]);

    if (deptRes.ok) {
      const data = await deptRes.json();
      departments.value = data.departments || [];
    }
    if (srcRes.ok) {
      const data = await srcRes.json();
      sources.value = data.sources || [];
    }
  } catch (err) {
    console.error('Failed to load picklists', err);
  }
};

const close = () => {
  emit('close');
};

const submitUpdate = async () => {
  if (!props.lead?.id) return;
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const payload: any = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      altMobile: form.altMobile.trim() || null,
      age: form.age !== null && form.age !== undefined && (form.age as any) !== '' ? Number(form.age) : null,
      location: form.location.trim() || null,
      departmentId: Number(form.departmentId),
      sourceId: Number(form.sourceId),
      priority: form.priority,
      concern: form.concern.trim(),
    };

    const res = await fetch(`${apiBase}/leads/${props.lead.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMessage.value = data.error?.message || 'Failed to update lead details.';
      return;
    }

    emit('updated', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error occurred.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
