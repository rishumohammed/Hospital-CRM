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
            <TestimonialChip
              v-if="lead"
              :sent-count="lead.testimonialsSentCount || 0"
              :last-sent-at="lead.testimonialsLastSentAt"
            />
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

        <!-- Log Call Button -->
        <button
          type="button"
          @click="showLogCallDrawer = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm"
        >
          <span>📝</span>
          <span>{{ $i18n.locale === 'ml' ? 'കോൾ രേഖപ്പെടുത്തുക' : 'Log Call' }}</span>
        </button>

        <!-- Send Testimonials Quick Action -->
        <button
          v-if="authStore.hasPermission('testimonial.send') && !lead.doNotContact && lead.status !== 'junk' && !lead.emergencyFlag"
          type="button"
          @click="showMarkTestimonial = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-teal-500/20"
        >
          <span>📜</span>
          <span>{{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രം' : 'Testimonials' }}</span>
        </button>

        <!-- Book Appointment Button -->
        <button
          type="button"
          @click="showBookApptModal = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-sky-500/20"
        >
          <span>📅</span>
          <span>{{ $i18n.locale === 'ml' ? 'അപ്പോയിന്റ്മെന്റ്' : 'Book Appt' }}</span>
        </button>

        <!-- Mark Visited & Convert Button -->
        <button
          v-if="lead.status !== 'converted'"
          type="button"
          @click="showConvertModal = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-purple-500/20"
        >
          <span>🏥</span>
          <span>{{ $i18n.locale === 'ml' ? 'രോഗി എത്തി (കൺവേർട്ട്)' : 'Mark Visited' }}</span>
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

    <!-- Converted Alert Banner -->
    <div
      v-if="lead?.status === 'converted'"
      class="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
    >
      <div class="flex items-center space-x-3">
        <span class="text-2xl">🏥</span>
        <div>
          <p class="font-bold text-sm">This lead has been converted to a Patient Case!</p>
          <p class="text-xs text-purple-700 dark:text-purple-300">
            A patient medical record and case file have been established.
          </p>
        </div>
      </div>
      <NuxtLink
        to="/cases"
        class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto min-h-[36px]"
      >
        <span>View Cases</span>
        <span>→</span>
      </NuxtLink>
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

        <!-- Testimonials Section -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-base">📜</span>
              <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                {{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രങ്ങൾ' : 'Testimonials Sent' }}
              </h2>
              <TestimonialChip
                :sent-count="lead.testimonialsSentCount || 0"
                :last-sent-at="lead.testimonialsLastSentAt"
              />
            </div>
            <button
              v-if="authStore.hasPermission('testimonial.send') && !lead.doNotContact && lead.status !== 'junk' && !lead.emergencyFlag"
              type="button"
              class="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              @click="showMarkTestimonial = true"
            >
              <span>+</span>
              <span>{{ $i18n.locale === 'ml' ? 'സാക്ഷ്യപത്രം അയക്കുക' : 'Send Testimonials' }}</span>
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="testimonialSends.length === 0" class="py-6 text-center text-xs text-slate-500">
            {{ $i18n.locale === 'ml' ? 'ഇതുവരെ സാക്ഷ്യപത്രങ്ങൾ അയച്ചിട്ടില്ല' : 'No testimonials have been sent to this lead yet.' }}
          </div>

          <!-- History List -->
          <div v-else class="space-y-3">
            <div
              v-for="send in testimonialSends"
              :key="send.id"
              :class="[
                'p-4 rounded-xl border transition-all text-xs space-y-2.5',
                send.voidedAt
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 opacity-80'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40'
              ]"
            >
              <!-- Row 1: Channel, Date, Void Badge, Actions -->
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200">
                    {{ formatChannel(send.channel) }}
                  </span>
                  <span :class="['font-medium text-slate-500', send.voidedAt ? 'line-through' : '']">
                    {{ formatDate(send.sentAt) }}
                  </span>
                  <span class="text-slate-400">&bull;</span>
                  <span class="text-slate-600 dark:text-slate-400 font-medium">
                    By {{ send.sentByUser?.name || 'Telecaller' }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Voided Badge -->
                  <span
                    v-if="send.voidedAt"
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  >
                    Voided
                  </span>

                  <!-- Edit Action (Same day, original sender, non-voided) -->
                  <button
                    v-if="!send.voidedAt && canEditSend(send)"
                    type="button"
                    class="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                    @click="openEditSend(send)"
                  >
                    Edit
                  </button>

                  <!-- Undo / Void Action -->
                  <button
                    v-if="!send.voidedAt && authStore.hasPermission('testimonial.void')"
                    type="button"
                    class="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                    @click="openVoidSend(send)"
                  >
                    Undo
                  </button>
                </div>
              </div>

              <!-- Testimonials Included -->
              <div :class="['space-y-1', send.voidedAt ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200']">
                <div
                  v-for="item in send.items"
                  :key="item.id"
                  class="flex items-center gap-1.5 text-xs"
                >
                  <span class="text-xs">{{ getTypeIcon(item.testimonial?.type) }}</span>
                  <span class="font-bold">{{ item.testimonial?.title }}</span>
                  <a
                    v-if="item.testimonial?.url"
                    :href="item.testimonial.url"
                    target="_blank"
                    class="text-teal-600 dark:text-teal-400 underline text-[11px] ml-1"
                  >
                    View
                  </a>
                </div>
              </div>

              <!-- Note -->
              <div v-if="send.note" :class="['text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60', send.voidedAt ? 'line-through' : '']">
                <span class="font-bold">Note:</span> {{ send.note }}
              </div>

              <!-- Override Reason Warning -->
              <div v-if="send.overrideReason" class="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60">
                ⚠️ <span class="font-bold">Manager Override:</span> {{ send.overrideReason }}
              </div>

              <!-- Void Reason & Details -->
              <div v-if="send.voidedAt" class="text-[11px] text-rose-800 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-300 dark:border-rose-800/60">
                <span class="font-bold">Voided on {{ formatDate(send.voidedAt) }} by {{ send.voidedByUser?.name || 'Manager' }}:</span>
                <span class="italic ml-1">"{{ send.voidReason }}"</span>
              </div>
            </div>
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
            <h3 class="text-lg font-black text-slate-900 dark:text-slate-100">
              {{ $i18n.locale === 'ml' ? 'രോഗി എത്തി (കൺവേർട്ട് ചെയ്യുക)' : 'Mark Visited & Convert Lead' }}
            </h3>
          </div>
          <button @click="showConvertModal = false" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400">
          Marking visited converts this inquiry into an active Patient Medical Record and Case File. All open cadence tasks will be archived.
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Visit Note (Optional)
            </label>
            <input
              v-model="convertNote"
              type="text"
              placeholder="e.g. Arrived for appointment"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-3">
          <button
            type="button"
            @click="showConvertModal = false"
            class="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isSubmittingConvert"
            @click="submitConvert"
            class="min-h-[44px] px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs disabled:opacity-50 transition-colors shadow-md shadow-purple-500/20"
          >
            {{ isSubmittingConvert ? 'Converting...' : 'Confirm & Convert' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mark Testimonial Drawer -->
    <MarkTestimonialDrawer
      :is-open="showMarkTestimonial"
      :lead="lead"
      @close="showMarkTestimonial = false"
      @sent="onTestimonialSent"
    />

    <!-- Void Testimonial Modal -->
    <VoidTestimonialModal
      :is-open="showVoidModal"
      :lead-id="lead?.id"
      :send="selectedSendForVoid"
      @close="showVoidModal = false"
      @voided="onTestimonialVoided"
    />

    <!-- Edit Testimonial Send Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" @click="showEditModal = false" />
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
              ✏️
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Edit Testimonial Send</h3>
              <p class="text-xs text-slate-500">Same-day edit: Note and timestamp only</p>
            </div>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sent Time</label>
              <input v-model="editSentAt" type="datetime-local" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Note (Optional)</label>
              <textarea v-model="editNote" rows="3" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100" placeholder="Optional notes..."></textarea>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" class="min-h-[40px] px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" @click="showEditModal = false">Cancel</button>
            <button type="button" class="min-h-[40px] px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white" :disabled="isSavingEdit" @click="submitEditSend">
              {{ isSavingEdit ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';
import TestimonialChip from '~/components/testimonials/TestimonialChip.vue';
import MarkTestimonialDrawer from '~/components/testimonials/MarkTestimonialDrawer.vue';
import VoidTestimonialModal from '~/components/testimonials/VoidTestimonialModal.vue';
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

const testimonialSends = ref<any[]>([]);
const showMarkTestimonial = ref(false);
const showVoidModal = ref(false);
const selectedSendForVoid = ref<any>(null);
const showEditModal = ref(false);
const selectedSendForEdit = ref<any>(null);
const editSentAt = ref('');
const editNote = ref('');
const isSavingEdit = ref(false);

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

const fetchTestimonialsHistory = async () => {
  if (!route.params.id) return;
  try {
    const headers: Record<string, string> = {};
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;
    const res = await fetch(`${apiBase}/leads/${route.params.id}/testimonials-sent`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      testimonialSends.value = data.sends || [];
    }
  } catch (err) {
    console.error('Failed to load testimonials history', err);
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

const formatChannel = (ch: string) => {
  switch (ch) {
    case 'whatsapp': return 'WhatsApp';
    case 'sms': return 'SMS';
    case 'email': return 'Email';
    case 'call_readout': return 'Call Readout';
    case 'other': return 'Other';
    default: return ch;
  }
};

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'video': return '🎥';
    case 'pdf': return '📄';
    case 'image': return '🖼️';
    default: return '📝';
  }
};

const canEditSend = (send: any) => {
  if (send.voidedAt) return false;
  if (!send.sentBy || send.sentBy !== authStore.user?.id) return false;
  const sentDate = new Date(send.sentAt);
  const today = new Date();
  return (
    sentDate.getFullYear() === today.getFullYear() &&
    sentDate.getMonth() === today.getMonth() &&
    sentDate.getDate() === today.getDate()
  );
};

const openEditSend = (send: any) => {
  selectedSendForEdit.value = send;
  const d = new Date(send.sentAt);
  const tzOffset = d.getTimezoneOffset() * 60000;
  editSentAt.value = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  editNote.value = send.note || '';
  showEditModal.value = true;
};

const submitEditSend = async () => {
  if (!selectedSendForEdit.value || !lead.value) return;
  isSavingEdit.value = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) headers['authorization'] = `Bearer ${authStore.token}`;
    const res = await fetch(`${apiBase}/leads/${lead.value.id}/testimonials-sent/${selectedSendForEdit.value.id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        note: editNote.value.trim() || undefined,
        sent_at: editSentAt.value ? new Date(editSentAt.value).toISOString() : undefined,
      }),
    });
    if (res.ok) {
      showEditModal.value = false;
      await Promise.all([fetchLead(), fetchTestimonialsHistory()]);
    }
  } catch (err) {
    console.error('Failed to update testimonial send', err);
  } finally {
    isSavingEdit.value = false;
  }
};

const openVoidSend = (send: any) => {
  selectedSendForVoid.value = send;
  showVoidModal.value = true;
};

const onTestimonialSent = async () => {
  await Promise.all([fetchLead(), fetchTestimonialsHistory()]);
};

const onTestimonialVoided = async () => {
  await Promise.all([fetchLead(), fetchTestimonialsHistory()]);
};

onMounted(() => {
  fetchLead();
  fetchLostReasons();
  fetchTestimonialsHistory();
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

const submitConvert = async () => {
  if (!lead.value) return;
  isSubmittingConvert.value = true;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authStore.token) {
      headers['authorization'] = `Bearer ${authStore.token}`;
    }

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
