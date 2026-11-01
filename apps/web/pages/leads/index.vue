<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>{{ $i18n.locale === 'ml' ? 'സപ്പോർട്ട് ഡെസ്ക്: ലീഡുകൾ' : 'Support Desk: Leads' }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold">
            {{ pagination.total }} {{ $i18n.locale === 'ml' ? 'ആകെ' : 'Total' }}
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {{ $i18n.locale === 'ml' ? 'പുതിയ അന്വേഷണങ്ങൾ കൈകാര്യം ചെയ്യുക, അപ്പോയിന്റ്മെന്റുകൾ ബുക്ക് ചെയ്യുക' : 'Respond to new inquiries within SLA, qualify patients, and book appointments' }}
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- CSV Import Button -->
        <button
          type="button"
          @click="showImportModal = true"
          class="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all shadow-sm flex items-center space-x-2"
        >
          <span>📥</span>
          <span>{{ $i18n.locale === 'ml' ? 'ഇമ്പോർട്ട് CSV' : 'Import CSV' }}</span>
        </button>

        <!-- Quick Create Button -->
        <button
          type="button"
          @click="showQuickCreate = true"
          class="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-teal-500/20 flex items-center space-x-2"
        >
          <span class="text-lg leading-none">+</span>
          <span>{{ $i18n.locale === 'ml' ? 'പുതിയ ലീഡ്' : 'Quick Create' }}</span>
        </button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
      <!-- Saved Views Bar -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-700/80">
        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px]',
            activeSavedView === 'all'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          ]"
          @click="applySavedView('all')"
        >
          {{ $i18n.locale === 'ml' ? 'എല്ലാ ലീഡുകളും' : 'All Leads' }}
        </button>

        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5',
            activeSavedView === 'not_sent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          ]"
          @click="applySavedView('not_sent')"
        >
          <span>📜</span>
          <span>{{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രം അയക്കാത്തവ' : 'Not yet sent testimonials' }}</span>
        </button>

        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5',
            activeSavedView === 'sent'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
          ]"
          @click="applySavedView('sent')"
        >
          <span>✓</span>
          <span>{{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രം അയച്ചവ' : 'Testimonials Sent' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <!-- Search Input -->
        <div class="lg:col-span-2 relative">
          <input
            v-model="filters.search"
            @input="handleSearch"
            type="text"
            class="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            :placeholder="$i18n.locale === 'ml' ? 'പേര്, ഫോൺ, അല്ലെങ്കിൽ മലയാളത്തിൽ സെർച്ച് ചെയ്യുക...' : 'Search by name, phone, or concern (English / മലയാളം)...'"
          />
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
        </div>

        <!-- Status Filter -->
        <div>
          <select
            v-model="filters.status"
            @change="fetchLeads"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{{ $i18n.locale === 'ml' ? 'എല്ലാ സ്റ്റാറ്റസും' : 'All Statuses' }}</option>
            <option value="new">New (പുതിയത്)</option>
            <option value="contacted">Contacted (ബന്ധപ്പെട്ടു)</option>
            <option value="qualified">Qualified (യോഗ്യമായത്)</option>
            <option value="appointment_booked">Appointment Booked (ബുക്കിംഗ്)</option>
            <option value="not_reachable">Not Reachable (ലഭ്യമല്ല)</option>
            <option value="not_interested">Not Interested (താല്പര്യമില്ല)</option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div>
          <select
            v-model="filters.priority"
            @change="fetchLeads"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{{ $i18n.locale === 'ml' ? 'എല്ലാ മുൻഗണനയും' : 'All Priorities' }}</option>
            <option value="hot">🔥 Hot (അടിയന്തിരം / പരസ്യം)</option>
            <option value="warm">⚡ Warm (സാധാരണം)</option>
            <option value="cold">❄️ Cold (തണുപ്പൻ)</option>
          </select>
        </div>

        <!-- Language Filter -->
        <div>
          <select
            v-model="filters.language"
            @change="fetchLeads"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{{ $i18n.locale === 'ml' ? 'എല്ലാ ഭാഷകളും' : 'All Languages' }}</option>
            <option value="ml">മലയാളം (Malayalam)</option>
            <option value="en">English</option>
          </select>
        </div>

        <!-- Testimonials Filter -->
        <div>
          <select
            v-model="filters.testimonials"
            @change="activeSavedView = filters.testimonials === 'not_sent' ? 'not_sent' : (filters.testimonials === 'sent' ? 'sent' : 'all'); fetchLeads()"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രം: എല്ലാം' : 'Testimonials: All' }}</option>
            <option value="sent">{{ $i18n.locale === 'ml' ? 'അയച്ചവ (Sent)' : 'Testimonials: Sent' }}</option>
            <option value="not_sent">{{ $i18n.locale === 'ml' ? 'അയക്കാത്തവ (Not sent)' : 'Testimonials: Not sent' }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Leads List Table / Cards -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2">⟳</span>
        <p class="text-sm font-medium">{{ $i18n.locale === 'ml' ? 'ലോഡ് ചെയ്യുന്നു...' : 'Loading leads...' }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="leads.length === 0" class="p-12 text-center space-y-3">
        <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
          📭
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-200">
          {{ $i18n.locale === 'ml' ? 'ലീഡുകളൊന്നും കണ്ടെത്തിയില്ല' : 'No leads found' }}
        </h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          {{ $i18n.locale === 'ml' ? 'തിരയൽ ഫിൽട്ടറുകൾ മാറ്റുകയോ പുതിയ ലീഡ് ചേർക്കുകയോ ചെയ്യുക' : 'Try adjusting your search criteria or create a new inquiry' }}
        </p>
        <button
          type="button"
          @click="showQuickCreate = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
        >
          + {{ $i18n.locale === 'ml' ? 'പുതിയ ലീഡ് ചേർക്കുക' : 'Add First Lead' }}
        </button>
      </div>

      <!-- Leads Grid / Table -->
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-700/60">
        <div
          v-for="lead in leads"
          :key="lead.id"
          class="p-5 hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <!-- Left: Patient Info & Badges -->
          <div class="space-y-2 flex-1 min-w-0">
            <div class="flex items-center space-x-2 flex-wrap gap-y-1">
              <NuxtLink
                :to="`/leads/${lead.id}`"
                class="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 truncate"
              >
                {{ lead.name }}
              </NuxtLink>

              <!-- Priority Badge -->
              <span
                :class="[
                  'px-2 py-0.5 text-[11px] font-black uppercase rounded-md tracking-wider',
                  lead.priority === 'hot'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : lead.priority === 'warm'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                ]"
              >
                {{ lead.priority }}
              </span>

              <!-- Status Badge -->
              <span class="px-2 py-0.5 text-[11px] font-bold rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {{ formatStatus(lead.status) }}
              </span>

              <!-- Testimonial Status Chip -->
              <TestimonialChip
                :sent-count="lead.testimonialsSentCount || 0"
                :last-sent-at="lead.testimonialsLastSentAt"
              />

              <!-- Language Tag -->
              <span class="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {{ lead.language?.toUpperCase() || 'EN' }}
              </span>

              <!-- Emergency Tag -->
              <span v-if="lead.emergencyFlag" class="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-rose-600 text-white animate-pulse">
                🚨 Emergency
              </span>
            </div>

            <!-- Medical Concern (Malayalam / English) -->
            <p v-if="lead.concern" class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {{ lead.concern }}
            </p>

            <!-- Metadata Row -->
            <div class="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-y-1">
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">
                📞 {{ lead.mobile }}
              </span>
              <span>•</span>
              <span>🏥 {{ $i18n.locale === 'ml' ? lead.department?.labelMl : lead.department?.labelEn }}</span>
              <span>•</span>
              <span>📡 {{ $i18n.locale === 'ml' ? lead.source?.labelMl : lead.source?.labelEn }}</span>
              <span>•</span>
              <span>👤 {{ lead.owner?.name || ($i18n.locale === 'ml' ? 'ഉടമയില്ല' : 'Unassigned') }}</span>
            </div>
          </div>

          <!-- Right: SLA Timer & Quick Channel Actions -->
          <div class="flex items-center space-x-2 shrink-0">
            <!-- First-Response SLA Countdown Badge -->
            <div
              v-if="lead.status === 'new' && lead.firstResponseDueAt"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border',
                isBreached(lead.firstResponseDueAt)
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              ]"
            >
              <span>⏱️</span>
              <span>{{ formatSlaTimer(lead.firstResponseDueAt) }}</span>
            </div>

            <!-- Call Button (tel:) -->
            <a
              :href="`tel:${lead.mobileNorm || lead.mobile}`"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              title="Call via tel: link"
            >
              <span>📞</span>
              <span class="hidden sm:inline">{{ $i18n.locale === 'ml' ? 'വിളിക്കുക' : 'Call' }}</span>
            </a>

            <!-- WhatsApp Button (wa.me) -->
            <a
              :href="getWhatsAppLink(lead)"
              target="_blank"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              title="Chat on WhatsApp"
            >
              <span>💬</span>
              <span class="hidden sm:inline">WhatsApp</span>
            </a>

            <!-- View Details Button -->
            <NuxtLink
              :to="`/leads/${lead.id}`"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1 transition-colors"
            >
              <span>{{ $i18n.locale === 'ml' ? 'കാണുക' : 'View' }}</span>
              <span>→</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <p class="text-xs text-slate-500">
          {{ $i18n.locale === 'ml' ? 'പേജ്' : 'Page' }} {{ pagination.page }} {{ $i18n.locale === 'ml' ? 'ആകെ' : 'of' }} {{ pagination.totalPages || 1 }}
        </p>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
            class="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
          >
            ← {{ $i18n.locale === 'ml' ? 'മുമ്പത്തേത്' : 'Prev' }}
          </button>
          <button
            type="button"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
            class="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
          >
            {{ $i18n.locale === 'ml' ? 'അടുത്തത്' : 'Next' }} →
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Create Drawer Modal -->
    <LeadQuickCreateDrawer
      :is-open="showQuickCreate"
      @close="showQuickCreate = false"
      @created="onLeadCreated"
    />

    <!-- CSV Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showImportModal = false" />
      <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
          <h3 class="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <span>📥</span>
            <span>{{ $i18n.locale === 'ml' ? 'ലീഡ് CSV ഇമ്പോർട്ട് ചെയ്യുക' : 'Import Leads from CSV' }}</span>
          </h3>
          <button @click="showImportModal = false" class="text-slate-400 hover:text-slate-600 text-xl font-bold">
            &times;
          </button>
        </div>

        <p class="text-xs text-slate-500">
          {{ $i18n.locale === 'ml' ? 'പേര്, ഫോൺ നമ്പർ എന്നിവ അടങ്ങിയ CSV ടെക്സ്റ്റ് ഒട്ടിക്കുക:' : 'Paste CSV rows (Name, Mobile, DepartmentCode, SourceCode, Concern):' }}
        </p>

        <textarea
          v-model="importText"
          rows="6"
          placeholder="Name,Mobile,DepartmentCode,SourceCode,Concern&#10;Fathima,+919447000111,ayurveda,META_ADS,Knee pain&#10;Rajesh,+919447000222,marma,GOOGLE_ADS,Back ache"
          class="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
        />

        <div v-if="importResult" class="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs">
          {{ importResult }}
        </div>

        <div class="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            @click="showImportModal = false"
            class="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
          >
            {{ $i18n.locale === 'ml' ? 'ക്ലോസ് ചെയ്യുക' : 'Close' }}
          </button>
          <button
            type="button"
            :disabled="isImporting || !importText.trim()"
            @click="runCsvImport"
            class="min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs disabled:opacity-50"
          >
            <span v-if="isImporting">Importing...</span>
            <span v-else>{{ $i18n.locale === 'ml' ? 'ഇമ്പോർട്ട് ആരംഭിക്കുക' : 'Preview & Commit' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import TestimonialChip from '~/components/testimonials/TestimonialChip.vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const leads = ref<any[]>([]);
const isLoading = ref(true);
const showQuickCreate = ref(false);
const showImportModal = ref(false);
const importText = ref('');
const isImporting = ref(false);
const importResult = ref('');
const activeSavedView = ref<'all' | 'not_sent' | 'sent'>('all');

const pagination = reactive({
  page: 1,
  pageSize: 15,
  total: 0,
  totalPages: 1,
});

const filters = reactive({
  search: '',
  status: '',
  priority: '',
  language: '',
  testimonials: '',
});

let searchDebounce: any = null;

const applySavedView = (view: 'all' | 'not_sent' | 'sent') => {
  activeSavedView.value = view;
  if (view === 'not_sent') {
    filters.testimonials = 'not_sent';
  } else if (view === 'sent') {
    filters.testimonials = 'sent';
  } else {
    filters.testimonials = '';
  }
  pagination.page = 1;
  fetchLeads();
};

const fetchLeads = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      pageSize: pagination.pageSize.toString(),
    });

    if (filters.search) params.append('search', filters.search.trim());
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.language) params.append('language', filters.language);
    if (filters.testimonials) params.append('testimonials', filters.testimonials);

    if (activeSavedView.value === 'not_sent') {
      params.append('sortBy', 'testimonials_last_sent_at');
      params.append('sortOrder', 'asc');
    }

    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      leads.value = data.leads || [];
      pagination.total = data.pagination?.total || 0;
      pagination.totalPages = data.pagination?.totalPages || 1;
    }
  } catch (err) {
    console.error('Failed to load leads', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchLeads();
});

