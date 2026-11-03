<template>
  <div class="space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>{{ t('nav.dues_followup') || 'Follow-up' }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ totalTasks }} Total
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track overdue calls, callbacks due today, and scheduled patient care cadences.
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Quick Create Lead Button -->
        <button
          type="button"
          @click="showQuickCreate = true"
          class="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-teal-500/20 flex items-center space-x-2"
        >
          <span class="text-lg leading-none">+</span>
          <span>Quick Create</span>
        </button>
      </div>
    </div>

    <!-- Quick Status KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- 1. Overdue Dues -->
      <button
        type="button"
        @click="selectTiming('overdue')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group',
          activeTiming === 'overdue'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Overdue Dues
          </span>
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" v-if="overdueCount > 0" />
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
            {{ overdueCount }}
          </span>
          <span class="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">Urgent attention</span>
        </div>
      </button>

      <!-- 2. Due Today -->
      <button
        type="button"
        @click="selectTiming('today')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group',
          activeTiming === 'today'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Due Today
          </span>
          <span class="text-base">📅</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {{ todayCount }}
          </span>
          <span class="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium">Today's callbacks</span>
        </div>
      </button>

      <!-- 3. Upcoming Follow-ups -->
      <button
        type="button"
        @click="selectTiming('upcoming')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group',
          activeTiming === 'upcoming'
            ? 'bg-slate-100 dark:bg-slate-700/60 border-slate-400 dark:border-slate-500 ring-2 ring-slate-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Upcoming Cadences
          </span>
          <span class="text-base">⏳</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            {{ upcomingCount }}
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Future milestones</span>
        </div>
      </button>

      <!-- 4. All Follow-ups -->
      <button
        type="button"
        @click="selectTiming('all')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group',
          activeTiming === 'all'
            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
            All Dues
          </span>
          <span class="text-base">📋</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400">
            {{ overdueCount + todayCount + upcomingCount }}
          </span>
          <span class="text-xs text-teal-600/80 dark:text-teal-400/80 font-medium">Full queue</span>
        </div>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      <!-- Desk Filter Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-700/80">
        <button
          v-for="desk in deskOptions"
          :key="desk.value"
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0',
            activeDesk === desk.value
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          ]"
          @click="selectDesk(desk.value)"
        >
          <span>{{ desk.icon }}</span>
          <span>{{ desk.label }}</span>
        </button>

        <!-- Group by Patient Toggle -->
        <button
          type="button"
          :class="[
            'ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 border',
            groupByPatient
              ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700'
              : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
          ]"
          @click="toggleNextStepOnly"
          title="Consolidate multiple future cadence steps under single next step"
        >
          <span>👥</span>
          <span>Single Next Step: {{ groupByPatient ? 'ON' : 'OFF' }}</span>
        </button>
      </div>

      <!-- Search & Timing Controls -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2 relative">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search patient name, mobile, or note..."
            class="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''; handleSearch()"
            class="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>

        <!-- Priority Filter -->
        <div>
          <select
            v-model="priorityFilter"
            @change="loadTasks"
            class="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500"
          >
            <option value="">⚡ All Priorities</option>
            <option value="hot">🔥 Hot Priority</option>
            <option value="warm">🌤️ Warm Priority</option>
            <option value="cold">❄️ Cold Priority</option>
          </select>
        </div>

        <!-- Staff / Telecaller Filter (Management) -->
        <div v-if="canViewAllStaff">
          <select
            v-model="ownerFilter"
            @change="loadTasks"
            class="w-full h-11 px-3 rounded-xl border border-teal-200 dark:border-teal-700/70 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 text-xs font-semibold focus:ring-2 focus:ring-teal-500"
          >
            <option value="">👤 All Telecallers</option>
            <option
              v-for="staff in staffMembers"
              :key="staff.id"
              :value="staff.id.toString()"
            >
              {{ staff.name }} ({{ staff.role?.name || staff.role?.code }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-16 flex flex-col justify-center items-center gap-3">
      <div class="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <span class="text-xs text-slate-400 font-medium">Loading dues & follow-up queue...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="displayedItems.length === 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-3xl">
        🎉
      </div>
      <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4">
        No Pending Dues Found
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        Great job! You are completely caught up on all follow-ups for this filter.
      </p>
    </div>

    <!-- Task Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="item in displayedItems"
        :key="item.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>
          <!-- Card Header: Priority & Due Badge -->
          <div class="flex items-center justify-between mb-3">
            <span
              :class="[
                'text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full',
                item.priority === 'hot'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : item.priority === 'cold'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              ]"
            >
              {{ item.priority }}
            </span>

            <!-- Timing Badge -->
            <span
              :class="[
                'text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1',
                getDueStatusClass(item.dueAt)
              ]"
            >
              <span>{{ getDueLabel(item.dueAt) }}</span>
            </span>
          </div>

          <!-- Patient / Lead Info -->
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors">
              <NuxtLink v-if="item.lead" :to="`/leads/${item.lead.id}`">
                {{ item.lead.name }}
              </NuxtLink>
              <NuxtLink v-else-if="item.case" :to="`/cases/${item.case.id}`">
                {{ item.case.patient?.name || 'Patient Case' }}
              </NuxtLink>
              <span v-else>{{ item.case?.patient?.name || 'Patient' }}</span>
            </h3>

            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="font-mono font-medium">{{ item.lead?.mobile || item.case?.patient?.mobileNorm || '—' }}</span>
              <span v-if="item.lead?.leadType === 'product'" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                📦 Product
              </span>
              <span v-if="item.groupedCount && item.groupedCount > 1" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                +{{ item.groupedCount - 1 }} more follow-ups
              </span>
            </div>
          </div>

          <!-- Structured Follow-up Reason & Context Section -->
          <div class="mt-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
            <!-- 1. Follow-up Reason / Action -->
            <div class="flex items-start gap-2">
              <span class="text-teal-600 dark:text-teal-400 text-sm mt-0.5 flex-shrink-0">🎯</span>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400 block">
                  Follow-up Reason
                </span>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words mt-0.5">
                  {{ getFollowUpReason(item) }}
                </p>
              </div>
            </div>

            <!-- 2. Last Call Note / Discussion (if entered) -->
            <div v-if="getLastNote(item)" class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2 bg-amber-50/60 dark:bg-amber-950/20 -mx-1 px-2 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
              <span class="text-amber-500 text-xs mt-0.5 flex-shrink-0">💬</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1 flex-wrap">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-300">
                    Previous Call Note
                  </span>
                  <span v-if="getLastOutcome(item)" class="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                    {{ getLastOutcome(item) }}
                  </span>
                </div>
                <p class="text-xs text-slate-700 dark:text-slate-300 italic break-words mt-1">
                  "{{ getLastNote(item) }}"
                </p>
                <span v-if="getLastCallerInfo(item)" class="text-[10px] text-slate-400 block mt-1 font-medium">
                  {{ getLastCallerInfo(item) }}
                </span>
              </div>
            </div>

            <!-- 3. Initial Concern / Inquiry Topic -->
            <div v-if="item.lead?.concern || item.case?.planNote" class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
              <span class="text-indigo-500 text-xs mt-0.5 flex-shrink-0">🩺</span>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Inquiry Concern
                </span>
                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                  {{ item.lead?.concern || item.case?.planNote }}
                </p>
              </div>
            </div>

            <!-- 4. Metadata: Department & Source -->
            <div class="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span v-if="item.lead?.department || item.case?.department">
                🏥 {{ item.lead?.department?.labelEn || item.case?.department?.labelEn }}
              </span>
              <span v-if="item.lead?.source">
                &bull; {{ item.lead.source.labelEn }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            <!-- 1. Direct Call -->
            <a
              v-if="getMobile(item)"
              :href="`tel:${getMobile(item)}`"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 transition-colors"
              title="Call immediately"
            >
              📞
            </a>

            <!-- 2. WhatsApp -->
            <button
              v-if="getMobile(item)"
              type="button"
              @click="openWhatsApp(item)"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition-colors"
              title="Open WhatsApp chat"
            >
              💬
            </button>
          </div>

          <div class="flex items-center gap-2">
            <!-- 3. Book Appointment -->
            <button
              v-if="item.lead"
              type="button"
              @click="openBookAppt(item)"
              class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              📅 Book
            </button>

            <!-- 4. Log Call / Next Action -->
            <button
              type="button"
              @click="openLogCall(item)"
              class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              Log Call
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
      <span class="text-xs text-slate-500">
        Page {{ page }} of {{ totalPages }}
      </span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="page <= 1"
          @click="page--; loadTasks()"
          class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          :disabled="page >= totalPages"
          @click="page++; loadTasks()"
          class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Modals & Drawers -->
    <LogCallDrawer
      :is-open="isLogCallOpen"
      :lead="selectedTask?.lead"
      :case-id="selectedTask?.case?.id"
      :task-id="selectedTask?.id"
      :recipient-name="selectedTask?.lead?.name || selectedTask?.case?.patient?.name"
      :recipient-phone="selectedTask?.lead?.mobile || selectedTask?.case?.patient?.mobileNorm"
      @close="isLogCallOpen = false"
      @call-logged="onActionCompleted"
    />

    <BookAppointmentModal
      :is-open="isBookApptOpen"
      :lead="selectedTask?.lead"
      @close="isBookApptOpen = false"
      @booked="onActionCompleted"
    />

    <LeadQuickCreateDrawer
      :is-open="showQuickCreate"
      :default-lead-type="activeDesk === 'product' ? 'product' : 'treatment'"
      @close="showQuickCreate = false"
      @created="onActionCompleted"
      @lead-created="onActionCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';
import LeadQuickCreateDrawer from '~/components/lead/QuickCreateDrawer.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

// Filter State
const activeTiming = ref<'all' | 'overdue' | 'today' | 'upcoming'>('today');
const activeDesk = ref<'all' | 'support' | 'admission' | 'aftercare' | 'product'>('all');
const searchQuery = ref('');
const priorityFilter = ref('');
const ownerFilter = ref('');
const groupByPatient = ref(true);

const toggleNextStepOnly = () => {
  groupByPatient.value = !groupByPatient.value;
  page.value = 1;
  loadTasks();
  fetchTimingCounts();
};

const page = ref(1);
const pageSize = ref(50);
const totalTasks = ref(0);
const totalPages = ref(1);

const tasks = ref<any[]>([]);
const isLoading = ref(true);

const overdueCount = ref(0);
const todayCount = ref(0);
const upcomingCount = ref(0);

// Drawers State
const isLogCallOpen = ref(false);
const isBookApptOpen = ref(false);
const showQuickCreate = ref(false);
const selectedTask = ref<any>(null);

const deskOptions = [
  { value: 'all', label: 'All Desks', icon: '🌐' },
  { value: 'support', label: 'Support Desk (Leads)', icon: '🏥' },
  { value: 'admission', label: 'Admission Desk', icon: '🏢' },
  { value: 'aftercare', label: 'Aftercare Desk', icon: '❤️' },
  { value: 'product', label: 'Product Desk', icon: '📦' },
];

const userRoleCode = computed(() => {
  const u = authStore.user;
  if (!u) return '';
  return (u.role?.code || (u as any).roleCode || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
});

const canViewAllStaff = computed(() => {
  return ['owner', 'admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(userRoleCode.value);
});

const staffMembers = ref<any[]>([]);

const fetchStaffMembers = async () => {
  if (!canViewAllStaff.value) return;
  try {
    const res = await fetch(`${apiBase}/users/staff`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      staffMembers.value = data.items || [];
    }
  } catch (err) {
    console.error('Failed to load staff list', err);
  }
};

const selectTiming = (timing: 'all' | 'overdue' | 'today' | 'upcoming') => {
  activeTiming.value = timing;
  page.value = 1;
  loadTasks();
};

const selectDesk = (desk: any) => {
  activeDesk.value = desk;
  page.value = 1;
  loadTasks();
};

let searchDebounce: any = null;
const handleSearch = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    page.value = 1;
    loadTasks();
  }, 350);
};

