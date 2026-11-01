<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="close"
    ></div>

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div class="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between">
        <!-- Drawer Header -->
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {{ t('common.log_call') }}
            </h2>
            <p v-if="lead" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ lead.name }} ({{ lead.mobile }})
            </p>
          </div>
          <button
            type="button"
            class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="close"
          >
            <span class="sr-only">Close</span>
            &times;
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="p-6 overflow-y-auto flex-1 space-y-5">
          <!-- Live Pre-check Contact Rules Warning Banner -->
          <div
            v-if="limitWarnings.length > 0"
            class="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-2 text-amber-900 dark:text-amber-200"
          >
            <div class="flex items-center gap-2 font-bold text-xs">
              <span>⚠️</span>
              <span>Contact Rule Notice / പ്രത്യേക കാരണം ആവശ്യമാണ്</span>
            </div>
            <ul class="list-disc list-inside text-xs space-y-1">
              <li v-for="(warn, idx) in limitWarnings" :key="idx">{{ warn }}</li>
            </ul>
          </div>

          <!-- Override Reason Input (Required when warning is active) -->
          <div v-if="requiresOverride || limitWarnings.length > 0" class="space-y-1">
            <label class="block text-xs font-semibold text-amber-800 dark:text-amber-300">
              {{ t('tasks.override_reason') }} <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="overrideReason"
              rows="2"
              required
              class="w-full text-xs rounded-lg border-amber-300 dark:border-amber-600 dark:bg-slate-800 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g. Patient requested an urgent callback on WhatsApp"
            ></textarea>
          </div>

          <!-- Call Outcome Selector -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('tasks.call_outcome') }} <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="outcomeId"
              class="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-teal-500 focus:border-teal-500"
              required
            >
              <option :value="null" disabled>{{ t('tasks.select_outcome') }}</option>
              <option
                v-for="outcome in callOutcomes"
                :key="outcome.id"
                :value="outcome.id"
              >
                {{ locale === 'ml' ? outcome.labelMl : outcome.labelEn }}
              </option>
            </select>
          </div>

          <!-- Call Duration -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Direction
              </label>
              <select
                v-model="direction"
                class="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Duration (sec)
              </label>
              <input
                v-model.number="durationSeconds"
                type="number"
                min="0"
                class="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g. 60"
              />
            </div>
          </div>

          <!-- Notes -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / സംഭാഷണ സംഗ്രഹം
            </label>
            <textarea
              v-model="note"
              rows="2"
              class="w-full text-sm rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Summary of patient discussion..."
            ></textarea>
          </div>

          <!-- Mode Toggle: Next Action vs Close Lead -->
          <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mandatory Follow-up / സമാപനം
              </span>
              <button
                type="button"
                class="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                @click="isCloseMode = !isCloseMode"
              >
                {{ isCloseMode ? 'Switch to Next Action' : 'Close Lead with Reason' }}
              </button>
            </div>

            <!-- Option A: Mandatory Next Action -->
            <div v-if="!isCloseMode" class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-500"></span>
                <span class="text-xs font-bold text-slate-900 dark:text-slate-100">{{ t('tasks.next_action') }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Type</label>
                  <select
                    v-model="nextAction.type"
                    class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="reminder">Reminder</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ t('common.priority') }}</label>
                  <select
                    v-model="nextAction.priority"
                    class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
              </div>

              <div class="space-y-1">
                <label class="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Title</label>
                <input
                  v-model="nextAction.title"
                  type="text"
                  required
                  class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="e.g. Call back regarding Ayurveda package"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ t('tasks.due_at') }}</label>
                <input
                  v-model="nextAction.dueAt"
                  type="datetime-local"
                  required
                  class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            <!-- Option B: Close Lead with Reason -->
            <div v-else class="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3">
              <div class="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                <span>✕</span>
                <span>Close Lead / ലീഡ് അവസാനിപ്പിക്കുക</span>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lost Reason <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="closedReasonId"
                  class="w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  required
                >
                  <option :value="null" disabled>Select Reason...</option>
                  <option
                    v-for="reason in lostReasons"
                    :key="reason.id"
                    :value="reason.id"
                  >
                    {{ locale === 'ml' ? reason.labelMl : reason.labelEn }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="errorMessage" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
            @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 min-h-[44px]"
            @click="submitCall"
          >
            <span v-if="isSubmitting">{{ t('common.loading') }}</span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'call-logged', data: any): void;
}>();

