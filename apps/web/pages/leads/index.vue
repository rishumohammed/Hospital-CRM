<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>{{ activeLeadType === 'product' ? 'Product Desk: Leads' : 'Support Desk: Leads' }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ pagination.total }} Total
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          <template v-if="selectedStaffName">
            Showing inquiries assigned to <strong class="text-teal-700 dark:text-teal-300 font-semibold">{{ selectedStaffName }}</strong>
          </template>
          <template v-else>
            {{ activeLeadType === 'product' ? 'Respond to customer product inquiries, cross-sell remedies, and track orders' : 'Respond to new inquiries within SLA, qualify patients, and book appointments' }}
          </template>
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Quick Create Button -->
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

    <!-- Treatment vs Product Leads Top Toggle Bar: Only show if user has access to BOTH -->
    <div v-if="canViewTreatmentLeads && canViewProductLeads" class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
      <button
        v-if="canViewTreatmentLeads"
        type="button"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-2xs',
          activeLeadType === 'treatment'
            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
        ]"
        @click="setLeadType('treatment')"
      >
        <span>🏥</span>
        <span>Treatment Leads</span>
      </button>

      <button
        v-if="canViewProductLeads"
        type="button"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-2xs',
          activeLeadType === 'product'
            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
        ]"
        @click="setLeadType('product')"
      >
        <span>📦</span>
        <span>Product Leads</span>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
      <!-- Scope & Saved Views Bar -->
      <div class="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-700/80 flex-wrap">
        <!-- Ownership Scope Toggle (Only for telecallers; hidden for MD/Managers who have access to all leads) -->
        <div v-if="!isManagement" class="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeScope === 'my'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="setScope('my')"
          >
            <span>👤</span>
            <span>My Leads</span>
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeScope === 'unassigned'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="setScope('unassigned')"
          >
            <span>📥</span>
            <span>Unassigned Pool</span>
          </button>
          <button
            v-if="canViewAllLeads"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeScope === 'all'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            ]"
            @click="setScope('all')"
          >
            <span>👥</span>
            <span>All Branch Leads</span>
          </button>
        </div>

        <!-- Management View Overview Badge (For MD, Admins, and Managers) -->
        <div v-else class="flex items-center gap-2">
          <span class="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <span>👥</span>
            <span>All Leads (Management View)</span>
          </span>
          <span v-if="selectedStaffName" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-600 flex items-center gap-1.5">
            <span>Filter:</span>
            <strong class="text-teal-700 dark:text-teal-300 font-semibold">{{ selectedStaffName }}</strong>
            <button
              type="button"
              @click="clearStaffFilter"
              class="ml-1 text-slate-400 hover:text-rose-600 font-bold transition-colors"
              title="Clear staff filter"
            >
              ✕
            </button>
          </span>
        </div>

        <!-- Saved Filter Views -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            :class="[
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[36px]',
              activeSavedView === 'all'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            ]"
            @click="applySavedView('all')"
          >
            All Status
          </button>

        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5',
            activeSavedView === 'not_sent'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          ]"
          @click="applySavedView('not_sent')"
        >
          <span>📜</span>
          <span>Not yet sent testimonials</span>
        </button>

        <button
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[36px] flex items-center gap-1.5',
            activeSavedView === 'sent'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
          ]"
          @click="applySavedView('sent')"
        >
          <span>✓</span>
          <span>Testimonials Sent</span>
        </button>
      </div>
    </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <!-- Search Input -->
        <div class="sm:col-span-2 md:col-span-2 lg:col-span-2 xl:col-span-2 relative">
          <input
            v-model="filters.search"
            @input="handleSearch"
            type="text"
            class="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            placeholder="Search by name, phone, or concern..."
          />
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
        </div>

        <!-- Employee / Telecaller Filter (Visible to Admin, MD, Center Head, and Managers) -->
        <div v-if="canViewAllLeads" class="sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
          <select
            v-model="filters.ownerId"
            @change="onEmployeeFilterChange"
            class="w-full h-11 px-3 rounded-xl border border-teal-200 dark:border-teal-700/70 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 text-xs font-semibold focus:ring-2 focus:ring-teal-500"
            title="Filter by assigned staff or telecaller"
          >
            <option value="">👥 All Employees</option>
            <option value="unassigned">⚠️ Unassigned Leads</option>
            <optgroup label="Telecallers & Staff">
              <option
                v-for="emp in staffMembers"
                :key="emp.id"
                :value="emp.id.toString()"
              >
                👤 {{ emp.name }} ({{ emp.role?.name || emp.role?.code }})
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <select
            v-model="filters.status"
            @change="fetchLeads"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="appointment_booked">Appointment Booked</option>
            <option value="not_reachable">Not Reachable</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>

        <!-- Priority Filter -->
        <div>
          <select
            v-model="filters.priority"
            @change="fetchLeads"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Priorities</option>
            <option value="hot">🔥 Hot (Urgent / Paid Ad)</option>
            <option value="warm">⚡ Warm (Standard)</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>

        <!-- Testimonials Filter -->
        <div>
          <select
            v-model="filters.testimonials"
            @change="activeSavedView = filters.testimonials === 'not_sent' ? 'not_sent' : (filters.testimonials === 'sent' ? 'sent' : 'all'); fetchLeads()"
            class="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Testimonials: All</option>
            <option value="sent">Testimonials: Sent</option>
            <option value="not_sent">Testimonials: Not sent</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Leads List Table / Cards -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center text-slate-500">
        <span class="inline-block animate-spin text-2xl mb-2">⟳</span>
        <p class="text-sm font-medium">Loading leads...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="leads.length === 0" class="p-12 text-center space-y-3">
        <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
          📭
        </div>
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">
          No leads found
        </h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Try adjusting your search criteria or create a new inquiry
        </p>
        <button
          type="button"
          @click="showQuickCreate = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          + Add First Lead
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
                class="font-semibold text-base text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 truncate"
              >
                {{ lead.name }}
              </NuxtLink>

              <!-- Priority Badge -->
              <span
                :class="[
                  'px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md tracking-wider',
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
              <span class="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {{ formatStatus(lead.status) }}
              </span>

              <!-- Manual Testimonials Sent Checkbox -->
              <label
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-colors"
                :class="[
                  (lead.testimonialsSentCount || 0) > 0
                    ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400'
                ]"
                @click.stop
              >
                <input
                  type="checkbox"
                  :checked="(lead.testimonialsSentCount || 0) > 0"
                  :disabled="isUpdatingTestimonial[lead.id]"
                  class="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                  @change="toggleTestimonialsSent(lead, $event)"
                />
                <span>{{ (lead.testimonialsSentCount || 0) > 0 ? 'Testimonials Sent' : 'Testimonials' }}</span>
              </label>

              <!-- Age & Location Badges -->
              <span v-if="lead.age" class="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                {{ lead.age }} yrs
              </span>
              <span v-if="lead.location" class="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                📍 {{ lead.location }}
              </span>
            </div>

            <!-- Medical Concern (Malayalam / English) -->
            <p v-if="lead.concern" class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {{ lead.concern }}
            </p>

            <!-- Product Inquiries Row (when product lead) -->
            <div v-if="lead.leadType === 'product' || (lead.productInterests && lead.productInterests.length > 0)" class="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span v-if="lead.campaign" class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                📢 {{ lead.campaign.name }}
              </span>
              <span
                v-for="pi in lead.productInterests"
                :key="pi.id"
                :class="[
                  'px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border',
                  pi.product?.stockStatus === 'out_of_stock'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-750 dark:border-slate-700'
                ]"
              >
                <span>{{ pi.product?.name }}</span>
                <span v-if="pi.product?.stockStatus === 'out_of_stock'" class="text-[9px] text-rose-600 font-bold">(OOS)</span>
              </span>
            </div>

            <!-- Metadata Row -->
            <div class="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-y-1">
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">
                📞 {{ lead.mobile }}
              </span>
              <span>•</span>
              <span>🏥 {{ lead.department?.labelEn }}</span>
              <span>•</span>
              <span>📡 {{ lead.source?.labelEn }}</span>
              <span>•</span>
              <span>👤 {{ lead.owner?.name || 'Unassigned' }}</span>
            </div>
          </div>

          <!-- Right: SLA Timer & Quick Channel Actions -->
          <div class="flex items-center space-x-2 shrink-0">
            <!-- First-Response SLA Countdown Badge -->
            <div
              v-if="lead.status === 'new' && lead.firstResponseDueAt"
              :class="[
                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border',
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
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
              title="Call via tel: link"
            >
              <span>📞</span>
              <span class="hidden sm:inline">Call</span>
            </a>

            <!-- WhatsApp Button (wa.me) -->
            <a
              :href="getWhatsAppLink(lead)"
              target="_blank"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
              title="Chat on WhatsApp"
            >
              <span>💬</span>
              <span class="hidden sm:inline">WhatsApp</span>
            </a>

            <!-- Edit Button -->
            <button
              type="button"
              @click.stop="openEditModal(lead)"
              class="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center space-x-1 transition-colors"
              title="Edit Lead"
            >
              <span>✏️</span>
              <span class="hidden sm:inline">Edit</span>
            </button>

            <!-- View Details Button -->
            <NuxtLink
              :to="`/leads/${lead.id}`"
              class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center space-x-1 transition-colors"
            >
              <span>View</span>
              <span>→</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <p class="text-xs text-slate-500">
          Page {{ pagination.page }} of {{ pagination.totalPages || 1 }}
        </p>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
            class="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            type="button"
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
            class="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Create Drawer Modal -->
    <LeadQuickCreateDrawer
      :is-open="showQuickCreate"
      :default-lead-type="activeLeadType"
      @close="showQuickCreate = false"
      @created="onLeadCreated"
      @lead-created="onLeadCreated"
    />

    <!-- Edit Lead Modal -->
    <EditLeadModal
      :is-open="showEditModal"
      :lead="selectedLeadToEdit"
      @close="showEditModal = false"
      @updated="fetchLeads"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import TestimonialChip from '~/components/testimonials/TestimonialChip.vue';