// Fetch Tasks
const loadTasks = async () => {
  if (!authStore.token) return;
  isLoading.value = true;

  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      pageSize: pageSize.value.toString(),
      status: 'open',
    });

    if (activeTiming.value !== 'all') {
      params.append('due', activeTiming.value);
    }

    if (activeDesk.value !== 'all') {
      params.append('team', activeDesk.value);
    }

    if (ownerFilter.value) {
      params.append('ownerId', ownerFilter.value);
    }

    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim());
    }

    if (groupByPatient.value) {
      params.append('nextStepOnly', 'true');
    }

    const res = await fetch(`${apiBase}/tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });

    if (res.ok) {
      const result = await res.json();
      tasks.value = result.data || [];
      totalTasks.value = result.meta?.total || tasks.value.length;
      totalPages.value = result.meta?.totalPages || 1;
    }
  } catch (err) {
    console.error('Failed to load tasks', err);
  } finally {
    isLoading.value = false;
  }
};

// Fetch KPI timing counts
const fetchTimingCounts = async () => {
  if (!authStore.token) return;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const teamParam = activeDesk.value !== 'all' ? `&team=${activeDesk.value}` : '';
    const ownerParam = ownerFilter.value ? `&ownerId=${ownerFilter.value}` : '';
    const nextStepParam = groupByPatient.value ? '&nextStepOnly=true' : '';

    const [odRes, tdRes, upRes] = await Promise.all([
      fetch(`${apiBase}/tasks?due=overdue&status=open&pageSize=1${nextStepParam}${teamParam}${ownerParam}`, { headers }),
      fetch(`${apiBase}/tasks?due=today&status=open&pageSize=1${nextStepParam}${teamParam}${ownerParam}`, { headers }),
      fetch(`${apiBase}/tasks?due=upcoming&status=open&pageSize=1${nextStepParam}${teamParam}${ownerParam}`, { headers }),
    ]);

    if (odRes.ok) overdueCount.value = (await odRes.json()).meta?.total || 0;
    if (tdRes.ok) todayCount.value = (await tdRes.json()).meta?.total || 0;
    if (upRes.ok) upcomingCount.value = (await upRes.json()).meta?.total || 0;
  } catch (err) {
    console.error('Failed to fetch timing counts', err);
  }
};

// Grouped Items Computed
const displayedItems = computed(() => {
  let list = tasks.value;

  if (priorityFilter.value) {
    list = list.filter((t) => t.priority === priorityFilter.value);
  }

  if (!groupByPatient.value) {
    return list;
  }

  // Group by leadId or caseId, keeping the earliest task and recording count
  const grouped = new Map<string, any>();
  for (const item of list) {
    const key = item.leadId ? `lead_${item.leadId}` : item.caseId ? `case_${item.caseId}` : `task_${item.id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { ...item, groupedCount: 1 });
    } else {
      const existing = grouped.get(key);
      existing.groupedCount = (existing.groupedCount || 1) + 1;
      // Keep earliest due date
      if (new Date(item.dueAt) < new Date(existing.dueAt)) {
        grouped.set(key, { ...item, groupedCount: existing.groupedCount });
      }
    }
  }

  return Array.from(grouped.values());
});

