<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('nav.leads') }}</h1>
        <p class="text-sm text-slate-500">{{ t('desks.support_desc') }}</p>
      </div>
      <button
        class="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
      >
        + {{ t('common.quick_create_lead') }}
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
      <p class="text-slate-500 text-sm">Leads management interface (Milestone 3)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
