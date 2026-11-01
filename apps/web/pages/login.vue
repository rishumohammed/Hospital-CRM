<template>
  <div class="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
    <!-- Ambient Background Glows -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      <!-- Brand Logo & Header -->
      <div class="text-center">
        <div class="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 items-center justify-center text-white shadow-xl shadow-teal-500/20 mb-4">
          <span class="font-extrabold text-2xl tracking-wider">H</span>
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">
          {{ t('app_name') }}
        </h1>
        <p class="mt-2 text-sm text-teal-200/80 font-medium tracking-wide">
          {{ t('tagline') }}
        </p>
      </div>

      <!-- Login Card -->
      <div class="mt-8 bg-slate-800/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-700/60 sm:px-10">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start space-x-3"
        >
          <span class="text-base">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Step 1: Username & Password -->
        <form v-if="!mfaStep" @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="identifier" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email or Mobile Number
            </label>
            <div class="mt-1.5">
              <input
                id="identifier"
                v-model="identifier"
                type="text"
                required
                autocomplete="username"
                placeholder="e.g. telecaller1@hospital.test or +919800000005"
                class="block w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-600/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div class="mt-1.5">
              <input
                id="password"
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••••••"
                class="block w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-600/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center min-h-[48px] py-3 px-4 rounded-xl shadow-lg shadow-teal-600/25 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <span v-if="loading">{{ t('common.loading') }}</span>
            <span v-else>{{ t('nav.login') }}</span>
          </button>
        </form>

        <!-- Step 2: MFA Code -->
        <form v-else @submit.prevent="handleMfaVerify" class="space-y-5">
          <div class="text-center mb-4">
            <h2 class="text-lg font-bold text-white">Two-Factor Authentication</h2>
            <p class="text-xs text-slate-400 mt-1">Enter the 6-digit TOTP code from your authenticator app</p>
          </div>

          <div>
            <input
              id="mfaCode"
              v-model="mfaCode"
              type="text"
              maxlength="6"
              required
              placeholder="000000"
              class="block w-full min-h-[48px] text-center tracking-[0.5em] font-mono text-xl px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-600/80 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center min-h-[48px] py-3 px-4 rounded-xl shadow-lg shadow-teal-600/25 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <span v-if="loading">{{ t('common.loading') }}</span>
            <span v-else>Verify Code</span>
          </button>
        </form>

        <!-- Demo Accounts Quick-Select for Easy Testing -->
        <div class="mt-8 pt-6 border-t border-slate-700/60">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Demo Credentials (Tap to fill)
          </p>
          <div class="flex flex-wrap gap-1.5 justify-center">
            <button
              v-for="acc in demoAccounts"
              :key="acc.email"
              type="button"
              @click="fillDemo(acc.email)"
              class="px-2.5 py-1 text-[11px] rounded-lg bg-slate-700/60 hover:bg-teal-900/40 border border-slate-600/50 text-slate-300 hover:text-teal-300 transition-colors"
            >
              {{ acc.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

definePageMeta({
  layout: false,
});

const { t } = useI18n();
const authStore = useAuthStore();

const identifier = ref('');
const password = ref('');
const mfaCode = ref('');
const mfaStep = ref(false);
const tempToken = ref('');
const errorMessage = ref('');
const loading = ref(false);

const demoAccounts = [
  { label: 'Telecaller 1', email: 'telecaller1@hospital.test' },
  { label: 'Telecaller 2', email: 'telecaller2@hospital.test' },
  { label: 'Admission Specialist', email: 'admission1@hospital.test' },
  { label: 'Aftercare / Nurse', email: 'aftercare1@hospital.test' },
  { label: 'Treating Doctor', email: 'doctor1@hospital.test' },
  { label: 'Manager', email: 'manager@hospital.test' },
  { label: 'IT Admin', email: 'admin@hospital.test' },
  { label: 'Managing Director', email: 'owner@hospital.test' },
];

function fillDemo(email: string) {
  identifier.value = email;
  password.value = 'HospitalCRM@2026';
  errorMessage.value = '';
}

async function handleLogin() {
  errorMessage.value = '';
  loading.value = true;
  try {
    const res = await authStore.login(identifier.value, password.value);
    if (res.mfaRequired && res.tempToken) {
      tempToken.value = res.tempToken;
      mfaStep.value = true;
    } else if (res.success) {
      navigateTo('/');
    }
  } catch (err: any) {
    const message = err.data?.error?.message || err.message || 'Login failed';
    errorMessage.value = message;
  } finally {
    loading.value = false;
  }
}

async function handleMfaVerify() {
  errorMessage.value = '';
  loading.value = true;
  try {
    const res = await authStore.verifyMfa(tempToken.value, mfaCode.value);
    if (res.success) {
      navigateTo('/');
    }
  } catch (err: any) {
    const message = err.data?.error?.message || err.message || 'MFA Verification failed';
    errorMessage.value = message;
  } finally {
    loading.value = false;
  }
}
</script>
