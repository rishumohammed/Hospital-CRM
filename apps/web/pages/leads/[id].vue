<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Breadcrumb & Status Indicator -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/leads"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-850 shadow-2xs"
      >
        <span class="text-sm font-semibold">←</span>
        <span>Back to All Leads</span>
      </NuxtLink>

      <div v-if="lead" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Active Lead Dossier</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <span class="inline-block animate-spin text-3xl mb-3 text-teal-600">⟳</span>
      <p class="text-sm font-semibold">Loading patient lead profile...</p>
    </div>

    <!-- Main Content when Lead is Loaded -->
    <div v-else-if="lead" class="space-y-6">
      <!-- 1. Hero Patient Profile Card & Action Toolbar -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <!-- Patient Identity & Badges -->
          <div class="flex items-start gap-4">
            <!-- Patient Initials Avatar -->
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/20 dark:from-teal-900/40 dark:to-emerald-900/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold text-xl flex items-center justify-center shrink-0 shadow-inner">
              {{ patientInitials }}
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h1 class="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  {{ lead.name }}
                </h1>

                <!-- Priority Badge -->
                <span
                  :class="[
                    'px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-lg tracking-wider border',
                    lead.priority === 'hot'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : lead.priority === 'warm'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200'
                  ]"
                >
                  {{ lead.priority === 'hot' ? '🔥 Hot' : lead.priority === 'warm' ? '⚡ Warm' : '❄️ Cold' }}
                </span>

                <!-- Status Badge -->
                <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  ● {{ formatStatus(lead.status) }}
                </span>

                <!-- Testimonials Sent Toggle Badge -->
                <label
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all shadow-2xs"
                  :class="[
                    (lead.testimonialsSentCount || 0) > 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  ]"
                >
                  <input
                    type="checkbox"
                    :checked="(lead.testimonialsSentCount || 0) > 0"
                    :disabled="isUpdatingTestimonial"
                    class="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                    @change="toggleTestimonialsSent($event)"
                  />
                  <span>{{ (lead.testimonialsSentCount || 0) > 0 ? '✓ Testimonials Sent' : 'Testimonials Not Sent' }}</span>
                </label>

                <!-- Emergency Flag -->
                <span v-if="lead.emergencyFlag" class="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-lg bg-rose-600 text-white animate-pulse">
                  🚨 Emergency
                </span>
              </div>

              <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">ID: #{{ lead.id }}</span>
                <span>•</span>
                <span>🏥 {{ lead.branch?.name }}</span>
                <span>•</span>
                <span>📡 {{ lead.source?.labelEn }}</span>
                <span>•</span>
                <span>🕒 Created {{ formatDate(lead.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Action Toolbar (Categorized & Balanced) -->
          <div class="flex items-center flex-wrap gap-2.5">
            <!-- Direct Call -->
            <a
              :href="`tel:${lead.mobileNorm || lead.mobile}`"
              class="min-h-[40px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-teal-600/20 transition-all active:scale-[0.98]"
            >
              <span>📞</span>
              <span>Call Patient</span>
            </a>

            <!-- WhatsApp -->
            <button
              type="button"
              @click="openWhatsApp"
              class="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <!-- Log Call / Interaction -->
            <button
              type="button"
              @click="showLogCallDrawer = true"
              class="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-600 transition-colors"
            >
              <span>📝</span>
              <span>Log Interaction</span>
            </button>

            <!-- Book Appointment -->
            <button
              v-if="lead.leadType !== 'product'"
              type="button"
              @click="showBookApptModal = true"
              class="min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-sky-600/20 transition-all"
            >
              <span>📅</span>
              <span>Book Appt</span>
            </button>

            <!-- Convert Lead -->
            <button
              v-if="lead.status !== 'converted' && lead.leadType !== 'product'"
              type="button"
              @click="showConvertModal = true"
              class="min-h-[40px] px-3.5 py-2 rounded-xl border border-teal-600 dark:border-teal-500 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>🏥</span>
              <span>Mark Visited</span>
            </button>

            <!-- Emergency Redirect -->
            <button
              type="button"
              @click="showEmergencyModal = true"
              class="min-h-[40px] px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 transition-colors"
              title="Clinical Emergency Redirect"
            >
              <span>🚨</span>
              <span class="hidden sm:inline">Emergency</span>
            </button>

            <!-- Close Inquiry -->
            <button
              v-if="lead.status !== 'not_interested' && lead.status !== 'converted'"
              type="button"
              @click="showCloseModal = true"
              class="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              title="Close Inquiry"
            >
              <span>✕</span>
              <span class="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Converted Notification Banner -->
      <div
        v-if="lead.status === 'converted'"
        class="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div class="flex items-center space-x-3">
          <span class="text-2xl">🏥</span>
          <div>
            <p class="font-semibold text-sm">Converted to Active Patient Medical Record</p>
            <p class="text-xs text-teal-700 dark:text-teal-300">
              This inquiry has been converted into a clinical case file.
            </p>
          </div>
        </div>
        <NuxtLink
          to="/cases"
          class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto min-h-[36px]"
        >
          <span>View Patient Cases</span>
          <span>→</span>
        </NuxtLink>
      </div>

      <!-- 2. Balanced 2-Column Grid Layout (8 cols dossier, 4 cols timeline) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Column: Patient Dossier (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Render Product Lead Panel when leadType is product -->
          <ProductLeadPanel
            v-if="lead.leadType === 'product'"
            :lead="lead"
            @updated="fetchLead"
          />

          <!-- Clinical Treatment Dossier when leadType is treatment -->
          <template v-else>
            <!-- Patient Information Grid Card -->
            <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs space-y-5">
              <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700/70">
                <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>👤</span>
                  <span>Patient Information & Contact</span>
                </h2>
              <span class="text-xs text-slate-400 font-mono">Assigned to {{ lead.owner?.name || 'Unassigned' }}</span>
            </div>

            <!-- Key-Value Tiles Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <!-- Tile: Primary Phone -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number</p>
                <div class="flex items-center justify-between mt-1">
                  <p class="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">{{ lead.mobile }}</p>
                  <a :href="`tel:${lead.mobileNorm || lead.mobile}`" class="text-teal-600 dark:text-teal-400 hover:underline text-xs font-semibold">Call</a>
                </div>
              </div>

              <!-- Tile: Alternate Phone -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Alternate Phone</p>
                <p class="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {{ lead.altMobile || 'Not provided' }}
                </p>
              </div>

              <!-- Tile: Department -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Clinical Department</p>
                <p class="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {{ lead.department?.labelEn || 'General Medicine' }}
                </p>
              </div>

              <!-- Tile: Source -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Acquisition Source</p>
                <p class="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {{ lead.source?.labelEn || 'Direct' }}
                </p>
              </div>

              <!-- Tile: Owner -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Assigned Owner</p>
                <p class="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {{ lead.owner?.name || 'Unassigned' }}
                </p>
              </div>

              <!-- Tile: Language -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-750">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Preferred Language</p>
                <p class="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                  {{ lead.language === 'ml' ? 'Malayalam' : 'English' }}
                </p>
              </div>
            </div>

            <!-- Consent Tracking Pill Strip -->
            <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-3 text-xs flex-wrap">
              <span class="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Patient Consent:</span>
              <span :class="lead.consentCalls ? 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800' : 'text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md'">
                {{ lead.consentCalls ? '✓ Phone Calls Allowed' : '✗ No Call Consent' }}
              </span>
              <span :class="lead.consentWhatsapp ? 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800' : 'text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md'">
                {{ lead.consentWhatsapp ? '✓ WhatsApp Opted-in' : '✗ No WhatsApp Consent' }}
              </span>
              <span :class="lead.consentSms ? 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800' : 'text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md'">
                {{ lead.consentSms ? '✓ SMS Opted-in' : '✗ No SMS Consent' }}
              </span>
            </div>
          </div>

          <!-- Medical Concern & Symptoms Description Card -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs space-y-4">
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-700/70">
              <span>🩺</span>
              <span>Medical Concern & Clinical Inquiry</span>
            </h2>
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {{ lead.concern || 'No specific symptoms or notes entered during inquiry capture.' }}
            </div>
          </div>

          <!-- Testimonials Status Card -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700/70">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>💬</span>
                <span>Testimonials Status</span>
              </h2>
              <span
                :class="[
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                  (lead.testimonialsSentCount || 0) > 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                ]"
              >
                {{ (lead.testimonialsSentCount || 0) > 0 ? 'Sent' : 'Not Sent' }}
              </span>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label class="inline-flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  :checked="(lead.testimonialsSentCount || 0) > 0"
                  :disabled="isUpdatingTestimonial"
                  class="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  @change="toggleTestimonialsSent($event)"
                />
                <div>
                  <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                    Testimonials sent to patient
                  </span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    Manually shared with patient via WhatsApp, SMS, or phone call
                  </span>
                </div>
              </label>

              <div v-if="lead.testimonialsLastSentAt" class="text-xs text-slate-500 font-medium sm:text-right">
                Marked sent: {{ formatDate(lead.testimonialsLastSentAt) }}
              </div>
            </div>
          </div>
          </template>

          <!-- Cadence Follow-up Tasks Section -->
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700/70">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📋</span>
                <span>Follow-up Cadence Tasks</span>
              </h2>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {{ lead.tasks?.length || 0 }} scheduled
              </span>
            </div>

            <div v-if="!lead.tasks || lead.tasks.length === 0" class="py-8 text-center text-xs text-slate-400">
              No pending cadence tasks for this lead inquiry.
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="task in lead.tasks"
                :key="task.id"
                class="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-750 transition-colors"
              >
                <div>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ task.title }}</p>
                  <p class="text-slate-500 text-[11px] mt-0.5">
                    Due: {{ formatDate(task.dueAt) }} • Assigned to {{ task.owner?.name }}
                  </p>
                </div>
                <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {{ task.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Timeline / History (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700/70">
              <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>⏱️</span>
                <span>Activity Timeline</span>
              </h2>
              <button
                type="button"
                @click="showLogCallDrawer = true"
                class="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                + Log Note
              </button>
            </div>

            <div v-if="!lead.interactions || lead.interactions.length === 0" class="py-8 text-center text-xs text-slate-400">
              No interactions recorded yet. Use the action bar above to log calls or chats.
            </div>

            <div v-else class="relative pl-6 space-y-5 border-l-2 border-teal-200 dark:border-teal-900 ml-2 pt-1">
              <div
                v-for="act in lead.interactions"
                :key="act.id"
                class="relative"
              >
                <!-- Timeline Dot -->
                <div class="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white dark:border-slate-800 shadow-xs" />

                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      {{ act.type }} • {{ act.outcome?.labelEn || act.direction }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ formatDate(act.occurredAt) }}</span>
                  </div>
                  <p v-if="act.note" class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    {{ act.note }}
                  </p>
                  <p class="text-[10px] text-slate-400">Recorded by {{ act.user?.name || 'Staff' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals & Drawers -->

    <!-- Emergency Redirect Modal -->
    <div v-if="showEmergencyModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showEmergencyModal = false" />
      <div class="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
        <h3 class="font-semibold text-base text-rose-600 dark:text-rose-400 flex items-center space-x-2">
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
          class="w-full text-xs p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
        />
        <div class="flex items-center justify-end space-x-2.5 pt-2">
          <button
            type="button"
            @click="showEmergencyModal = false"
            class="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!emergencyNote.trim() || isSubmittingEmergency"
            @click="submitEmergency"
            class="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50"
          >
            {{ isSubmittingEmergency ? 'Redirecting...' : 'Confirm Emergency' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Close Inquiry Modal -->
    <div v-if="showCloseModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="showCloseModal = false" />
      <div class="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
          <h3 class="font-semibold text-base text-slate-900 dark:text-white">
            Close Lead Inquiry
          </h3>
          <button @click="showCloseModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-300">
          Select why this patient inquiry is being closed or marked lost.
        </p>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Closing</label>
            <select
              v-model="closeReasonId"
              class="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white min-h-[44px]"
            >
              <option v-for="r in lostReasons" :key="r.id" :value="r.id">
                {{ r.labelEn }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
            <textarea
              v-model="closeNote"
              rows="3"
              placeholder="Add final closure details..."
              class="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2.5 pt-2">
          <button
            type="button"
            @click="showCloseModal = false"
            class="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!closeReasonId || isSubmittingClose"
            @click="submitClose"
            class="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-semibold text-xs disabled:opacity-50"
          >
            {{ isSubmittingClose ? 'Closing...' : 'Close Inquiry' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Log Call Drawer -->
    <LogCallDrawer
      :is-open="showLogCallDrawer"
      :lead="lead"
      @close="showLogCallDrawer = false"
      @call-logged="fetchLead"
    />

    <!-- Book Appointment Modal -->
    <BookAppointmentModal
      :is-open="showBookApptModal"
      :lead="lead"
      @close="showBookApptModal = false"
      @booked="fetchLead"
    />

    <!-- Mark Visited & Convert Modal -->
    <div
      v-if="showConvertModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🏥</span>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Mark Visited & Convert Lead
            </h3>
          </div>
          <button @click="showConvertModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">
          Marking visited converts this inquiry into an active Patient Medical Record and Case File. All open cadence tasks will be archived.
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Visit Note (Optional)
            </label>
            <input
              v-model="convertNote"
              type="text"
              placeholder="e.g. Arrived for consultation"
              class="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2.5 pt-3">
          <button
            type="button"
            @click="showConvertModal = false"
            class="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSubmittingConvert"
            @click="submitConvert"
            class="min-h-[40px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-md shadow-teal-500/20"
          >
            {{ isSubmittingConvert ? 'Converting...' : 'Confirm & Convert' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';
import ProductLeadPanel from '~/components/lead/ProductLeadPanel.vue';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const lead = ref<any | null>(null);
const isLoading = ref(true);

const showLogCallDrawer = ref(false);
const showBookApptModal = ref(false);

const showConvertModal = ref(false);
const convertNote = ref('');
const isSubmittingConvert = ref(false);

const showEmergencyModal = ref(false);
const emergencyNote = ref('');
const isSubmittingEmergency = ref(false);

const showCloseModal = ref(false);
const closeReasonId = ref<number | null>(null);
const closeNote = ref('');
const isSubmittingClose = ref(false);
const lostReasons = ref<any[]>([]);

const isUpdatingTestimonial = ref(false);

// Patient initials avatar computation
const patientInitials = computed(() => {
  if (!lead.value?.name) return 'PT';
  const parts = lead.value.name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return lead.value.name.slice(0, 2).toUpperCase();
});

const formatStatus = (status: string) => {
  const map: Record<string, string> = {
    new: 'New Inquiry',
    contacted: 'Contacted',
    qualified: 'Qualified',
    appointment_booked: 'Appt Booked',
    not_reachable: 'Not Reachable',
    not_interested: 'Closed / Lost',
    converted: 'Converted to Case',
    junk: 'Junk',
  };
  return map[status] || status;
};

const toggleTestimonialsSent = async (event: Event) => {
  if (!lead.value) return;
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;
  isUpdatingTestimonial.value = true;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${lead.value.id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        testimonialsSent: isChecked,
      }),
    });

    if (res.ok) {
      lead.value.testimonialsSentCount = isChecked ? 1 : 0;
      lead.value.testimonialsLastSentAt = isChecked ? new Date().toISOString() : null;
    } else {
      target.checked = !isChecked;
    }
  } catch (err) {
    console.error('Failed to update testimonials status', err);
    target.checked = !isChecked;
  } finally {
    isUpdatingTestimonial.value = false;
  }
};

const fetchLead = async () => {
  isLoading.value = true;
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${route.params.id}`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      lead.value = await res.json();
    } else if (res.status === 403) {
      alert('Access Restricted: You do not have permission to view this lead (RBAC).');
      router.push('/leads');
    }
  } catch (err) {
    console.error('Failed to load lead', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchLostReasons = async () => {
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/picklists/lost_reasons`, {
      headers,
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
    year: 'numeric',
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
  const greeting = `Hello ${lead.value.name}, regarding your healthcare inquiry with Hospital CRM.`;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const submitEmergency = async () => {
  if (!lead.value || !emergencyNote.value.trim()) return;
  isSubmittingEmergency.value = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${lead.value.id}/emergency`, {
      method: 'POST',
      headers,
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${lead.value.id}/close`, {
      method: 'POST',
      headers,
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

const submitConvert = async () => {
  if (!lead.value) return;
  isSubmittingConvert.value = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;

    const res = await fetch(`${apiBase}/leads/${lead.value.id}/convert`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        note: convertNote.value.trim() || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      showConvertModal.value = false;
      if (data.case?.id) {
        router.push(`/cases/${data.case.id}`);
      } else {
        fetchLead();
      }
    } else {
      const err = await res.json();
      alert(err.error?.message || 'Failed to convert lead');
    }
  } catch (err) {
    console.error('Lead conversion failed', err);
    alert('An unexpected error occurred during conversion');
  } finally {
    isSubmittingConvert.value = false;
  }
};
</script>
