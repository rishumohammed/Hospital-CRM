<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      @click="close"
    />

    <div class="flex min-h-full items-center justify-center p-4 text-center">
      <div class="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800 space-y-4">
        
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl font-bold">
            ↩️
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {{ t('testimonials.void_title') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Send ID #{{ send?.id }} &bull; {{ send?.channel?.toUpperCase() }}
            </p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {{ t('testimonials.void_reason_prompt') }}
        </p>

        <!-- Error Banner -->
        <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {{ errorMessage }}
        </div>

        <!-- Reason Input -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Reason for Voiding (Mandatory)
          </label>
          <textarea
            v-model="voidReason"
            rows="3"
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
            :placeholder="t('testimonials.void_reason_placeholder')"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting || !voidReason.trim()"
            class="min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white transition-all shadow-sm flex items-center gap-2"
            @click="submitVoid"
          >
            <span v-if="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Confirm Void</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  isOpen: boolean;
  leadId: number;
  send: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'voided', result: any): void;
}>();

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const voidReason = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      voidReason.value = '';
      errorMessage.value = '';
    }
  }
);

function close() {
  emit('close');
}

async function submitVoid() {
  if (!voidReason.value.trim()) {
    errorMessage.value = 'Void reason is required.';
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

    const res = await fetch(`${apiBase}/leads/${props.leadId}/testimonials-sent/${props.send.id}/void`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ reason: voidReason.value.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to void testimonial send');
    }

    emit('voided', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'An error occurred';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
