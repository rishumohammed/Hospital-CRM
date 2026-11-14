<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      @click="close"
    />

    <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
      <div
        class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 dark:border-slate-800"
      >
        <!-- Modal Header -->
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-teal-50/60 dark:bg-teal-950/20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg font-semibold">
              👤⇄
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                {{ lead?.owner ? 'Reassign Lead' : 'Assign Lead' }}
              </h3>
              <p v-if="lead" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {{ lead.name }} <span class="text-slate-400">&bull;</span> {{ lead.mobile }}
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
        <form @submit.prevent="submitAssign" class="p-6 space-y-4">
          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium"
          >
            {{ errorMessage }}
          </div>

          <!-- Current Assignee Info -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">Current Assignee</span>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {{ lead?.owner?.name || '⚠️ Unassigned' }}
              </span>
              <span
                v-if="lead?.owner"
                class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300"
              >
                {{ lead.owner.role?.name || lead.owner.role?.code || 'Staff' }}
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
              >
                In Unassigned Pool
              </span>
            </div>
          </div>

          <!-- New Staff Member Selector -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign To Telecaller / Staff Member <span class="text-rose-500">*</span>
            </label>
            <div v-if="isLoadingStaff" class="py-2 text-xs text-slate-400 flex items-center gap-2">
              <span class="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>
              <span>Loading active telecallers...</span>
            </div>
            <select
              v-else
              v-model="selectedOwnerId"
              required
              class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option :value="null" disabled>Select telecaller or staff...</option>
              <optgroup v-if="telecallers.length > 0" label="Support Telecallers">
                <option v-for="s in telecallers" :key="s.id" :value="s.id">
                  {{ s.name }} (Support Telecaller)
                </option>
              </optgroup>
              <optgroup v-if="otherStaff.length > 0" label="Other Staff & Managers">
                <option v-for="s in otherStaff" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.role?.name || s.role?.code || 'Staff' }})
                </option>
              </optgroup>
            </select>
          </div>

          <!-- Reason (Optional) -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason / Assignment Note <span class="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              v-model="reason"
              type="text"
              maxlength="200"
              class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Workload balance, Language preference, Shift handoff..."
            />
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !selectedOwnerId || selectedOwnerId === lead?.ownerId"
              class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center gap-2 min-h-[38px]"
            >
              <span v-if="isSubmitting" class="flex items-center gap-2">
                <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Assigning...</span>
              </span>
              <span v-else>
                {{ lead?.owner ? 'Confirm Reassign' : 'Assign Lead' }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '~/stores/auth';

const props = defineProps<{
  isOpen: boolean;
  lead?: any;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'reassigned', updatedLead: any): void;
}>();

const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApi = config.public.apiBase || '/api/v1';
const apiBase = rawApi.endsWith('/api/v1') ? rawApi : `${rawApi.replace(/\/+$/, '')}/api/v1`;

const staffList = ref<any[]>([]);
const selectedOwnerId = ref<number | null>(null);
const reason = ref('');
const isSubmitting = ref(false);
const isLoadingStaff = ref(false);
const errorMessage = ref('');

const telecallers = computed(() => {
  const list = Array.isArray(staffList.value) ? staffList.value : [];
  return list.filter(
    (s) => s.role?.code === 'support_telecaller' || s.role?.code === 'caller'
  );
});

const otherStaff = computed(() => {
  const list = Array.isArray(staffList.value) ? staffList.value : [];
  return list.filter(
    (s) => s.role?.code !== 'support_telecaller' && s.role?.code !== 'caller'
  );
});

async function fetchStaff() {
  if (Array.isArray(staffList.value) && staffList.value.length > 0) return;
  isLoadingStaff.value = true;
  try {
    const token =
      authStore.token ||
      authStore.accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/users/staff`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      staffList.value = Array.isArray(data) ? data : (data.items || []);
    }
  } catch (err) {
    console.error('Failed to load staff list:', err);
  } finally {
    isLoadingStaff.value = false;
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = '';
      reason.value = '';
      selectedOwnerId.value = props.lead?.ownerId || null;
      fetchStaff();
    }
  }
);

function close() {
  emit('close');
}

async function submitAssign() {
  if (!props.lead?.id || !selectedOwnerId.value) return;
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const token =
      authStore.token ||
      authStore.accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/leads/${props.lead.id}/assign`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        ownerId: selectedOwnerId.value,
        reason: reason.value.trim() || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      errorMessage.value = data?.error?.message || data?.message || 'Failed to reassign lead';
      return;
    }

    emit('reassigned', data);
    emit('close');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Network error occurred while reassigning lead';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

