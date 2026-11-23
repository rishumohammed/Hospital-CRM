<template>
  <div class="space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <span>{{ t('nav.dues_followup') || 'Follow-up' }}</span>
          <span class="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-semibold">
            {{ totalTasks }} Total
          </span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {{ activeDesk === 'product' ? 'Track customer product inquiries, callback requests, and order follow-ups.' : 'Track overdue calls, callbacks due today, and scheduled patient follow-ups.' }}
        </p>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Quick Create Lead Button -->
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

    <!-- Treatment vs Product Follow-up Top Toggle Bar: Only show if user has access to BOTH -->
    <div v-if="canViewTreatmentFollowups && canViewProductFollowups" class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
      <button
        v-if="canViewTreatmentFollowups"
        type="button"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-2xs cursor-pointer',
          activeDesk === 'treatment'
            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
        ]"
        @click="setDesk('treatment')"
      >
        <span>🏥</span>
        <span>Treatment Follow-ups</span>
      </button>

      <button
        v-if="canViewProductFollowups"
        type="button"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shadow-2xs cursor-pointer',
          activeDesk === 'product'
            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
        ]"
        @click="setDesk('product')"
      >
        <span>📦</span>
        <span>Product Follow-ups</span>
      </button>
    </div>

    <!-- Quick Status KPI Cards -->
    <div :class="['grid grid-cols-2 gap-3 sm:gap-4', activeDesk === 'product' ? 'lg:grid-cols-3' : 'lg:grid-cols-4']">
      <!-- 1. Overdue Dues -->
      <button
        type="button"
        @click="selectTiming('overdue')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          activeTiming === 'overdue'
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Overdue Dues
          </span>
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" v-if="overdueCount > 0" />
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
            {{ overdueCount }}
          </span>
          <span class="text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">Urgent attention</span>
        </div>
      </button>

      <!-- 2. Due Today -->
      <button
        type="button"
        @click="selectTiming('today')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          activeTiming === 'today'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Due Today
          </span>
          <span class="text-base">📅</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {{ todayCount }}
          </span>
          <span class="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium">Today's callbacks</span>
        </div>
      </button>

      <!-- 3. Today's Visits (Clinical Only) -->
      <button
        v-if="activeDesk !== 'product'"
        type="button"
        @click="selectTiming('today_visits')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          activeTiming === 'today_visits'
            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800/60'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Today's Visits
          </span>
          <span class="text-base">🏥</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400">
            {{ todayVisitCount }}
          </span>
          <span class="text-xs text-teal-600/80 dark:text-teal-400/80 font-medium">Clinic visits today</span>
        </div>
      </button>

      <!-- 4. Upcoming Follow-ups -->
      <button
        type="button"
        @click="selectTiming('upcoming')"
        :class="[
          'p-4 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between group cursor-pointer',
          activeTiming === 'upcoming'
            ? 'bg-slate-100 dark:bg-slate-700/60 border-slate-400 dark:border-slate-500 ring-2 ring-slate-500/30 shadow-sm'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Upcoming Follow-ups
          </span>
          <span class="text-base">⏳</span>
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            {{ upcomingCount }}
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Future milestones</span>
        </div>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="flex flex-col lg:flex-row items-center gap-3">
        <!-- Search Input -->
        <div class="flex-1 w-full relative">
          <input
            v-model="searchQuery"
            @input="handleSearch"
            type="text"
            placeholder="Search patient name, mobile, or note..."
            class="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span class="absolute left-3.5 top-3 text-slate-400">🔍</span>
          <button
            v-if="searchQuery"
            type="button"
            @click="clearSearch"
            class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-sm cursor-pointer"
            title="Clear search"
          >
            ✕
          </button>
        </div>

        <!-- Priority Filter -->
        <div class="w-full sm:w-44 shrink-0">
          <select
            v-model="priorityFilter"
            class="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="">⚡ All Priorities</option>
            <option value="hot">🔥 Hot Priority</option>
            <option value="warm">🌤️ Warm Priority</option>
            <option value="cold">❄️ Cold Priority</option>
          </select>
        </div>

        <!-- Staff / Telecaller Filter (Management) -->
        <div v-if="canViewAllStaff" class="w-full sm:w-60 shrink-0">
          <select
            v-model="ownerFilter"
            class="w-full h-11 px-3 rounded-xl border border-teal-200 dark:border-teal-700/70 bg-teal-50/50 dark:bg-teal-950/30 text-teal-950 dark:text-teal-200 text-xs font-semibold focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="">{{ activeDesk === 'product' ? '👤 All Product Staff' : '👤 All Telecallers' }}</option>
            <option
              v-for="staff in filteredStaffMembers"
              :key="staff.id"
              :value="staff.id.toString()"
            >
              {{ staff.name }} ({{ staff.role?.name || staff.role?.code }})
            </option>
          </select>
        </div>

        <!-- Single Next Step Toggle -->
        <button
          type="button"
          :class="[
            'h-11 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer',
            groupByPatient
              ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700'
              : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
          ]"
          @click="toggleNextStepOnly"
          title="Consolidate multiple future follow-up steps under single next step"
        >
          <span>👥</span>
          <span>Single Next Step: {{ groupByPatient ? 'ON' : 'OFF' }}</span>
        </button>

        <!-- View Mode Toggle: Cards vs Table/List -->
        <div class="flex items-center h-11 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            :class="[
              'h-full px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'cards'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            ]"
            @click="setViewMode('cards')"
            title="Cards Grid View"
          >
            <span>▦</span>
            <span>Cards</span>
          </button>
          <button
            type="button"
            :class="[
              'h-full px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            ]"
            @click="setViewMode('table')"
            title="Table / List View"
          >
            <span>☰</span>
            <span>Table</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-16 flex flex-col justify-center items-center gap-3">
      <div class="w-9 h-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <span class="text-xs text-slate-400 font-medium">Loading dues & follow-up queue...</span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="displayedItems.length === 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm"
    >
      <div v-if="searchQuery" class="space-y-3">
        <div class="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 text-2xl">
          🔍
        </div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          No follow-ups found
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          No follow-up tasks match "<span class="font-semibold text-slate-700 dark:text-slate-200">{{ searchQuery }}</span>"<span v-if="activeTiming !== 'all'"> in <strong>{{ activeTiming }}</strong> dues</span>.
        </p>
        <div class="flex items-center justify-center gap-2 pt-2">
          <button
            v-if="activeTiming !== 'all'"
            type="button"
            @click="selectTiming('all')"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 transition-colors"
          >
            Search in All Dues
          </button>
          <button
            type="button"
            @click="clearSearch"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 transition-colors"
          >
            Clear Search
          </button>
        </div>
      </div>
      <div v-else-if="fetchError" class="space-y-3">
        <div class="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500 text-2xl">
          ⚠️
        </div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Failed to load follow-up tasks
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          {{ fetchError }}
        </p>
        <div class="pt-2">
          <button
            type="button"
            @click="loadTasks"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
      <div v-else>
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-3xl">
          🎉
        </div>
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4">
          {{ activeTiming === 'today_visits' ? "No Visits Scheduled Today" : "No Pending Dues Found" }}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          {{ activeTiming === 'today_visits' ? "No patient clinic visits scheduled for today under this filter." : "Great job! You are completely caught up on all follow-ups for this filter." }}
        </p>
      </div>
    </div>

    <!-- Task Display: Cards vs Table/List -->
    <template v-else>
      <!-- 1. Task Cards Grid View -->
      <div v-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in displayedItems"
          :key="item.id"
          class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <!-- Card Header: Priority & Due Badge -->
            <div class="flex items-center justify-between mb-3">
              <span
                :class="[
                  'text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full',
                  item.priority === 'hot'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : item.priority === 'cold'
                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                ]"
              >
                {{ item.priority }}
              </span>

              <!-- Timing Badge -->
              <span
                :class="[
                  'text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1',
                  getDueStatusClass(item.dueAt)
                ]"
              >
                <span>{{ getDueLabel(item.dueAt) }}</span>
              </span>
            </div>

            <!-- Patient / Lead Info -->
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors">
                  <NuxtLink v-if="getDossierUrl(item)" :to="getDossierUrl(item)!" class="hover:underline flex items-center gap-1.5 group">
                    <span>{{ item.lead?.name || item.case?.patient?.name || 'Patient' }}</span>
                    <span class="text-xs text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                  </NuxtLink>
                  <span v-else>{{ item.case?.patient?.name || item.lead?.name || 'Patient' }}</span>
                </h3>

                <NuxtLink
                  v-if="getDossierUrl(item)"
                  :to="getDossierUrl(item)!"
                  class="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800/60 transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <span>{{ item.lead ? 'View Lead' : 'View Case' }}</span>
                  <span>&rarr;</span>
                </NuxtLink>
              </div>

              <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span class="font-mono font-medium">{{ item.lead?.mobile || item.case?.patient?.mobileNorm || '—' }}</span>
                <span v-if="item.lead?.leadType === 'product'" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  📦 Product
                </span>
                <span v-if="item.groupedCount && item.groupedCount > 1" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                  +{{ item.groupedCount - 1 }} more follow-ups
                </span>
              </div>
            </div>

            <!-- Structured Follow-up Reason & Context Section -->
            <div class="mt-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
              <!-- 1. Follow-up Reason / Action -->
              <div class="flex items-start gap-2">
                <span class="text-teal-600 dark:text-teal-400 text-sm mt-0.5 flex-shrink-0">🎯</span>
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400 block">
                    Follow-up Reason
                  </span>
                  <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words mt-0.5">
                    {{ getFollowUpReason(item) }}
                  </p>
                </div>
              </div>

              <!-- 2. Last Call Note / Discussion (if entered) -->
              <div v-if="getLastNote(item)" class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2 bg-amber-50/60 dark:bg-amber-950/20 -mx-1 px-2 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                <span class="text-amber-500 text-xs mt-0.5 flex-shrink-0">💬</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1 flex-wrap">
                    <span class="text-[10px] uppercase font-bold tracking-wider text-amber-800 dark:text-amber-300">
                      Previous Call Note
                    </span>
                    <span v-if="getLastOutcome(item)" class="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                      {{ getLastOutcome(item) }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-700 dark:text-slate-300 italic break-words mt-1">
                    "{{ getLastNote(item) }}"
                  </p>
                  <span v-if="getLastCallerInfo(item)" class="text-[10px] text-slate-400 block mt-1 font-medium">
                    {{ getLastCallerInfo(item) }}
                  </span>
                </div>
              </div>

              <!-- Scheduled Appointment Banner (if present) -->
              <div v-if="getAppointmentInfo(item)" class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2 bg-teal-50/70 dark:bg-teal-950/30 -mx-1 px-2 py-1.5 rounded-lg border border-teal-200/60 dark:border-teal-800/60">
                <span class="text-teal-600 dark:text-teal-400 text-xs mt-0.5 flex-shrink-0">🩺</span>
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-teal-800 dark:text-teal-300 block">
                    Scheduled Appointment
                  </span>
                  <p class="text-xs font-semibold text-teal-900 dark:text-teal-200 break-words mt-0.5">
                    {{ getAppointmentInfo(item) }}
                  </p>
                </div>
              </div>

              <!-- 3. Initial Concern / Inquiry Topic -->
              <div v-if="item.lead?.concern || item.case?.planNote" class="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
                <span class="text-indigo-500 text-xs mt-0.5 flex-shrink-0">🩺</span>
                <div class="flex-1 min-w-0">
                  <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Inquiry Concern
                  </span>
                  <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {{ item.lead?.concern || item.case?.planNote }}
                  </p>
                </div>
              </div>

              <!-- 4. Metadata: Department & Source -->
              <div class="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span v-if="item.lead?.department || item.case?.department">
                  🏥 {{ item.lead?.department?.labelEn || item.case?.department?.labelEn }}
                </span>
                <span v-if="item.lead?.source">
                  &bull; {{ item.lead.source.labelEn }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-1.5">
              <!-- 1. Direct Call -->
              <a
                v-if="getMobile(item)"
                :href="`tel:${getMobile(item)}`"
                class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 transition-colors"
                title="Call immediately"
              >
                📞
              </a>

              <!-- 2. WhatsApp -->
              <button
                v-if="getMobile(item)"
                type="button"
                @click="openWhatsApp(item)"
                class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition-colors"
                title="Open WhatsApp chat"
              >
                💬
              </button>
            </div>

            <div class="flex items-center gap-2">
              <!-- Mark Visited (Post-Appointment) -->
              <button
                v-if="item.lead && isPostAppointment(item) && item.lead.status !== 'converted'"
                type="button"
                @click="openMarkVisited(item)"
                class="px-3 py-1.5 rounded-xl border border-teal-600 dark:border-teal-500 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                title="Mark patient arrival & consultation decision"
              >
                <span>🏥</span>
                <span>Mark Visited</span>
              </button>

              <!-- Reschedule Appointment (if appointment exists) -->
              <button
                v-if="item.lead && hasAppointment(item)"
                type="button"
                @click="openBookAppt(item)"
                class="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/60 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Reschedule Appointment"
              >
                <span>📅</span>
                <span>Reschedule</span>
              </button>

              <!-- Book Appointment (if NO appointment exists) -->
              <button
                v-else-if="item.lead"
                type="button"
                @click="openBookAppt(item)"
                class="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Book Appointment"
              >
                <span>📅</span>
                <span>Book</span>
              </button>

              <!-- Log Call / Next Action -->
              <button
                type="button"
                @click="openLogCall(item)"
                class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Log Call
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Task Table / List View -->
      <div v-else class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50/80 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80 dark:border-slate-700">
                <th class="py-3 px-4">Priority &amp; Timing</th>
                <th class="py-3 px-4">Patient / Lead</th>
                <th class="py-3 px-4">Follow-up Reason &amp; Notes</th>
                <th class="py-3 px-4">Desk / Department</th>
                <th class="py-3 px-4">Telecaller</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
              <tr
                v-for="item in displayedItems"
                :key="item.id"
                class="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
              >
                <!-- Priority & Due Timing -->
                <td class="py-3.5 px-4 align-top whitespace-nowrap">
                  <div class="flex flex-col gap-1.5 items-start">
                    <span
                      :class="[
                        'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block',
                        item.priority === 'hot'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : item.priority === 'cold'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      ]"
                    >
                      {{ item.priority }}
                    </span>
                    <span
                      :class="[
                        'text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1',
                        getDueStatusClass(item.dueAt)
                      ]"
                    >
                      {{ getDueLabel(item.dueAt) }}
                    </span>
                  </div>
                </td>

                <!-- Patient / Lead Info -->
                <td class="py-3.5 px-4 align-top">
                  <div class="space-y-0.5">
                    <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 transition-colors">
                      <NuxtLink v-if="getDossierUrl(item)" :to="getDossierUrl(item)!" class="hover:underline flex items-center gap-1 group">
                        <span>{{ item.lead?.name || item.case?.patient?.name || 'Patient' }}</span>
                        <span class="text-xs text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </NuxtLink>
                      <span v-else>{{ item.case?.patient?.name || item.lead?.name || 'Patient' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                      <span>{{ item.lead?.mobile || item.case?.patient?.mobileNorm || '—' }}</span>
                    </div>
                    <div class="flex items-center gap-1 flex-wrap pt-0.5">
                      <span v-if="item.lead?.leadType === 'product'" class="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        📦 Product
                      </span>
                      <span v-if="item.groupedCount && item.groupedCount > 1" class="px-1.5 py-0.2 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        +{{ item.groupedCount - 1 }} more
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Follow-up Reason & Notes -->
                <td class="py-3.5 px-4 align-top max-w-xs sm:max-w-sm">
                  <div class="space-y-1">
                    <p class="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      {{ getFollowUpReason(item) }}
                    </p>
                    <div v-if="getAppointmentInfo(item)" class="text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60 flex items-center gap-1 w-fit mt-1">
                      <span>🩺</span>
                      <span>{{ getAppointmentInfo(item) }}</span>
                    </div>
                    <p v-if="getLastNote(item)" class="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200/50 italic line-clamp-2">
                      "{{ getLastNote(item) }}"
                    </p>
                    <p v-else-if="item.lead?.concern || item.case?.planNote" class="text-[11px] text-slate-500 line-clamp-1">
                      Concern: {{ item.lead?.concern || item.case?.planNote }}
                    </p>
                  </div>
                </td>

                <!-- Desk / Department / Source -->
                <td class="py-3.5 px-4 align-top whitespace-nowrap text-slate-600 dark:text-slate-400">
                  <div class="space-y-0.5">
                    <div v-if="item.lead?.department || item.case?.department" class="font-medium text-slate-700 dark:text-slate-300">
                      {{ item.lead?.department?.labelEn || item.case?.department?.labelEn }}
                    </div>
                    <div v-if="item.lead?.source" class="text-[11px] text-slate-400">
                      {{ item.lead.source.labelEn }}
                    </div>
                  </div>
                </td>

                <!-- Assigned Telecaller -->
                <td class="py-3.5 px-4 align-top whitespace-nowrap text-slate-600 dark:text-slate-400">
                  <div v-if="item.owner" class="flex items-center gap-1.5 font-medium">
                    <span class="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] flex items-center justify-center font-bold">
                      {{ item.owner.name?.charAt(0) || '👤' }}
                    </span>
                    <span>{{ item.owner.name }}</span>
                  </div>
                  <span v-else class="text-slate-400 italic">Unassigned</span>
                </td>

                <!-- Actions -->
                <td class="py-3.5 px-4 align-top text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Call -->
                    <a
                      v-if="getMobile(item)"
                      :href="`tel:${getMobile(item)}`"
                      class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 hover:text-teal-600 transition-colors"
                      title="Direct Call"
                    >
                      📞
                    </a>

                    <!-- WhatsApp -->
                    <button
                      v-if="getMobile(item)"
                      type="button"
                      @click="openWhatsApp(item)"
                      class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 hover:text-emerald-600 transition-colors"
                      title="WhatsApp Chat"
                    >
                      💬
                    </button>

                    <!-- Mark Visited (Post-Appointment) -->
                    <button
                      v-if="item.lead && isPostAppointment(item) && item.lead.status !== 'converted'"
                      type="button"
                      @click="openMarkVisited(item)"
                      class="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-teal-600 dark:border-teal-500 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold text-xs transition-colors flex items-center gap-1"
                      title="Mark Visited & Record Consultation Decision"
                    >
                      <span>🏥</span>
                      <span class="hidden sm:inline">Mark Visited</span>
                    </button>

                    <!-- Reschedule (if appointment exists) -->
                    <button
                      v-if="item.lead && hasAppointment(item)"
                      type="button"
                      @click="openBookAppt(item)"
                      class="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-semibold text-xs transition-colors flex items-center gap-1"
                      title="Reschedule Appointment"
                    >
                      <span>📅</span>
                      <span class="hidden sm:inline">Reschedule</span>
                    </button>

                    <!-- Book Appt (if NO appointment exists) -->
                    <button
                      v-else-if="item.lead"
                      type="button"
                      @click="openBookAppt(item)"
                      class="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                      title="Book Appointment"
                    >
                      <span>📅</span>
                      <span class="hidden sm:inline">Book</span>
                    </button>

                    <!-- Log Call -->
                    <button
                      type="button"
                      @click="openLogCall(item)"
                      class="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                    >
                      Log Call
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
      <span class="text-xs text-slate-500">
        Page {{ page }} of {{ totalPages }}
      </span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="page <= 1"
          @click="page--; loadTasks()"
          class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          :disabled="page >= totalPages"
          @click="page++; loadTasks()"
          class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Modals & Drawers -->
    <LogCallDrawer
      :is-open="isLogCallOpen"
      :lead="selectedTask?.lead"
      :case-id="selectedTask?.case?.id"
      :task-id="selectedTask?.id"
      :recipient-name="selectedTask?.lead?.name || selectedTask?.case?.patient?.name"
      :recipient-phone="selectedTask?.lead?.mobile || selectedTask?.case?.patient?.mobileNorm"
      @close="isLogCallOpen = false"
      @call-logged="onActionCompleted"
    />

    <BookAppointmentModal
      :is-open="isBookApptOpen"
      :lead="selectedTask?.lead"
      @close="isBookApptOpen = false"
      @booked="onActionCompleted"
    />

    <MarkVisitedModal
      :is-open="isMarkVisitedOpen"
      :lead="selectedTask?.lead"
      :task="selectedTask"
      @close="isMarkVisitedOpen = false"
      @converted="onActionCompleted"
    />

    <LeadQuickCreateDrawer
      :is-open="showQuickCreate"
      :default-lead-type="activeDesk === 'product' || isProductStaff ? 'product' : 'treatment'"
      @close="showQuickCreate = false"
      @created="onActionCompleted"
      @lead-created="onActionCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';
import MarkVisitedModal from '~/components/lead/MarkVisitedModal.vue';
import LeadQuickCreateDrawer from '~/components/lead/QuickCreateDrawer.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

// Filter & View State
const viewMode = ref<'cards' | 'table'>('cards');
const setViewMode = (mode: 'cards' | 'table') => {
  viewMode.value = mode;
  if (import.meta.client) {
    localStorage.setItem('crm_followup_view_mode', mode);
  }
};

const activeTiming = ref<'all' | 'overdue' | 'today' | 'today_visits' | 'upcoming'>('today');
const searchQuery = ref('');
const priorityFilter = ref('');
const ownerFilter = ref('');
const groupByPatient = ref(true);

const page = ref(1);
const pageSize = ref(50);
const totalTasks = ref(0);
const totalPages = ref(1);

const tasks = ref<any[]>([]);
const isLoading = ref(true);
const fetchError = ref('');

const overdueCount = ref(0);
const todayCount = ref(0);
const todayVisitCount = ref(0);
const upcomingCount = ref(0);

// Drawers State
const isLogCallOpen = ref(false);
const isBookApptOpen = ref(false);
const isMarkVisitedOpen = ref(false);
const showQuickCreate = ref(false);
const selectedTask = ref<any>(null);

const userRoleCode = computed(() => {
  const u = authStore.user;
  if (!u) return '';
  return (u.role?.code || (u as any).roleCode || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
});

const canViewAllStaff = computed(() => {
  return ['owner', 'admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(userRoleCode.value);
});

const isProductStaff = computed(() => {
  return ['product_sales_executive', 'product_caller', 'product_manager'].includes(userRoleCode.value);
});

const canViewTreatmentFollowups = computed(() => {
  if (isProductStaff.value && !['owner', 'admin'].includes(userRoleCode.value)) return false;
  return authStore.hasPermission('task.view') && (authStore.hasPermission('lead.view') || authStore.hasPermission('case.view'));
});

const canViewProductFollowups = computed(() => {
  return isProductStaff.value || authStore.hasPermission('product_lead.view');
});

const activeDesk = ref<'treatment' | 'product'>('treatment');

const setDesk = (desk: 'treatment' | 'product') => {
  activeDesk.value = desk;
  if (desk === 'product' && activeTiming.value === 'today_visits') {
    activeTiming.value = 'all';
  }
  ownerFilter.value = '';
  page.value = 1;
  loadTasks();
  fetchTimingCounts();
};

const staffMembers = ref<any[]>([]);

const filteredStaffMembers = computed(() => {
  if (activeDesk.value === 'product') {
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
  if (!canViewAllStaff.value) return;
  try {
    const res = await fetch(`${apiBase}/users/staff`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      const data = await res.json();
      staffMembers.value = data.items || [];
    }
  } catch (err) {
    console.error('Failed to load staff list', err);
  }
};

const userSelectedTiming = ref<string>('');

const selectTiming = (timing: 'all' | 'overdue' | 'today' | 'today_visits' | 'upcoming') => {
  if (activeTiming.value === timing) {
    activeTiming.value = 'all';
    userSelectedTiming.value = 'all';
  } else {
    userSelectedTiming.value = timing;
    activeTiming.value = timing;
  }
  page.value = 1;
  loadTasks();
};

const toggleNextStepOnly = () => {
  groupByPatient.value = !groupByPatient.value;
};

// Automatically reload tasks and refresh KPI cards whenever any filter changes
watch([ownerFilter, priorityFilter, groupByPatient], () => {
  page.value = 1;
  loadTasks();
  fetchTimingCounts();
});

let searchDebounce: any = null;
const handleSearch = () => {
  clearTimeout(searchDebounce);
  if (searchQuery.value.trim() && !userSelectedTiming.value && activeTiming.value === 'today') {
    activeTiming.value = 'all';
  }
  searchDebounce = setTimeout(() => {
    page.value = 1;
    loadTasks();
    fetchTimingCounts();
  }, 300);
};

const clearSearch = () => {
  searchQuery.value = '';
  if (!userSelectedTiming.value && activeTiming.value === 'all') {
    activeTiming.value = 'today';
  }
  page.value = 1;
  loadTasks();
  fetchTimingCounts();
};

// Fetch Tasks
const loadTasks = async () => {
  if (!authStore.token) return;
  isLoading.value = true;

  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      pageSize: pageSize.value.toString(),
      status: 'open',
    });

    if (activeTiming.value !== 'all') {
      params.append('due', activeTiming.value);
    }

    if (ownerFilter.value) {
      params.append('ownerId', ownerFilter.value);
    }

    if (priorityFilter.value) {
      params.append('priority', priorityFilter.value);
    }

    if (searchQuery.value.trim()) {
      params.append('search', searchQuery.value.trim());
    }

    if (groupByPatient.value && !searchQuery.value.trim()) {
      params.append('nextStepOnly', 'true');
    }

    const team = (activeDesk.value === 'product' || isProductStaff.value) ? 'product' : 'support';
    params.append('team', team);

    const res = await fetch(`${apiBase}/tasks?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });

    if (res.ok) {
      fetchError.value = '';
      const result = await res.json();
      const rawTasks = result.data || [];
      tasks.value = rawTasks;
      totalTasks.value = result.meta?.total || tasks.value.length;
      totalPages.value = result.meta?.totalPages || 1;
    } else {
      fetchError.value = `Server returned status ${res.status}. Could not load follow-up list.`;
    }
  } catch (err: any) {
    console.error('Failed to load tasks', err);
    fetchError.value = 'Network error: could not connect to server.';
  } finally {
    isLoading.value = false;
  }
};

// Fetch KPI timing counts according to active filters
const fetchTimingCounts = async () => {
  if (!authStore.token) return;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const ownerParam = ownerFilter.value ? `&ownerId=${ownerFilter.value}` : '';
    const priorityParam = priorityFilter.value ? `&priority=${priorityFilter.value}` : '';
    const nextStepParam = groupByPatient.value ? '&nextStepOnly=true' : '';
    const searchParam = searchQuery.value.trim() ? `&search=${encodeURIComponent(searchQuery.value.trim())}` : '';
    const team = (activeDesk.value === 'product' || isProductStaff.value) ? 'product' : 'support';
    const teamParam = `&team=${team}`;

    const filterSuffix = `${nextStepParam}${ownerParam}${priorityParam}${searchParam}${teamParam}`;

    const promises: Promise<any>[] = [
      fetch(`${apiBase}/tasks?due=overdue&status=open&pageSize=1${filterSuffix}`, { headers }),
      fetch(`${apiBase}/tasks?due=today&status=open&pageSize=1${filterSuffix}`, { headers }),
    ];
    if (activeDesk.value !== 'product') {
      promises.push(fetch(`${apiBase}/tasks?due=today_visits&status=open&pageSize=1${filterSuffix}`, { headers }));
    } else {
      promises.push(Promise.resolve({ ok: false }));
    }
    promises.push(fetch(`${apiBase}/tasks?due=upcoming&status=open&pageSize=1${filterSuffix}`, { headers }));

    const [odRes, tdRes, tvRes, upRes] = await Promise.all(promises);

    if (odRes.ok) overdueCount.value = (await odRes.json()).meta?.total || 0;
    if (tdRes.ok) todayCount.value = (await tdRes.json()).meta?.total || 0;
    if (tvRes.ok) {
      todayVisitCount.value = (await tvRes.json()).meta?.total || 0;
    } else {
      todayVisitCount.value = 0;
    }
    if (upRes.ok) upcomingCount.value = (await upRes.json()).meta?.total || 0;
  } catch (err) {
    console.error('Failed to fetch timing counts', err);
  }
};

// Grouped Items Computed
const displayedItems = computed(() => {
  let list = tasks.value;

  if (priorityFilter.value) {
    list = list.filter((t) => t.priority === priorityFilter.value);
  }

  if (!groupByPatient.value) {
    return list;
  }

  // Group by leadId or caseId, keeping the earliest task and recording count
  const grouped = new Map<string, any>();
  for (const item of list) {
    const key = item.leadId ? `lead_${item.leadId}` : item.caseId ? `case_${item.caseId}` : `task_${item.id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { ...item, groupedCount: 1 });
    } else {
      const existing = grouped.get(key);
      existing.groupedCount = (existing.groupedCount || 1) + 1;
      // Keep earliest due date
      if (new Date(item.dueAt) < new Date(existing.dueAt)) {
        grouped.set(key, { ...item, groupedCount: existing.groupedCount });
      }
    }
  }

  return Array.from(grouped.values());
});

const getMobile = (item: any) => {
  return item.lead?.mobile || item.case?.patient?.mobileNorm || '';
};

const getDueStatusClass = (dueAtStr: string) => {
  const diff = new Date(dueAtStr).getTime() - Date.now();
  if (diff < 0) {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
  }
  if (diff <= 24 * 3600 * 1000) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
};

import { formatFollowUpDueLabel } from '~/utils/time-format';

const getDueLabel = (dueAtStr: string) => {
  return formatFollowUpDueLabel(dueAtStr);
};

const getLastInteraction = (item: any) => {
  return item.lead?.interactions?.[0] || item.case?.interactions?.[0] || null;
};

const getLastNote = (item: any) => {
  const inter = getLastInteraction(item);
  return inter?.note?.trim() || '';
};

const getLastOutcome = (item: any) => {
  const inter = getLastInteraction(item);
  return inter?.outcome?.labelEn || inter?.outcome?.code || '';
};

const getLastCallerInfo = (item: any) => {
  const inter = getLastInteraction(item);
  if (!inter) return '';
  const callerName = inter.user?.name || '';
  const timeStr = inter.occurredAt
    ? new Date(inter.occurredAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  if (callerName && timeStr) return `by ${callerName} • ${timeStr}`;
  return callerName ? `by ${callerName}` : timeStr;
};

const getFollowUpReason = (item: any) => {
  if (item.title) {
    return item.title;
  }
  const lastNote = getLastNote(item);
  if (lastNote) {
    return `Follow-up: ${lastNote}`;
  }
  return 'Scheduled Care Follow-up';
};

const getAppointmentInfo = (item: any) => {
  const appt = item.lead?.appointments?.[0] || item.case?.appointments?.[0];
  if (!appt) return null;
  const time = new Date(appt.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = new Date(appt.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${appt.doctorName || 'Doctor'} • ${date} at ${time}`;
};

const getDossierUrl = (item: any) => {
  if (item.leadId || item.lead?.id) return `/leads/${item.leadId || item.lead.id}`;
  if (item.caseId || item.case?.id) return `/cases/${item.caseId || item.case.id}`;
  return null;
};

const openLogCall = (item: any) => {
  selectedTask.value = item;
  isLogCallOpen.value = true;
};

const getLeadAppointment = (item: any) => {
  return item.lead?.appointments?.[0] || item.case?.appointments?.[0] || null;
};

const hasAppointment = (item: any) => {
  return Boolean(getLeadAppointment(item));
};

const isPostAppointment = (item: any) => {
  const appt = getLeadAppointment(item);
  if (!appt) return false;
  const apptTime = new Date(appt.startsAt).getTime();
  const isPast = apptTime <= Date.now();
  const title = (item.title || '').toLowerCase();
  const isPostTask = title.includes('post-appointment') || title.includes('appointment attended') || title.includes('attended') || title.includes('visit');
  return isPast || isPostTask;
};

const openMarkVisited = (item: any) => {
  selectedTask.value = item;
  isMarkVisitedOpen.value = true;
};

const openBookAppt = (item: any) => {
  selectedTask.value = item;
  isBookApptOpen.value = true;
};

const openWhatsApp = (item: any) => {
  const mobile = getMobile(item);
  const cleanPhone = mobile.replace(/\D/g, '');
  const greeting = 'Hello, reaching out to you from Hospital CRM regarding your follow-up.';
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const completeReminder = async (item: any) => {
  try {
    await $fetch(`${config.public.apiBase}/tasks/${item.id}/complete`, {
      method: 'POST',
      headers: authStore.token ? { authorization: `Bearer ${authStore.token}` } : {},
      credentials: 'include',
    });
    onActionCompleted();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to complete reminder');
  }
};

const cancelReminder = async (item: any) => {
  if (!confirm(`Are you sure you want to cancel the reminder "${item.title}"?`)) return;
  try {
    await $fetch(`${config.public.apiBase}/tasks/${item.id}/cancel`, {
      method: 'POST',
      headers: authStore.token ? { authorization: `Bearer ${authStore.token}` } : {},
      credentials: 'include',
    });
    onActionCompleted();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to cancel reminder');
  }
};

const onActionCompleted = () => {
  loadTasks();
  fetchTimingCounts();
};

onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem('crm_followup_view_mode');
    if (saved === 'cards' || saved === 'table') {
      viewMode.value = saved;
    }
  }
  if (isProductStaff.value && !['owner', 'admin', 'center_head', 'telecaller_manager'].includes(userRoleCode.value)) {
    activeDesk.value = 'product';
  } else if (!canViewTreatmentFollowups.value && canViewProductFollowups.value) {
    activeDesk.value = 'product';
  }
  fetchStaffMembers();
  loadTasks();
  fetchTimingCounts();
});
</script>
