<template>
  <div class="space-y-6">
    <!-- Top Back Navigation -->
    <div class="flex items-center justify-between">
      <NuxtLink
        to="/cases"
        class="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors gap-1 min-h-[44px]"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        <span>{{ t('cases.title') }}</span>
      </NuxtLink>

      <div class="flex items-center space-x-2">
        <UButton
          @click="showLogCall = true"
          color="teal"
          icon="i-heroicons-phone"
          class="min-h-[44px]"
        >
          {{ t('common.log_call') }}
        </UButton>

        <UButton
          v-if="canRecordOutcome"
          @click="showOutcomeModal = true"
          color="primary"
          variant="solid"
          icon="i-heroicons-clipboard-document-check"
          class="min-h-[44px]"
        >
          {{ t('cases.record_outcome') }}
        </UButton>

        <UButton
          v-if="caseData && caseData.stage !== 'completed' && caseData.stage !== 'not_started'"
          @click="openAdvanceModal"
          color="purple"
          variant="solid"
          icon="i-heroicons-arrow-trending-up"
          class="min-h-[44px]"
        >
          {{ t('admission.advance_stage') }}
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <div v-else-if="caseData" class="space-y-6">
      <!-- Patient & Case Header Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-start space-x-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-teal-500/20 flex-shrink-0">
              {{ caseData.patient?.name ? caseData.patient.name.charAt(0).toUpperCase() : 'P' }}
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {{ caseData.patient?.name }}
                </h1>
                <span class="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300">
                  {{ caseData.patient?.patientCode }}
                </span>
                <span
                  :class="[
                    'text-xs font-bold px-3 py-1 rounded-full',
                    getStageBadgeClass(caseData.stage)
                  ]"
                >
                  {{ formatStage(caseData.stage) }}
                </span>
                <span
                  v-if="caseData.advisedAdmission"
                  class="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                  {{ t('cases.advised_admission') }}
                </span>
              </div>

              <!-- Sub details -->
              <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-phone" class="w-4 h-4 text-slate-400" />
                  <a :href="`tel:${caseData.patient?.mobileNorm}`" class="hover:underline font-semibold text-slate-700 dark:text-slate-300">
                    {{ caseData.patient?.mobileNorm }}
                  </a>
                </span>
                <span>•</span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-slate-400" />
                  {{ caseData.branch?.name }}
                </span>
                <span>•</span>
                <span class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-user" class="w-4 h-4 text-slate-400" />
                  Treating: {{ caseData.treatingDoctor ? `Dr. ${caseData.treatingDoctor.name}` : 'Not assigned' }}
                </span>
                <span v-if="caseData.owner">•</span>
                <span v-if="caseData.owner" class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-slate-400" />
                  Desk Owner: {{ caseData.owner.name }} ({{ caseData.team }})
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center space-x-2">
            <a
              :href="`tel:${caseData.patient?.mobileNorm}`"
              class="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <UIcon name="i-heroicons-phone" class="w-4 h-4" />
              <span>{{ t('common.call') }}</span>
            </a>
            <a
              :href="`https://wa.me/${caseData.patient?.mobileNorm?.replace(/[^0-9]/g, '')}`"
              target="_blank"
              class="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-bold flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <UIcon name="i-heroicons-chat-bubble-left-right" class="w-4 h-4" />
              <span>{{ t('common.whatsapp') }}</span>
            </a>
          </div>
        </div>

        <!-- Stage Stepper -->
        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto">
          <div class="flex items-center justify-between min-w-[650px] relative">
            <div
              v-for="(stg, idx) in stagesList"
              :key="stg.key"
              class="flex flex-col items-center relative z-10"
            >
              <div
                :class="[
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm',
                  getStepClass(stg.key)
                ]"
              >
                <UIcon
                  v-if="isStepCompleted(stg.key)"
                  name="i-heroicons-check"
                  class="w-5 h-5 text-white"
                />
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                :class="[
                  'text-xs font-semibold mt-2 whitespace-nowrap',
                  caseData.stage === stg.key
                    ? 'text-teal-600 dark:text-teal-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                ]"
              >
                {{ stg.label }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Consultation Outcome Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5" />
            </div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
              {{ t('cases.consultation_outcome') }}
            </h2>
          </div>

          <UButton
            v-if="canRecordOutcome"
            @click="showOutcomeModal = true"
            color="teal"
            variant="ghost"
            size="sm"
            icon="i-heroicons-pencil-square"
          >
            Edit Outcome
          </UButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.care_type') }}
            </p>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize">
              {{ formatCareType(caseData.careType) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.treating_doctor') }}
            </p>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
              {{ caseData.treatingDoctor ? `Dr. ${caseData.treatingDoctor.name}` : 'Not assigned' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.advised_admission') }}
            </p>
            <p class="text-sm font-bold mt-1" :class="caseData.advisedAdmission ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'">
              {{ caseData.advisedAdmission ? 'Yes (In-Patient)' : 'No' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.estimated_amount') }}
            </p>
            <p class="text-sm font-bold text-teal-600 dark:text-teal-400 mt-1">
              {{ caseData.estimatedAmount ? `₹${Number(caseData.estimatedAmount).toLocaleString('en-IN')}` : 'Not shared' }}
            </p>
          </div>
        </div>

        <div v-if="caseData.consultationCompletedAt" class="mt-3 text-xs text-slate-400">
          Recorded on {{ new Date(caseData.consultationCompletedAt).toLocaleString() }}
        </div>
      </div>

      <!-- Main Columns: Activity Timeline & Tasks -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Open Tasks Column -->
        <div class="lg:col-span-1 space-y-4">
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span>{{ t('tasks.title') }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold">
                {{ openTasks.length }} Open
              </span>
            </h2>

            <div v-if="openTasks.length === 0" class="text-center py-8 text-slate-400 text-sm">
              {{ t('tasks.no_tasks') }}
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="task in openTasks"
                :key="task.id"
                class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                    {{ task.type }}
                  </span>
                  <span class="text-xs font-semibold text-slate-500">
                    {{ new Date(task.dueAt).toLocaleDateString() }}
                  </span>
                </div>
                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {{ task.title }}
                </p>
                <div class="text-xs text-slate-400">
                  Assigned to: {{ task.owner?.name || 'Unassigned' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Timeline Column -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Activity Timeline
            </h2>

            <div v-if="!caseData.interactions || caseData.interactions.length === 0" class="text-center py-8 text-slate-400 text-sm">
              No activity logged yet.
            </div>

            <div v-else class="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              <div
                v-for="item in caseData.interactions"
                :key="item.id"
                class="relative group"
              >
                <!-- Dot Icon -->
                <div class="absolute -left-[27px] top-1 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-teal-500 flex items-center justify-center">
                  <div class="w-2 h-2 rounded-full bg-teal-500"></div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {{ item.type }}
                    </span>
                    <span class="text-xs text-slate-400">
                      {{ new Date(item.occurredAt).toLocaleString() }}
                    </span>
                  </div>

                  <p class="text-sm text-slate-800 dark:text-slate-200 mt-1 font-medium">
                    {{ item.note }}
                  </p>

                  <div class="text-xs text-slate-400 mt-2 flex items-center gap-2">
                    <span>Logged by: {{ item.user?.name || 'System' }}</span>
                    <span v-if="item.outcome">• Outcome: {{ item.outcome.labelEn }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Consultation Outcome Modal -->
    <UModal v-model="showOutcomeModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
            {{ t('cases.record_outcome') }}
          </h3>
          <button @click="showOutcomeModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitOutcome" class="space-y-4">
          <!-- Care Type -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('cases.care_type') }} *
            </label>
            <select
              v-model="outcomeForm.careType"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="consultation_only">{{ t('cases.consultation_only') }}</option>
              <option value="opd_course">{{ t('cases.opd_course') }}</option>
              <option value="in_patient">{{ t('cases.in_patient') }}</option>
              <option value="procedure">{{ t('cases.procedure') }}</option>
            </select>
          </div>

          <!-- Alert for In-Patient Selection -->
          <div
            v-if="outcomeForm.careType === 'in_patient'"
            class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1"
          >
            <p class="font-bold flex items-center gap-1.5">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
              Admission Desk Cadence Trigger
            </p>
            <p>
              Saving as <strong>In-Patient Admission</strong> will set <code>advised_admission = true</code>, move stage to <strong>Plan Given</strong>, route to Admission Desk, and schedule the first follow-up task within <strong>24 hours</strong>.
            </p>
          </div>

          <!-- Estimated Amount -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('cases.estimated_amount') }}
            </label>
            <input
              v-model.number="outcomeForm.estimatedAmount"
              type="number"
              min="0"
              placeholder="e.g. 45000"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>

          <!-- Clinical / Plan Notes -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('cases.plan_notes') }}
            </label>
            <textarea
              v-model="outcomeForm.planNote"
              rows="3"
              placeholder="Details of medical advice, procedures or medicines prescribed..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-3">
            <UButton
              type="button"
              @click="showOutcomeModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              type="submit"
              :loading="submittingOutcome"
              color="teal"
              class="min-h-[44px]"
            >
              {{ t('common.save') }}
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Advance Stage Modal -->
    <UModal v-model="showAdvanceModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
            {{ t('admission.advance_stage') }}
          </h3>
          <button @click="showAdvanceModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitAdvanceStage" class="space-y-4">
          <!-- Next Stage Selection -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Select Next Stage *
            </label>
            <select
              v-model="advanceForm.stage"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500 min-h-[44px]"
            >
              <option value="counseling_estimate">{{ t('cases.stages.counseling_estimate') }}</option>
              <option value="plan_accepted">{{ t('cases.stages.plan_accepted') }} (Deposit Paid)</option>
              <option value="in_treatment">{{ t('cases.stages.in_treatment') }} (Admitted)</option>
              <option value="not_started">{{ t('cases.stages.not_started') }} (Declined)</option>
            </select>
          </div>

          <!-- Counseling / Estimate fields -->
          <div v-if="advanceForm.stage === 'counseling_estimate'" class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Estimated Treatment Amount (₹)
              </label>
              <input
                v-model.number="advanceForm.estimatedAmount"
                type="number"
                min="0"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <!-- Plan Accepted fields -->
          <div v-if="advanceForm.stage === 'plan_accepted'" class="space-y-3">
            <div class="flex items-center space-x-2">
              <input
                id="depRecDetail"
                v-model="advanceForm.depositReceived"
                type="checkbox"
                class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label for="depRecDetail" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Deposit Received (50% Advance)
              </label>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Deposit Amount (₹)
              </label>
              <input
                v-model.number="advanceForm.depositAmount"
                type="number"
                min="0"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Expected Admission Date
              </label>
              <input
                v-model="advanceForm.expectedAdmissionDate"
                type="date"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <!-- In-Treatment (Deposit Gate / Emergency Override) -->
          <div v-if="advanceForm.stage === 'in_treatment'" class="space-y-3">
            <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <p class="font-bold flex items-center gap-1">
                <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-amber-600" />
                Admission Deposit Gate
              </p>
              <p class="mt-1">
                In-patient admission requires advance deposit received or an emergency override with medical reason.
              </p>
            </div>

            <div class="flex items-center space-x-2">
              <input
                id="admitDepDetail"
                v-model="advanceForm.depositReceived"
                type="checkbox"
                class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label for="admitDepDetail" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                Advance Deposit Confirmed Received
              </label>
            </div>

            <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div class="flex items-center space-x-2">
                <input
                  id="emgAdmDetail"
                  v-model="advanceForm.emergencyAdmission"
                  type="checkbox"
                  class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <label for="emgAdmDetail" class="text-xs font-bold text-rose-600 dark:text-rose-400">
                  🚨 Emergency Admission Override (Waive Deposit Gate)
                </label>
              </div>

              <div v-if="advanceForm.emergencyAdmission" class="mt-2">
                <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Emergency Justification Reason *
                </label>
                <textarea
                  v-model="advanceForm.emergencyReason"
                  rows="2"
                  required
                  placeholder="e.g. Acute trauma / MD approved waiver"
                  class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Declined (Not Started) -->
          <div v-if="advanceForm.stage === 'not_started'" class="space-y-3">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
                Decline Reason *
              </label>
              <select
                v-model="advanceForm.notStartedReasonId"
                required
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              >
                <option :value="null" disabled>Select Reason</option>
                <option v-for="dr in declineReasons" :key="dr.id" :value="dr.id">
                  {{ dr.labelEn }} ({{ dr.labelMl }})
                </option>
              </select>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Transition Note (Optional)
            </label>
            <input
              v-model="advanceForm.note"
              type="text"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
            />
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3">
            <UButton
              type="button"
              @click="showAdvanceModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingAdvance"
              color="purple"
              class="min-h-[44px]"
            >
              Update Stage
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Log Call Slide-over Drawer -->
    <InteractionLogCallDrawer
      :is-open="showLogCall"
      :case-id="caseData?.id"
      :recipient-name="caseData?.patient?.name"
      :recipient-phone="caseData?.patient?.mobileNorm"
      @close="showLogCall = false"
      @call-logged="handleCallLogged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();

const caseId = route.params.id as string;
const caseData = ref<any>(null);
const loading = ref(true);

const showLogCall = ref(false);
const showOutcomeModal = ref(false);
const submittingOutcome = ref(false);

const showAdvanceModal = ref(false);
const submittingAdvance = ref(false);
const declineReasons = ref<any[]>([]);

const advanceForm = ref({
  stage: 'counseling_estimate',
  estimatedAmount: null as number | null,
  depositReceived: false,
  depositAmount: null as number | null,
  expectedAdmissionDate: '',
  emergencyAdmission: false,
  emergencyReason: '',
  notStartedReasonId: null as string | null,
  note: '',
});

const outcomeForm = ref({
  careType: 'consultation_only' as 'consultation_only' | 'opd_course' | 'in_patient' | 'procedure',
  estimatedAmount: null as number | null,
  planNote: '',
});

const canRecordOutcome = computed(() => {
  const role = authStore.user?.role?.code;
  return (
    role === 'doctor' ||
    role === 'owner' ||
    role === 'telecaller_manager' ||
    role === 'center_head' ||
    role === 'admission_specialist'
  );
});

const openTasks = computed(() => {
  return (caseData.value?.tasks || []).filter((t: any) => t.status === 'open');
});

const stagesList = computed(() => [
  { key: 'visited', label: t('cases.stages.visited') },
  { key: 'plan_given', label: t('cases.stages.plan_given') },
  { key: 'counseling_estimate', label: t('cases.stages.counseling_estimate') },
  { key: 'plan_accepted', label: t('cases.stages.plan_accepted') },
  { key: 'in_treatment', label: t('cases.stages.in_treatment') },
  { key: 'aftercare_follow_up', label: t('cases.stages.aftercare_follow_up') },
  { key: 'completed', label: t('cases.stages.completed') },
]);

function getStepOrder(stage: string): number {
  const map: Record<string, number> = {
    visited: 1,
    plan_given: 2,
    counseling_estimate: 3,
    plan_accepted: 4,
    in_treatment: 5,
    aftercare_follow_up: 6,
    completed: 7,
  };
  return map[stage] || 0;
}

function isStepCompleted(stageKey: string): boolean {
  if (!caseData.value) return false;
  return getStepOrder(caseData.value.stage) > getStepOrder(stageKey);
}

function getStepClass(stageKey: string): string {
  if (!caseData.value) return 'bg-slate-200 text-slate-600';
  const currentOrder = getStepOrder(caseData.value.stage);
  const thisOrder = getStepOrder(stageKey);

  if (thisOrder < currentOrder) {
    return 'bg-emerald-500 text-white';
  } else if (thisOrder === currentOrder) {
    return 'bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-950';
  } else {
    return 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700';
  }
}

function getStageBadgeClass(stage: string) {
  switch (stage) {
    case 'visited':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
    case 'plan_given':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
    case 'counseling_estimate':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    case 'plan_accepted':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'in_treatment':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'aftercare_follow_up':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300';
    case 'completed':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  }
}

function formatStage(stage: string) {
  return t(`cases.stages.${stage}`, stage);
}

function formatCareType(careType: string) {
  return t(`cases.${careType}`, careType);
}

function openAdvanceModal() {
  if (!caseData.value) return;
  const cur = caseData.value.stage;
  let nextStage = 'counseling_estimate';
  if (cur === 'plan_given') nextStage = 'counseling_estimate';
  else if (cur === 'counseling_estimate') nextStage = 'plan_accepted';
  else if (cur === 'plan_accepted') nextStage = 'in_treatment';
  else nextStage = cur;

  advanceForm.value = {
    stage: nextStage,
    estimatedAmount: caseData.value.estimatedAmount ? Number(caseData.value.estimatedAmount) : null,
    depositReceived: !!caseData.value.depositReceived,
    depositAmount: caseData.value.depositAmount ? Number(caseData.value.depositAmount) : null,
    expectedAdmissionDate: caseData.value.expectedAdmissionDate ? new Date(caseData.value.expectedAdmissionDate).toISOString().split('T')[0] : '',
    emergencyAdmission: !!caseData.value.emergencyAdmission,
    emergencyReason: caseData.value.emergencyReason || '',
    notStartedReasonId: caseData.value.notStartedReasonId || null,
    note: '',
  };
  showAdvanceModal.value = true;
}

async function fetchDeclineReasons() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/picklists/decline_reasons`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    declineReasons.value = res.data || res || [];
  } catch (err) {
    console.error('Failed to fetch decline reasons:', err);
  }
}

async function submitAdvanceStage() {
  submittingAdvance.value = true;
  try {
    const payload: any = {
      stage: advanceForm.value.stage,
      note: advanceForm.value.note || undefined,
    };

    if (advanceForm.value.stage === 'counseling_estimate') {
      if (advanceForm.value.estimatedAmount !== null) {
        payload.estimatedAmount = advanceForm.value.estimatedAmount;
      }
    } else if (advanceForm.value.stage === 'plan_accepted') {
      payload.depositReceived = advanceForm.value.depositReceived;
      if (advanceForm.value.depositAmount !== null) {
        payload.depositAmount = advanceForm.value.depositAmount;
      }
      if (advanceForm.value.expectedAdmissionDate) {
        payload.expectedAdmissionDate = new Date(advanceForm.value.expectedAdmissionDate).toISOString();
      }
    } else if (advanceForm.value.stage === 'in_treatment') {
      payload.depositReceived = advanceForm.value.depositReceived;
      payload.emergencyAdmission = advanceForm.value.emergencyAdmission;
      if (advanceForm.value.emergencyAdmission) {
        payload.emergencyReason = advanceForm.value.emergencyReason;
      }
    } else if (advanceForm.value.stage === 'not_started') {
      payload.notStartedReasonId = advanceForm.value.notStartedReasonId;
    }

    await $fetch(`${config.public.apiBase}/cases/${caseId}/advance-stage`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showAdvanceModal.value = false;
    await fetchCaseDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to advance case stage');
  } finally {
    submittingAdvance.value = false;
  }
}

async function fetchCaseDetails() {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/cases/${caseId}`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    caseData.value = res;
    if (res) {
      outcomeForm.value.careType = res.careType || 'consultation_only';
      outcomeForm.value.estimatedAmount = res.estimatedAmount ? Number(res.estimatedAmount) : null;
    }
  } catch (err) {
    console.error('Failed to fetch case:', err);
  } finally {
    loading.value = false;
  }
}

async function submitOutcome() {
  submittingOutcome.value = true;
  try {
    const payload = {
      careType: outcomeForm.value.careType,
      departmentId: caseData.value.departmentId,
      estimatedAmount: outcomeForm.value.estimatedAmount,
      planNote: outcomeForm.value.planNote,
    };

    await $fetch(`${config.public.apiBase}/cases/${caseId}/consultation-outcome`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showOutcomeModal.value = false;
    await fetchCaseDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to record consultation outcome');
  } finally {
    submittingOutcome.value = false;
  }
}

function handleCallLogged() {
  showLogCall.value = false;
  fetchCaseDetails();
}

onMounted(() => {
  fetchCaseDetails();
  fetchDeclineReasons();
});
</script>
