<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ t('nav.doctor_view') }}</h1>
      <p class="text-sm text-slate-500">Treating Doctor View & Clinical Escalations (Milestone 5, 7)</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
      <p class="text-slate-500 text-sm">Doctor consultation and escalation queue</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
