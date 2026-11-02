<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex font-sans antialiased">
    <!-- Mobile Drawer Backdrop -->
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
      @click="isMobileMenuOpen = false"
    />

    <!-- Side Navigation Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shadow-lg lg:shadow-none',
        // Desktop sizing
        isCollapsed ? 'lg:w-20' : 'lg:w-64',
        // Mobile visibility
        isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
      ]"
    >
      <!-- Sidebar Brand / Header -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <NuxtLink to="/" class="flex items-center overflow-hidden focus:outline-none py-1" @click="isMobileMenuOpen = false">
          <img
            src="/logo.webp"
            alt="Samad's Elements"
            :class="[
              'object-contain transition-all duration-200',
              isCollapsed && !isMobileMenuOpen ? 'h-8 max-w-[44px]' : 'h-10 max-w-[170px]'
            ]"
          />
        </NuxtLink>

        <!-- Mobile Close Button -->
        <button
          type="button"
          class="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          @click="isMobileMenuOpen = false"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>

        <!-- Desktop Collapse Toggle -->
        <button
          type="button"
          class="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="isCollapsed = !isCollapsed"
        >
          <UIcon :name="isCollapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'" class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Links Groups -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        <!-- Group 1: Core Telecalling -->
        <div>
          <div
            v-if="!isCollapsed || isMobileMenuOpen"
            class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            {{ t('nav.my_work') }} &amp; {{ t('nav.leads') }}
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in coreNavItems"
              :key="item.to"
              :to="item.to"
              :title="isCollapsed && !isMobileMenuOpen ? item.label : undefined"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                isActive(item.to)
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
              ]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon
                :name="item.icon"
                :class="[
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive(item.to) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                ]"
              />
              <span v-show="!isCollapsed || isMobileMenuOpen" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Group 2: Specialized Desks -->
        <div>
          <div
            v-if="!isCollapsed || isMobileMenuOpen"
            class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Clinical Desks
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in deskNavItems"
              :key="item.to"
              :to="item.to"
              :title="isCollapsed && !isMobileMenuOpen ? item.label : undefined"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                isActive(item.to)
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
              ]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon
                :name="item.icon"
                :class="[
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive(item.to) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                ]"
              />
              <span v-show="!isCollapsed || isMobileMenuOpen" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Group 3: Products & Campaigns -->
        <div v-if="productNavItems.length > 0">
          <div
            v-if="!isCollapsed || isMobileMenuOpen"
            class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Products &amp; Campaigns
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in productNavItems"
              :key="item.to"
              :to="item.to"
              :title="isCollapsed && !isMobileMenuOpen ? item.label : undefined"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                isActive(item.to)
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
              ]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon
                :name="item.icon"
                :class="[
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive(item.to) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                ]"
              />
              <span v-show="!isCollapsed || isMobileMenuOpen" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Group 4: Analytics & Content -->
        <div>
          <div
            v-if="!isCollapsed || isMobileMenuOpen"
            class="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Management
          </div>
          <div class="space-y-1">
            <NuxtLink
              v-for="item in managementNavItems"
              :key="item.to"
              :to="item.to"
              :title="isCollapsed && !isMobileMenuOpen ? item.label : undefined"
              :class="[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                isActive(item.to)
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
              ]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon
                :name="item.icon"
                :class="[
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive(item.to) ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400'
                ]"
              />
              <span v-show="!isCollapsed || isMobileMenuOpen" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <!-- Sidebar Footer (Compact collapse indicator) -->
      <div class="p-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <span v-show="!isCollapsed || isMobileMenuOpen" class="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
          v1.0 • CRM
        </span>
        <button
          type="button"
          class="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors ml-auto"
          :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="isCollapsed = !isCollapsed"
        >
          <UIcon :name="isCollapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'" class="w-4 h-4" />
        </button>
      </div>
    </aside>

    <!-- Main App Column -->
    <div
      :class="[
        'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
        isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      ]"
    >
      <!-- Top Action Bar -->
      <header class="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- Left: Mobile Menu Toggle -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            @click="isMobileMenuOpen = true"
          >
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
          </button>
        </div>

        <!-- Right: Notifications, User Profile & Admin & Logout Dropdown -->
        <div class="flex items-center gap-2 sm:gap-3 ml-auto">

          <!-- Notification Bell & Dropdown Popover -->
          <div v-if="authStore.user" class="relative">
            <button
              type="button"
              class="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              @click="isNotifOpen = !isNotifOpen; isProfileMenuOpen = false"
            >
              <UIcon name="i-heroicons-bell" class="w-5 h-5" />
              <span
                v-if="unreadNotifCount > 0"
                class="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-rose-600 text-white shadow-sm animate-pulse"
              >
                {{ unreadNotifCount > 9 ? '9+' : unreadNotifCount }}
              </span>
            </button>

            <!-- Popover Menu -->
            <div
              v-if="isNotifOpen"
              class="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div class="p-3 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
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
                      class="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600"
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

          <!-- User Profile & Admin & Logout Dropdown -->
          <div v-if="authStore.user" class="relative">
            <button
              type="button"
              class="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all text-left focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              @click="isProfileMenuOpen = !isProfileMenuOpen; isNotifOpen = false"
            >
              <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-semibold text-xs shadow-xs flex-shrink-0">
                {{ userInitials }}
              </div>
              <div class="hidden sm:flex flex-col min-w-0 pr-1">
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {{ authStore.user.name }}
                </span>
                <span class="text-[10px] text-teal-600 dark:text-teal-400 font-semibold truncate uppercase leading-none">
                  {{ userRoleName }}
                </span>
              </div>
              <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-slate-400" />
            </button>

            <!-- Profile Floating Dropdown Menu -->
            <div
              v-if="isProfileMenuOpen"
              class="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in zoom-in-95 duration-150"
            >
              <!-- User Info Card -->
              <div class="p-3.5 bg-slate-50/70 dark:bg-slate-900/50">
                <p class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {{ authStore.user.name }}
                </p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {{ authStore.user.email }}
                </p>
                <div class="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {{ userRoleName }}
                  </span>
                  <span v-if="authStore.user.center" class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 truncate">
                    {{ authStore.user.center.name || authStore.user.center.code }}
                  </span>
                </div>
              </div>

              <!-- Menu Link: Settings -->
              <div class="p-1.5 space-y-0.5">
                <NuxtLink
                  to="/admin"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors group"
                  @click="isProfileMenuOpen = false"
                >
                  <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  <span>Settings</span>
                </NuxtLink>
              </div>

              <!-- Menu Action: Logout -->
              <div class="p-1.5">
                <button
                  type="button"
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  @click="isProfileMenuOpen = false; authStore.logout()"
                >
                  <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
                  <span>{{ t('nav.logout') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Login Link if not logged in -->
          <NuxtLink
            v-else
            to="/login"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 hover:bg-teal-100 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
            <span>{{ t('nav.login') }}</span>
          </NuxtLink>
        </div>
      </header>

      <!-- Main Content Page Body -->
      <main class="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

// Sidebar & Menus State
const isCollapsed = ref(false);
const isMobileMenuOpen = ref(false);
const isProfileMenuOpen = ref(false);

// Close open menus on route change
watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
    isProfileMenuOpen.value = false;
    isNotifOpen.value = false;
  }
);

