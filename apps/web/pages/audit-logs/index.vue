<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold shadow-md">
            🛡️
          </span>
          <span>{{ t('audit.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Immutable forensic audit trails, login records, scope enforcement events, and state mutations
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <span class="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {{ totalLogs }} Total Records
        </span>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-3">
      <!-- Entity Filter -->
      <div class="flex-1 min-w-[160px]">
        <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Entity</label>
        <select
          v-model="filters.entity"
          @change="fetchLogs"
          class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-slate-500 min-h-[38px]"
        >
          <option value="">All Entities</option>
          <option value="lead">Lead</option>
          <option value="case">Case</option>
          <option value="task">Task</option>
          <option value="interaction">Interaction</option>
          <option value="export">Export</option>
          <option value="user">User</option>
          <option value="auth">Auth</option>
        </select>
      </div>

      <!-- Action Filter -->
      <div class="flex-1 min-w-[160px]">
        <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Action</label>
        <select
          v-model="filters.action"
          @change="fetchLogs"
          class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-slate-500 min-h-[38px]"
        >
          <option value="">All Actions</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="LEAD_CREATED">LEAD_CREATED</option>
          <option value="LEAD_CONVERTED">LEAD_CONVERTED</option>
          <option value="CALL_LOGGED">CALL_LOGGED</option>
          <option value="CASE_STAGE_ADVANCED">CASE_STAGE_ADVANCED</option>
          <option value="TREATMENT_COMPLETED">TREATMENT_COMPLETED</option>
          <option value="CASE_CLOSED">CASE_CLOSED</option>
          <option value="SCOPE_DENIED">SCOPE_DENIED</option>
          <option value="PERMISSION_GRANTED">PERMISSION_GRANTED</option>
          <option value="EXPORT_REQUESTED">EXPORT_REQUESTED</option>
          <option value="EXPORT_DOWNLOADED">EXPORT_DOWNLOADED</option>
        </select>
      </div>

      <!-- Reset Filter Button -->
      <div class="self-end">
        <UButton
          @click="resetFilters"
          color="gray"
          variant="soft"
          size="sm"
          class="min-h-[38px]"
        >
          Reset Filters
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-16 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-slate-600 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="logs.length === 0"
      class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
        <UIcon name="i-heroicons-shield-check" class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        No audit entries found
      </h3>
      <p class="text-xs text-slate-500 mt-1">
        Try adjusting your filter criteria above.
      </p>
    </div>

    <!-- Audit Logs Table -->
    <div v-else class="space-y-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase">
                <th class="py-3.5 px-4">Timestamp (Kolkata)</th>
                <th class="py-3.5 px-4">Action</th>
                <th class="py-3.5 px-4">Entity</th>
                <th class="py-3.5 px-4">Entity ID</th>
                <th class="py-3.5 px-4">Actor</th>
                <th class="py-3.5 px-4">IP Address</th>
                <th class="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <template v-for="log in logs" :key="log.id">
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer" @click="toggleExpand(log.id)">
                  <td class="py-3 px-4 font-mono text-slate-500">
                    {{ new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }}
                  </td>
                  <td class="py-3 px-4">
                    <span
                      :class="[
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono',
                        getActionBadgeClass(log.action)
                      ]"
                    >
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="py-3 px-4 font-semibold uppercase text-slate-700 dark:text-slate-300">
                    {{ log.entity }}
                  </td>
                  <td class="py-3 px-4 font-mono text-slate-500">
                    {{ log.entityId || '—' }}
                  </td>
                  <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {{ log.user?.name || 'System / Anonymous' }}
                  </td>
                  <td class="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {{ log.ip || '—' }}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <UIcon
                      :name="expandedId === log.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                      class="w-4 h-4 text-slate-400 inline-block"
                    />
                  </td>
                </tr>

                <!-- Expanded JSON Snapshot Row -->
                <tr v-if="expandedId === log.id" class="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700">
                  <td colspan="7" class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p class="font-bold text-slate-400 text-[10px] uppercase mb-1">State Before:</p>
                        <pre class="overflow-x-auto text-slate-700 dark:text-slate-300 max-h-48 text-[11px]">{{ JSON.stringify(log.before, null, 2) || 'null' }}</pre>
                      </div>

                      <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p class="font-bold text-slate-400 text-[10px] uppercase mb-1">State After / Payload:</p>
                        <pre class="overflow-x-auto text-slate-700 dark:text-slate-300 max-h-48 text-[11px]">{{ JSON.stringify(log.after, null, 2) || 'null' }}</pre>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>Showing {{ logs.length }} of {{ totalLogs }} logs</span>

        <div class="flex items-center space-x-2">
          <UButton
            :disabled="page <= 1"
            @click="page--; fetchLogs()"
            color="gray"
            variant="soft"
            size="xs"
            class="min-h-[36px]"
          >
            Previous
          </UButton>
          <span class="font-bold px-2">Page {{ page }}</span>
          <UButton
            :disabled="page * pageSize >= totalLogs"
            @click="page++; fetchLogs()"
            color="gray"
            variant="soft"
            size="xs"
            class="min-h-[36px]"
          >
            Next
          </UButton>
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

const logs = ref<any[]>([]);
const totalLogs = ref(0);
const page = ref(1);
const pageSize = 25;
const loading = ref(true);
const expandedId = ref<number | null>(null);

const filters = ref({
  entity: '',
  action: '',
});

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id;
}

function resetFilters() {
  filters.value = {
    entity: '',
    action: '',
  };
  page.value = 1;
  fetchLogs();
}

function getActionBadgeClass(action: string) {
  if (action.includes('FAILED') || action.includes('DENIED') || action.includes('REJECTED')) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
  }
  if (action.includes('SUCCESS') || action.includes('APPROVED') || action.includes('COMPLETED')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  }
  if (action.includes('CREATED') || action.includes('DOWNLOADED')) {
    return 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
  }
  return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
}

async function fetchLogs() {
  loading.value = true;
  const query = new URLSearchParams({
    page: String(page.value),
    pageSize: String(pageSize),
  });

  if (filters.value.entity) query.append('entity', filters.value.entity);
  if (filters.value.action) query.append('action', filters.value.action);

  try {
    const res = await $fetch<any>(`${config.public.apiBase}/audit-logs?${query.toString()}`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    logs.value = res.items || [];
    totalLogs.value = res.total || 0;
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchLogs();
});
</script>
