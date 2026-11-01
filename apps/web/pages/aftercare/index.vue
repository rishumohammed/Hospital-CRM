<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-emerald-500/20">
            🌿
          </span>
          <span>{{ t('aftercare.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t('desks.aftercare_desc') }}
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <UButton
          @click="loadAllData"
          color="gray"
          variant="soft"
          icon="i-heroicons-arrow-path"
          class="min-h-[44px]"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Total Cases
        </p>
        <p class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
          {{ report?.totalCases || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Active Follow-ups
        </p>
        <p class="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
          {{ report?.activeCases || 0 }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Call On-Time %
        </p>
        <p class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
          {{ report?.calls?.onTimeRate || 0 }}%
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Meds Adherence
        </p>
        <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
          {{ report?.clinical?.adherenceRate != null ? report.clinical.adherenceRate + '%' : '—' }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Feedback Avg
        </p>
        <p class="text-2xl font-black text-amber-500 dark:text-amber-400 mt-1">
          {{ report?.feedback?.average != null ? report.feedback.average + ' / 10' : '—' }}
        </p>
      </div>

      <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Escalations
        </p>
        <p
          :class="[
            'text-2xl font-black mt-1',
            report?.escalations?.pending > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700 dark:text-slate-300'
          ]"
        >
          {{ report?.escalations?.pending || 0 }} <span class="text-xs font-normal text-slate-400">pending</span>
        </p>
      </div>
    </div>

    <!-- Active Escalations Alert Banner -->
    <div
      v-if="escalations.some((e: any) => e.status === 'pending')"
      class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 space-y-2 shadow-sm"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 font-bold text-sm">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-rose-600 animate-bounce" />
          <span>Pending Clinical Red Flag Escalations Awaiting Doctor Decision (1h SLA)</span>
        </div>
        <button
          @click="activeTab = 'escalations'"
          class="text-xs font-bold px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
        >
          View Escalations
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
      <button
        type="button"
        @click="activeTab = 'all'"
        :class="[
          'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
          activeTab === 'all'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        All Active Cases ({{ cases.length }})
      </button>

      <button
        type="button"
        @click="activeTab = 'escalations'"
        :class="[
          'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px] flex items-center gap-1.5',
          activeTab === 'escalations'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <span>{{ t('aftercare.clinical_escalations') }}</span>
        <span
          v-if="escalations.filter((e: any) => e.status === 'pending').length > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-black"
        >
          {{ escalations.filter((e: any) => e.status === 'pending').length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'completed'"
        :class="[
          'px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
          activeTab === 'completed'
            ? 'bg-slate-800 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        Completed / Closed
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-12 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-emerald-600 animate-spin" />
    </div>

    <!-- Escalations Tab View -->
    <div v-else-if="activeTab === 'escalations'" class="space-y-4">
      <div v-if="escalations.length === 0" class="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
        <p class="text-slate-400 text-sm">No clinical escalations recorded.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="esc in escalations"
          :key="esc.id"
          class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <span
              :class="[
                'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                esc.status === 'pending'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              ]"
            >
              {{ esc.status }}
            </span>
            <span class="text-xs text-slate-400 font-mono">
              Due: {{ new Date(esc.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>

          <div>
            <h4 class="font-bold text-slate-900 dark:text-slate-100">
              <NuxtLink :to="`/cases/${esc.caseId}`" class="hover:text-emerald-600">
                {{ esc.case?.patient?.name }}
              </NuxtLink>
            </h4>
            <p class="text-xs text-slate-500 font-mono">{{ esc.case?.patient?.mobileNorm }} &bull; Case #{{ esc.caseId }}</p>
          </div>

          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200">
            <p class="font-bold">Red Flag Reason:</p>
            <p class="mt-0.5">{{ esc.reason }}</p>
          </div>

          <div v-if="esc.decision" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200">
            <p class="font-bold">Doctor Decision (Dr. {{ esc.decidedUser?.name }}):</p>
            <p class="mt-0.5">{{ esc.decision }}</p>
          </div>

          <div class="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Raised by: {{ esc.raisedUser?.name }}</span>
            <span>{{ new Date(esc.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cases List View -->
    <div v-else class="space-y-4">
      <div v-if="filteredCases.length === 0" class="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
        <p class="text-slate-400 text-sm">No cases found in this view.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="c in filteredCases"
          :key="c.id"
          class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span
                :class="[
                  'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase',
                  c.stage === 'aftercare_follow_up'
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                ]"
              >
                {{ formatStage(c.stage) }}
              </span>

              <span class="text-xs font-mono font-semibold text-slate-400">
                {{ c.patient?.patientCode }}
              </span>
            </div>

            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600">
                <NuxtLink :to="`/cases/${c.id}`">
                  {{ c.patient?.name }}
                </NuxtLink>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                📞 {{ c.patient?.mobileNorm }} &bull; {{ c.careType?.toUpperCase() }}
              </p>
            </div>

            <div class="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p v-if="c.dischargeDate" class="text-slate-600 dark:text-slate-400">
                <strong>Discharged:</strong> {{ new Date(c.dischargeDate).toLocaleDateString() }}
              </p>
              <p v-else-if="c.treatmentCompletedAt" class="text-slate-600 dark:text-slate-400">
                <strong>Completed:</strong> {{ new Date(c.treatmentCompletedAt).toLocaleDateString() }}
              </p>
              <p v-if="c.planNote" class="text-slate-500 line-clamp-1 italic">
                "{{ c.planNote }}"
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <UButton
              @click="openAftercareCallModal(c)"
              color="emerald"
              variant="solid"
              icon="i-heroicons-clipboard-document-check"
              class="min-h-[44px] justify-center text-xs"
            >
              {{ t('aftercare.log_aftercare_call') }}
            </UButton>

            <UButton
              v-if="c.stage !== 'completed'"
              @click="openCloseCaseModal(c)"
              color="gray"
              variant="soft"
              icon="i-heroicons-check-circle"
              class="min-h-[44px] justify-center text-xs"
            >
              {{ t('aftercare.close_case') }}
            </UButton>

            <NuxtLink
              v-else
              :to="`/cases/${c.id}`"
              class="min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              View Details
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Log Aftercare Call Modal -->
    <UModal v-model="showCallModal" :ui="{ width: 'sm:max-w-xl' }">
      <div class="p-6 space-y-5 bg-white dark:bg-slate-800 rounded-3xl">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
              {{ t('aftercare.log_aftercare_call') }}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ selectedCase?.patient?.name }} ({{ selectedCase?.patient?.mobileNorm }})
            </p>
          </div>
          <button @click="showCallModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="submitAftercareCall" class="space-y-4">
          <!-- 1. General Condition -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
              {{ t('aftercare.general_condition') }} *
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="callForm.generalCondition = 'better'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.generalCondition === 'better'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                😊 {{ t('aftercare.better') }}
              </button>

              <button
                type="button"
                @click="callForm.generalCondition = 'same'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.generalCondition === 'same'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                😐 {{ t('aftercare.same') }}
              </button>

              <button
                type="button"
                @click="callForm.generalCondition = 'worse'"
                :class="[
                  'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.generalCondition === 'worse'
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
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1.5">
              {{ t('aftercare.medicines_taken') }} *
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                @click="callForm.medicinesTaken = 'yes'"
                :class="[
                  'py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.medicinesTaken === 'yes'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                {{ t('aftercare.yes') }}
              </button>

              <button
                type="button"
                @click="callForm.medicinesTaken = 'partly'"
                :class="[
                  'py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.medicinesTaken === 'partly'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                {{ t('aftercare.partly') }}
              </button>

              <button
                type="button"
                @click="callForm.medicinesTaken = 'no'"
                :class="[
                  'py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px]',
                  callForm.medicinesTaken === 'no'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                ]"
              >
                {{ t('aftercare.no') }}
              </button>
            </div>
          </div>

          <!-- 3. New / Worsening Symptoms -->
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('aftercare.symptoms') }}
            </label>
            <input
              v-model="callForm.symptoms"
              type="text"
              placeholder="e.g. none, or mild nausea, pain at incision"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
            />
          </div>

          <!-- 4. Diet & Rest Followed -->
          <div class="flex items-center space-x-2">
            <input
              id="dietRestCheck"
              v-model="callForm.dietRestFollowed"
              type="checkbox"
              class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label for="dietRestCheck" class="text-xs font-bold text-slate-700 dark:text-slate-300">
              {{ t('aftercare.diet_rest_followed') }}
            </label>
          </div>

          <!-- 5. Feedback Rating (0 - 10) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold uppercase text-slate-500">
                {{ t('aftercare.feedback_score') }}
              </label>
              <span class="text-xs font-mono font-bold text-emerald-600">
                {{ callForm.feedbackScore != null ? callForm.feedbackScore + ' / 10' : 'Not rated' }}
              </span>
            </div>
            <input
              v-model.number="callForm.feedbackScore"
              type="range"
              min="0"
              max="10"
              class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <p v-if="callForm.feedbackScore != null && callForm.feedbackScore <= 6" class="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              ⚠️ {{ t('aftercare.low_feedback_warning') }}
            </p>
          </div>

          <!-- 6. Red Flag Clinical Escalation Toggle -->
          <div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
            <div class="flex items-center space-x-2">
              <input
                id="escToggle"
                v-model="callForm.escalateToDoctor"
                type="checkbox"
                class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <label for="escToggle" class="text-xs font-black text-rose-700 dark:text-rose-300">
                🚨 {{ t('aftercare.escalate_to_doctor') }}
              </label>
            </div>

            <div v-if="callForm.escalateToDoctor" class="space-y-2 pt-1">
              <label class="block text-xs font-bold uppercase text-rose-800 dark:text-rose-300">
                {{ t('aftercare.escalation_reason') }} *
              </label>
              <textarea
                v-model="callForm.escalationReason"
                rows="2"
                required
                placeholder="Describe fever, acute pain, bleeding, or dangerous symptoms..."
                class="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs focus:ring-2 focus:ring-rose-500"
              ></textarea>
              <p class="text-[10px] text-rose-600 font-medium">
                {{ t('aftercare.escalation_sla_notice') }}
              </p>
            </div>
          </div>

          <!-- 7. Review Visit Booking -->
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <input
                id="reviewVisitCheck"
                v-model="callForm.reviewVisitBooked"
                type="checkbox"
                class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <label for="reviewVisitCheck" class="text-xs font-bold text-slate-700 dark:text-slate-300">
                {{ t('aftercare.review_visit') }}
              </label>
            </div>

            <div v-if="callForm.reviewVisitBooked">
              <input
                v-model="callForm.reviewVisitDate"
                type="datetime-local"
                required
                class="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs min-h-[44px]"
              />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3">
            <UButton
              type="button"
              @click="showCallModal = false"
              color="gray"
              variant="soft"
              class="min-h-[44px]"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="submittingCall"
              color="emerald"
              class="min-h-[44px]"
            >
              Save Aftercare Call
            </UButton>
          </div>
        </form>
      </div>
    </UModal>

    <!-- Close Case Modal -->
    <UModal v-model="showCloseModal">
      <div class="p-6 space-y-4 bg-white dark:bg-slate-800 rounded-3xl">
        <h3 class="text-xl font-black text-slate-900 dark:text-slate-100">
          {{ t('aftercare.close_case') }}
        </h3>

        <form @submit.prevent="submitCloseCase" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              {{ t('aftercare.closure_code') }} *
            </label>
            <select
              v-model="closeForm.closureCodeId"
              required
              class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm min-h-[44px]"
            >
              <option :value="null" disabled>Select Closure Code</option>
              <option v-for="cc in closureCodes" :key="cc.id" :value="cc.id">
                {{ cc.labelEn }} ({{ cc.labelMl }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase text-slate-500 mb-1">
              Closure Note
            </label>
            <textarea
              v-model="closeForm.note"
              rows="2"
              class="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              placeholder="e.g. Treatment goal reached, patient advised periodic exercise..."
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
              color="gray"
              class="min-h-[44px]"
            >
              Complete & Close Case
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

const activeTab = ref<'all' | 'escalations' | 'completed'>('all');
const cases = ref<any[]>([]);
const escalations = ref<any[]>([]);
const report = ref<any>(null);
const closureCodes = ref<any[]>([]);
const loading = ref(true);

const showCallModal = ref(false);
const submittingCall = ref(false);
const showCloseModal = ref(false);
const submittingClose = ref(false);
const selectedCase = ref<any>(null);

const callForm = ref({
  generalCondition: 'better' as 'better' | 'same' | 'worse',
  medicinesTaken: 'yes' as 'yes' | 'partly' | 'no',
  symptoms: 'none',
  dietRestFollowed: true,
  reviewVisitBooked: false,
  reviewVisitDate: '',
  feedbackScore: null as number | null,
  escalateToDoctor: false,
  escalationReason: '',
});

const closeForm = ref({
  closureCodeId: null as number | null,
  note: '',
});

const filteredCases = computed(() => {
  if (activeTab.value === 'completed') {
    return cases.value.filter((c: any) => c.stage === 'completed');
  }
  return cases.value.filter((c: any) => c.stage === 'aftercare_follow_up');
});

function formatStage(stage: string) {
  return t(`cases.stages.${stage}`, stage);
}

function openAftercareCallModal(c: any) {
  selectedCase.value = c;
  callForm.value = {
    generalCondition: 'better',
    medicinesTaken: 'yes',
    symptoms: 'none',
    dietRestFollowed: true,
    reviewVisitBooked: false,
    reviewVisitDate: '',
    feedbackScore: 8,
    escalateToDoctor: false,
    escalationReason: '',
  };
  showCallModal.value = true;
}

function openCloseCaseModal(c: any) {
  selectedCase.value = c;
  closeForm.value = {
    closureCodeId: null,
    note: '',
  };
  showCloseModal.value = true;
}

async function loadAllData() {
  if (!authStore.token) return;
  loading.value = true;
  try {
    const [casesRes, escRes, repRes, ccRes] = await Promise.all([
      $fetch<any>(`${config.public.apiBase}/cases?stage=aftercare_follow_up`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch<any>(`${config.public.apiBase}/escalations`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch<any>(`${config.public.apiBase}/reports/aftercare`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch<any>(`${config.public.apiBase}/picklists/closure_codes`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
    ]);

    cases.value = casesRes?.data || casesRes || [];
    escalations.value = escRes?.data || escRes || [];
    report.value = repRes;
    closureCodes.value = ccRes?.data || ccRes || [];
  } catch (err) {
    console.error('Failed to load aftercare data:', err);
  } finally {
    loading.value = false;
  }
}

async function submitAftercareCall() {
  if (!selectedCase.value) return;
  submittingCall.value = true;
  try {
    const payload = {
      caseId: selectedCase.value.id,
      durationSeconds: 90,
      details: {
        generalCondition: callForm.value.generalCondition,
        medicinesTaken: callForm.value.medicinesTaken,
        symptoms: callForm.value.symptoms || 'none',
        dietRestFollowed: callForm.value.dietRestFollowed,
        reviewVisitBooked: callForm.value.reviewVisitBooked,
        reviewVisitDate: callForm.value.reviewVisitBooked && callForm.value.reviewVisitDate
          ? new Date(callForm.value.reviewVisitDate).toISOString()
          : null,
        feedbackScore: callForm.value.feedbackScore,
        escalateToDoctor: callForm.value.escalateToDoctor,
        escalationReason: callForm.value.escalateToDoctor ? callForm.value.escalationReason : null,
      },
      escalateToDoctor: callForm.value.escalateToDoctor,
      escalationReason: callForm.value.escalateToDoctor ? callForm.value.escalationReason : null,
    };

    await $fetch(`${config.public.apiBase}/interactions/aftercare-call`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: payload,
    });

    showCallModal.value = false;
    await loadAllData();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to record aftercare call');
  } finally {
    submittingCall.value = false;
  }
}

async function submitCloseCase() {
  if (!selectedCase.value) return;
  submittingClose.value = true;
  try {
    await $fetch(`${config.public.apiBase}/cases/${selectedCase.value.id}/close`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        closureCodeId: closeForm.value.closureCodeId,
        note: closeForm.value.note || undefined,
      },
    });

    showCloseModal.value = false;
    await loadAllData();
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to close case');
  } finally {
    submittingClose.value = false;
  }
}

onMounted(() => {
  loadAllData();
});
</script>
