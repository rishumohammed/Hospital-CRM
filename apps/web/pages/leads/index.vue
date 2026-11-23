<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>{{ activeLeadType === 'product' ? 'Product Desk: Leads' : 'Support Desk: Leads' }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ pagination.total }} {{ selectedDateRange === 'today' ? 'Today' : 'Total' }}
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

      <div v-if="canCreateLead" class="flex items-center space-x-3">
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

    <!-- Date Filter Bar -->
    <div class="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3">
      <!-- Date Range Pills -->
      <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
        <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
          <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-slate-400" />
          <span>Period:</span>
        </span>
        <button
          v-for="r in dateRanges"
          :key="r.key"
          type="button"
          @click="selectDateRange(r.key)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] cursor-pointer',
            selectedDateRange === r.key
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          ]"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- Custom Date Picker Inputs (shown when Custom is active) -->
      <div v-if="selectedDateRange === 'custom'" class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium">From:</span>
          <input
            type="date"
            v-model="customStartDate"
            @change="applyCustomDateFilter"
            class="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
          />
        </div>
        <div class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span class="text-slate-400 font-medium">To:</span>
          <input
            type="date"
            v-model="customEndDate"
            @change="applyCustomDateFilter"
            class="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
          />
        </div>
      </div>
    </div>

    <!-- Quick Status KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <!-- 1. Total Leads -->
      <button
        type="button"
        @click="selectStatusFilter('active')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          filters.status === 'active' || filters.status === ''
            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/30 shadow-xs'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
            {{ selectedDateRange === 'today' ? "Today's Inquiries" : "Total Inquiries" }}
          </span>
          <span class="text-base">📋</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-teal-700 dark:text-teal-200">
            {{ stats.active || pagination.total }}
          </span>
          <span class="text-[11px] text-teal-700/70 dark:text-teal-300/70 font-medium">
            {{ selectedDateRange === 'today' ? "Today's active" : "All active" }}
          </span>
        </div>
      </button>

      <!-- 2. New / Uncalled -->
      <button
        type="button"
        @click="selectStatusFilter('new')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          filters.status === 'new'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/30 shadow-xs'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            {{ selectedDateRange === 'today' ? "Today's New" : "New (Uncalled)" }}
          </span>
          <span class="flex h-2.5 w-2.5 relative" v-if="(stats.new || 0) > 0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <span v-else class="text-base">🔴</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
            {{ stats.new || 0 }}
          </span>
          <span class="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
            {{ selectedDateRange === 'today' ? "Needs 1st call today" : "Needs 1st call" }}
          </span>
        </div>
      </button>

      <!-- 3. In Follow-up / Contacted -->
      <button
        type="button"
        @click="selectStatusFilter('contacted')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          filters.status === 'contacted'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/30 shadow-xs'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            {{ selectedDateRange === 'today' ? "Today's In Follow-up" : "In Follow-up" }}
          </span>
          <span class="text-base">📞</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {{ (stats.contacted || 0) + (stats.qualified || 0) }}
          </span>
          <span class="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium">
            {{ selectedDateRange === 'today' ? "Created today in talks" : "Active talks" }}
          </span>
        </div>
        <!-- Scheduled Callbacks Badge (reconciles with Follow-up Desk) -->
        <span
          v-if="selectedDateRange === 'today' && tasksDueTodayCount > 0"
          @click.stop="navigateTo('/follow-ups')"
          class="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
          title="Open Follow-up Desk to view today's scheduled callbacks"
        >
          <span>📅</span>
          <span>{{ tasksDueTodayCount }} Callbacks Due Today</span>
          <span class="text-amber-600 font-bold ml-0.5">→</span>
        </span>
      </button>
    </div>

    <!-- Search Bar & Live Queue Switcher -->
    <div class="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <!-- Search Input -->
        <div class="relative flex-1">
          <input
            v-model="filters.search"
            @input="handleSearch"
            type="text"
            class="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            placeholder="Search leads by patient name, phone number, or clinical concern..."
          />
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
          <button
            v-if="filters.search"
            type="button"
            @click="filters.search = ''; handleSearch()"
            class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer"
            title="Clear search"
          >
            ✕
          </button>
        </div>

        <!-- Telecaller / Staff Filter (for Managers & Lead Viewers) -->
        <div v-if="canViewAllLeads" class="w-full sm:w-64 shrink-0">
          <select
            v-model="filters.ownerId"
            @change="onEmployeeFilterChange"
            class="w-full h-11 px-3 rounded-xl border border-teal-200 dark:border-teal-700/70 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 text-xs font-semibold focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
          >
            <option value="">{{ activeLeadType === 'product' ? '👤 All Product Staff' : '👤 All Telecallers' }}</option>
            <option value="unassigned">⚠️ Unassigned Leads</option>
            <option
              v-for="staff in filteredStaffMembers"
              :key="staff.id"
              :value="staff.id.toString()"
            >
              {{ staff.name }} ({{ staff.role?.name || staff.role?.code }})
            </option>
          </select>
        </div>
      </div>

      <!-- Live Pipeline Scope Indicator -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-slate-500">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span
            :class="[
              'inline-block w-2 h-2 rounded-full',
              filters.status === 'not_interested' ? 'bg-rose-500' : filters.status === 'all' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
            ]"
          ></span>
          <span class="font-semibold text-slate-700 dark:text-slate-300">
            {{ filters.status === 'not_interested' ? 'Closed / Lost Inquiries' : filters.status === 'all' ? 'All Inquiries Archive' : 'Live Active Pipeline' }}
          </span>
          <span class="hidden sm:inline text-slate-400">
            &bull; {{ filters.status === 'not_interested' ? 'Showing leads closed from call logs and their recorded lost reasons' : filters.status === 'all' ? 'Showing all historical records including closed/converted' : 'Excludes converted (patients in consultation) & closed' }}
          </span>

          <!-- Active Telecaller Filter Pill -->
          <div v-if="filters.ownerId" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-medium ml-1">
            <span>👤 {{ selectedStaffName }}</span>
            <button
              type="button"
              @click="clearStaffFilter"
              class="text-teal-600 hover:text-teal-800 dark:text-teal-400 font-bold ml-0.5 cursor-pointer"
              title="Clear telecaller filter"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Quick Filter for Closed / Lost Leads -->
          <button
            type="button"
            @click="selectStatusFilter(filters.status === 'not_interested' ? 'active' : 'not_interested')"
            :class="[
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              filters.status === 'not_interested'
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent'
            ]"
          >
            <span>✕ Closed / Lost</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200/70 dark:bg-rose-900/60 font-mono">
              {{ stats.not_interested || 0 }}
            </span>
          </button>

          <span class="text-slate-300 dark:text-slate-700">|</span>

          <button
            type="button"
            @click="selectStatusFilter(filters.status === 'all' ? 'active' : 'all')"
            class="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
          >
            {{ filters.status === 'all' ? '← Switch to Live Active Pipeline' : 'View All Inquiries (Archive)' }}
          </button>
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
          v-if="canCreateLead"
          type="button"
          @click="showQuickCreate = true"
          class="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          + Add First Lead
        </button>
      </div>

      <!-- Leads List Cards -->
      <div v-else class="divide-y divide-slate-100 dark:divide-slate-800">
        <div
          v-for="lead in leads"
          :key="lead.id"
          class="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors space-y-2.5"
        >
          <!-- Top Row: Name, Priority, Status, Testimonials, Demographics, and SLA Countdown -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/leads/${lead.id}`"
                class="font-semibold text-base text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                {{ lead.name }}
              </NuxtLink>

              <!-- Priority Badge -->
              <span
                :class="[
                  'px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider',
                  lead.priority === 'hot'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : lead.priority === 'warm'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                ]"
              >
                {{ lead.priority === 'hot' ? '🔥 HOT' : lead.priority === 'warm' ? '⚡ WARM' : '❄️ COLD' }}
              </span>

              <!-- Status Badge (Color-coded for quick recognition) -->
              <span
                :class="[
                  'px-2 py-0.5 text-[10px] font-semibold rounded-md border flex items-center gap-1.5',
                  lead.status === 'new'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    : lead.status === 'contacted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : lead.status === 'not_reachable'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                    : lead.status === 'appointment_booked'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
                    : lead.status === 'converted'
                    ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                ]"
              >
                <span v-if="lead.status === 'new'" class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{{ formatStatus(lead.status) }}</span>
              </span>

              <!-- Call Count Pill (Shows call attempts) -->
              <span
                v-if="(lead._count?.interactions || 0) > 0"
                class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                title="Number of call interactions logged"
              >
                📞 {{ lead._count.interactions }} {{ lead._count.interactions === 1 ? 'call' : 'calls' }}
              </span>
              <span
                v-else-if="lead.status === 'new'"
                class="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
              >
                Not Called Yet
              </span>

              <!-- Testimonials Status Toggle -->
              <label
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium cursor-pointer select-none transition-colors"
                :class="[
                  (lead.testimonialsSentCount || 0) > 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-900/50 dark:border-slate-750 dark:text-slate-400'
                ]"
                @click.stop
              >
                <input
                  type="checkbox"
                  :checked="(lead.testimonialsSentCount || 0) > 0"
                  :disabled="isUpdatingTestimonial[lead.id]"
                  class="w-3 h-3 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                  @change="toggleTestimonialsSent(lead, $event)"
                />
                <span>{{ (lead.testimonialsSentCount || 0) > 0 ? '✓ Testimonials Sent' : 'Testimonials' }}</span>
              </label>

              <!-- Demographics (Age & Location) -->
              <span v-if="lead.age" class="text-xs text-slate-400">
                • <strong class="text-slate-600 dark:text-slate-300 font-medium">{{ lead.age }} yrs</strong>
              </span>
              <span v-if="lead.location" class="text-xs text-slate-400">
                • <strong class="text-slate-600 dark:text-slate-300 font-medium">📍 {{ lead.location }}</strong>
              </span>
            </div>

            <!-- First-Response SLA Countdown Badge (Pinned to Right) -->
            <div
              v-if="lead.status === 'new' && lead.firstResponseDueAt"
              :class="[
                'px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border shrink-0',
                isBreached(lead.firstResponseDueAt)
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              ]"
            >
              <span>⏱️</span>
              <span>{{ formatSlaTimer(lead.firstResponseDueAt) }} SLA</span>
            </div>
          </div>

          <!-- Middle Row: Contact & Attribution Metadata -->
          <div class="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span class="font-mono font-semibold text-slate-800 dark:text-slate-200">
              📞 {{ lead.mobile }}
            </span>
            <span v-if="lead.department?.labelEn" class="text-slate-300 dark:text-slate-600">•</span>
            <span v-if="lead.department?.labelEn" class="text-slate-600 dark:text-slate-300">
              🏥 {{ lead.department.labelEn }}
            </span>
            <span v-if="lead.source?.labelEn" class="text-slate-300 dark:text-slate-600">•</span>
            <span v-if="lead.source?.labelEn" class="text-slate-600 dark:text-slate-300">
              📡 {{ lead.source.labelEn }}
            </span>
            <span class="text-slate-300 dark:text-slate-600">•</span>

            <!-- Assignee Pill -->
            <button
              v-if="canReassignLead"
              type="button"
              @click.stop="openReassignModal(lead)"
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
              :class="lead.owner ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600' : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100'"
              :title="lead.owner ? 'Click to reassign lead' : 'Click to assign lead'"
            >
              <span>👤 {{ lead.owner?.name || 'Unassigned' }}</span>
              <span class="text-[10px] text-teal-600 dark:text-teal-400 font-bold">{{ lead.owner ? '⇄' : '+ Assign' }}</span>
            </button>
            <span v-else class="text-slate-600 dark:text-slate-400">
              👤 {{ lead.owner?.name || 'Unassigned' }}
            </span>
          </div>

          <!-- Bottom Row: Concern Callout Bubble & Action Buttons -->
          <div class="flex items-center justify-between gap-3 pt-1 flex-wrap">
            <!-- Left: Clinical Concern or Product Tags -->
            <div class="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <div v-if="lead.concern" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 max-w-xl truncate">
                <span class="text-slate-400">📝</span>
                <span class="truncate italic">"{{ lead.concern }}"</span>
              </div>
              <span v-if="lead.campaign" class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                📢 {{ lead.campaign.name }}
              </span>
              <span
                v-for="pi in (lead.productInterests || [])"
                :key="pi.id"
                class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-750 dark:border-slate-700"
              >
                {{ pi.product?.name }}
              </span>
            </div>

            <!-- Right: 4 Clean, Unified Action Buttons -->
            <div class="flex items-center gap-2 shrink-0 ml-auto">
              <!-- Direct Call -->
              <a
                :href="`tel:${lead.mobileNorm || lead.mobile}`"
                class="h-9 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Call Patient"
              >
                <span>📞</span>
                <span>Call</span>
              </a>

              <!-- WhatsApp -->
              <a
                :href="getWhatsAppLink(lead)"
                target="_blank"
                class="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Chat on WhatsApp"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>

              <!-- Edit -->
              <button
                type="button"
                @click.stop="openEditModal(lead)"
                class="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Edit Lead Details"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>

              <!-- View Details -->
              <NuxtLink
                :to="`/leads/${lead.id}`"
                class="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm shadow-teal-600/20"
                title="View Full Lead File"
              >
                <span>View</span>
                <span>→</span>
              </NuxtLink>
            </div>
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

    <!-- Reassign Lead Modal -->
    <ReassignLeadModal
      :is-open="showReassignModal"
      :lead="selectedLeadToReassign"
      @close="showReassignModal = false"
      @reassigned="onLeadReassigned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LeadQuickCreateDrawer from '~/components/lead/QuickCreateDrawer.vue';
import EditLeadModal from '~/components/lead/EditLeadModal.vue';
import ReassignLeadModal from '~/components/lead/ReassignLeadModal.vue';
import TestimonialChip from '~/components/testimonials/TestimonialChip.vue';
import { formatSlaTimer } from '~/utils/time-format';
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

const selectedDateRange = ref<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
const customStartDate = ref('');
const customEndDate = ref('');

const dateRanges = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

function initCustomDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  customEndDate.value = end.toISOString().slice(0, 10);
  customStartDate.value = start.toISOString().slice(0, 10);
}

function selectDateRange(rangeKey: any) {
  selectedDateRange.value = rangeKey;
  if (rangeKey === 'custom') {
    if (!customStartDate.value || !customEndDate.value) {
      initCustomDates();
    }
  }
  pagination.page = 1;
  fetchLeads();
}

function applyCustomDateFilter() {
  if (customStartDate.value && customEndDate.value) {
    if (customStartDate.value > customEndDate.value) {
      const temp = customStartDate.value;
      customStartDate.value = customEndDate.value;
      customEndDate.value = temp;
    }
    pagination.page = 1;
    fetchLeads();
  }
}

function getDateParams() {
  let startDate: string | undefined;
  let endDate: string | undefined;

  if (selectedDateRange.value === 'today') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (selectedDateRange.value === 'week') {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
    startDate = monday.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth(), diff + 6, 23, 59, 59, 999);
    endDate = end.toISOString();
  } else if (selectedDateRange.value === 'month') {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    startDate = d.toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    endDate = end.toISOString();
  } else if (selectedDateRange.value === 'custom') {
    if (customStartDate.value) {
      startDate = new Date(`${customStartDate.value}T00:00:00`).toISOString();
    }
    if (customEndDate.value) {
      endDate = new Date(`${customEndDate.value}T23:59:59.999`).toISOString();
    }
  }

  return { startDate, endDate };
}

const stats = reactive({
  all: 0,
  active: 0,
  new: 0,
  contacted: 0,
  qualified: 0,
  appointment_booked: 0,
  converted: 0,
  not_reachable: 0,
  not_interested: 0,
});

const selectStatusFilter = (status: string) => {
  if (filters.status === status) {
    filters.status = 'active';
  } else {
    filters.status = status;
  }
  pagination.page = 1;
  fetchLeads();
};

const showReassignModal = ref(false);
const selectedLeadToReassign = ref<any | null>(null);

const openReassignModal = (lead: any) => {
  selectedLeadToReassign.value = lead;
  showReassignModal.value = true;
};

const onLeadReassigned = () => {
  fetchLeads();
};

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
  status: 'active',
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
  return ['owner', 'admin', 'super_admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(role) || authStore.hasPermission('lead.view_all');
});

const canReassignLead = computed(() => {
  const role = userRoleCode.value;
  return (
    ['owner', 'admin', 'center_head', 'telecaller_manager'].includes(role) ||
    authStore.hasPermission('lead.reassign')
  );
});

const staffMembers = ref<any[]>([]);

const filteredStaffMembers = computed(() => {
  if (activeLeadType.value === 'product') {
    const prods = staffMembers.value.filter((s: any) => {
      const code = (s.role?.code || '').toLowerCase();
      return ['product_sales_executive', 'product_caller', 'product_manager'].includes(code);
    });
    return prods.length > 0 ? prods : staffMembers.value;
  }
  const nonProds = staffMembers.value.filter((s: any) => {
    const code = (s.role?.code || '').toLowerCase();
    return !['product_sales_executive', 'product_caller'].includes(code);
  });
  return nonProds.length > 0 ? nonProds : staffMembers.value;
});

const fetchStaffMembers = async () => {
  try {
    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

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

const canCreateLead = computed(() => {
  const role = userRoleCode.value;
  if (['owner', 'admin', 'super_admin', 'center_head', 'telecaller_manager', 'support_telecaller', 'caller', 'product_sales_executive', 'product_caller', 'product_manager'].includes(role)) {
    return true;
  }
  return authStore.hasPermission('lead.create') || authStore.hasPermission('product_lead.create');
});

const activeLeadType = ref<'treatment' | 'product'>('treatment');
const tasksDueTodayCount = ref(0);

const fetchTasksDueToday = async () => {
  try {
    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    if (!token) return;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const team = (activeLeadType.value === 'product' || isProductStaff.value) ? 'product' : 'support';
    const ownerParam = filters.ownerId && filters.ownerId !== 'unassigned' ? `&ownerId=${filters.ownerId}` : '';
    const res = await fetch(`${apiBase}/tasks?due=today&status=open&pageSize=1&nextStepOnly=true&team=${team}${ownerParam}`, {
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      tasksDueTodayCount.value = data.meta?.total || 0;
    }
  } catch (err) {
    console.error('Failed to fetch tasks due today', err);
  }
};

const setLeadType = (type: 'treatment' | 'product') => {
  activeLeadType.value = type;
  pagination.page = 1;
  fetchLeads();
  fetchTasksDueToday();
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
      sortBy: 'created_at',
      sortOrder: 'desc',
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

    const { startDate, endDate } = getDateParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/leads?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      leads.value = data.leads || [];
      pagination.total = data.pagination?.total || 0;
      pagination.totalPages = data.pagination?.totalPages || 1;
      if (data.stats) {
        Object.assign(stats, data.stats);
      }
    }
    fetchTasksDueToday();
  } catch (err) {
    console.error('Failed to load leads', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const route = useRoute();
  if (route.query.status && typeof route.query.status === 'string') {
    filters.status = route.query.status;
  }
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

const getWhatsAppLink = (lead: any) => {
  const cleanPhone = (lead.mobileNorm || lead.mobile).replace(/[^0-9]/g, '');
  const greeting = `Hello ${lead.name}, regarding your healthcare inquiry with Hospital CRM.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
};

</script>