const getMobile = (item: any) => {
  return item.lead?.mobile || item.case?.patient?.mobileNorm || '';
};

const getDueStatusClass = (dueAtStr: string) => {
  const diff = new Date(dueAtStr).getTime() - Date.now();
  if (diff < 0) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
  }
  if (diff <= 24 * 3600 * 1000) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
};

const getDueLabel = (dueAtStr: string) => {
  const diff = new Date(dueAtStr).getTime() - Date.now();
  if (diff < 0) {
    const overdueHrs = Math.floor(Math.abs(diff) / 3600000);
    if (overdueHrs === 0) return 'Overdue (<1h)';
    return `Overdue (-${overdueHrs}h)`;
  }
  const dueDate = new Date(dueAtStr);
  const isToday = dueDate.toDateString() === new Date().toDateString();
  if (isToday) {
    return `Today at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getLastInteraction = (item: any) => {
  return item.lead?.interactions?.[0] || item.case?.interactions?.[0] || null;
};

const getLastNote = (item: any) => {
  const inter = getLastInteraction(item);
  return inter?.note?.trim() || '';
};

const getLastOutcome = (item: any) => {
  const inter = getLastInteraction(item);
  return inter?.outcome?.labelEn || inter?.outcome?.code || '';
};

const getLastCallerInfo = (item: any) => {
  const inter = getLastInteraction(item);
  if (!inter) return '';
  const callerName = inter.user?.name || '';
  const timeStr = inter.occurredAt
    ? new Date(inter.occurredAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  if (callerName && timeStr) return `by ${callerName} • ${timeStr}`;
  return callerName ? `by ${callerName}` : timeStr;
};

const getFollowUpReason = (item: any) => {
  if (item.title) {
    return item.title;
  }
  const lastNote = getLastNote(item);
  if (lastNote) {
    return `Follow-up: ${lastNote}`;
  }
  return 'Scheduled Care Follow-up';
};

const openLogCall = (item: any) => {
  selectedTask.value = item;
  isLogCallOpen.value = true;
};

const openBookAppt = (item: any) => {
  selectedTask.value = item;
  isBookApptOpen.value = true;
};

const openWhatsApp = (item: any) => {
  const mobile = getMobile(item);
  const cleanPhone = mobile.replace(/\D/g, '');
  const greeting = 'Hello, reaching out to you from Hospital CRM regarding your follow-up.';
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const onActionCompleted = () => {
  loadTasks();
  fetchTimingCounts();
};

onMounted(() => {
  fetchStaffMembers();
  loadTasks();
  fetchTimingCounts();
});
</script>
