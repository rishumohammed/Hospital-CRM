<template>
  <div class="space-y-6">
    <!-- Hero / Welcome Header -->
    <div class="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {{ t('nav.my_work') }}
          </h1>
          <p class="mt-1 text-teal-100 text-sm leading-relaxed">
            {{ authStore.user?.name || 'Telecaller' }} &bull; {{ authStore.user?.role?.code }} &bull; MAIN Campus
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-teal-600/80 hover:bg-teal-500 text-white font-semibold text-xs tracking-wider uppercase border border-teal-400/30 transition-all flex items-center gap-2 min-h-[44px]"
            @click="isQuickCreateOpen = true"
          >
            <span>+</span>
            <span>{{ t('common.quick_create_lead') }}</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Bar -->
      <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-teal-600/50">
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.overdue') }}</p>
          <p class="mt-1 font-extrabold text-xl text-rose-300">{{ overdueCount }}</p>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.today') }} Due</p>
          <p class="mt-1 font-extrabold text-xl text-amber-200">{{ todayCount }}</p>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">{{ t('common.upcoming') }}</p>
          <p class="mt-1 font-extrabold text-xl text-teal-100">{{ upcomingCount }}</p>
        </div>
        <div class="bg-teal-900/40 rounded-xl p-3 border border-teal-500/20 backdrop-blur-sm">
          <p class="text-xs text-teal-200 font-medium">New Leads SLA</p>
          <div class="mt-1 flex items-center space-x-1.5 font-bold text-sm">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active Monitor</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Desk Tabs Navigation -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
      <!-- Team Queue Tabs -->
      <div class="flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'support'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'support'; loadWorkQueue()"
        >
          {{ t('desks.support_title') }}
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'admission'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'admission'; loadWorkQueue()"
        >
          {{ t('desks.admission_title') }}
        </button>
        <button
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'aftercare'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'aftercare'; loadWorkQueue()"
        >
          {{ t('desks.aftercare_title') }}
        </button>
      </div>

      <!-- Timing Sub-Filter: Overdue / Today / Upcoming -->
      <div class="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'overdue'; loadWorkQueue()"
        >
          {{ t('common.overdue') }} ({{ overdueCount }})
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'today'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'today'; loadWorkQueue()"
        >
          {{ t('common.today') }} ({{ todayCount }})
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'upcoming'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'upcoming'; loadWorkQueue()"
        >
          {{ t('common.upcoming') }} ({{ upcomingCount }})
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 flex justify-center items-center">
      <div class="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="tasks.length === 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700"
    >
      <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl mb-4">
        ✨
      </div>
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">
        {{ t('tasks.no_tasks') }}
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        Great job! You have cleared all {{ activeTiming }} items for this desk queue.
      </p>
    </div>

    <!-- Task Cards List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>
          <!-- Top Row: Priority Badge & SLA Countdown -->
          <div class="flex items-center justify-between mb-3">
            <span
              :class="[
                'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full',
                task.priority === 'hot'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : task.priority === 'cold'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              ]"
            >
              {{ task.priority }}
            </span>

            <!-- SLA Timer for New Leads -->
            <div
              v-if="task.lead?.firstResponseDueAt && !task.lead.firstResponseAt"
              class="flex items-center gap-1.5 text-xs font-mono font-bold"
            >
              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[11px]',
                  isSlaBreached(task.lead.firstResponseDueAt)
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                ]"
              >
                {{ formatSlaRemaining(task.lead.firstResponseDueAt) }}
              </span>
            </div>
            <div v-else class="text-xs text-slate-400 font-medium">
              Due: {{ formatDueDate(task.dueAt) }}
            </div>
          </div>

          <!-- Patient Information -->
          <div class="space-y-1">
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600">
              <NuxtLink v-if="task.lead" :to="`/leads/${task.lead.id}`">
                {{ task.lead.name }}
              </NuxtLink>
              <span v-else>{{ task.case?.patient?.name || 'Patient Case' }}</span>
            </h3>

            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="font-mono">{{ task.lead?.mobile || task.case?.patient?.mobileNorm || '—' }}</span>
              <span v-if="task.lead?.language" class="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold">
                {{ task.lead.language.toUpperCase() }}
              </span>
            </div>
          </div>

          <!-- Task Title & Concern -->
          <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-200">
              {{ task.title }}
            </p>
            <p v-if="task.lead?.concern" class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              {{ task.lead.concern }}
            </p>
            <div class="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span v-if="task.lead?.department">
                🏥 {{ locale === 'ml' ? task.lead.department.labelMl : task.lead.department.labelEn }}
              </span>
              <span v-if="task.lead?.source">
                &bull; {{ task.lead.source.labelEn }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
          <!-- Call Button (tel: link) -->
          <a
            :href="`tel:${task.lead?.mobileNorm || task.lead?.mobile || ''}`"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            📞 {{ t('common.call') }}
          </a>

          <!-- WhatsApp Button (wa.me link with consent check) -->
          <button
            type="button"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-xs hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
            @click="openWhatsApp(task.lead)"
          >
            💬 {{ t('common.whatsapp') }}
          </button>

          <!-- Log Call Button -->
          <button
            type="button"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-xs"
            @click="openLogCall(task.lead)"
          >
            📝 {{ t('common.log_call') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Drawers & Modals -->
    <QuickCreateDrawer
      :is-open="isQuickCreateOpen"
      @close="isQuickCreateOpen = false"
      @lead-created="onLeadCreated"
    />

    <LogCallDrawer
      :is-open="isLogCallOpen"
      :lead="selectedLead"
      @close="isLogCallOpen = false"
      @call-logged="onCallLogged"
    />

    <BookAppointmentModal
      :is-open="isBookApptOpen"
      :lead="selectedLead"
      @close="isBookApptOpen = false"
      @booked="onApptBooked"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';
import QuickCreateDrawer from '~/components/lead/QuickCreateDrawer.vue';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';

const { t, locale } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:3001';

const activeTeam = ref<'support' | 'admission' | 'aftercare'>('support');
const activeTiming = ref<'overdue' | 'today' | 'upcoming'>('today');
const tasks = ref<any[]>([]);
const isLoading = ref(true);

const overdueCount = ref(0);
const todayCount = ref(0);
const upcomingCount = ref(0);

const isQuickCreateOpen = ref(false);
const isLogCallOpen = ref(false);
const isBookApptOpen = ref(false);
const selectedLead = ref<any>(null);

let countdownInterval: any = null;
const nowTime = ref(Date.now());

// Fetch tasks for the current queue and counts
const loadWorkQueue = async () => {
  if (!authStore.token) return;
  isLoading.value = true;
  try {
    const res = await fetch(
      `${apiBase}/api/v1/tasks?team=${activeTeam.value}&due=${activeTiming.value}&status=open`,
      {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }
    );
    if (res.ok) {
      const result = await res.json();
      tasks.value = result.data || [];
    }

    // Load counts for tabs
    const [odRes, tdRes, upRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/tasks?team=${activeTeam.value}&due=overdue&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/api/v1/tasks?team=${activeTeam.value}&due=today&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/api/v1/tasks?team=${activeTeam.value}&due=upcoming&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
    ]);

    if (odRes.ok) overdueCount.value = (await odRes.json()).meta?.total || 0;
    if (tdRes.ok) todayCount.value = (await tdRes.json()).meta?.total || 0;
    if (upRes.ok) upcomingCount.value = (await upRes.json()).meta?.total || 0;
  } catch (err) {
    console.error('Failed to load work queue', err);
  } finally {
    isLoading.value = false;
  }
};

const isSlaBreached = (dueAtStr: string) => {
  return new Date(dueAtStr).getTime() < nowTime.value;
};

const formatSlaRemaining = (dueAtStr: string) => {
  const diff = new Date(dueAtStr).getTime() - nowTime.value;
  if (diff <= 0) {
    const overdueMin = Math.floor(Math.abs(diff) / 60000);
    return `BREACHED (-${overdueMin}m)`;
  }
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s left`;
};

const formatDueDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const openLogCall = (lead: any) => {
  selectedLead.value = lead;
  isLogCallOpen.value = true;
};

const openWhatsApp = (lead: any) => {
  if (!lead?.mobile) return;
  if (!lead.consentWhatsapp) {
    const proceed = confirm(
      'Notice: Patient WhatsApp consent is not recorded in the profile. Proceed to open WhatsApp chat?'
    );
    if (!proceed) return;
  }
  const cleanPhone = lead.mobile.replace(/\D/g, '');
  const greeting =
    lead.language === 'ml'
      ? 'നമസ്കാരം, ഹോസ്പിറ്റലിൽ നിന്ന് ബന്ധപ്പെടുകയാണ്.'
      : 'Hello, reaching out to you from Hospital CRM regarding your enquiry.';
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const onLeadCreated = () => {
  loadWorkQueue();
};

const onCallLogged = () => {
  loadWorkQueue();
};

const onApptBooked = () => {
  loadWorkQueue();
};

onMounted(() => {
  loadWorkQueue();
  countdownInterval = setInterval(() => {
    nowTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});
</script>
