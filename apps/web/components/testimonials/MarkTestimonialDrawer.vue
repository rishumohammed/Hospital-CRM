<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="close"
    />

    <!-- Drawer Panel: Bottom sheet on mobile, slide-over on md+ -->
    <div class="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 w-full md:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-t-none md:rounded-l-3xl shadow-2xl flex flex-col max-h-[92vh] md:max-h-full transition-transform duration-300">
      
      <!-- Drawer Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 rounded-t-3xl md:rounded-none">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-semibold text-lg">
            📜
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              {{ t('testimonials.mark_sent_title') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ lead?.name }} &bull; {{ lead?.mobile }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          @click="close"
        >
          <span class="text-2xl leading-none">&times;</span>
        </button>
      </div>

      <!-- Drawer Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">

        <!-- Error Banner -->
        <div
          v-if="errorMessage"
          class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-medium space-y-1"
        >
          <div class="flex items-center gap-1.5 font-semibold">
            <span>⚠️</span>
            <span>Error</span>
          </div>
          <p>{{ errorMessage }}</p>
        </div>

        <!-- 1. Channel Selector: Large Radio Buttons -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            {{ t('testimonials.send_channel') }}
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button
              v-for="ch in channels"
              :key="ch.value"
              type="button"
              :class="[
                'p-3 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[58px]',
                selectedChannel === ch.value
                  ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 ring-2 ring-teal-500/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
              ]"
              @click="selectedChannel = ch.value"
            >
              <div class="flex items-center justify-between w-full">
                <span class="text-lg">{{ ch.icon }}</span>
                <span
                  :class="[
                    'w-4 h-4 rounded-full border flex items-center justify-center',
                    selectedChannel === ch.value ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                  ]"
                >
                  <span v-if="selectedChannel === ch.value" class="w-1.5 h-1.5 rounded-full bg-white"></span>
                </span>
              </div>
              <span class="text-xs font-semibold mt-2 truncate">{{ ch.label }}</span>
            </button>
          </div>
        </div>

        <!-- Channel Consent Warning Banner -->
        <div
          v-if="isConsentMissing"
          class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2"
        >
          <div class="flex items-center gap-2 font-semibold text-xs">
            <span class="text-base">⚠️</span>
            <span>{{ t('testimonials.consent_missing_warning', { channel: selectedChannel.toUpperCase() }) }}</span>
          </div>

          <!-- Supervisor Override Field -->
          <div v-if="canOverride" class="pt-2 border-t border-amber-200 dark:border-amber-800/80 space-y-1.5">
            <label class="block text-xs font-semibold text-amber-950 dark:text-amber-200">
              {{ t('testimonials.override_reason') }}
            </label>
            <input
              v-model="overrideReason"
              type="text"
              class="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              :placeholder="t('testimonials.override_reason_placeholder')"
            />
          </div>
          <div v-else class="text-xs text-amber-800 dark:text-amber-300">
            <em>Only managers with void permissions can override channel consent blocks.</em>
          </div>
        </div>

        <!-- WhatsApp Prefilled Link & Action -->
        <div
          v-if="selectedChannel === 'whatsapp'"
          class="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <span>💬</span>
              <span>WhatsApp Prefilled Message</span>
            </span>
            <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-semibold">
              Includes Mandatory Disclaimer
            </span>
          </div>

          <textarea
            v-model="whatsappMessage"
            rows="4"
            class="w-full text-xs p-3 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 leading-relaxed font-sans"
          ></textarea>

          <button
            type="button"
            :disabled="isConsentMissing && (!canOverride || !overrideReason.trim())"
            class="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            @click="handleOpenWhatsApp"
          >
            <span>📱</span>
            <span>{{ t('testimonials.open_whatsapp') }}</span>
          </button>
        </div>

        <!-- 2. Testimonial Library Picker -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {{ t('testimonials.select_items') }} ({{ selectedTestimonialIds.length }} selected)
            </label>
            <button
              type="button"
              class="text-xs font-semibold text-teal-600 hover:underline"
              @click="showAllLibrary = !showAllLibrary"
            >
              {{ showAllLibrary ? 'Show Dept Filter' : 'Show All Library' }}
            </button>
          </div>

          <!-- Search Filter -->
          <div class="relative mb-3">
            <input
              v-model="librarySearch"
              type="text"
              class="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              :placeholder="t('testimonials.search_placeholder')"
            />
            <span class="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          <!-- Testimonial Items List -->
          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
            <div v-if="filteredLibrary.length === 0" class="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No approved testimonials found matching filter criteria.
            </div>

            <div
              v-for="item in filteredLibrary"
              :key="item.id"
              :class="[
                'p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3',
                selectedTestimonialIds.includes(item.id)
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
              ]"
              @click="toggleTestimonial(item.id)"
            >
              <input
                type="checkbox"
                :checked="selectedTestimonialIds.includes(item.id)"
                class="mt-1 h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                @click.stop="toggleTestimonial(item.id)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm">{{ getTypeIcon(item.type) }}</span>
                  <span class="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {{ item.title }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {{ item.language }}
                  </span>
                  <span v-if="item.department" class="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-medium">
                    {{ item.department.labelEn }}
                  </span>
                </div>
                <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {{ item.summary }}
                </p>
                <div class="mt-1 text-[11px] text-slate-400 font-mono">
                  Ref: {{ item.consentReference }}
                </div>
              </div>
            </div>
          </div>

          <!-- Mandatory Disclaimer Banner Under List -->
          <div class="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-2">
            <span class="text-base text-amber-500">⚖️</span>
            <span>{{ t('testimonials.disclaimer') }}</span>
          </div>
        </div>

        <!-- 3. Note & Sent Time -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {{ t('testimonials.sent_at') }}
            </label>
            <input
              v-model="sentAtInput"
              type="datetime-local"
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {{ t('testimonials.notes_optional') }}
            </label>
            <input
              v-model="note"
              type="text"
              class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Sent video link, patient interested in knee therapy"
            />
          </div>
        </div>

      </div>

      <!-- Drawer Footer Action Bar -->
      <div class="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-end gap-3">
        <button
          type="button"
          class="min-h-[44px] px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          @click="close"
        >
          {{ t('common.cancel') }}
        </button>

        <button
          type="button"
          :disabled="isSubmitting || selectedTestimonialIds.length === 0 || (isConsentMissing && (!canOverride || !overrideReason.trim()))"
          class="min-h-[44px] px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
          @click="submitSend"
        >
          <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ t('common.save') }} & {{ t('testimonials.mark_sent') }}</span>
        </button>
      </div>

    </div>

    <!-- WhatsApp "Did you send it?" Confirmation Sheet -->
    <div
      v-if="showWhatsAppConfirmSheet"
      class="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-3xl">
          💬
        </div>

        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
            {{ t('testimonials.whatsapp_confirm_title') }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {{ t('testimonials.whatsapp_confirm_desc') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            @click="showWhatsAppConfirmSheet = false"
          >
            {{ t('testimonials.whatsapp_confirm_no') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
            @click="submitSend"
          >
            {{ t('testimonials.whatsapp_confirm_yes') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'sent', result: any): void;
}>();

const { t, locale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const channels: Array<{
  value: 'whatsapp' | 'sms' | 'email' | 'call_readout' | 'other';
  label: string;
  icon: string;
}> = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'sms', label: 'SMS', icon: '✉️' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'call_readout', label: 'Call Readout', icon: '📞' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const selectedChannel = ref<'whatsapp' | 'sms' | 'email' | 'call_readout' | 'other'>('whatsapp');
const selectedTestimonialIds = ref<number[]>([]);
const note = ref('');
const overrideReason = ref('');
const sentAtInput = ref('');
const librarySearch = ref('');
const showAllLibrary = ref(false);

const library = ref<any[]>([]);
const isSubmitting = ref(false);
const errorMessage = ref('');
const showWhatsAppConfirmSheet = ref(false);

const canOverride = computed(() => {
  return authStore.hasPermission('testimonial.void');
});

const isConsentMissing = computed(() => {
  if (!props.lead) return false;
  const ch = selectedChannel.value;
  if (ch === 'whatsapp') return !props.lead.consentWhatsapp;
  if (ch === 'sms') return !props.lead.consentSms;
  if (ch === 'email') return !props.lead.consentEmail;
  return false;
});

const filteredLibrary = computed(() => {
  return library.value.filter((item) => {
    if (!showAllLibrary.value && props.lead) {
      // Prioritize lead language and department
      const matchLang = !props.lead.language || item.language === props.lead.language;
      const matchDept = !props.lead.departmentId || item.departmentId === props.lead.departmentId;
      if (!matchLang && !matchDept) return false;
    }

    if (librarySearch.value.trim()) {
      const q = librarySearch.value.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        (item.department?.labelEn?.toLowerCase().includes(q))
      );
    }
    return true;
  });
});

const whatsappMessage = ref('');

function updateWhatsAppMessage() {
  const patientName = props.lead?.name || 'Patient';
  const callerName = authStore.user?.name || 'Telecaller';
  const centerName = 'Hospital Main Campus';
  const selectedItem = library.value.find((i) => selectedTestimonialIds.value.includes(i.id));
  const link = selectedItem ? selectedItem.url : 'https://example.com/testimonials';

  whatsappMessage.value = `Hello ${patientName}, this is ${callerName} from ${centerName}. Here is the experience of one of our patients, shared with their permission: ${link}. Results vary from person to person. Please consult a doctor. We would be glad to help you. When would you like to speak to our doctor?`;
}

watch(
  () => [props.lead, selectedTestimonialIds.value, locale.value],
  () => {
    updateWhatsAppMessage();
  },
  { deep: true }
);

function getTypeIcon(type: string) {
  switch (type) {
    case 'video': return '🎥';
    case 'pdf': return '📄';
    case 'image': return '🖼️';
    default: return '📝';
  }
}

function toggleTestimonial(id: number) {
  const idx = selectedTestimonialIds.value.indexOf(id);
  if (idx >= 0) {
    selectedTestimonialIds.value.splice(idx, 1);
  } else {
    selectedTestimonialIds.value.push(id);
  }
}

async function fetchLibrary() {
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) {
      headers['authorization'] = `Bearer ${authStore.token}`;
    }
    const res = await fetch(`${apiBase}/testimonials?active=true`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      library.value = data.testimonials || [];
      // Auto-select first matching item for 2-tap convenience
      if (selectedTestimonialIds.value.length === 0 && library.value.length > 0) {
        const matching = library.value.find(
          (i) => i.language === props.lead?.language || i.departmentId === props.lead?.departmentId
        );
        if (matching) {
          selectedTestimonialIds.value = [matching.id];
        } else {
          selectedTestimonialIds.value = [library.value[0].id];
        }
      }
      updateWhatsAppMessage();
    }
  } catch (err) {
    console.error('Failed to fetch testimonials library', err);
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = '';
      showWhatsAppConfirmSheet.value = false;
      const now = new Date();
      // Formats to YYYY-MM-DDTHH:mm for datetime-local
      const tzOffset = now.getTimezoneOffset() * 60000;
      sentAtInput.value = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      fetchLibrary();
    }
  }
);

function handleOpenWhatsApp() {
  const phone = (props.lead?.mobileNorm || props.lead?.mobile || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(whatsappMessage.value);
  const waUrl = `https://wa.me/${phone}?text=${encodedText}`;
  window.open(waUrl, '_blank');
  showWhatsAppConfirmSheet.value = true;
}

async function submitSend() {
  if (!props.lead) return;
  if (selectedTestimonialIds.value.length === 0) {
    errorMessage.value = 'Please select at least one testimonial.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authStore.token) {
      headers['authorization'] = `Bearer ${authStore.token}`;
    }

    const res = await fetch(`${apiBase}/leads/${props.lead.id}/testimonials-sent`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        channel: selectedChannel.value,
        testimonial_ids: selectedTestimonialIds.value,
        note: note.value.trim() || undefined,
        sent_at: sentAtInput.value ? new Date(sentAtInput.value).toISOString() : undefined,
        override_reason: isConsentMissing.value ? overrideReason.value.trim() : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to record testimonial send');
    }

    emit('sent', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'An error occurred';
    showWhatsAppConfirmSheet.value = false;
  } finally {
    isSubmitting.value = false;
  }
}

function close() {
  showWhatsAppConfirmSheet.value = false;
  emit('close');
}
</script>
