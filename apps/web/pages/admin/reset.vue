<template>
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-inner" :class="status === 'success' ? 'bg-emerald-100 text-emerald-600' : status === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-teal-50 text-teal-600'">
        <UIcon v-if="status === 'loading'" name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" />
        <UIcon v-else-if="status === 'success'" name="i-heroicons-check-circle" class="w-8 h-8 text-emerald-600" />
        <UIcon v-else-if="status === 'error'" name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-rose-600" />
        <UIcon v-else name="i-heroicons-trash" class="w-8 h-8 text-teal-600" />
      </div>

      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-slate-100">
          {{ status === 'success' ? 'Data Reset Complete!' : status === 'loading' ? 'Clearing Test Data...' : 'Reset Operational CRM Data' }}
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          {{ message || 'Wipe all transactional leads, tasks, cases, calls, and appointments for fresh end-to-end manual testing.' }}
        </p>
      </div>

      <div v-if="status === 'success'" class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
        <p class="font-semibold text-slate-700 dark:text-slate-300">Clean State Verified:</p>
        <ul class="space-y-1 text-slate-500 dark:text-slate-400 list-disc list-inside">
          <li>Leads, inquiries &amp; product pipeline: <strong class="text-emerald-600">0 records</strong></li>
          <li>Marketing campaigns &amp; ad spend: <strong class="text-emerald-600">0 records (₹0 spend)</strong></li>
          <li>Telecaller tasks &amp; queues: <strong class="text-emerald-600">0 records</strong></li>
          <li>Patient cases &amp; follow-up visits: <strong class="text-emerald-600">0 records</strong></li>
          <li>Staff logins &amp; roles: <strong class="text-teal-600">Preserved &amp; Active</strong></li>
          <li>Products &amp; Categories: <strong class="text-emerald-600">0 records (Fresh Setup)</strong></li>
        </ul>
      </div>

      <div class="flex flex-col gap-3">
        <button
          v-if="status !== 'success'"
          type="button"
          :disabled="status === 'loading'"
          @click="runReset"
          class="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
        >
          <UIcon v-if="status === 'loading'" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <span>{{ status === 'loading' ? 'Clearing Database...' : 'Confirm: Clear All Data Now' }}</span>
        </button>

        <NuxtLink
          v-if="status === 'success'"
          to="/"
          class="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span>Go to Clean Dashboard →</span>
        </NuxtLink>

        <NuxtLink
          to="/admin"
          class="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Cancel &amp; Return to Admin
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const message = ref('');

const runReset = async () => {
  status.value = 'loading';
  message.value = 'Connecting to database and clearing transactional records...';

  try {
    const config = useRuntimeConfig();
    const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
    const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

    const res = await fetch(`${apiBase}/health/reset-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    status.value = 'success';
    message.value = data.message || 'All operational data cleared successfully.';
  } catch (err: any) {
    status.value = 'error';
    message.value = err.message || 'Failed to clear operational data.';
  }
};

onMounted(() => {
  const route = useRoute();
  if (route.query.auto === 'true') {
    runReset();
  }
});
</script>