const { t, locale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:3001';

const callOutcomes = ref<any[]>([]);
const lostReasons = ref<any[]>([]);
const outcomeId = ref<number | null>(null);
const direction = ref<'inbound' | 'outbound'>('outbound');
const durationSeconds = ref<number>(60);
const note = ref('');
const overrideReason = ref('');
const isCloseMode = ref(false);
const closedReasonId = ref<number | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref('');

// Soft limits live check state
const requiresOverride = ref(false);
const limitWarnings = ref<string[]>([]);

// Default next action
const getTomorrow10AM = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.toISOString().slice(0, 16);
};

const nextAction = ref({
  type: 'call',
  title: 'Follow-up Call',
  dueAt: getTomorrow10AM(),
  priority: 'warm',
});

// Load Picklists
const loadPicklists = async () => {
  try {
    const [coRes, lrRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/picklists/call-outcomes`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/api/v1/picklists/lost-reasons`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
    ]);
    if (coRes.ok) callOutcomes.value = await coRes.json();
    if (lrRes.ok) lostReasons.value = await lrRes.json();
  } catch (err) {
    console.error('Failed to load picklists', err);
  }
};

// Check Contact Rules on Open
const checkLimits = async () => {
  if (!props.lead?.id) return;
  try {
    const res = await fetch(`${apiBase}/api/v1/interactions/check-limits?leadId=${props.lead.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      requiresOverride.value = data.requiresOverride;
      limitWarnings.value = data.warnings || [];
    }
  } catch (err) {
    console.error('Failed to check limits', err);
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      outcomeId.value = null;
      note.value = '';
      overrideReason.value = '';
      errorMessage.value = '';
      isCloseMode.value = false;
      closedReasonId.value = null;
      nextAction.value = {
        type: 'call',
        title: `Follow-up with ${props.lead?.name || 'patient'}`,
        dueAt: getTomorrow10AM(),
        priority: 'warm',
      };
      checkLimits();
      loadPicklists();
    }
  }
);

const close = () => {
  emit('close');
};

const submitCall = async () => {
  if (!outcomeId.value) {
    errorMessage.value = 'Please select a call outcome';
    return;
  }

  if (requiresOverride.value && !overrideReason.value.trim()) {
    errorMessage.value = 'Contact rule override reason is required';
    return;
  }

  if (isCloseMode.value && !closedReasonId.value) {
    errorMessage.value = 'Please select a closure reason';
    return;
  }

  if (!isCloseMode.value && (!nextAction.value.title || !nextAction.value.dueAt)) {
    errorMessage.value = 'Next action title and due date/time are required';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload: any = {
      leadId: props.lead.id,
      outcomeId: outcomeId.value,
      direction: direction.value,
      durationSeconds: durationSeconds.value,
      note: note.value,
      overrideReason: overrideReason.value || null,
    };

    if (isCloseMode.value) {
      payload.closedReasonId = closedReasonId.value;
    } else {
      payload.nextAction = {
        type: nextAction.value.type,
        title: nextAction.value.title,
        dueAt: new Date(nextAction.value.dueAt).toISOString(),
        priority: nextAction.value.priority,
      };
    }

    const res = await fetch(`${apiBase}/api/v1/interactions/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      errorMessage.value = data.error?.message || 'Failed to log call';
      isSubmitting.value = false;
      return;
    }

    emit('call-logged', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error logging call';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
