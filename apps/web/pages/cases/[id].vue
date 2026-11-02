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
          v-if="caseData?.stage === 'aftercare_follow_up'"
          @click="openAftercareCallModal"
          color="emerald"
          variant="solid"
          icon="i-heroicons-clipboard-document-check"
          class="min-h-[44px]"
        >
          {{ t('aftercare.log_aftercare_call') }}
        </UButton>

        <UButton
          v-else
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
          v-if="caseData && caseData.stage !== 'completed' && caseData.stage !== 'aftercare_follow_up' && caseData.stage !== 'not_started'"
          @click="openAdvanceModal"
          color="primary"
          variant="solid"
          icon="i-heroicons-arrow-trending-up"
          class="min-h-[44px]"
        >
          {{ t('admission.advance_stage') }}
        </UButton>

        <UButton
          v-if="canMarkTreatmentCompleted"
          @click="openTreatmentModal"
          color="emerald"
          variant="solid"
          icon="i-heroicons-check-circle"
          class="min-h-[44px]"
        >
          {{ t('aftercare.mark_treatment_completed') }}
        </UButton>

        <UButton
          v-if="canCloseCase"
          @click="openCloseModal"
          color="gray"
          variant="soft"
          icon="i-heroicons-archive-box-x-mark"
          class="min-h-[44px]"
        >
          {{ t('aftercare.close_case') }}
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
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white flex items-center justify-center font-semibold text-2xl shadow-lg shadow-teal-500/20 flex-shrink-0">
              {{ caseData.patient?.name ? caseData.patient.name.charAt(0).toUpperCase() : 'P' }}
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {{ caseData.patient?.name }}
                </h1>
                <span class="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                  {{ caseData.patient?.patientCode }}
                </span>
                <span
                  :class="[
                    'text-xs font-semibold px-3 py-1 rounded-full',
                    getStageBadgeClass(caseData.stage)
                  ]"
                >
                  {{ formatStage(caseData.stage) }}
                </span>
                <span
                  v-if="caseData.advisedAdmission"
                  class="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 flex items-center gap-1"
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
              class="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <UIcon name="i-heroicons-phone" class="w-4 h-4" />
              <span>{{ t('common.call') }}</span>
            </a>
            <a
              :href="`https://wa.me/${caseData.patient?.mobileNorm?.replace(/[^0-9]/g, '')}`"
              target="_blank"
              class="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-semibold flex items-center gap-2 min-h-[44px] transition-colors"
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
                  'w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all shadow-sm',
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
                    ? 'text-teal-600 dark:text-teal-400 font-semibold'
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
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">
              {{ formatCareType(caseData.careType) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.treating_doctor') }}
            </p>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {{ caseData.treatingDoctor ? `Dr. ${caseData.treatingDoctor.name}` : 'Not assigned' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.advised_admission') }}
            </p>
            <p class="text-sm font-semibold mt-1" :class="caseData.advisedAdmission ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'">
              {{ caseData.advisedAdmission ? 'Yes (In-Patient)' : 'No' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {{ t('cases.estimated_amount') }}
            </p>
            <p class="text-sm font-semibold text-teal-600 dark:text-teal-400 mt-1">
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
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
              <span>{{ t('tasks.title') }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-semibold">
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
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 uppercase">
                    {{ task.type }}
                  </span>
                  <span class="text-xs font-semibold text-slate-500">
                    {{ new Date(task.dueAt).toLocaleDateString() }}
                  </span>
                </div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
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
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
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
                    <span class="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
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
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('cases.record_outcome') }}
          </h3>
          <button @click="showOutcomeModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitOutcome" class="space-y-4">
          <!-- Care Type -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
            <p class="font-semibold flex items-center gap-1.5">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
              Admission Desk Cadence Trigger
            </p>
            <p>
              Saving as <strong>In-Patient Admission</strong> will set <code>advised_admission = true</code>, move stage to <strong>Plan Given</strong>, route to Admission Desk, and schedule the first follow-up task within <strong>24 hours</strong>.
            </p>
          </div>

          <!-- Estimated Amount -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('admission.advance_stage') }}
          </h3>
          <button @click="showAdvanceModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitAdvanceStage" class="space-y-4">
          <!-- Next Stage Selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Select Next Stage *
            </label>
            <select
              v-model="advanceForm.stage"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-teal-500 min-h-[44px]"
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
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
                class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="depRecDetail" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Deposit Received (50% Advance)
              </label>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
              <p class="font-semibold flex items-center gap-1">
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
                class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="admitDepDetail" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                <label for="emgAdmDetail" class="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  🚨 Emergency Admission Override (Waive Deposit Gate)
                </label>
              </div>

              <div v-if="advanceForm.emergencyAdmission" class="mt-2">
                <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Decline Reason *
              </label>
              <select
                v-model="advanceForm.notStartedReasonId"
                required
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
              >
                <option :value="null" disabled>Select Reason</option>
                <option v-for="dr in declineReasons" :key="dr.id" :value="dr.id">
                  {{ dr.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
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
              color="primary"
              class="min-h-[44px]"
            >
              Update Stage
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Mark Treatment Completed Modal -->
    <UModal v-model="showTreatmentModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('aftercare.mark_treatment_completed') }}
          </h3>
          <button @click="showTreatmentModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitTreatmentCompleted" class="space-y-4">
          <div class="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 space-y-1">
            <p class="font-semibold flex items-center gap-1.5">
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-teal-600" />
              Aftercare Desk Routing & Follow-up Cadence
            </p>
            <p v-if="caseData?.careType === 'in_patient'">
              Marking treatment completed for In-Patient care requires a <strong>Discharge Date</strong>. The case will automatically transition to <strong>Aftercare Follow-Up</strong>, round-robin assign to an aftercare executive, and schedule cadence calls on <strong>Day 2, Day 7, Day 30, and Day 90</strong> post-discharge.
            </p>
            <p v-else>
              Marking treatment completed will transition this case to <strong>Aftercare Follow-Up</strong>, round-robin assign to an aftercare executive, and schedule OPD cadence calls on <strong>Day 7, Day 30, and Day 90</strong>.
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Treatment Completed Date & Time *
            </label>
            <input
              v-model="treatmentForm.treatmentCompletedAt"
              type="datetime-local"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>

          <div v-if="caseData?.careType === 'in_patient'">
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Discharge Date * <span class="text-rose-500 font-semibold">(Required for In-Patient)</span>
            </label>
            <input
              v-model="treatmentForm.dischargeDate"
              type="date"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Completion & Discharge Summary Notes
            </label>
            <textarea
              v-model="treatmentForm.notes"
              rows="3"
              placeholder="Post-discharge instructions, medical summary, review timeline..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <UButton
              type="button"
              @click="showTreatmentModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingTreatment"
              color="emerald"
              class="min-h-[44px]"
            >
              Confirm Treatment Completed
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Close Case Modal -->
    <UModal v-model="showCloseModal">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('aftercare.close_case') }}
          </h3>
          <button @click="showCloseModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitCloseCase" class="space-y-4">
          <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
            Closing this case marks the stage as <strong>Completed</strong> and cancels any remaining scheduled tasks.
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              {{ t('aftercare.closure_code') }} *
            </label>
            <select
              v-model="closeForm.closureCodeId"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500 min-h-[44px]"
            >
              <option value="" disabled>Select Closure Code</option>
              <option v-for="c in closureCodes" :key="c.id" :value="c.id">
                {{ c.labelEn }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Closure Note (Optional)
            </label>
            <textarea
              v-model="closeForm.note"
              rows="3"
              placeholder="Final patient condition, recovery assessment or summary..."
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <UButton
              type="button"
              @click="showCloseModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingClose"
              color="rose"
              class="min-h-[44px]"
            >
              Close Case
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Log Aftercare Call Modal -->
    <UModal v-model="showAftercareCallModal" :ui="{ width: 'sm:max-w-xl' }">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {{ t('aftercare.log_aftercare_call') }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ caseData?.patient?.name }} ({{ caseData?.patient?.mobileNorm }})
            </p>
          </div>
          <button @click="showAftercareCallModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitAftercareCall" class="space-y-4">
          <!-- 1. General Condition -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              {{ t('aftercare.general_condition') }} *
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="aftercareForm.generalCondition = 'better'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.generalCondition === 'better'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                😊 {{ t('aftercare.better') }}
              </button>

              <button
                type="button"
                @click="aftercareForm.generalCondition = 'same'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.generalCondition === 'same'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                😐 {{ t('aftercare.same') }}
              </button>

              <button
                type="button"
                @click="aftercareForm.generalCondition = 'worse'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.generalCondition === 'worse'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                😟 {{ t('aftercare.worse') }}
              </button>
            </div>
          </div>

          <!-- 2. Medicines Taken -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              {{ t('aftercare.medicines_taken') }} *
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="aftercareForm.medicinesTaken = 'full'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.medicinesTaken === 'full'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                💊 {{ t('aftercare.full') }}
              </button>

              <button
                type="button"
                @click="aftercareForm.medicinesTaken = 'partial'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.medicinesTaken === 'partial'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                ⚠️ {{ t('aftercare.partial') }}
              </button>

              <button
                type="button"
                @click="aftercareForm.medicinesTaken = 'stopped'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all min-h-[44px]',
                  aftercareForm.medicinesTaken === 'stopped'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                🛑 {{ t('aftercare.stopped') }}
              </button>
            </div>
          </div>

          <!-- 3. Complications -->
          <div class="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {{ t('aftercare.complications') }}
              </p>
              <p class="text-[11px] text-slate-400">
                Any fever, acute pain, bleeding, or wound issues
              </p>
            </div>
            <input
              v-model="aftercareForm.complications"
              type="checkbox"
              class="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
            />
          </div>

          <!-- 4. Escalate to Doctor (Red Flag) -->
          <div
            :class="[
              'p-4 rounded-2xl border transition-all space-y-3',
              aftercareForm.escalateToDoctor || aftercareForm.generalCondition === 'worse' || aftercareForm.complications
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            ]"
          >
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
                  {{ t('aftercare.escalate_to_doctor') }}
                </span>
                <p class="text-[11px] text-rose-600 dark:text-rose-300">
                  Creates an urgent clinical escalation for duty doctor with 1-hour SLA
                </p>
              </div>
              <input
                v-model="aftercareForm.escalateToDoctor"
                type="checkbox"
                class="w-5 h-5 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>

            <div v-if="aftercareForm.escalateToDoctor || aftercareForm.generalCondition === 'worse' || aftercareForm.complications">
              <label class="block text-xs font-semibold uppercase text-rose-700 dark:text-rose-400 mb-1">
                {{ t('aftercare.escalation_reason') }} *
              </label>
              <textarea
                v-model="aftercareForm.escalationReason"
                rows="2"
                required
                placeholder="Describe red flag symptoms, vitals, or clinical complications..."
                class="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs focus:ring-2 focus:ring-rose-500"
              ></textarea>
            </div>
          </div>

          <!-- 5. Feedback Score (1-10) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold uppercase text-slate-500">
                {{ t('aftercare.feedback_score') }} (1 to 10)
              </label>
              <span class="text-xs font-semibold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {{ aftercareForm.feedbackScore }} / 10
              </span>
            </div>
            <div class="grid grid-cols-10 gap-1">
              <button
                v-for="num in 10"
                :key="num"
                type="button"
                @click="aftercareForm.feedbackScore = num"
                :class="[
                  'py-2 rounded-lg text-xs font-semibold transition-all min-h-[38px]',
                  aftercareForm.feedbackScore === num
                    ? num <= 6
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                ]"
              >
                {{ num }}
              </button>
            </div>
            <p v-if="aftercareForm.feedbackScore <= 6" class="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
              <UIcon name="i-heroicons-bell-alert" class="w-3.5 h-3.5" />
              Score ≤ 6 automatically creates a 24-hour callback task for Telecaller Manager.
            </p>
          </div>

          <!-- 6. Review Visit Booked -->
          <div class="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {{ t('aftercare.review_visit_booked') }}
                </p>
                <p class="text-[11px] text-slate-400">
                  Patient scheduled for OPD review with doctor
                </p>
              </div>
              <input
                v-model="aftercareForm.reviewVisitBooked"
                type="checkbox"
                class="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div v-if="aftercareForm.reviewVisitBooked" class="pt-2">
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {{ t('aftercare.review_date') }} *
              </label>
              <input
                v-model="aftercareForm.reviewDate"
                type="date"
                required
                class="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
              />
            </div>
          </div>

          <!-- 7. Close Case Checkbox -->
          <div class="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Close Case Now
                </p>
                <p class="text-[11px] text-slate-400">
                  Patient has fully recovered or completed aftercare cycle
                </p>
              </div>
              <input
                v-model="aftercareForm.closeCase"
                type="checkbox"
                class="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
              />
            </div>

            <div v-if="aftercareForm.closeCase" class="pt-2">
              <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Closure Code *
              </label>
              <select
                v-model="aftercareForm.closureCodeId"
                required
                class="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
              >
                <option value="" disabled>Select Closure Code</option>
                <option v-for="c in closureCodes" :key="c.id" :value="c.id">
                  {{ c.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              {{ t('common.notes') }}
            </label>
            <textarea
              v-model="aftercareForm.notes"
              rows="2"
              placeholder="Summary of conversation, recovery feedback, diet notes..."
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <UButton
              type="button"
              @click="showAftercareCallModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingAftercareCall"
              color="emerald"
              class="min-h-[44px]"
            >
              Save Aftercare Interaction
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

const showTreatmentModal = ref(false);
const submittingTreatment = ref(false);
const treatmentForm = ref({
  treatmentCompletedAt: '',
  dischargeDate: '',
  notes: '',
});

const showCloseModal = ref(false);
const submittingClose = ref(false);
const closeForm = ref({
  closureCodeId: '',
  note: '',
});
const closureCodes = ref<any[]>([]);

const showAftercareCallModal = ref(false);
const submittingAftercareCall = ref(false);
const aftercareForm = ref({
  generalCondition: 'better' as 'better' | 'same' | 'worse',
  medicinesTaken: 'full' as 'full' | 'partial' | 'stopped',
  complications: false,
  escalateToDoctor: false,
  escalationReason: '',
  feedbackScore: 9,
  reviewVisitBooked: false,
  reviewDate: '',
  closeCase: false,
  closureCodeId: '',
  notes: '',
});

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

const canMarkTreatmentCompleted = computed(() => {
  if (!caseData.value) return false;
  const stage = caseData.value.stage;
  return stage === 'in_treatment' || stage === 'plan_accepted' || stage === 'plan_given';
});

const canCloseCase = computed(() => {
  if (!caseData.value) return false;
  return caseData.value.stage !== 'completed' && caseData.value.stage !== 'not_started';
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
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'counseling_estimate':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    case 'plan_accepted':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case 'in_treatment':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
    case 'aftercare_follow_up':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300';
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

function openTreatmentModal() {
  if (!caseData.value) return;
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const nowLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  treatmentForm.value = {
    treatmentCompletedAt: nowLocal,
    dischargeDate: new Date().toISOString().split('T')[0],
    notes: '',
  };
  showTreatmentModal.value = true;
}

async function submitTreatmentCompleted() {
  submittingTreatment.value = true;
  try {
    const payload: any = {
      treatmentCompletedAt: new Date(treatmentForm.value.treatmentCompletedAt).toISOString(),
      dischargeDate: treatmentForm.value.dischargeDate ? new Date(treatmentForm.value.dischargeDate).toISOString() : undefined,
      notes: treatmentForm.value.notes || undefined,
    };

    await $fetch(`${config.public.apiBase}/cases/${caseId}/treatment-completed`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showTreatmentModal.value = false;
    await fetchCaseDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to mark treatment completed');
  } finally {
    submittingTreatment.value = false;
  }
}

function openCloseModal() {
  closeForm.value = {
    closureCodeId: closureCodes.value[0]?.id || '',
    note: '',
  };
  showCloseModal.value = true;
}

async function submitCloseCase() {
  if (!closeForm.value.closureCodeId) return;
  submittingClose.value = true;
  try {
    await $fetch(`${config.public.apiBase}/cases/${caseId}/close`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        closureCodeId: closeForm.value.closureCodeId,
        note: closeForm.value.note || undefined,
      },
    });

    showCloseModal.value = false;
    await fetchCaseDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to close case');
  } finally {
    submittingClose.value = false;
  }
}

function openAftercareCallModal() {
  aftercareForm.value = {
    generalCondition: 'better',
    medicinesTaken: 'full',
    complications: false,
    escalateToDoctor: false,
    escalationReason: '',
    feedbackScore: 9,
    reviewVisitBooked: false,
    reviewDate: '',
    closeCase: false,
    closureCodeId: closureCodes.value[0]?.id || '',
    notes: '',
  };
  showAftercareCallModal.value = true;
}

async function submitAftercareCall() {
  submittingAftercareCall.value = true;
  try {
    const payload: any = {
      caseId: Number(caseId),
      generalCondition: aftercareForm.value.generalCondition,
      medicinesTaken: aftercareForm.value.medicinesTaken,
      complications: aftercareForm.value.complications,
      escalateToDoctor: aftercareForm.value.escalateToDoctor || aftercareForm.value.generalCondition === 'worse' || aftercareForm.value.complications,
      escalationReason: aftercareForm.value.escalationReason || undefined,
      feedbackScore: aftercareForm.value.feedbackScore,
      reviewVisitBooked: aftercareForm.value.reviewVisitBooked,
      reviewDate: aftercareForm.value.reviewDate ? new Date(aftercareForm.value.reviewDate).toISOString() : undefined,
      closeCase: aftercareForm.value.closeCase,
      closureCodeId: aftercareForm.value.closeCase ? aftercareForm.value.closureCodeId : undefined,
      notes: aftercareForm.value.notes || undefined,
    };

    await $fetch(`${config.public.apiBase}/interactions/aftercare-call`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showAftercareCallModal.value = false;
    await fetchCaseDetails();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to log aftercare call');
  } finally {
    submittingAftercareCall.value = false;
  }
}

async function fetchClosureCodes() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/picklists/closure-codes`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    closureCodes.value = res.data || res || [];
  } catch (err) {
    console.error('Failed to fetch closure codes:', err);
  }
}

onMounted(() => {
  fetchCaseDetails();
  fetchDeclineReasons();
  fetchClosureCodes();
});
</script>
