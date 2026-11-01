<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('nav.reports') }}</h1>
      <p class="text-sm text-slate-500">Management Dashboards & Analytics (Milestone 8)</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
      <p class="text-slate-500 text-sm">Reports and analytics overview</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