const handleSearch = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    pagination.page = 1;
    fetchLeads();
  }, 350);
};

const changePage = (newPage: number) => {
  pagination.page = newPage;
  fetchLeads();
};

const onLeadCreated = () => {
  fetchLeads();
};

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    appointment_booked: 'Appt Booked',
    not_reachable: 'Not Reachable',
    not_interested: 'Closed / Lost',
    converted: 'Converted',
  };
  return map[status] || status;
};

const isBreached = (dueAtStr: string) => {
  return new Date(dueAtStr).getTime() < Date.now();
};

const formatSlaTimer = (dueAtStr: string) => {
  const diffMs = new Date(dueAtStr).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return `Breached by ${Math.abs(diffMin)}m`;
  return `${diffMin}m SLA`;
};

const getWhatsAppLink = (lead: any) => {
  const cleanPhone = (lead.mobileNorm || lead.mobile).replace(/[^0-9]/g, '');
  const greeting = lead.language === 'ml'
    ? `നമസ്കാരം ${lead.name}, ഹോസ്പിറ്റലിൽ നിന്നുള്ള സന്ദേശമാണ്.`
    : `Hello ${lead.name}, regarding your healthcare inquiry with Hospital CRM.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
};

const runCsvImport = async () => {
  isImporting.value = true;
  importResult.value = '';

  try {
    const lines = importText.value.trim().split('\n');
    const rows: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('name,mobile'))) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        rows.push({
          name: parts[0]?.trim(),
          mobile: parts[1]?.trim(),
          departmentCode: parts[2]?.trim() || 'ayurveda',
          sourceCode: parts[3]?.trim() || 'WEBSITE',
          concern: parts[4]?.trim() || '',
        });
      }
    }

    if (rows.length === 0) {
      importResult.value = 'No valid rows detected in CSV';
      return;
    }

    // Preview
    const previewRes = await fetch(`${apiBase}/leads/import/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rows }),
    });

    if (!previewRes.ok) throw new Error('Preview validation failed');
    const preview = await previewRes.json();

    // Commit
    const commitRes = await fetch(`${apiBase}/leads/import/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rows }),
    });

    if (commitRes.ok) {
      const commit = await commitRes.json();
      importResult.value = `✓ Successfully imported ${commit.importedCount} leads! (${preview.duplicateCount} duplicates skipped)`;
      fetchLeads();
      setTimeout(() => {
        showImportModal.value = false;
        importText.value = '';
        importResult.value = '';
      }, 2000);
    }
  } catch (err: any) {
    importResult.value = `Import error: ${err.message}`;
  } finally {
    isImporting.value = false;
  }
};
</script>