import EditLeadModal from '~/components/lead/EditLeadModal.vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const leads = ref<any[]>([]);
const isLoading = ref(true);
const showQuickCreate = ref(false);
const showEditModal = ref(false);
const selectedLeadToEdit = ref<any | null>(null);

const openEditModal = (lead: any) => {
  selectedLeadToEdit.value = lead;
  showEditModal.value = true;
};
const activeSavedView = ref<'all' | 'not_sent' | 'sent'>('all');

const pagination = reactive({
  page: 1,
  pageSize: 15,
  total: 0,
  totalPages: 1,
});

const isUpdatingTestimonial = ref<Record<number, boolean>>({});

const toggleTestimonialsSent = async (lead: any, event: Event) => {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;
  isUpdatingTestimonial.value[lead.id] = true;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${lead.id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        testimonialsSent: isChecked,
      }),
    });

    if (res.ok) {
      lead.testimonialsSentCount = isChecked ? 1 : 0;
      lead.testimonialsLastSentAt = isChecked ? new Date().toISOString() : null;
    } else {
      target.checked = !isChecked;
    }
  } catch (err) {
    console.error('Failed to update testimonials status', err);
    target.checked = !isChecked;
  } finally {
    isUpdatingTestimonial.value[lead.id] = false;
  }
};

