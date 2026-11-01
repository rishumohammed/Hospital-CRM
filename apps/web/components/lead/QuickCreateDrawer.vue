<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
      @click="close"
    />

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div class="w-screen max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        <!-- Header -->
        <div class="px-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <span class="text-xl">⚡</span>
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                {{ $i18n.locale === 'ml' ? 'പുതിയ ലീഡ് ചേർക്കുക' : 'Quick Create Lead' }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ $i18n.locale === 'ml' ? 'പുതിയ അന്വേഷണം രജിസ്റ്റർ ചെയ്യുക' : 'Register a new patient inquiry' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="close"
          >
            <span class="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitLead" class="flex-1 overflow-y-auto p-6 space-y-5">
          <!-- Live Duplicate Alert Banner -->
          <div
            v-if="duplicateLead"
            class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 animate-fadeIn"
          >
            <div class="flex items-center space-x-2 font-bold text-sm">
              <span>⚠️</span>
              <span>
                {{ $i18n.locale === 'ml' ? 'ഈ നമ്പർ ഇതിനകം നിലവിലുണ്ട്!' : 'Duplicate Phone Number Detected!' }}
              </span>
            </div>
            <p class="text-xs leading-relaxed">
              {{ $i18n.locale === 'ml' ? 'രോഗി:' : 'Lead:' }}
              <strong class="font-semibold">{{ duplicateLead.name }}</strong>
              ({{ duplicateLead.status }}) -
              {{ $i18n.locale === 'ml' ? 'ഉടമ:' : 'Owner:' }}
              {{ duplicateLead.ownerName || 'Unassigned' }}
            </p>
            <div class="pt-2 border-t border-amber-200 dark:border-amber-800/60">
              <label class="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.overrideDuplicate"
                  class="mt-1 rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span class="text-xs font-semibold">
                  {{ $i18n.locale === 'ml' ? 'പ്രത്യേക കാരണത്താൽ വീണ്ടും സൃഷ്ടിക്കുക' : 'Override duplicate and create anyway' }}
                </span>
              </label>
              <div v-if="form.overrideDuplicate" class="mt-2">
                <input
                  v-model="form.overrideReason"
                  type="text"
                  required
                  placeholder="Reason for duplicate override..."
                  class="w-full text-xs px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"
          >
            {{ errorMessage }}
          </div>

          <!-- 1. Patient Name -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {{ $i18n.locale === 'ml' ? 'രോഗിയുടെ പേര്' : 'Patient Name' }} *
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              :placeholder="$i18n.locale === 'ml' ? 'ഉദാ: ഫാത്തിമ റഹ്മാൻ' : 'e.g. Fathima Rahman'"
            />
          </div>

          <!-- 2. Mobile Phone (with live duplicate check) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {{ $i18n.locale === 'ml' ? 'മൊബൈൽ നമ്പർ' : 'Mobile Number' }} *
            </label>
            <div class="relative">
              <input
                v-model="form.mobile"
                type="tel"
                required
                @input="handlePhoneInput"
                class="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
                placeholder="+91 98471 23456"
              />
              <div v-if="isCheckingDuplicate" class="absolute right-3 top-3 text-slate-400">
                <span class="inline-block animate-spin text-sm">⟳</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">
              {{ $i18n.locale === 'ml' ? '10 അക്ക നമ്പർ അല്ലെങ്കിൽ E.164 ഫോർമാറ്റ്' : '10-digit Indian number or E.164 (+91...)' }}
            </p>
          </div>

          <!-- 3. Language & Preferred Communication -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {{ $i18n.locale === 'ml' ? 'ഭാഷ' : 'Language' }}
              </label>
              <select
                v-model="form.language"
                class="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {{ $i18n.locale === 'ml' ? 'ഉറവിടം' : 'Source' }} *
              </label>
              <select
                v-model.number="form.sourceId"
                required
                class="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option v-for="s in sources" :key="s.id" :value="s.id">
                  {{ $i18n.locale === 'ml' ? s.labelMl : s.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- 4. Department -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {{ $i18n.locale === 'ml' ? 'വിഭാഗം (ഡിപ്പാർട്ട്മെന്റ്)' : 'Department' }} *
            </label>
            <select
              v-model.number="form.departmentId"
              required
              class="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option v-for="d in departments" :key="d.id" :value="d.id">
                {{ $i18n.locale === 'ml' ? d.labelMl : d.labelEn }}
              </option>
            </select>
          </div>

          <!-- 5. Medical Concern / Inquiry Details -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {{ $i18n.locale === 'ml' ? 'ആരോഗ്യ പ്രശ്നം / കുറിപ്പ്' : 'Medical Concern / Inquiry Details' }}
            </label>
            <textarea
              v-model="form.concern"
              rows="3"
              class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500"
              :placeholder="$i18n.locale === 'ml' ? 'രോഗിയുടെ പ്രധാന പ്രശ്നങ്ങളും പ്രത്യേക ആവശ്യങ്ങളും...' : 'Patient symptoms, concerns, or requested procedures...'"
            />
          </div>

          <!-- Submit Buttons -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
            <button
              type="button"
              class="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              @click="close"
            >
              {{ $i18n.locale === 'ml' ? 'റദ്ദാക്കുക' : 'Cancel' }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center space-x-2"
            >
              <span v-if="isSubmitting" class="animate-spin text-sm">⟳</span>
              <span>{{ $i18n.locale === 'ml' ? 'ലീഡ് സേവ് ചെയ്യുക' : 'Save Lead' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', lead: any): void;
}>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const departments = ref<any[]>([]);
const sources = ref<any[]>([]);
const isCheckingDuplicate = ref(false);
const duplicateLead = ref<any | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref('');

const form = reactive({
  name: '',
  mobile: '',
  language: 'en',
  concern: '',
  departmentId: 1,
  sourceId: 1,
  branchId: 1,
  overrideDuplicate: false,
  overrideReason: '',
});

let debounceTimer: any = null;

const fetchPicklists = async () => {
  try {
    const [deptRes, srcRes] = await Promise.all([
      fetch(`${apiBase}/picklists/departments`, { credentials: 'include' }),
      fetch(`${apiBase}/picklists/sources`, { credentials: 'include' }),
    ]);

    if (deptRes.ok) {
      departments.value = await deptRes.json();
      if (departments.value.length > 0) form.departmentId = departments.value[0].id;
    }
    if (srcRes.ok) {
      sources.value = await srcRes.json();
      if (sources.value.length > 0) form.sourceId = sources.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load picklists', err);
  }
};

onMounted(() => {
  fetchPicklists();
});

const handlePhoneInput = () => {
  clearTimeout(debounceTimer);
  duplicateLead.value = null;

  if (form.mobile.trim().length < 8) return;

  debounceTimer = setTimeout(async () => {
    isCheckingDuplicate.value = true;
    try {
      const res = await fetch(
        `${apiBase}/leads/check-duplicate?mobile=${encodeURIComponent(form.mobile.trim())}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          duplicateLead.value = data.existingLead;
        }
      }
    } catch (err) {
      console.error('Duplicate check failed', err);
    } finally {
      isCheckingDuplicate.value = false;
    }
  }, 400);
};

const close = () => {
  emit('close');
};

const submitLead = async () => {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const res = await fetch(`${apiBase}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: form.name,
        mobile: form.mobile,
        language: form.language,
        concern: form.concern,
        departmentId: form.departmentId,
        sourceId: form.sourceId,
        branchId: form.branchId,
        overrideDuplicate: form.overrideDuplicate,
        overrideReason: form.overrideDuplicate ? form.overrideReason : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        duplicateLead.value = data.error?.details?.existingLead;
        errorMessage.value = data.error?.message || 'A lead with this phone number already exists.';
        return;
      }
      errorMessage.value = data.error?.message || 'Failed to create lead.';
      return;
    }

    emit('created', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error occurred.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
