<template>
  <div class="space-y-6">
    <!-- Hero / Welcome Header -->
    <div class="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
      <div class="max-w-3xl">
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {{ t('nav.my_work') }}
        </h1>
        <p class="mt-2 text-teal-100 text-sm sm:text-base leading-relaxed">
          {{ t('tagline') }} — Hospital CRM
        </p>
      </div>

      <!-- Quick Stats / Health Indicator -->
      <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-teal-600/50">
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.status') }}</p>
          <div class="mt-1 flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-bold text-sm">Online</span>
          </div>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.branch') }}</p>
          <p class="mt-1 font-bold text-sm">MAIN Branch</p>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.today') }} Tasks</p>
          <p class="mt-1 font-bold text-sm">0 Pending</p>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.overdue') }}</p>
          <p class="mt-1 font-bold text-sm text-amber-300">0 Overdue</p>
        </div>
      </div>
    </div>

    <!-- The Three Work Desks Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 1. Support Desk -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-xl mb-4">
            1
          </div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ t('desks.support_title') }}
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ t('desks.support_desc') }}
          </p>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <NuxtLink
            to="/leads"
            class="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {{ t('nav.support_desk') }} &rarr;
          </NuxtLink>
        </div>
      </div>

      <!-- 2. Admission Desk -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xl mb-4">
            2
          </div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ t('desks.admission_title') }}
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ t('desks.admission_desc') }}
          </p>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <NuxtLink
            to="/cases?team=admission"
            class="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {{ t('nav.admission_desk') }} &rarr;
          </NuxtLink>
        </div>
      </div>

      <!-- 3. Aftercare Desk -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl mb-4">
            3
          </div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ t('desks.aftercare_title') }}
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ t('desks.aftercare_desc') }}
          </p>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <NuxtLink
            to="/cases?team=aftercare"
            class="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {{ t('nav.aftercare_desk') }} &rarr;
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
