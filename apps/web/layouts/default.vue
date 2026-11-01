<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
    <!-- Top Navigation Header -->
    <header class="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Brand / Logo -->
        <div class="flex items-center space-x-3">
          <NuxtLink to="/" class="flex items-center space-x-2 focus:outline-none">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <span class="font-bold text-xl tracking-tight">H</span>
            </div>
            <div>
              <span class="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-700 to-emerald-600 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">
                {{ t('app_name') }}
              </span>
              <p class="text-[10px] text-slate-500 font-medium tracking-wide uppercase leading-none">
                {{ t('tagline') }}
              </p>
            </div>
          </NuxtLink>
        </div>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center space-x-1 lg:space-x-2">
          <NuxtLink
            to="/"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.my_work') }}
          </NuxtLink>
          <NuxtLink
            to="/leads"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.leads') }}
          </NuxtLink>
          <NuxtLink
            to="/cases"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.cases') }}
          </NuxtLink>
          <NuxtLink
            to="/admission"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.admission_desk') }}
          </NuxtLink>
          <NuxtLink
            to="/doctor"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.doctor_view') }}
          </NuxtLink>
          <NuxtLink
            to="/reports"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.reports') }}
          </NuxtLink>
          <NuxtLink
            to="/admin"
            class="px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            active-class="!bg-teal-50 dark:!bg-teal-950/50 !text-teal-700 dark:!text-teal-400 font-bold"
          >
            {{ t('nav.admin') }}
          </NuxtLink>
        </nav>

        <!-- Right Side: Language Switcher & Actions -->
        <div class="flex items-center space-x-2">
          <!-- Language Toggle (EN / ML) -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              @click="switchLocale('en')"
              :class="[
                'px-2.5 py-1.5 text-xs font-semibold rounded-md min-h-[36px] transition-all',
                locale === 'en'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              ]"
            >
              EN
            </button>
            <button
              type="button"
              @click="switchLocale('ml')"
              :class="[
                'px-2.5 py-1.5 text-xs font-semibold rounded-md min-h-[36px] transition-all',
                locale === 'ml'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              ]"
            >
              മലയാളം
            </button>
          </div>

          <!-- Notification Bell Icon & Dropdown -->
          <div v-if="authStore.user" class="relative">
            <button
              type="button"
              class="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              @click="isNotifOpen = !isNotifOpen"
            >
              <span class="text-lg">🔔</span>
              <span
                v-if="unreadNotifCount > 0"
                class="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-600 text-white shadow-sm animate-pulse"
              >
                {{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}
              </span>
            </button>

            <!-- Notifications Popover -->
            <div
              v-if="isNotifOpen"
              class="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
            >
              <div class="p-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Notifications ({{ unreadNotifCount }} unread)
                </span>
                <button
                  v-if="unreadNotifCount > 0"
                  type="button"
                  class="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  @click="markAllRead"
                >
                  Mark all read
                </button>
              </div>

              <div class="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
                <div v-if="notifications.length === 0" class="p-6 text-center text-xs text-slate-400">
                  No notifications
                </div>
                <div
                  v-for="notif in notifications"
                  :key="notif.id"
                  :class="[
                    'p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40',
                    !notif.readAt ? 'bg-teal-50/30 dark:bg-teal-950/20' : ''
                  ]"
                >
                  <div class="flex items-start justify-between gap-2">
                    <NuxtLink
                      :to="notif.link || '#'"
                      class="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                      @click="isNotifOpen = false; markRead(notif.id)"
                    >
                      {{ notif.title }}
                    </NuxtLink>
                    <button
                      v-if="!notif.readAt"
                      type="button"
                      class="text-[10px] text-teal-600 font-semibold"
                      @click="markRead(notif.id)"
                    >
                      ✓
                    </button>
                  </div>
                  <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    {{ notif.body }}
                  </p>
                  <p class="text-[9px] text-slate-400 mt-1">
                    {{ new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Auth Status & Logout / Login -->
          <div v-if="authStore.user" class="flex items-center space-x-2">
            <span class="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300">
              {{ authStore.user.name }}
            </span>
            <button
              @click="authStore.logout()"
              class="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
          <NuxtLink
            v-else
            to="/login"
            class="px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
          >
            {{ t('nav.login') }}
          </NuxtLink>

          <!-- Quick Create Lead Button -->
          <NuxtLink
            to="/leads?quickCreate=true"
            class="hidden sm:inline-flex items-center justify-center px-3.5 py-2 min-h-[44px] rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-all shadow-teal-600/20 active:scale-95"
          >
            + {{ t('common.quick_create_lead') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
      <slot />
    </main>

    <!-- Mobile Bottom Navigation Bar (Large touch targets >= 44px) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 py-1 px-2 shadow-lg">
      <div class="grid grid-cols-5 gap-1">
        <NuxtLink
          to="/"
          class="flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg text-slate-600 dark:text-slate-400"
          active-class="!text-teal-600 dark:!text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/30"
        >
          <span class="text-xs">{{ t('nav.my_work') }}</span>
        </NuxtLink>
        <NuxtLink
          to="/leads"
          class="flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg text-slate-600 dark:text-slate-400"
          active-class="!text-teal-600 dark:!text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/30"
        >
          <span class="text-xs">{{ t('nav.leads') }}</span>
        </NuxtLink>
        <NuxtLink
          to="/cases"
          class="flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg text-slate-600 dark:text-slate-400"
          active-class="!text-teal-600 dark:!text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/30"
        >
          <span class="text-xs">{{ t('nav.cases') }}</span>
        </NuxtLink>
        <NuxtLink
          to="/doctor"
          class="flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg text-slate-600 dark:text-slate-400"
          active-class="!text-teal-600 dark:!text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/30"
        >
          <span class="text-xs">{{ t('nav.doctor_view') }}</span>
        </NuxtLink>
        <NuxtLink
          to="/admin"
          class="flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg text-slate-600 dark:text-slate-400"
          active-class="!text-teal-600 dark:!text-teal-400 font-bold bg-teal-50/50 dark:bg-teal-950/30"
        >
          <span class="text-xs">{{ t('nav.admin') }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const { t, locale, setLocale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:3001';

const isNotifOpen = ref(false);
const notifications = ref<any[]>([]);
const unreadNotifCount = ref(0);
let notifPollTimer: any = null;

const fetchNotifications = async () => {
  if (!authStore.token) return;
  try {
    const res = await fetch(`${apiBase}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      notifications.value = data.data || [];
      unreadNotifCount.value = data.unreadCount || 0;
    }
  } catch (err) {
    // Silent catch on poll
  }
};

const markRead = async (id: number) => {
  try {
    await fetch(`${apiBase}/api/v1/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    fetchNotifications();
  } catch (err) {
    console.error(err);
  }
};

const markAllRead = async () => {
  try {
    await fetch(`${apiBase}/api/v1/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    fetchNotifications();
  } catch (err) {
    console.error(err);
  }
};

onMounted(() => {
  authStore.fetchMe();
  fetchNotifications();
  notifPollTimer = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (notifPollTimer) clearInterval(notifPollTimer);
});

const switchLocale = (newLocale: string) => {
  setLocale(newLocale);
};
</script>