// Navigation Groups
const coreNavItems = computed(() => [
  { to: '/', label: t('nav.my_work'), icon: 'i-heroicons-squares-2x2' },
  { to: '/leads', label: t('nav.leads'), icon: 'i-heroicons-user-group' },
  { to: '/cases', label: t('nav.cases'), icon: 'i-heroicons-briefcase' },
]);

const deskNavItems = computed(() => [
  { to: '/admission', label: t('nav.admission_desk'), icon: 'i-heroicons-building-office-2' },
  { to: '/aftercare', label: t('nav.aftercare_desk'), icon: 'i-heroicons-heart' },
  { to: '/doctor', label: t('nav.doctor_view'), icon: 'i-heroicons-academic-cap' },
]);

const productNavItems = computed(() => {
  const items: { to: string; label: string; icon: string }[] = [];
  if (authStore.hasPermission('product.view') || authStore.hasPermission('product_lead.view')) {
    items.push({ to: '/products', label: 'Product Catalog', icon: 'i-heroicons-shopping-bag' });
  }
  return items;
});

const managementNavItems = computed(() => {
  const items = [
    { to: '/reports', label: t('nav.reports'), icon: 'i-heroicons-chart-bar' },
  ];
  const role = authStore.user?.role;
  const canAccessAdmin =
    ['owner', 'admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(role) ||
    authStore.hasPermission('settings.manage');
  if (canAccessAdmin) {
    items.push({ to: '/admin', label: t('nav.settings') || 'Settings', icon: 'i-heroicons-cog-6-tooth' });
  }
  return items;
});

// Active route helper
const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  if (path === '/admin') return route.path === '/admin';
  return route.path === path || route.path.startsWith(`${path}/`);
};

// User Initials
const userInitials = computed(() => {
  const name = authStore.user?.name || '';
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
});

// User Role Display Name
const userRoleName = computed(() => {
  if (!authStore.user) return 'Staff';
  const role = authStore.user.role;
  if (typeof role === 'object' && role) return role.name || role.code || 'Staff';
  if (typeof role === 'string' && role) return role;
  if (authStore.user.roleName) return authStore.user.roleName;
  if (authStore.user.roleCode) {
    const code = authStore.user.roleCode;
    const roleMap: Record<string, string> = {
      owner: 'Managing Director',
      admin: 'IT Administrator',
      center_head: 'Branch Manager',
      doctor: 'Treating Doctor',
      telecaller: 'Telecaller',
      telecaller_manager: 'Patient Experience Lead',
      support_telecaller: 'Support Telecaller',
      admission_specialist: 'Admission Specialist',
      aftercare_executive: 'Aftercare Executive',
      treatment_followup_executive: 'Treatment Follow-up Executive',
      product_manager: 'Product Manager',
      product_sales_executive: 'Product Sales Executive',
      front_office: 'Front Office / Reception',
      pharmacy_store: 'Pharmacy Store',
      auditor: 'Auditor',
    };
    return roleMap[code] || code.replace(/_/g, ' ');
  }
  return 'Staff';
});

// Notifications
const isNotifOpen = ref(false);
const notifications = ref<any[]>([]);
const unreadNotifCount = ref(0);
let notifPollTimer: any = null;

const fetchNotifications = async () => {
  if (!authStore.token) return;
  try {
    const res = await fetch(`${apiBase}/notifications`, {
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
    await fetch(`${apiBase}/notifications/${id}/read`, {
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
    await fetch(`${apiBase}/notifications/read-all`, {
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
</script>
