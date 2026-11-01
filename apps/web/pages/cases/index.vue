<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('nav.cases') }}</h1>
      <p class="text-sm text-slate-500">Admission & Aftercare Cases (Milestones 5, 6, 7)</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
      <p class="text-slate-500 text-sm">Cases management interface</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
