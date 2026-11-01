<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-teal-500/20">
            🔒
          </span>
          <span>{{ t('exports.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Supervised data export requests with cryptographic user, branch, and timestamp watermarking
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <UButton
          @click="showRequestModal = true"
          color="teal"
          icon="i-heroicons-plus"
          class="min-h-[44px]"
        >
          {{ t('exports.request_new') }}
        </UButton>
      </div>
    </div>

    <!-- Security Watermark Banner -->
    <div class="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
      <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
      <div>
        <p class="font-bold">Watermark Security Policy</p>
        <p class="mt-0.5 leading-relaxed">
          {{ t('exports.watermark_notice') }}
          Any unauthorized leak or distribution can be definitively traced back to the downloading user account.
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-16 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="exports.length === 0"
      class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
        <UIcon name="i-heroicons-document-arrow-down" class="w-8 h-8" />
      </div>
      <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
        No export requests yet
      </h3>
      <p class="text-xs text-slate-500 mt-1">
        Request your first watermarked data export by clicking the button above.
      </p>
    </div>

    <!-- Exports Table -->
    <div v-else class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase">
              <th class="py-3.5 px-4">Export ID</th>
              <th class="py-3.5 px-4">Resource</th>
              <th class="py-3.5 px-4">Requested By</th>
              <th class="py-3.5 px-4">Branch Scope</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4">Approver</th>
              <th class="py-3.5 px-4 text-center">Downloads</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="exp in exports" :key="exp.id" class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
              <td class="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                EXP-{{ String(exp.id).padStart(5, '0') }}
              </td>
              <td class="py-3.5 px-4">
                <span class="font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  {{ exp.resource }}
                </span>
                <span class="text-[10px] text-slate-400 block font-mono">CSV format</span>
              </td>
              <td class="py-3.5 px-4">
                <div class="font-bold text-slate-800 dark:text-slate-200">{{ exp.user?.name }}</div>
                <div class="text-[10px] text-slate-400">{{ new Date(exp.requestedAt).toLocaleString() }}</div>
              </td>
              <td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                {{ exp.branch?.name || 'All Branches' }}
              </td>
              <td class="py-3.5 px-4">
                <span
                  :class="[
                    'text-[10px] font-black uppercase px-2.5 py-1 rounded-full',
                    getStatusBadgeClass(exp.status)
                  ]"
                >
                  {{ exp.status }}
                </span>
                <p v-if="exp.status === 'rejected' && exp.rejectionReason" class="text-[10px] text-rose-500 mt-0.5">
                  {{ exp.rejectionReason }}
                </p>
              </td>
              <td class="py-3.5 px-4 text-slate-500">
                <span v-if="exp.approver">{{ exp.approver.name }}</span>
                <span v-else class="text-slate-400 italic">Pending supervisor</span>
              </td>
              <td class="py-3.5 px-4 text-center font-mono font-bold">
                {{ exp.downloadCount }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <!-- Approve / Reject actions for supervisors -->
                  <template v-if="exp.status === 'pending' && canApprove">
                    <UButton
                      @click="handleApprove(exp.id, true)"
                      color="emerald"
                      size="xs"
                      icon="i-heroicons-check"
                      class="min-h-[36px]"
                    >
                      Approve
                    </UButton>
                    <UButton
                      @click="handleApprove(exp.id, false)"
                      color="rose"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-x-mark"
                      class="min-h-[36px]"
                    >
                      Reject
                    </UButton>
                  </template>

                  <!-- Download action -->
                  <a
                    v-if="exp.status === 'approved' || exp.status === 'completed'"
                    :href="`${config.public.apiBase}/exports/${exp.id}/download?token=${authStore.token}`"
                    @click.prevent="downloadExportFile(exp.id)"
                    class="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[36px]"
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
                    <span>Download Watermarked</span>
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Request Export Modal -->
    <UModal v-model="showRequestModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
            {{ t('exports.request_new') }}
          </h3>
          <button @click="showRequestModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitExportRequest" class="space-y-4">
          <!-- Resource selection -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('exports.resource') }} *
            </label>
            <select
              v-model="requestForm.resource"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="leads">Support Desk: Leads Dataset</option>
              <option value="cases">Admission & Aftercare: Patient Cases Dataset</option>
              <option value="interactions">Interactions & Telecalling Logs</option>
              <option value="audit_logs">Security Audit Logs</option>
            </select>
          </div>

          <!-- Format -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Format
            </label>
            <input
              type="text"
              value="CSV (Encrypted Watermarked File)"
              disabled
              class="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 min-h-[44px]"
            />
          </div>

          <!-- Notice -->
          <div class="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200">
            <p class="font-bold flex items-center gap-1">
              <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-teal-600" />
              Traceability Guarantee
            </p>
            <p class="mt-0.5">
              The generated CSV will embed your user identification tag in both file headers and each exported record.
            </p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <UButton
              type="button"
              @click="showRequestModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingRequest"
              color="teal"
              class="min-h-[44px]"
            >
              Submit Export Request
            </UButton>
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const exports = ref<any[]>([]);
const loading = ref(true);

const showRequestModal = ref(false);
const submittingRequest = ref(false);
const requestForm = ref({
  resource: 'leads',
  format: 'csv',
});

const canApprove = computed(() => {
  const role = authStore.user?.role?.code;
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'center_head' ||
    role === 'telecaller_manager'
  );
});

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'completed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  }
}

async function fetchExports() {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/exports`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    exports.value = res.data || [];
  } catch (err) {
    console.error('Failed to load exports:', err);
  } finally {
    loading.value = false;
  }
}

async function submitExportRequest() {
  submittingRequest.value = true;
  try {
    await $fetch(`${config.public.apiBase}/exports`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: requestForm.value,
    });

    showRequestModal.value = false;
    await fetchExports();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to request export');
  } finally {
    submittingRequest.value = false;
  }
}

async function handleApprove(exportId: number, approved: boolean) {
  let rejectionReason: string | undefined;
  if (!approved) {
    const reason = prompt('Please enter a rejection reason:');
    if (reason === null) return;
    rejectionReason = reason || 'Rejected by supervisor';
  }

  try {
    await $fetch(`${config.public.apiBase}/exports/${exportId}/approve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        approved,
        rejectionReason,
      },
    });

    await fetchExports();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to update export status');
  }
}

async function downloadExportFile(exportId: number) {
  try {
    const res = await fetch(`${config.public.apiBase}/exports/${exportId}/download`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Download failed');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = `export-EXP-${exportId}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Refresh count
    fetchExports();
  } catch (err: any) {
    alert(err.message || 'Failed to download export');
  }
}

onMounted(() => {
  fetchExports();
});
</script>
