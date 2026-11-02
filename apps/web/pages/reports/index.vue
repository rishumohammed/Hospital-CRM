<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm font-semibold shadow-md shadow-teal-500/20">
            📊
          </span>
          <span>{{ t('reports.title') }}</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Executive performance analytics, SLA compliance, marketing source ROI, and conversion funnels
        </p>
      </div>

      <div class="flex items-center space-x-2">
        <button
          type="button"
          @click="selectTab('exports')"
          class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all min-h-[44px]"
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
          <span>Export Data</span>
        </button>
      </div>
    </div>

    <!-- Global Filter Bar -->
    <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <!-- Date Range Pills -->
      <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
        <button
          v-for="r in dateRanges"
          :key="r.key"
          type="button"
          @click="selectDateRange(r.key)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[38px]',
            selectedRange === r.key
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          ]"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- Branch Filter -->
      <div class="flex items-center space-x-2">
        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch:</label>
        <select
          v-model="selectedBranchId"
          @change="loadReportData"
          class="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[38px]"
        >
          <option :value="null">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">
            {{ b.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="selectTab(tab.key)"
        :class="[
          'px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px]',
          activeTab === tab.key
            ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 flex justify-center items-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
    </div>

    <!-- Tab 1: Support Desk Report -->
    <div v-else-if="activeTab === 'support' && supportData" class="space-y-6">
      <!-- KPI Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
          <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ supportData.totalLeads }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.newLeads }} new awaiting response</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Compliance</p>
          <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {{ supportData.sla?.complianceRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">
            Avg response: {{ supportData.sla?.avgResponseMinutes ? `${supportData.sla.avgResponseMinutes} min` : 'N/A' }}
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments Booked</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
            {{ supportData.bookingRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.appointmentBookedLeads }} leads booked</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visit Conversion</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
            {{ supportData.conversionRate }}%
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ supportData.convertedLeads }} converted to cases</p>
        </div>
      </div>

      <!-- Telecaller Productivity Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Telecaller Performance & Productivity
          </h3>
          <button
            type="button"
            @click="exportTelecallerTable()"
            class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
            <span>Export Table (CSV)</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th class="py-3 px-4">Telecaller</th>
                <th class="py-3 px-4 text-center">Assigned Leads</th>
                <th class="py-3 px-4 text-center">Calls Logged</th>
                <th class="py-3 px-4 text-center">Appointments Booked</th>
                <th class="py-3 px-4 text-center">Converted to Cases</th>
                <th class="py-3 px-4 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="tc in supportData.telecallerProductivity" :key="tc.id" class="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td class="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{{ tc.name }}</td>
                <td class="py-3.5 px-4 text-center font-mono">{{ tc.assigned }}</td>
                <td class="py-3.5 px-4 text-center font-mono font-semibold text-teal-600">{{ tc.calls }}</td>
                <td class="py-3.5 px-4 text-center font-mono text-emerald-600 font-semibold">{{ tc.booked }}</td>
                <td class="py-3.5 px-4 text-center font-mono text-teal-600 font-semibold">{{ tc.converted }}</td>
                <td class="py-3.5 px-4 text-right font-mono font-semibold">
                  {{ tc.assigned > 0 ? Math.round((tc.converted / tc.assigned) * 100) : 0 }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Testimonials Outreach & Association Analytics Card -->
      <div v-if="testimonialsData" class="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-700">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-semibold text-lg">
              📜
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
                Testimonial Outreach & Outcome Association
              </h3>
              <p class="text-xs text-slate-500">
                Evaluation of approved testimonial sharing and its correlation with appointment conversion
              </p>
            </div>
          </div>
          <span class="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {{ testimonialsData.leadsWithTestimonials }} / {{ testimonialsData.totalLeads }} Leads Reached ({{ testimonialsData.percentage }}%)
          </span>
        </div>

        <!-- Association Disclaimer Banner -->
        <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <span class="text-amber-600 text-lg leading-none mt-0.5">ℹ️</span>
          <div class="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span class="font-semibold">Observational Association Notice:</span>
            Appointment booking rates for leads who received testimonials versus those who did not are reported as an observational association, not proof of cause. Multiple clinical and personal factors influence patient appointment decisions.
          </div>
        </div>

        <!-- 3-Column Comparative Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Testimonials Sent Rate</p>
            <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {{ testimonialsData.percentage }}%
            </p>
            <p class="text-xs text-slate-400 mt-1">
              {{ testimonialsData.leadsWithTestimonials }} of {{ testimonialsData.totalLeads }} total inquiries
            </p>
          </div>

          <div class="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <p class="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">With Testimonials: Booked</p>
            <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              {{ testimonialsData.appointmentBookedRate?.withTestimonials?.ratePercentage }}%
            </p>
            <p class="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {{ testimonialsData.appointmentBookedRate?.withTestimonials?.bookedCount }} of {{ testimonialsData.appointmentBookedRate?.withTestimonials?.totalLeads }} leads booked
            </p>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Without Testimonials: Booked</p>
            <p class="text-2xl font-semibold text-slate-700 dark:text-slate-300 mt-1">
              {{ testimonialsData.appointmentBookedRate?.withoutTestimonials?.ratePercentage }}%
            </p>
            <p class="text-xs text-slate-400 mt-1">
              {{ testimonialsData.appointmentBookedRate?.withoutTestimonials?.bookedCount }} of {{ testimonialsData.appointmentBookedRate?.withoutTestimonials?.totalLeads }} leads booked
            </p>
          </div>
        </div>

        <!-- 2-Column Breakdown: By Channel & By Telecaller -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <!-- Channel Breakdown -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Sends by Channel
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                <span class="text-slate-500">💬 WhatsApp</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ testimonialsData.sendsByChannel?.whatsapp || 0 }}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                <span class="text-slate-500">✉️ SMS</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ testimonialsData.sendsByChannel?.sms || 0 }}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                <span class="text-slate-500">📧 Email</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ testimonialsData.sendsByChannel?.email || 0 }}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                <span class="text-slate-500">📞 Call Readout</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ testimonialsData.sendsByChannel?.call_readout || 0 }}</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                <span class="text-slate-500">📋 Other</span>
                <span class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ testimonialsData.sendsByChannel?.other || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Telecaller Breakdown -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Sends by Telecaller
            </h4>
            <div v-if="!testimonialsData.sendsByTelecaller || testimonialsData.sendsByTelecaller.length === 0" class="text-xs text-slate-400 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              No testimonials sent during this period
            </div>
            <div v-else class="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
              <div
                v-for="tc in testimonialsData.sendsByTelecaller"
                :key="tc.userId"
                class="p-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <span class="font-semibold text-slate-800 dark:text-slate-200">{{ tc.userName }}</span>
                <span class="font-mono font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md">
                  {{ tc.count }} sent
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Admission Desk Report -->
    <div v-else-if="activeTab === 'admission' && admissionData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advised Admission</p>
          <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ admissionData.advised }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">24h First Contact</p>
          <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{{ admissionData.contactedWithin24hRate }}%</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.contactedWithin24hCount }} contacted in 24h</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposit Paid</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">{{ admissionData.acceptedCount }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.acceptedRate }}% acceptance</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admitted In-Treatment</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">{{ admissionData.admittedCount }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ admissionData.admittedRate }}% admission rate</p>
        </div>
      </div>

      <!-- Overdue Follow-ups Alert -->
      <div v-if="admissionData.overdueFollowUps && admissionData.overdueFollowUps.length > 0" class="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3">
        <h4 class="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-amber-600" />
          <span>{{ admissionData.overdueFollowUps.length }} Cases Overdue for Admission Counseling (>24 Hours)</span>
        </h4>
        <div class="divide-y divide-amber-200/60 dark:divide-amber-900/40">
          <div v-for="item in admissionData.overdueFollowUps.slice(0, 5)" :key="item.id" class="py-2 flex items-center justify-between text-xs">
            <span class="font-semibold text-amber-950 dark:text-amber-100">
              <NuxtLink :to="`/cases/${item.id}`" class="hover:underline">{{ item.patientName }} (Case #{{ item.id }})</NuxtLink>
            </span>
            <span class="text-amber-700 dark:text-amber-400 font-semibold">{{ item.hoursOverdue }}h without follow-up</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: Aftercare Desk Report -->
    <div v-else-if="activeTab === 'aftercare' && aftercareData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Follow-up Cases</p>
          <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ aftercareData.activeCases }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ aftercareData.completedCases }} closed</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">On-Time Cadence Rate</p>
          <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{{ aftercareData.calls?.onTimeRate }}%</p>
          <p class="text-xs text-slate-400 mt-1">{{ aftercareData.calls?.completed }} / {{ aftercareData.calls?.due }} calls done</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Patient Feedback</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
            {{ aftercareData.feedback?.average ? `${aftercareData.feedback.average} / 10` : 'N/A' }}
          </p>
          <p class="text-xs text-rose-500 mt-1 font-semibold" v-if="aftercareData.feedback?.lowCount > 0">
            {{ aftercareData.feedback.lowCount }} low score (≤6) callbacks
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinical Escalations</p>
          <p class="text-2xl font-semibold text-rose-600 dark:text-rose-400 mt-1">{{ aftercareData.escalations?.total }}</p>
          <p class="text-xs text-slate-400 mt-1">
            {{ aftercareData.escalations?.pending }} pending &bull; Avg SLA: {{ aftercareData.escalations?.avgDecisionHours || '<1' }}h
          </p>
        </div>
      </div>
    </div>

    <!-- Tab 4: Lost Reasons Analytics -->
    <div v-else-if="activeTab === 'lost_reasons' && lostReasonsData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Lead Lost Reasons -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Support Desk: Lead Drop-off Reasons
            </h3>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600">
              Total Lost: {{ lostReasonsData.leadLostReasons?.total }}
            </span>
          </div>

          <div v-if="lostReasonsData.leadLostReasons?.breakdown.length === 0" class="py-8 text-center text-slate-400 text-xs">
            No lost leads recorded in this period.
          </div>

          <div v-else class="space-y-3">
            <div v-for="r in lostReasonsData.leadLostReasons.breakdown" :key="r.code" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-800 dark:text-slate-200">{{ r.labelEn }}</span>
                <span class="font-mono text-slate-500">{{ r.count }} ({{ r.percentage }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="bg-rose-500 h-full rounded-full" :style="{ width: `${r.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admission Decline Reasons -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Admission Desk: Patient Decline Reasons
            </h3>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600">
              Total Declined: {{ lostReasonsData.admissionDeclineReasons?.total }}
            </span>
          </div>

          <div v-if="lostReasonsData.admissionDeclineReasons?.breakdown.length === 0" class="py-8 text-center text-slate-400 text-xs">
            No declined admissions recorded in this period.
          </div>

          <div v-else class="space-y-3">
            <div v-for="r in lostReasonsData.admissionDeclineReasons.breakdown" :key="r.code" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-800 dark:text-slate-200">{{ r.labelEn }}</span>
                <span class="font-mono text-slate-500">{{ r.count }} ({{ r.percentage }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full" :style="{ width: `${r.percentage}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 5: Source Quality & ROI -->
    <div v-else-if="activeTab === 'source_quality' && sourceQualityData" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Marketing Leads</p>
          <p class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{{ sourceQualityData.totalLeads }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Est. Revenue</p>
          <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{{ Number(sourceQualityData.overallRevenue || 0).toLocaleString('en-IN') }}
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 md:col-span-1">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposits Collected</p>
          <p class="text-2xl font-semibold text-teal-600 dark:text-teal-400 mt-1">
            ₹{{ Number(sourceQualityData.overallDeposits || 0).toLocaleString('en-IN') }}
          </p>
        </div>
      </div>

      <!-- Source ROI Table -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Source Funnel Conversion & Revenue Performance
          </h3>
          <button
            type="button"
            @click="exportSourceRoiTable()"
            class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
            <span>Export Table (CSV)</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold uppercase">
                <th class="py-3 px-4">Lead Source</th>
                <th class="py-3 px-4 text-center">Total Leads</th>
                <th class="py-3 px-4 text-center">Contact %</th>
                <th class="py-3 px-4 text-center">Booked %</th>
                <th class="py-3 px-4 text-center">Visited %</th>
                <th class="py-3 px-4 text-center">Admitted %</th>
                <th class="py-3 px-4 text-right">Est. Revenue (₹)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="src in sourceQualityData.sources" :key="src.code" class="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td class="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {{ src.labelEn }}
                </td>
                <td class="py-3.5 px-4 text-center font-mono font-semibold">{{ src.totalLeads }}</td>
                <td class="py-3.5 px-4 text-center font-mono">{{ src.contactRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-teal-600 font-semibold">{{ src.bookingRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-teal-600 font-semibold">{{ src.visitRate }}%</td>
                <td class="py-3.5 px-4 text-center font-mono text-emerald-600 font-semibold">{{ src.treatmentRate }}%</td>
                <td class="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                  ₹{{ Number(src.totalEstimatedRevenue).toLocaleString('en-IN') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 6: Data Exports & Downloads Center -->
    <div v-else-if="activeTab === 'exports'" class="space-y-6">
      <!-- Security Watermark Banner -->
      <div class="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3">
        <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-semibold">Cryptographic Watermark Security Policy</p>
          <p class="mt-0.5 leading-relaxed">
            All data exported from this reporting module is digitally watermarked with your user credentials, branch ID, and UTC timestamp in both the CSV headers and individual record signatures for strict patient data auditability and leak prevention.
          </p>
        </div>
      </div>

      <!-- Quick 1-Click Exports Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Leads Export -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
              <UIcon name="i-heroicons-user-group" class="w-5 h-5" />
            </div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Leads Dataset</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Patient leads, contact details, status, source, and assigned telecaller.</p>
          </div>
          <button
            type="button"
            :disabled="quickExporting === 'leads'"
            @click="quickExport('leads')"
            class="mt-4 w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 min-h-[38px]"
          >
            <UIcon :name="quickExporting === 'leads' ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-down-tray'" :class="['w-3.5 h-3.5', quickExporting === 'leads' ? 'animate-spin' : '']" />
            <span>{{ quickExporting === 'leads' ? 'Exporting...' : 'Export Leads (CSV)' }}</span>
          </button>
        </div>

        <!-- Cases Export -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <UIcon name="i-heroicons-briefcase" class="w-5 h-5" />
            </div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Cases & Treatment</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Admission stages, doctors, care types, estimated fees, and clinical milestones.</p>
          </div>
          <button
            type="button"
            :disabled="quickExporting === 'cases'"
            @click="quickExport('cases')"
            class="mt-4 w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 min-h-[38px]"
          >
            <UIcon :name="quickExporting === 'cases' ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-down-tray'" :class="['w-3.5 h-3.5', quickExporting === 'cases' ? 'animate-spin' : '']" />
            <span>{{ quickExporting === 'cases' ? 'Exporting...' : 'Export Cases (CSV)' }}</span>
          </button>
        </div>

        <!-- Interactions Export -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <UIcon name="i-heroicons-phone" class="w-5 h-5" />
            </div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Call Logs & Activity</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Telecalling history, dispositions, call duration, notes, and follow-ups.</p>
          </div>
          <button
            type="button"
            :disabled="quickExporting === 'interactions'"
            @click="quickExport('interactions')"
            class="mt-4 w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 min-h-[38px]"
          >
            <UIcon :name="quickExporting === 'interactions' ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-down-tray'" :class="['w-3.5 h-3.5', quickExporting === 'interactions' ? 'animate-spin' : '']" />
            <span>{{ quickExporting === 'interactions' ? 'Exporting...' : 'Export Call Logs (CSV)' }}</span>
          </button>
        </div>

        <!-- Executive Analytics Export -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <UIcon name="i-heroicons-chart-pie" class="w-5 h-5" />
            </div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Executive Summary</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">KPI metrics, telecaller conversion rates, and marketing source ROI.</p>
          </div>
          <button
            type="button"
            @click="exportCurrentReportSummary()"
            class="mt-4 w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm min-h-[38px]"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
            <span>Export Analytics (CSV)</span>
          </button>
        </div>
      </div>

      <!-- Export History Card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Supervised Export Requests & History
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Cryptographically verified exports awaiting approval or ready for secure download
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <button
              type="button"
              @click="fetchExports()"
              class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[38px] transition-colors"
            >
              Refresh List
            </button>
            <button
              type="button"
              @click="showRequestModal = true"
              class="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm min-h-[38px] transition-colors"
            >
              <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
              <span>+ Request Custom Export</span>
            </button>
          </div>
        </div>

        <!-- Exports Loading -->
        <div v-if="exportsLoading" class="py-16 flex justify-center items-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
        </div>

        <!-- Empty State -->
        <div v-else-if="exportsList.length === 0" class="p-12 text-center text-slate-400">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
            <UIcon name="i-heroicons-document-arrow-down" class="w-6 h-6" />
          </div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No export requests recorded</p>
          <p class="text-xs text-slate-400 mt-1">Use the quick export cards above or click "+ Request Custom Export".</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-semibold uppercase">
                <th class="py-3 px-4">Export ID</th>
                <th class="py-3 px-4">Dataset Resource</th>
                <th class="py-3 px-4">Requested By</th>
                <th class="py-3 px-4">Branch Scope</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Approver</th>
                <th class="py-3 px-4 text-center">Downloads</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="exp in exportsList" :key="exp.id" class="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td class="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  EXP-{{ String(exp.id).padStart(5, '0') }}
                </td>
                <td class="py-3 px-4">
                  <span class="font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    {{ exp.resource }}
                  </span>
                  <span class="text-[10px] text-slate-400 block font-mono">Encrypted CSV</span>
                </td>
                <td class="py-3 px-4">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">{{ exp.user?.name || exp.user?.email }}</div>
                  <div class="text-[10px] text-slate-400">{{ new Date(exp.requestedAt).toLocaleString() }}</div>
                </td>
                <td class="py-3 px-4 text-slate-600 dark:text-slate-300">
                  {{ exp.branch?.name || 'All Branches' }}
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full',
                      getExportBadgeClass(exp.status)
                    ]"
                  >
                    {{ exp.status }}
                  </span>
                  <p v-if="exp.status === 'rejected' && exp.rejectionReason" class="text-[10px] text-rose-500 mt-0.5">
                    {{ exp.rejectionReason }}
                  </p>
                </td>
                <td class="py-3 px-4 text-slate-500">
                  <span v-if="exp.approver">{{ exp.approver.name }}</span>
                  <span v-else class="text-slate-400 italic">Pending supervisor</span>
                </td>
                <td class="py-3 px-4 text-center font-mono font-semibold">
                  {{ exp.downloadCount }}
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end space-x-2">
                    <!-- Approve / Reject actions for supervisors -->
                    <template v-if="exp.status === 'pending' && canApproveExport">
                      <button
                        type="button"
                        @click="handleApproveExport(exp.id, true)"
                        class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        @click="handleApproveExport(exp.id, false)"
                        class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </template>

                    <!-- Download action -->
                    <button
                      v-if="exp.status === 'approved' || exp.status === 'completed'"
                      type="button"
                      @click="downloadExportFile(exp.id)"
                      class="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Request Export Modal -->
    <div
      v-if="showRequestModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
            Request Data Export
          </h3>
          <button @click="showRequestModal = false" class="text-slate-400 hover:text-slate-600">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="submitExportRequest" class="space-y-4">
          <!-- Resource selection -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Select Dataset *
            </label>
            <select
              v-model="requestForm.resource"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[40px]"
            >
              <option value="leads">Support Desk: Leads Dataset</option>
              <option value="cases">Admission & Aftercare: Patient Cases Dataset</option>
              <option value="interactions">Interactions & Telecalling Logs</option>
            </select>
          </div>

          <!-- Format -->
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Format
            </label>
            <input
              type="text"
              value="CSV (Encrypted Watermarked File)"
              disabled
              class="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 min-h-[40px]"
            />
          </div>

          <!-- Traceability Notice -->
          <div class="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200">
            <p class="font-semibold flex items-center gap-1">
              <UIcon name="i-heroicons-finger-print" class="w-4 h-4 text-teal-600" />
              Traceability Guarantee
            </p>
            <p class="mt-0.5 leading-relaxed text-[11px]">
              The generated CSV file will embed your user identification tag in both file headers and each exported record.
            </p>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              @click="showRequestModal = false"
              class="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submittingExport"
              class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm min-h-[40px] disabled:opacity-50"
            >
              <UIcon v-if="submittingExport" name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
              <span>{{ submittingExport ? 'Submitting...' : 'Submit Export Request' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

const validTabs = ['support', 'admission', 'aftercare', 'lost_reasons', 'source_quality', 'exports'] as const;
const initialTab = (route.query.tab as string) || 'support';
const activeTab = ref(validTabs.includes(initialTab as any) ? initialTab : 'support');

function selectTab(tabKey: string) {
  activeTab.value = tabKey;
  router.replace({ query: { ...route.query, tab: tabKey } });
  if (tabKey === 'exports') {
    fetchExports();
  }
}

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && validTabs.includes(newTab as any) && newTab !== activeTab.value) {
      activeTab.value = String(newTab);
      if (newTab === 'exports') {
        fetchExports();
      }
    }
  }
);

const selectedRange = ref('30d');
const selectedBranchId = ref<number | null>(null);
const loading = ref(true);

const branches = ref<any[]>([]);
const supportData = ref<any>(null);
const admissionData = ref<any>(null);
const aftercareData = ref<any>(null);
const lostReasonsData = ref<any>(null);
const sourceQualityData = ref<any>(null);
const testimonialsData = ref<any>(null);

const dateRanges = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

const tabs = [
  { key: 'support', label: t('reports.support_tab') },
  { key: 'admission', label: t('reports.admission_tab') },
  { key: 'aftercare', label: t('reports.aftercare_tab') },
  { key: 'lost_reasons', label: t('reports.lost_reasons_tab') },
  { key: 'source_quality', label: t('reports.source_quality_tab') },
  { key: 'exports', label: 'Data Exports & Downloads' },
];

function selectDateRange(rangeKey: string) {
  selectedRange.value = rangeKey;
  loadReportData();
}

function getDateParams() {
  const now = new Date();
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (selectedRange.value === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString();
  } else if (selectedRange.value === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString();
  } else if (selectedRange.value === 'this_month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = d.toISOString();
  }

  return {
    startDate,
    endDate,
    branchId: selectedBranchId.value || undefined,
  };
}

async function fetchBranches() {
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/branches`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    branches.value = res.branches || res.data || [];
  } catch (err) {
    console.error('Failed to load branches:', err);
  }
}

async function loadReportData() {
  loading.value = true;
  const params = getDateParams();
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.branchId) query.append('branchId', String(params.branchId));

  const qs = query.toString() ? `?${query.toString()}` : '';

  // Testimonials query uses from/to/branch_id
  const tQuery = new URLSearchParams();
  if (params.startDate) tQuery.append('from', params.startDate);
  if (params.endDate) tQuery.append('to', params.endDate);
  if (params.branchId) tQuery.append('branch_id', String(params.branchId));
  const tqs = tQuery.toString() ? `?${tQuery.toString()}` : '';

  try {
    const [sup, adm, aft, lost, src, testm] = await Promise.all([
      $fetch(`${config.public.apiBase}/reports/support${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/admission${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/aftercare${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/lost-reasons${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/source-quality${qs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }),
      $fetch(`${config.public.apiBase}/reports/testimonials${tqs}`, {
        headers: { authorization: `Bearer ${authStore.token}` },
      }).catch((err) => {
        console.warn('Failed to load testimonials report:', err);
        return null;
      }),
    ]);

    supportData.value = sup;
    admissionData.value = adm;
    aftercareData.value = aft;
    lostReasonsData.value = lost;
    sourceQualityData.value = src;
    testimonialsData.value = testm;
  } catch (err) {
    console.error('Failed to load reports:', err);
  } finally {
    loading.value = false;
  }
}

// Data Exports State & Actions
const exportsList = ref<any[]>([]);
const exportsLoading = ref(false);
const showRequestModal = ref(false);
const submittingExport = ref(false);
const quickExporting = ref<string | null>(null);

const requestForm = ref({
  resource: 'leads',
  format: 'csv',
});

const canApproveExport = computed(() => {
  const role = authStore.user?.role?.code;
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'center_head' ||
    role === 'telecaller_manager'
  );
});

function getExportBadgeClass(status: string) {
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
  exportsLoading.value = true;
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/exports`, {
      headers: { authorization: `Bearer ${authStore.token}` },
    });
    exportsList.value = res.data || [];
  } catch (err) {
    console.error('Failed to load exports:', err);
  } finally {
    exportsLoading.value = false;
  }
}

async function quickExport(resource: 'leads' | 'cases' | 'interactions') {
  quickExporting.value = resource;
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/exports`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        resource,
        format: 'csv',
        branchId: selectedBranchId.value || undefined,
      },
    });

    await fetchExports();

    if (res.status === 'approved' || res.status === 'completed') {
      await downloadExportFile(res.id);
    } else {
      alert(`Export request EXP-${String(res.id).padStart(5, '0')} submitted successfully for supervisor approval.`);
    }
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to initiate export');
  } finally {
    quickExporting.value = null;
  }
}

async function submitExportRequest() {
  submittingExport.value = true;
  try {
    const res = await $fetch<any>(`${config.public.apiBase}/exports`, {
      method: 'POST',
      headers: { authorization: `Bearer ${authStore.token}` },
      body: {
        ...requestForm.value,
        branchId: selectedBranchId.value || undefined,
      },
    });

    showRequestModal.value = false;
    await fetchExports();

    if (res.status === 'approved' || res.status === 'completed') {
      await downloadExportFile(res.id);
    } else {
      alert(`Export request EXP-${String(res.id).padStart(5, '0')} created and pending approval.`);
    }
  } catch (err: any) {
    alert(err.data?.error?.message || err.message || 'Failed to request export');
  } finally {
    submittingExport.value = false;
  }
}

async function handleApproveExport(exportId: number, approved: boolean) {
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

    // Refresh download count
    fetchExports();
  } catch (err: any) {
    alert(err.message || 'Failed to download export');
  }
}

function exportCurrentReportSummary() {
  const lines: string[] = [];
  lines.push(`HOSPITAL CRM - EXECUTIVE REPORT ANALYTICS`);
  lines.push(`Date Range: ${selectedRange.value} | Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  lines.push('');

  if (supportData.value) {
    lines.push('--- SUPPORT DESK METRICS ---');
    lines.push(`Total Leads,${supportData.value.totalLeads}`);
    lines.push(`SLA Compliance Rate,${supportData.value.sla?.complianceRate}%`);
    lines.push(`Appointments Booked Rate,${supportData.value.bookingRate}%`);
    lines.push(`Visit Conversion Rate,${supportData.value.conversionRate}%`);
    lines.push('');
    lines.push('Telecaller,Assigned Leads,Calls Logged,Appointments Booked,Converted Cases');
    for (const tc of supportData.value.telecallerProductivity || []) {
      lines.push(`"${tc.name}",${tc.assigned},${tc.calls},${tc.booked},${tc.converted}`);
    }
    lines.push('');
  }

  if (sourceQualityData.value?.sources) {
    lines.push('--- MARKETING SOURCE ROI ---');
    lines.push('Source,Total Leads,Contact Rate %,Booking Rate %,Visit Rate %,Treatment Rate %,Estimated Revenue');
    for (const s of sourceQualityData.value.sources) {
      lines.push(`"${s.labelEn}",${s.totalLeads},${s.contactRate}%,${s.bookingRate}%,${s.visitRate}%,${s.treatmentRate}%,INR ${s.totalEstimatedRevenue}`);
    }
    lines.push('');
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `executive-report-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function exportTelecallerTable() {
  if (!supportData.value?.telecallerProductivity) return;
  const lines: string[] = [];
  lines.push('Telecaller,Assigned Leads,Calls Logged,Appointments Booked,Converted Cases,Conversion Rate %');
  for (const tc of supportData.value.telecallerProductivity) {
    const rate = tc.assigned > 0 ? Math.round((tc.converted / tc.assigned) * 100) : 0;
    lines.push(`"${tc.name}",${tc.assigned},${tc.calls},${tc.booked},${tc.converted},${rate}%`);
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `telecaller-performance-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function exportSourceRoiTable() {
  if (!sourceQualityData.value?.sources) return;
  const lines: string[] = [];
  lines.push('Lead Source,Total Leads,Contact Rate %,Booking Rate %,Visit Rate %,Treatment Rate %,Estimated Revenue INR');
  for (const s of sourceQualityData.value.sources) {
    lines.push(`"${s.labelEn}",${s.totalLeads},${s.contactRate}%,${s.bookingRate}%,${s.visitRate}%,${s.treatmentRate}%,${s.totalEstimatedRevenue}`);
  }
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marketing-source-roi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

onMounted(() => {
  fetchBranches();
  loadReportData();
  if (activeTab.value === 'exports') {
    fetchExports();
  }
});
</script>
