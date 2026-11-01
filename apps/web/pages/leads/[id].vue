<template>
  <div class="space-y-6">
    <!-- Top Breadcrumb & Actions Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center space-x-3">
        <NuxtLink
          to="/leads"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          ←
        </NuxtLink>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">
              {{ lead?.name || 'Loading...' }}
            </h1>
            <span
              v-if="lead"
              :class="[
                'px-2.5 py-0.5 text-xs font-black uppercase rounded-md tracking-wider',
                lead.priority === 'hot'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              ]"
            >
              {{ lead.priority }}
            </span>
            <span v-if="lead?.emergencyFlag" class="px-2.5 py-0.5 text-xs font-black uppercase rounded-md bg-rose-600 text-white animate-pulse">
              🚨 Emergency
            </span>
          </div>
          <p class="text-xs text-slate-500 font-mono mt-0.5">
            ID: #{{ lead?.id }} • {{ lead?.branch?.name }}
          </p>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div v-if="lead" class="flex items-center space-x-2 flex-wrap gap-y-2">
        <!-- Call Button (tel:) -->
        <a
          :href="`tel:${lead.mobileNorm || lead.mobile}`"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-teal-500/20"
        >
          <span>📞</span>
          <span>{{ $i18n.locale === 'ml' ? 'വിളിക്കുക' : 'Call Patient' }}</span>
        </a>

        <!-- WhatsApp Button (wa.me) -->
        <button
          type="button"
          @click="openWhatsApp"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-emerald-500/20"
        >
          <span>💬</span>
          <span>WhatsApp</span>
        </button>

        <!-- Emergency Redirect Button -->
        <button
          type="button"
          @click="showEmergencyModal = true"
          class="min-h-[44px] px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100 transition-colors"
        >
          🚨 {{ $i18n.locale === 'ml' ? 'അടിയന്തിര വിഭാഗം' : 'Emergency Redirect' }}
        </button>

        <!-- Close Lead Button -->
        <button
          v-if="lead.status !== 'not_interested' && lead.status !== 'converted'"
          type="button"
          @click="showCloseModal = true"
          class="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          ✕ {{ $i18n.locale === 'ml' ? 'ക്ലോസ് ചെയ്യുക' : 'Close Lead' }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-500">
      <span class="inline-block animate-spin text-3xl mb-3">⟳</span>
      <p class="text-sm font-semibold">Loading patient lead profile...</p>
    </div>

    <!-- Main Content Layout -->
    <div v-else-if="lead" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Patient Details & Medical Concern -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Key Info Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
          <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-700">
            {{ $i18n.locale === 'ml' ? 'രോഗിയുടെ പ്രധാന വിവരങ്ങൾ' : 'Patient Information' }}
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'മൊബൈൽ ഫോൺ' : 'Phone Number' }}</p>
              <p class="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{{ lead.mobile }}</p>
            </div>
            <div v-if="lead.altMobile">
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'മറ്റൊരു നമ്പർ' : 'Alternate Phone' }}</p>
              <p class="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{{ lead.altMobile }}</p>
            </div>
            <div>
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'വിഭാഗം' : 'Department' }}</p>
              <p class="font-bold text-slate-900 dark:text-white mt-0.5">
                {{ $i18n.locale === 'ml' ? lead.department?.labelMl : lead.department?.labelEn }}
              </p>
            </div>
            <div>
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'ഉറവിടം' : 'Inquiry Source' }}</p>
              <p class="font-bold text-slate-900 dark:text-white mt-0.5">
                {{ $i18n.locale === 'ml' ? lead.source?.labelMl : lead.source?.labelEn }}
              </p>
            </div>
            <div>
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'ഭാഷ' : 'Language' }}</p>
              <p class="font-bold text-slate-900 dark:text-white mt-0.5">
                {{ lead.language === 'ml' ? 'മലയാളം (Malayalam)' : 'English' }}
              </p>
            </div>
            <div>
              <p class="text-slate-500 font-medium">{{ $i18n.locale === 'ml' ? 'ഉടമ' : 'Assigned Owner' }}</p>
              <p class="font-bold text-slate-900 dark:text-white mt-0.5">
                {{ lead.owner?.name || ($i18n.locale === 'ml' ? 'ഉടമയില്ല' : 'Unassigned') }}
              </p>
            </div>
          </div>

          <!-- Medical Concern Section (Bilingual formatting) -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {{ $i18n.locale === 'ml' ? 'രോഗലക്ഷണങ്ങൾ / കുറിപ്പ്' : 'Medical Concern / Inquiry Description' }}
            </h3>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {{ lead.concern || 'No specific symptoms entered.' }}
            </div>
          </div>

          <!-- Consent Tracking Flags -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center space-x-4 text-xs font-medium">
            <span :class="lead.consentCalls ? 'text-emerald-600' : 'text-slate-400'">
              {{ lead.consentCalls ? '✓ Calls Allowed' : '✗ No Call Consent' }}
            </span>
            <span :class="lead.consentWhatsapp ? 'text-emerald-600' : 'text-slate-400'">
              {{ lead.consentWhatsapp ? '✓ WhatsApp Opted-in' : '✗ No WhatsApp Consent' }}
            </span>
            <span :class="lead.consentSms ? 'text-emerald-600' : 'text-slate-400'">
              {{ lead.consentSms ? '✓ SMS Opted-in' : '✗ No SMS Consent' }}
            </span>
          </div>
        </div>

        <!-- Tasks Section -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-700">
            <span>{{ $i18n.locale === 'ml' ? 'ടാസ്കുകൾ (ഫോളോ-അപ്പ്)' : 'Follow-up Tasks' }}</span>
            <span class="text-xs text-slate-500 font-normal">{{ lead.tasks?.length || 0 }} scheduled</span>
          </h2>

          <div v-if="!lead.tasks || lead.tasks.length === 0" class="p-6 text-center text-xs text-slate-500">
            {{ $i18n.locale === 'ml' ? 'തുറന്ന ടാസ്കുകളൊന്നുമില്ല' : 'No tasks scheduled for this lead.' }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="task in lead.tasks"
              :key="task.id"
              class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
            >
              <div>
                <p class="font-bold text-slate-900 dark:text-white">{{ task.title }}</p>
                <p class="text-slate-500 text-[11px] mt-0.5">
                  Due: {{ formatDate(task.dueAt) }} • Assigned to {{ task.owner?.name }}
                </p>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {{ task.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Timeline / History -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-slate-700">
            {{ $i18n.locale === 'ml' ? 'ടൈംലൈൻ & ഹിസ്റ്ററി' : 'Activity Timeline' }}
          </h2>

          <div v-if="!lead.interactions || lead.interactions.length === 0" class="p-6 text-center text-xs text-slate-500">
            {{ $i18n.locale === 'ml' ? 'ഇടപാടുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല' : 'No interactions recorded yet.' }}
          </div>

          <div v-else class="relative pl-6 space-y-5 border-l-2 border-teal-200 dark:border-teal-900 ml-2">
            <div
              v-for="act in lead.interactions"
              :key="act.id"
              class="relative"
            >
              <!-- Timeline Dot -->
              <div class="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white dark:border-slate-800 shadow" />

              <div>
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    {{ act.type }} • {{ act.outcome?.labelEn || act.direction }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ formatDate(act.occurredAt) }}</span>
                </div>
                <p v-if="act.note" class="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {{ act.note }}
                </p>
                <p class="text-[10px] text-slate-400 mt-0.5">By {{ act.user?.name }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Emergency Redirect Modal -->
    <div v-if="showEmergencyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showEmergencyModal = false" />
      <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 class="font-bold text-base text-rose-600 dark:text-rose-400 flex items-center space-x-2">
          <span>🚨</span>
          <span>Emergency Clinical Redirect</span>
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          This will immediately flag this patient inquiry as a medical emergency and notify all duty nurses in this branch.
        </p>
        <textarea
          v-model="emergencyNote"
          rows="3"
          required
          placeholder="State the acute clinical emergency reason..."
          class="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
        />
        <div class="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            @click="showEmergencyModal = false"
            class="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!emergencyNote.trim() || isSubmittingEmergency"
            @click="submitEmergency"
            class="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
          >
            Confirm Emergency Alert
          </button>
        </div>
      </div>
    </div>

    <!-- Close Lead Modal -->
    <div v-if="showCloseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showCloseModal = false" />
      <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
          <span>✕</span>
          <span>Close Lead</span>
        </h3>
        <p class="text-xs text-slate-500">
          Select a reason for closing this inquiry. Open cadence tasks will be cancelled automatically.
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Closure Reason *
          </label>
          <select
            v-model.number="closeReasonId"
            class="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
          >
            <option v-for="r in lostReasons" :key="r.id" :value="r.id">
              {{ $i18n.locale === 'ml' ? r.labelMl : r.labelEn }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Optional Note
          </label>
          <input
            v-model="closeNote"
            type="text"
            placeholder="Feedback or rationale..."
            class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>
        <div class="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            @click="showCloseModal = false"
            class="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!closeReasonId || isSubmittingClose"
            @click="submitClose"
            class="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs disabled:opacity-50"
          >
            Close Inquiry
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || 'http://localhost:4000/api/v1';

const lead = ref<any | null>(null);
const isLoading = ref(true);

const showEmergencyModal = ref(false);
const emergencyNote = ref('');
const isSubmittingEmergency = ref(false);

const showCloseModal = ref(false);
const closeReasonId = ref<number | null>(null);
const closeNote = ref('');
const isSubmittingClose = ref(false);
const lostReasons = ref<any[]>([]);

const fetchLead = async () => {
  isLoading.value = true;
  try {
    const res = await fetch(`${apiBase}/leads/${route.params.id}`, {
      credentials: 'include',
    });
    if (res.ok) {
      lead.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load lead', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchLostReasons = async () => {
  try {
    const res = await fetch(`${apiBase}/picklists/lost_reasons`, {
      credentials: 'include',
    });
    if (res.ok) {
      lostReasons.value = await res.json();
      if (lostReasons.value.length > 0) closeReasonId.value = lostReasons.value[0].id;
    }
  } catch (err) {
    console.error('Failed to load lost reasons', err);
  }
};

onMounted(() => {
  fetchLead();
  fetchLostReasons();
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const openWhatsApp = () => {
  if (!lead.value) return;
  if (!lead.value.consentWhatsapp) {
    const proceed = confirm(
      '⚠️ Consent Note: WhatsApp opt-in is not formally recorded for this lead. Do you wish to continue opening WhatsApp chat?'
    );
    if (!proceed) return;
  }
  const cleanPhone = (lead.value.mobileNorm || lead.value.mobile).replace(/[^0-9]/g, '');
  const greeting = lead.value.language === 'ml'
    ? `നമസ്കാരം ${lead.value.name}, ഹോസ്പിറ്റലിൽ നിന്നുള്ള സന്ദേശമാണ്.`
    : `Hello ${lead.value.name}, regarding your healthcare inquiry with Hospital CRM.`;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const submitEmergency = async () => {
  if (!lead.value || !emergencyNote.value.trim()) return;
  isSubmittingEmergency.value = true;
  try {
    const res = await fetch(`${apiBase}/leads/${lead.value.id}/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ note: emergencyNote.value.trim() }),
    });
    if (res.ok) {
      showEmergencyModal.value = false;
      emergencyNote.value = '';
      fetchLead();
    }
  } catch (err) {
    console.error('Emergency redirect failed', err);
  } finally {
    isSubmittingEmergency.value = false;
  }
};

const submitClose = async () => {
  if (!lead.value || !closeReasonId.value) return;
  isSubmittingClose.value = true;
  try {
    const res = await fetch(`${apiBase}/leads/${lead.value.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        closedReasonId: closeReasonId.value,
        note: closeNote.value.trim() || undefined,
      }),
    });
    if (res.ok) {
      showCloseModal.value = false;
      fetchLead();
    }
  } catch (err) {
    console.error('Close lead failed', err);
  } finally {
    isSubmittingClose.value = false;
  }
};
</script>
