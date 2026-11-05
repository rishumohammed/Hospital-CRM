<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="close"
    ></div>

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div class="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
        <!-- Drawer Header -->
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              📞
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {{ t('common.log_call') }}
              </h2>
              <p v-if="lead || recipientName" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {{ recipientName || lead?.name }} <span class="text-slate-400">&bull;</span> {{ recipientPhone || lead?.mobile }}
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

        <!-- Drawer Body -->
        <div class="p-6 overflow-y-auto flex-1 space-y-5">
          <!-- Live Pre-check Contact Rules Notice -->
          <div
            v-if="limitWarnings.length > 0"
            class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1 text-amber-900 dark:text-amber-200"
          >
            <div class="flex items-center gap-2 font-semibold text-xs">
              <span>⚠️</span>
              <span>Calling Notice</span>
            </div>
            <ul class="list-disc list-inside text-xs space-y-0.5">
              <li v-for="(warn, idx) in limitWarnings" :key="idx">{{ warn }}</li>
            </ul>
          </div>

          <!-- Product Lead Interests Context Banner -->
          <div
            v-if="lead?.productInterests?.length"
            class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5"
          >
            <div class="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span class="flex items-center gap-1.5">
                <span>📦</span>
                <span>Products Inquired</span>
              </span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                Click to mention in notes
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-0.5">
              <button
                v-for="interest in lead.productInterests"
                :key="interest.id"
                type="button"
                @click="appendProductToNote(interest.product?.name)"
                class="px-2 py-0.5 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-emerald-300 dark:border-emerald-700/60 shadow-xs hover:border-emerald-500 font-medium transition-all"
              >
                + {{ interest.product?.name }} (₹{{ interest.product?.mrp }})
              </button>
            </div>
          </div>

          <!-- Call Outcome Selector -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ t('tasks.call_outcome') }} <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <select
                v-model="outcomeId"
                class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                required
              >
                <option :value="null" disabled>{{ t('tasks.select_outcome') }}</option>
                <option
                  v-for="outcome in callOutcomes"
                  :key="outcome.id"
                  :value="outcome.id"
                >
                  {{ outcome.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- Call Direction & Duration -->
          <div class="grid grid-cols-2 gap-3.5">
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Direction
              </label>
              <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  @click="direction = 'outbound'"
                  :class="direction === 'outbound' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
                  class="py-1.5 px-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <span>↗</span>
                  <span>Outbound</span>
                </button>
                <button
                  type="button"
                  @click="direction = 'inbound'"
                  :class="direction === 'inbound' ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
                  class="py-1.5 px-2 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
                >
                  <span>↙</span>
                  <span>Inbound</span>
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Duration (sec)
                </label>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    @click="durationSeconds = 30"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  >
                    30s
                  </button>
                  <button
                    type="button"
                    @click="durationSeconds = 60"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  >
                    1m
                  </button>
                  <button
                    type="button"
                    @click="durationSeconds = 120"
                    class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  >
                    2m
                  </button>
                </div>
              </div>
              <div class="relative">
                <input
                  v-model.number="durationSeconds"
                  type="number"
                  min="0"
                  class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="60"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-slate-400 pointer-events-none">sec</span>
              </div>
            </div>
          </div>

          <!-- Notes / Discussion Summary -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notes / Discussion Summary
            </label>
            <textarea
              v-model="note"
              rows="3"
              class="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              placeholder="Summary of patient discussion, symptoms, questions, package preferences..."
            ></textarea>
          </div>

          <!-- Mandatory Conclusion / Follow-up Section -->
          <div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mandatory Follow-up / Conclusion
              </span>
            </div>

            <!-- Segmented Selector between Follow-up and Close Lead -->
            <div class="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                @click="isCloseMode = false"
                :class="!isCloseMode ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
                class="py-2 px-3 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>📅</span>
                <span>Schedule Next Action</span>
              </button>
              <button
                type="button"
                @click="isCloseMode = true"
                :class="isCloseMode ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-sm font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
                class="py-2 px-3 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>✕</span>
                <span>Close Lead with Reason</span>
              </button>
            </div>

            <!-- Next Follow-up Action -->
            <div v-if="!isCloseMode" class="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 shadow-sm">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span class="text-xs font-semibold text-slate-900 dark:text-slate-100">{{ t('tasks.next_action') }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div class="space-y-1">
                  <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">Type</label>
                  <select
                    v-model="nextAction.type"
                    class="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="reminder">Reminder</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">{{ t('common.priority') }}</label>
                  <select
                    v-model="nextAction.priority"
                    class="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="hot">🔴 Hot</option>
                    <option value="warm">🟡 Warm</option>
                    <option value="cold">⚪ Cold</option>
                  </select>
                </div>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Follow-up Reason / Action Title <span class="text-rose-500">*</span>
                  </label>
                  <button
                    v-if="note && note.trim()"
                    type="button"
                    @click="nextAction.title = note.trim().slice(0, 100)"
                    class="text-[10px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold"
                  >
                    Use Call Note
                  </button>
                </div>
                <input
                  v-model="nextAction.title"
                  type="text"
                  required
                  class="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  placeholder="e.g. Call back regarding pricing discount / Patient asked to call at 4 PM"
                />
                <!-- Quick Reason Presets -->
                <div class="flex flex-wrap gap-1 pt-0.5">
                  <button
                    v-for="preset in reasonPresets"
                    :key="preset"
                    type="button"
                    @click="nextAction.title = preset"
                    class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    + {{ preset }}
                  </button>
                </div>
              </div>

              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">{{ t('tasks.due_at') }}</label>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      @click="setQuickDue(2)"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      @click="setTomorrow10AM"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                    >
                      Tomorrow 10 AM
                    </button>
                    <button
                      type="button"
                      @click="setQuickDue(48)"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                    >
                      In 2 Days
                    </button>
                  </div>
                </div>
                <input
                  v-model="nextAction.dueAt"
                  type="datetime-local"
                  required
                  class="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <!-- Option B: Close Lead with Reason -->
            <div v-else class="p-4 bg-rose-50/80 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3 shadow-sm">
              <div class="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold text-xs">
                <span>✕</span>
                <span>Close Lead</span>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lost Reason <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="closedReasonId"
                  class="w-full text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                >
                  <option :value="null" disabled>Select Reason...</option>
                  <option
                    v-for="reason in lostReasons"
                    :key="reason.id"
                    :value="reason.id"
                  >
                    {{ reason.labelEn }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Error Alert Banner -->
          <div v-if="errorMessage" class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Drawer Footer -->
        <div class="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] transition-colors"
            @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            @click="submitCall"
          >
            <span v-if="isSubmitting" class="flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>{{ t('common.loading') }}</span>
            </span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
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
  caseId?: number;
  taskId?: number;
  recipientName?: string;
  recipientPhone?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'call-logged', data: any): void;
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApi = config.public.apiBase || '/api/v1';
const apiBase = rawApi.endsWith('/api/v1') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api/v1`;

const callOutcomes = ref<any[]>([]);
const lostReasons = ref<any[]>([]);
const outcomeId = ref<number | null>(null);

const selectedOutcome = computed(() => callOutcomes.value.find((o) => o.id === outcomeId.value));

const reasonPresets = [
  'Callback requested by patient',
  'Pricing / package discussion',
  'Family / spouse consultation',
  'Check report / doctor review',
  'Confirm admission / visit date',
];
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

// Helper to format Date to local YYYY-MM-DDTHH:mm string for datetime-local inputs
const formatToLocalDateTime = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Default next action: Tomorrow at 10:00 AM local time
const getTomorrow10AM = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return formatToLocalDateTime(d);
};

const setTomorrow10AM = () => {
  nextAction.value.dueAt = getTomorrow10AM();
};

const setQuickDue = (hoursOffset: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursOffset);
  nextAction.value.dueAt = formatToLocalDateTime(d);
};

const nextAction = ref({
  type: 'call',
  title: 'Follow-up Call',
  dueAt: getTomorrow10AM(),
  priority: 'warm',
});

const appendProductToNote = (productName?: string) => {
  if (!productName) return;
  const mention = `Discussed: ${productName}`;
  if (!note.value) {
    note.value = mention;
  } else if (!note.value.includes(productName)) {
    note.value += ` | ${mention}`;
  }
};

// Load Picklists
const loadPicklists = async () => {
  try {
    const outcomeUrl = props.lead?.leadType === 'product'
      ? `${apiBase}/picklists/call-outcomes?scope=product`
      : (props.lead?.leadType === 'treatment' ? `${apiBase}/picklists/call-outcomes?scope=treatment` : `${apiBase}/picklists/call-outcomes`);

    const headers: Record<string, string> = {};
    const token = authStore.token || authStore.accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const [coRes, lrRes] = await Promise.all([
      fetch(outcomeUrl, {
        headers,
        credentials: 'include',
      }),
      fetch(`${apiBase}/picklists/lost-reasons`, {
        headers,
        credentials: 'include',
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
  const targetLeadId = props.lead?.id;
  const targetCaseId = props.caseId;
  if (!targetLeadId && !targetCaseId) return;

  const query = targetLeadId ? `leadId=${targetLeadId}` : `caseId=${targetCaseId}`;
  try {
    const headers: Record<string, string> = {};
    const token = authStore.token || authStore.accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/interactions/check-limits?${query}`, {
      headers,
      credentials: 'include',
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
      direction.value = 'outbound';
      durationSeconds.value = 60;
      nextAction.value = {
        type: 'call',
        title: props.lead?.leadType === 'product'
          ? `Product follow-up with ${props.recipientName || props.lead?.name || 'customer'}`
          : `Follow-up with ${props.recipientName || props.lead?.name || 'patient'}`,
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
      leadId: props.lead?.id || undefined,
      caseId: props.caseId || props.lead?.caseId || undefined,
      taskId: props.taskId || undefined,
      outcomeId: outcomeId.value,
      direction: direction.value,
      durationSeconds: durationSeconds.value,
      note: note.value?.trim() || '',
      overrideReason: note.value?.trim() || null,
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = authStore.token || authStore.accessToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/interactions/call`, {
      method: 'POST',
      headers,
      credentials: 'include',
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