const filters = reactive({
  search: '',
  status: '',
  priority: '',
  language: '',
  testimonials: '',
  ownerId: '',
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

const userRoleCode = computed(() => {
  const u = authStore.user;
  if (!u) return '';
  return (u.role?.code || (u as any).roleCode || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
});

const isManagement = computed(() => {
  const role = userRoleCode.value;
  return ['owner', 'admin', 'super_admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(role);
});

const canViewAllLeads = computed(() => {
  const role = userRoleCode.value;
  return role === 'owner' || role === 'admin' || role === 'center_head' || role === 'telecaller_manager' || role === 'product_manager';
});

const staffMembers = ref<any[]>([]);

const fetchStaffMembers = async () => {
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/users/staff`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      staffMembers.value = data.items || [];
    }
  } catch (err) {
    console.error('Failed to load staff list for filter', err);
  }
};

const activeScope = ref<'my' | 'all' | 'unassigned'>('all');

watch(isManagement, (val) => {
  if (val) {
    activeScope.value = 'all';
    if (import.meta.client) {
      fetchStaffMembers();
    }
  } else {
    activeScope.value = 'my';
  }
});

const onEmployeeFilterChange = () => {
  pagination.page = 1;
  fetchLeads();
};

const clearStaffFilter = () => {
  filters.ownerId = '';
  pagination.page = 1;
  fetchLeads();
};

const selectedStaffName = computed(() => {
  if (!filters.ownerId) return '';
  if (filters.ownerId === 'unassigned') return 'Unassigned Leads';
  const found = staffMembers.value.find((s) => s.id.toString() === filters.ownerId.toString());
  return found ? `${found.name} (${found.role?.name || found.role?.code})` : `Staff #${filters.ownerId}`;
});

const isProductStaff = computed(() => {
  return ['product_sales_executive', 'product_caller', 'product_manager'].includes(userRoleCode.value);
});

const canViewTreatmentLeads = computed(() => {
  if (isProductStaff.value && !['owner', 'admin'].includes(userRoleCode.value)) return false;
  return authStore.hasPermission('lead.view');
});

const canViewProductLeads = computed(() => {
  return isProductStaff.value || authStore.hasPermission('product_lead.view');
});

const activeLeadType = ref<'treatment' | 'product'>('treatment');

const setLeadType = (type: 'treatment' | 'product') => {
  activeLeadType.value = type;
  pagination.page = 1;
  fetchLeads();
};

const setScope = (scope: 'my' | 'all' | 'unassigned') => {
  activeScope.value = scope;
  pagination.page = 1;
  fetchLeads();
};

const fetchLeads = async () => {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      pageSize: pagination.pageSize.toString(),
      leadType: activeLeadType.value,
    });

    if (!isManagement.value) {
      if (activeScope.value === 'my' && authStore.user?.id) {
        params.append('ownerId', authStore.user.id.toString());
      } else if (activeScope.value === 'unassigned') {
        params.append('unassigned', 'true');
      }
    } else if (filters.ownerId) {
      if (filters.ownerId === 'unassigned') {
        params.append('unassigned', 'true');
      } else {
        params.append('ownerId', filters.ownerId);
      }
    }

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

onMounted(async () => {
  if (!authStore.token && !authStore.user) {
    await authStore.fetchMe();
  }
  if (isManagement.value) {
    activeScope.value = 'all';
  } else {
    activeScope.value = 'my';
  }
  if (canViewAllLeads.value) {
    fetchStaffMembers();
  }
  if (isProductStaff.value && !['owner', 'admin', 'center_head', 'telecaller_manager'].includes(userRoleCode.value)) {
    activeLeadType.value = 'product';
  } else if (!canViewTreatmentLeads.value && canViewProductLeads.value) {
    activeLeadType.value = 'product';
  }
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

const onLeadCreated = (createdLead?: any) => {
  // If the created lead specifies a type, ensure the active tab matches it
  if (createdLead?.leadType && ['treatment', 'product'].includes(createdLead.leadType)) {
    activeLeadType.value = createdLead.leadType;
  }

  // Clear filters that would otherwise hide the newly created lead
  filters.search = '';
  filters.status = '';
  filters.priority = '';
  pagination.page = 1;

  // If a telecaller created it, it gets assigned to them; switch to 'my' so it's in view
  if (!isManagement.value && activeScope.value === 'unassigned') {
    activeScope.value = 'my';
  } else if (isManagement.value && filters.ownerId) {
    // If management was filtering by another staff member, reset employee filter
    filters.ownerId = '';
  }

  // Optimistically insert if present and not already in list
  if (createdLead && createdLead.id) {
    const exists = leads.value.some((l) => l.id === createdLead.id);
    if (!exists) {
      leads.value = [createdLead, ...leads.value];
      pagination.total += 1;
    }
  }

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
  const greeting = `Hello ${lead.name}, regarding your healthcare inquiry with Hospital CRM.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
};

</script>
