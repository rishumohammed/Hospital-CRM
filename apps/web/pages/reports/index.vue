<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-teal-500/20">
            📊
          </span>
          <span>{{ t('reports.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Executive performance analytics, SLA compliance, marketing source ROI, and conversion funnels
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <NuxtLink
          to="/exports"
          class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all min-h-[44px]"
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
          <span>{{ t('reports.request_export') }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Global Filter Bar -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <!-- Date Range Pills -->
      <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
        <button
          v-for="r in dateRanges"
          :key="r.key"
          type="button"
          @click="selectDateRange(r.key)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px]',
            selectedRange === r.key
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          ]"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- Branch Filter -->
      <div class="flex items-center space-x-2">
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch:</label>
        <select
          v-model="selectedBranchId"
          @change="loadReportData"
          class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[38px]"
        >
          <option :value="null">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="activeTab = tab.key"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all min-h-[44px]',
          activeTab === tab.key
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Tab 1: Support Desk Report -->
    <div v-else-if="activeTab === 'support' && supportData" class="space-y-6">
      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
          <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{{ supportData.totalLeads }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.newLeads }} new awaiting response</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Compliance</p>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {{ supportData.sla?.complianceRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">
            Avg response: {{ supportData.sla?.avgResponseMinutes ? `${supportData.sla.avgResponseMinutes} min` : 'N/A' }}
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments Booked</p>
          <p class="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {{ supportData.bookingRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.appointmentBookedLeads }} leads booked</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visit Conversion</p>
          <p class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {{ supportData.conversionRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.convertedLeads }} converted to cases</p>
        </div>
      </div>

      <!-- Telecaller Productivity Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
          Telecaller Performance & Productivity
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th class="py-3 px-4">Telecaller</th>
                <th class="py-3 px-4 text-center">Assigned Leads</th>
                <th class="py-3 px-4 text-center">Calls Logged</th>
                <th class="py-3 px-4 text-center">Appointments Booked</th>
                <th class="py-3 px-4 text-center">Converted to Cases</th>
                <th class="py-3 px-4 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="tc in supportData.telecallerProductivity" :key="tc.id" class="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{{ tc.name }}</td>
                <td class="py-3.5 px-4 text-center font-mono">{{ tc.assigned }}</td>
                <td class="py-3.5 px-4 text-center font-mono font-bold text-teal-600">{{ tc.calls }}</td>
                <td class="py-3.5 px-4 text-center font-mono text-emerald-600 font-bold">{{ tc.booked }}</td>
                <td class="py-3.5 px-4 text-center font-mono text-purple-600 font-bold">{{ tc.converted }}</td>
                <td class="py-3.5 px-4 text-right font-mono font-bold">
                  {{ tc.assigned > 0 ? Math.round((tc.converted / tc.assigned) * 100) : 0 }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: Admission Desk Report -->
    <div v-else-if="activeTab === 'admission' && admissionData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advised Admission</p>
          <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{{ admissionData.advised }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">24h First Contact</p>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{{ admissionData.contactedWithin24hRate }}%</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.contactedWithin24hCount }} contacted in 24h</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposit Paid</p>
          <p class="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">{{ admissionData.acceptedCount }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.acceptedRate }}% acceptance</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admitted In-Treatment</p>
          <p class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{{ admissionData.admittedCount }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.admittedRate }}% admission rate</p>
        </div>
      </div>

      <!-- Overdue Follow-ups Alert -->
      <div v-if="admissionData.overdueFollowUps && admissionData.overdueFollowUps.length > 0" class="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3">
        <h4 class="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-600" />
          <span>{{ admissionData.overdueFollowUps.length }} Cases Overdue for Admission Counseling (>24 Hours)</span>
        </h4>
        <div class="divide-y divide-amber-200/60 dark:divide-amber-900/40">
          <div v-for="item in admissionData.overdueFollowUps.slice(0, 5)" :key="item.id" class="py-2 flex items-center justify-between text-xs">
            <span class="font-bold text-amber-950 dark:text-amber-100">
              <NuxtLink :to="`/cases/${item.id}`" class="hover:underline">{{ item.patientName }} (Case #{{ item.id }})</NuxtLink>
            </span>
            <span class="text-amber-700 dark:text-amber-400 font-semibold">{{ item.hoursOverdue }}h without follow-up</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Aftercare Desk Report -->
    <div v-else-if="activeTab === 'aftercare' && aftercareData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Follow-up Cases</p>
          <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{{ aftercareData.activeCases }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ aftercareData.completedCases }} closed</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">On-Time Cadence Rate</p>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{{ aftercareData.calls?.onTimeRate }}%</p>
          <p class="text-xs text-slate-400 mt-1">{{ aftercareData.calls?.completed }} / {{ aftercareData.calls?.due }} calls done</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Patient Feedback</p>
          <p class="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
            {{ aftercareData.feedback?.average ? `${aftercareData.feedback.average} / 10` : 'N/A' }}
          </p>
          <p class="text-xs text-rose-500 mt-1 font-semibold" v-if="aftercareData.feedback?.lowCount > 0">
            {{ aftercareData.feedback.lowCount }} low score (≤6) callbacks
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinical Escalations</p>
          <p class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{{ aftercareData.escalations?.total }}</p>
          <p class="text-xs text-slate-400 mt-1">
            {{ aftercareData.escalations?.pending }} pending &bull; Avg SLA: {{ aftercareData.escalations?.avgDecisionHours || '<1' }}h
          </p>
        </div>
      </div>
    </div>

    <!-- Tab 4: Lost Reasons Analytics -->
    <div v-else-if="activeTab === 'lost_reasons' && lostReasonsData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Lead Lost Reasons -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Support Desk: Lead Drop-off Reasons
            </h3>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600">
              Total Lost: {{ lostReasonsData.leadLostReasons?.total }}
            </span>
          </div>

          <div v-if="lostReasonsData.leadLostReasons?.breakdown.length === 0" class="py-8 text-center text-slate-400 text-xs">
            No lost leads recorded in this period.
          </div>

          <div v-else class="space-y-3">
            <div v-for="r in lostReasonsData.leadLostReasons.breakdown" :key="r.code" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ r.labelEn }} ({{ r.labelMl }})</span>
                <span class="font-mono text-slate-500">{{ r.count }} ({{ r.percentage }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="bg-rose-500 h-full rounded-full" :style="{ width: `${r.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admission Decline Reasons -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Admission Desk: Patient Decline Reasons
            </h3>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600">
              Total Declined: {{ lostReasonsData.admissionDeclineReasons?.total }}
            </span>
          </div>

          <div v-if="lostReasonsData.admissionDeclineReasons?.breakdown.length === 0" class="py-8 text-center text-slate-400 text-xs">
            No declined admissions recorded in this period.
          </div>

          <div v-else class="space-y-3">
            <div v-for="r in lostReasonsData.admissionDeclineReasons.breakdown" :key="r.code" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ r.labelEn }} ({{ r.labelMl }})</span>
                <span class="font-mono text-slate-500">{{ r.count }} ({{ r.percentage }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full" :style="{ width: `${r.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Source Quality & ROI -->
    <div v-else-if="activeTab === 'source_quality' && sourceQualityData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Marketing Leads</p>
          <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{{ sourceQualityData.totalLeads }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Est. Revenue</p>
          <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{{ Number(sourceQualityData.overallRevenue || 0).toLocaleString('en-IN') }}
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 md:col-span-1">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposits Collected</p>
          <p class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            ₹{{ Number(sourceQualityData.overallDeposits || 0).toLocaleString('en-IN') }}
          </p>
        </div>
      </div>

      <!-- Source ROI Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
          Source Funnel Conversion & Revenue Performance
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th class="py-3 px-4">Lead Source</th>
                <th class="py-3 px-4 text-center">Total Leads</th>
                <th class="py-3 px-4 text-center">Contact %</th>
                <th class="py-3 px-4 text-center">Booked %</th>
                <th class="py-3 px-4 text-center">Visited %</th>
                <th class="py-3 px-4 text-center">Admitted %</th>
                <th class="py-3 px-4 text-right">Est. Revenue (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="src in sourceQualityData.sources" :key="src.code" class="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td class="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                  {{ src.labelEn }} <span class="text-slate-400 font-normal">({{ src.labelMl }})</span>
                </td>
                <td class="py-3.5 px-4 text-center font-mono font-bold">{{ src.totalLeads }}</td>
                <td class="py-3.5 px-4 text-center font-mono">{{ src.contactRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-teal-600 font-bold">{{ src.bookingRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-purple-600 font-bold">{{ src.visitRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-emerald-600 font-bold">{{ src.treatmentRate }}%</td>
                <td class="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                  ₹{{ Number(src.totalEstimatedRevenue).toLocaleString('en-IN') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const activeTab = ref('support');
const selectedRange = ref('30d');
const selectedBranchId = ref<number | null>(null);
const loading = ref(true);

const branches = ref<any[]>([]);
const supportData = ref<any>(null);
const admissionData = ref<any>(null);
const aftercareData = ref<any>(null);
const lostReasonsData = ref<any>(null);
const sourceQualityData = ref<any>(null);

const dateRanges = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

const tabs = [
  { key: 'support', label: t('reports.support_tab') },
  { key: 'admission', label: t('reports.admission_tab') },
  { key: 'aftercare', label: t('reports.aftercare_tab') },
  { key: 'lost_reasons', label: t('reports.lost_reasons_tab') },
  { key: 'source_quality', label: t('reports.source_quality_tab') },
];

function selectDateRange(rangeKey: string) {
  selectedRange.value = rangeKey;
  loadReportData();
}

function getDateParams() {
  const now = new Date();
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (selectedRange.value === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString();
  } else if (selectedRange.value === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString();
  } else if (selectedRange.value === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = d.toISOString();
  }

  return {
    startDate,
    endDate,
    branchId: selectedBranchId.value || undefined,
  };
}

async function fetchBranches() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/branches`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    branches.value = res.branches || res.data || [];
  } catch (err) {
    console.error('Failed to load branches:', err);
  }
}

async function loadReportData() {
  loading.value = true;
  const params = getDateParams();
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.branchId) query.append('branchId', String(params.branchId));

  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    const [sup, adm, aft, lost, src] = await Promise.all([
      $fetch(`${config.public.apiBase}/reports/support${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/admission${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/aftercare${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/lost-reasons${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/source-quality${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
    ]);

    supportData.value = sup;
    admissionData.value = adm;
    aftercareData.value = aft;
    lostReasonsData.value = lost;
    sourceQualityData.value = src;
  } catch (err) {
    console.error('Failed to load reports:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchBranches();
  loadReportData();
});
</script>
