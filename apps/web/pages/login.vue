<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50/70 via-slate-50 to-teal-50/70 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
    <!-- Ambient Background Glows -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-300/20 rounded-full blur-3xl pointer-events-none"></div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
      <!-- Brand Logo & Header -->
      <div class="text-center">
        <div class="inline-flex items-center justify-center mb-3">
          <img
            src="/logo.webp"
            alt="Samad's Elements - Traditional Treatment Centre"
            class="h-16 sm:h-20 max-w-full object-contain drop-shadow-xs"
          />
        </div>
        <div>
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hospital CRM &bull; Telecalling Portal</span>
          </span>
        </div>
      </div>

      <!-- Login Card -->
      <div class="mt-7 bg-white/95 backdrop-blur-xl py-8 px-6 shadow-xl shadow-emerald-950/5 rounded-3xl border border-slate-200/90 sm:px-10">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start space-x-3"
        >
          <span class="text-base">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Step 1: Username & Password -->
        <form v-if="!mfaStep" @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="identifier" class="block text-xs font-semibold uppercase tracking-wider text-slate-700">
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
                class="block w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-slate-700">
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
                class="block w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center min-h-[48px] py-3 px-4 rounded-xl shadow-md shadow-emerald-700/20 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <span v-if="loading">{{ t('common.loading') }}</span>
            <span v-else>{{ t('nav.login') }}</span>
          </button>
        </form>

        <!-- Step 2: MFA Code -->
        <form v-else @submit.prevent="handleMfaVerify" class="space-y-5">
          <div class="text-center mb-4">
            <h2 class="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
            <p class="text-xs text-slate-500 mt-1">Enter the 6-digit TOTP code from your authenticator app</p>
          </div>

          <div>
            <input
              id="mfaCode"
              v-model="mfaCode"
              type="text"
              maxlength="6"
              required
              placeholder="000000"
              class="block w-full min-h-[48px] text-center tracking-[0.5em] font-mono text-xl px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center min-h-[48px] py-3 px-4 rounded-xl shadow-md shadow-emerald-700/20 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <span v-if="loading">{{ t('common.loading') }}</span>
            <span v-else>Verify Code</span>
          </button>
        </form>

        <!-- Demo Accounts Quick-Select for Easy Testing -->
        <div class="mt-8 pt-6 border-t border-slate-100">
          <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
            Demo Credentials (Tap to fill)
          </p>
          <div class="flex flex-wrap gap-1.5 justify-center">
            <button
              v-for="acc in demoAccounts"
              :key="acc.email"
              type="button"
              @click="fillDemo(acc.email)"
              class="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100/90 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 transition-all shadow-2xs"
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
  { label: 'Product Caller', email: 'prod_caller@hospital.test' },
  { label: 'Product Manager', email: 'prod_mgr@hospital.test' },
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
