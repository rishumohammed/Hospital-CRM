<template>
  <div class="space-y-6">
    <!-- Hero / Welcome Header -->
    <div class="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-teal-900/10">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-teal-600/70 border border-teal-400/40 flex items-center justify-center text-teal-100 shadow-xs">
              <UIcon name="i-heroicons-squares-plus" class="w-5 h-5" />
            </span>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {{ t('nav.my_work') }}
            </h1>
          </div>
          <p class="mt-1 text-teal-100/90 text-sm leading-relaxed font-medium">
            {{ authStore.user?.name || 'Managing Director' }} &bull; {{ userRoleDisplay }} &bull; MAIN Campus
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-500 text-white font-semibold text-xs tracking-wider uppercase border border-teal-400/40 transition-all flex items-center gap-2 min-h-[44px] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            @click="isQuickCreateOpen = true"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4 stroke-2" />
            <span>{{ t('common.quick_create_lead') }}</span>
          </button>
        </div>
      </div>

      <!-- 1. Executive KPI Section: Only for Owner, Admins, Center Head, Managers -->
      <div v-if="isExecutive" class="mt-6 pt-5 border-t border-teal-600/50 flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <!-- View Switcher Tabs -->
          <div class="inline-flex p-1 rounded-2xl bg-teal-950/50 border border-teal-500/30 text-xs shadow-inner">
            <button
              type="button"
              @click="switchMetricTab('clinical')"
              :class="[
                'px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-2',
                activeMetricTab === 'clinical'
                  ? 'bg-white text-teal-900 shadow-sm shadow-teal-950/20'
                  : 'text-teal-200 hover:text-white hover:bg-teal-900/40'
              ]"
            >
              <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-teal-600" />
              <span>Consultation Leads</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono" :class="activeMetricTab === 'clinical' ? 'bg-teal-100 text-teal-800' : 'bg-teal-900 text-teal-200'">{{ todayMetrics?.clinical?.newLeads ?? 0 }} Today</span>
            </button>

            <button
              type="button"
              @click="switchMetricTab('product')"
              :class="[
                'px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-2',
                activeMetricTab === 'product'
                  ? 'bg-white text-teal-900 shadow-sm shadow-teal-950/20'
                  : 'text-teal-200 hover:text-white hover:bg-teal-900/40'
              ]"
            >
              <UIcon name="i-heroicons-shopping-bag" class="w-4 h-4 text-emerald-600" />
              <span>Product Leads</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono" :class="activeMetricTab === 'product' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-900 text-teal-200'">{{ todayMetrics?.product?.newLeads ?? 0 }} Today</span>
            </button>

            <button
              type="button"
              @click="switchMetricTab('all')"
              :class="[
                'px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-2',
                activeMetricTab === 'all'
                  ? 'bg-white text-teal-900 shadow-sm shadow-teal-950/20'
                  : 'text-teal-200 hover:text-white hover:bg-teal-900/40'
              ]"
            >
              <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 text-amber-500" />
              <span>All Operations</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <NuxtLink
              to="/reports"
              class="text-xs font-semibold text-teal-100 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl bg-teal-800/50 hover:bg-teal-700/60 border border-teal-500/30 shadow-xs"
            >
              <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5 text-teal-300" />
              <span>Reports</span>
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </div>

        <!-- 1. Clinical / Support Consultation Leads Grid -->
        <div v-if="activeMetricTab === 'all' || activeMetricTab === 'clinical'" class="space-y-2.5">
          <div v-if="activeMetricTab === 'all'" class="flex items-center justify-between pt-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-800/80 border border-teal-500/30 text-teal-100">
              <UIcon name="i-heroicons-user-group" class="w-3.5 h-3.5 text-teal-300" />
              <span>Clinical &amp; Consultation Leads</span>
            </span>
            <span class="text-[11px] text-teal-200/80 font-medium hidden sm:inline">Click any card to filter tasks or view leads</span>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <!-- 1. New Leads -->
            <div
              @click="navigateTo('/leads?status=new')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view new consultation leads"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>🌟</span>
                  <span>New Leads</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-white tracking-tight">
                  {{ todayMetrics?.clinical?.newLeads ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/80 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                <span>Hot Inquiries: {{ todayMetrics?.clinical?.newLeadsHot ?? 0 }}</span>
              </span>
            </div>

            <!-- 2. Follow-ups Done -->
            <div
              @click="navigateTo('/follow-ups')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view follow-ups"
            >
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>📞</span>
                  <span>Follow-ups Done</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl tracking-tight text-emerald-300">
                  {{ todayMetrics?.clinical?.followUpsDone ?? todayMetrics?.clinical?.followUpsCompleted ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] mt-2.5 flex items-center gap-1 font-normal text-teal-200/90">
                <span class="w-1.5 h-1.5 rounded-full" :class="(todayMetrics?.clinical?.followUpsDue || todayMetrics?.clinical?.followUps || 0) > 0 ? 'bg-amber-400' : 'bg-emerald-400'"></span>
                <span>{{ todayMetrics?.clinical?.followUpsDue ?? todayMetrics?.clinical?.followUps ?? 0 }} remaining due</span>
              </span>
            </div>

            <!-- 3. Appointments Got -->
            <div
              @click="navigateTo('/follow-ups')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view appointments and follow-ups"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>📅</span>
                  <span>Appointments Got</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-teal-100 tracking-tight">
                  {{ todayMetrics?.clinical?.appointmentsGot ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                <span>Booked by team</span>
              </span>
            </div>

            <!-- 4. Visiting -->
            <div
              @click="navigateTo('/follow-ups')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view patients visiting clinic"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>🏥</span>
                  <span>Visiting</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-emerald-300 tracking-tight">
                  {{ todayMetrics?.clinical?.visitingToday ?? todayMetrics?.clinical?.appointments ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-emerald-200/90 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{{ todayMetrics?.clinical?.visitedToday ?? todayMetrics?.clinical?.confirmedVisits ?? 0 }} Visited • {{ Math.max(0, (todayMetrics?.clinical?.visitingToday ?? todayMetrics?.clinical?.appointments ?? 0) - (todayMetrics?.clinical?.visitedToday ?? todayMetrics?.clinical?.confirmedVisits ?? 0)) }} Pending</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 2. Product & Formulation Leads Grid -->
        <div v-if="activeMetricTab === 'all' || activeMetricTab === 'product'" class="space-y-2.5">
          <div v-if="activeMetricTab === 'all'" class="flex items-center justify-between pt-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-800/80 border border-teal-500/30 text-teal-100">
              <UIcon name="i-heroicons-shopping-bag" class="w-3.5 h-3.5 text-emerald-300" />
              <span>Product Sales</span>
            </span>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <!-- P1. New Product Leads -->
            <div
              @click="navigateTo('/leads?type=product')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product leads"
            >
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>🛍️</span>
                  <span>New Inquiries</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-white tracking-tight">
                  {{ todayMetrics?.product?.newLeads ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/80 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                <span>Product orders &amp; inquiries</span>
              </span>
            </div>

            <!-- P2. Product Follow-ups Done -->
            <div
              @click="navigateTo('/follow-ups?tab=product')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product callbacks"
            >
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>🔄</span>
                  <span>Follow-ups Done</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-emerald-300 tracking-tight">
                  {{ todayMetrics?.product?.followUpsDone ?? todayMetrics?.product?.followUpsCompleted ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full" :class="(todayMetrics?.product?.followUpsDue || todayMetrics?.product?.followUps || 0) > 0 ? 'bg-amber-400' : 'bg-emerald-400'"></span>
                <span>{{ todayMetrics?.product?.followUpsDue ?? todayMetrics?.product?.followUps ?? 0 }} remaining due</span>
              </span>
            </div>

            <!-- P3. Scheduled Inquiries -->
            <div
              @click="navigateTo('/follow-ups?tab=product')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view scheduled product callbacks"
            >
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>📞</span>
                  <span>Scheduled Inquiries</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-teal-100 tracking-tight">
                  {{ todayMetrics?.product?.appointments ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                <span>Consultation &amp; order calls</span>
              </span>
            </div>

            <!-- P4. Confirmed Orders -->
            <div
              @click="navigateTo('/orders')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view confirmed orders"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <div class="flex items-center gap-1.5 text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">
                  <span>💰</span>
                  <span>Confirmed Orders</span>
                </div>
                <p class="mt-1.5 font-bold text-3xl text-emerald-300 tracking-tight">
                  {{ todayMetrics?.product?.confirmed ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-amber-200/90 mt-2.5 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>₹{{ (todayMetrics?.product?.revenue || 0).toLocaleString() }} confirmed value</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Telecaller Action Center: For Callers and Sales Executives -->
      <div v-else-if="isTelecaller || isProductStaff" class="mt-6 pt-5 border-t border-teal-600/50 flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-950/60 border border-teal-500/30 text-teal-100 flex items-center gap-1.5">
              <UIcon name="i-heroicons-phone-arrow-up-right" class="w-4 h-4 text-teal-300" />
              <span>Telecaller Daily Workstation</span>
            </span>
            <span class="text-xs text-teal-200/90 font-medium hidden sm:inline">Active calling tasks and response SLAs</span>
          </div>
          <NuxtLink
            to="/leads"
            class="text-xs font-semibold text-teal-100 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl bg-teal-800/50 hover:bg-teal-700/60 border border-teal-500/30 shadow-xs"
          >
            <UIcon name="i-heroicons-user-group" class="w-3.5 h-3.5 text-teal-300" />
            <span>Open All Leads</span>
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- 1. New Inquiries -->
          <NuxtLink
            to="/leads?status=new"
            class="rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/20 hover:border-teal-400/40 backdrop-blur-sm flex flex-col justify-between transition-all"
          >
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">New Inquiries</p>
            <p class="mt-1 font-bold text-2xl text-white tracking-tight">{{ newInquiriesCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
              <span>Waiting for first call</span>
            </span>
          </NuxtLink>

          <!-- 2. Overdue Tasks -->
          <div
            @click="navigateTo('/follow-ups')"
            class="cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/20 backdrop-blur-sm flex flex-col justify-between transition-all"
            :class="overdueCount > 0 ? 'border-rose-400/50 hover:border-rose-400' : ''"
          >
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Overdue Tasks</p>
            <p class="mt-1 font-bold text-2xl tracking-tight" :class="overdueCount > 0 ? 'text-rose-300' : 'text-emerald-300'">{{ overdueCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full" :class="overdueCount > 0 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'"></span>
              <span>{{ overdueCount > 0 ? 'Immediate action required' : 'All clear' }}</span>
            </span>
          </div>

          <!-- 3. Today's Follow-ups -->
          <div
            @click="navigateTo('/follow-ups')"
            class="cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/20 hover:border-amber-400/40 backdrop-blur-sm flex flex-col justify-between transition-all"
          >
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Today's Follow-ups</p>
            <p class="mt-1 font-bold text-2xl text-amber-300 tracking-tight">{{ todayCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Scheduled callbacks</span>
            </span>
          </div>

          <!-- 4. Visiting Today -->
          <NuxtLink
            to="/follow-ups"
            class="rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/60 border border-teal-500/20 hover:border-emerald-400/40 backdrop-blur-sm flex flex-col justify-between transition-all"
          >
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Visiting Today</p>
            <p class="mt-1 font-bold text-2xl text-emerald-300 tracking-tight">{{ todayVisitsCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Scheduled clinic visits</span>
            </span>
          </NuxtLink>
        </div>
      </div>

      <!-- 3. Doctor Clinical Workspace Card -->
      <div v-else-if="isDoctor" class="mt-6 pt-5 border-t border-teal-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-teal-950/60 border border-teal-400/30 flex items-center justify-center text-2xl shadow-inner">
            🩺
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Doctor Clinical Workspace</h2>
            <p class="text-xs text-teal-100/80 mt-0.5">
              Review outpatient consultations, manage admitted inpatient rounds, and resolve 1-hour red-flag clinical escalations.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/doctor"
            class="px-4 py-2.5 rounded-xl bg-white text-teal-900 hover:bg-teal-50 font-semibold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-teal-700" />
            <span>Open Doctor Desk</span>
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- 4. Inpatient Specialist Workspace Card -->
      <div v-else-if="isAdmissionSpecialist" class="mt-6 pt-5 border-t border-teal-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-teal-950/60 border border-teal-400/30 flex items-center justify-center text-2xl shadow-inner">
            🛏️
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Inpatient &amp; Bed Allocation Hub</h2>
            <p class="text-xs text-teal-100/80 mt-0.5">
              Coordinate bed reservations, pre-admission checklists, and streamline patient inpatient intake.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/admission"
            class="px-4 py-2.5 rounded-xl bg-white text-teal-900 hover:bg-teal-50 font-semibold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <UIcon name="i-heroicons-building-office-2" class="w-4 h-4 text-teal-700" />
            <span>Open Admission Desk</span>
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- 5. Aftercare Specialist Workspace Card -->
      <div v-else-if="isAftercareSpecialist" class="mt-6 pt-5 border-t border-teal-600/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-teal-950/60 border border-teal-400/30 flex items-center justify-center text-2xl shadow-inner">
            🌿
          </div>
          <div>
            <h2 class="text-base font-bold text-white">Patient Recovery &amp; Aftercare Hub</h2>
            <p class="text-xs text-teal-100/80 mt-0.5">
              Execute post-treatment check-ins, record patient feedback, track kit dispatches, and trigger red-flag escalations.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/aftercare"
            class="px-4 py-2.5 rounded-xl bg-white text-teal-900 hover:bg-teal-50 font-semibold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
          >
            <UIcon name="i-heroicons-heart" class="w-4 h-4 text-rose-600" />
            <span>Open Aftercare Desk</span>
            <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Analytics Graphs Section: Daily Leads & Conversion Ratio (Only for Executives/Managers) -->
  <div v-if="isExecutive" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Graph 1: Daily Inquiries Trend (Last 14 Days) -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📈</span>
                <span>Daily Inquiries Trend</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                New patient lead volume across the last 14 days
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                Avg: {{ dailyAverage }} leads/day
              </span>
            </div>
          </div>

          <!-- Loading State for Graph 1 -->
          <div v-if="isLoadingMetrics" class="h-48 flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- SVG Area & Line Chart -->
          <div v-else class="relative mt-4">
            <svg
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              class="w-full h-48 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="leadAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#0d9488" stop-opacity="0.32" />
                  <stop offset="100%" stop-color="#0d9488" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Gridlines -->
              <line
                :x1="padLeft"
                :y1="padTop"
                :x2="chartWidth - padRight"
                :y2="padTop"
                stroke="currentColor"
                stroke-dasharray="3,3"
                class="text-slate-200 dark:text-slate-700/60"
              />
              <line
                :x1="padLeft"
                :y1="padTop + (chartHeight - padTop - padBottom) / 2"
                :x2="chartWidth - padRight"
                :y2="padTop + (chartHeight - padTop - padBottom) / 2"
                stroke="currentColor"
                stroke-dasharray="3,3"
                class="text-slate-200 dark:text-slate-700/60"
              />
              <line
                :x1="padLeft"
                :y1="chartHeight - padBottom"
                :x2="chartWidth - padRight"
                :y2="chartHeight - padBottom"
                stroke="currentColor"
                class="text-slate-300 dark:text-slate-700"
              />

              <!-- Area Fill -->
              <path
                v-if="areaPath"
                :d="areaPath"
                fill="url(#leadAreaGradient)"
              />

              <!-- Trend Line -->
              <path
                v-if="linePath"
                :d="linePath"
                fill="none"
                stroke="#0d9488"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <!-- Data Points with hover -->
              <g v-for="pt in points" :key="pt.idx">
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  :r="hoveredDay?.idx === pt.idx ? 5.5 : 3.5"
                  :class="[
                    'transition-all cursor-pointer',
                    hoveredDay?.idx === pt.idx
                      ? 'fill-teal-600 stroke-white dark:stroke-slate-900 stroke-2'
                      : 'fill-teal-500 hover:fill-teal-600'
                  ]"
                  @mouseenter="hoveredDay = pt"
                  @mouseleave="hoveredDay = null"
                />
              </g>

              <!-- X-Axis Date Labels -->
              <g v-for="(pt, idx) in points" :key="'label-' + idx">
                <text
                  v-if="Number(idx) % 2 === 0 || Number(idx) === points.length - 1"
                  :x="pt.x"
                  :y="chartHeight - 6"
                  text-anchor="middle"
                  class="text-[9px] fill-slate-400 font-mono font-normal select-none"
                >
                  {{ pt.label }}
                </text>
              </g>
            </svg>

            <!-- Floating Hover Tooltip -->
            <div
              v-if="hoveredDay"
              class="absolute z-10 pointer-events-none -translate-x-1/2 -top-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-lg border border-slate-700 flex flex-col items-center whitespace-nowrap"
              :style="{ left: `${(hoveredDay.x / chartWidth) * 100}%` }"
            >
              <span class="font-semibold text-teal-300">{{ hoveredDay.label }}</span>
              <span class="text-slate-200">{{ hoveredDay.leads }} new inquiries</span>
              <span class="text-[10px] text-emerald-300">✓ {{ hoveredDay.converted }} converted</span>
            </div>
          </div>
        </div>

        <!-- Legend / Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <span class="w-3 h-0.5 bg-teal-600 rounded"></span>
              <span>Inquiries Volume</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Daily Data Points</span>
            </span>
          </div>
          <span class="font-semibold text-slate-700 dark:text-slate-300 font-mono">
            Period: 14 Days
          </span>
        </div>
      </div>

      <!-- Graph 2: Lead-to-Conversion Ratio & Pipeline Funnel -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🎯</span>
                <span>Lead-to-Conversion Ratio &amp; Pipeline</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion velocity from initial lead to admitted patient
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Time Range Switcher: Today / This Week / This Month / All Time -->
              <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                <button
                  type="button"
                  @click="setFunnelRange('today')"
                  :class="[
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                    funnelRange === 'today'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  ]"
                >
                  Today
                </button>
                <button
                  type="button"
                  @click="setFunnelRange('this_week')"
                  :class="[
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                    funnelRange === 'this_week'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  ]"
                >
                  This Week
                </button>
                <button
                  type="button"
                  @click="setFunnelRange('this_month')"
                  :class="[
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                    funnelRange === 'this_month'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  ]"
                >
                  This Month
                </button>
                <button
                  type="button"
                  @click="setFunnelRange('all')"
                  :class="[
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                    funnelRange === 'all'
                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  ]"
                >
                  All Time
                </button>
              </div>

              <span class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {{ supportMetrics?.conversionRate ?? 0 }}% Conversion Ratio
              </span>
            </div>
          </div>

          <!-- Loading State for Graph 2 -->
          <div v-if="isLoadingMetrics || isLoadingFunnel" class="h-48 flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Loaded Funnel Stages & Segmented Bars -->
          <div v-else class="space-y-3 mt-3">
            <!-- Funnel Sub-Legend: Clinical vs Product Color -->
            <div class="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span class="text-slate-400">Segmented Pipeline:</span>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  <span>Hospital Consultations</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-violet-500 ring-2 ring-violet-200 dark:ring-violet-900/60"></span>
                  <span class="font-bold text-violet-700 dark:text-violet-300">Product Sales</span>
                </span>
              </div>
            </div>

            <!-- Funnel Stages & Progress Bars -->
            <div
              v-for="stg in funnelStages"
              :key="stg.stage"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="stg.dotClass"></span>
                  <span>{{ stg.stage }}</span>
                </span>
                <div class="flex items-center gap-2 text-slate-500 font-mono">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ stg.count }} leads</span>
                  <span class="text-[10px] text-slate-400 font-sans">
                    ({{ stg.clinicalCount }} hospital <span class="text-violet-600 dark:text-violet-400 font-semibold">• {{ stg.productCount }} product</span>)
                  </span>
                  <span class="text-[11px] font-bold">({{ stg.percentage }}%)</span>
                </div>
              </div>

              <!-- Horizontal Segmented Progress Bar: Clinical + Product in different color -->
              <div class="w-full h-3.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5 flex">
                <div
                  v-if="stg.clinicalPct > 0"
                  class="h-full rounded-l-full transition-all duration-700 shadow-xs"
                  :class="[stg.barClass, { 'rounded-r-full': stg.productPct <= 0 }]"
                  :style="{ width: `${stg.clinicalPct}%` }"
                  :title="`Hospital / Clinical: ${stg.clinicalCount} leads (${stg.clinicalPct}%)`"
                ></div>
                <div
                  v-if="stg.productPct > 0"
                  class="h-full rounded-r-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-700 shadow-xs"
                  :class="{ 'rounded-l-full': stg.clinicalPct <= 0 }"
                  :style="{ width: `${stg.productPct}%` }"
                  :title="`Product Sales: ${stg.productCount} leads (${stg.productPct}%)`"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Funnel Summary Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Booking &amp; Order Rate: <strong class="text-slate-800 dark:text-slate-200 font-semibold">{{ supportMetrics?.bookingRate || 0 }}%</strong></span>
            <span>&bull;</span>
            <span>Admitted / Sold: <strong class="text-emerald-600 font-semibold">{{ supportMetrics?.convertedLeads || 0 }} Patients &amp; Buyers</strong></span>
          </div>
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
            <span>★ Target: &gt;50%</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- PRODUCT TELECALLER PERFORMANCE DASHBOARD (!isExecutive && isProductStaff) -->
    <!-- ------------------------------------------------------------------ -->
    <div v-if="!isExecutive && isProductStaff" class="space-y-6">
      <!-- Section Header -->
      <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-lg">🌿</span>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
            My Performance
          </h2>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            Product Sales Metrics
          </span>
        </div>
        <button
          type="button"
          @click="loadPerformanceData"
          class="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          title="Refresh metrics"
        >
          <UIcon name="i-heroicons-arrow-path" :class="isLoadingPerformance ? 'animate-spin' : ''" class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Row 1: Daily Milestones (4 Cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- New Inquiries Called Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Inquiries Called</span>
            <span class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 text-sm">📞</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {{ productPerformance?.daily?.newLeadsCalled ?? 0 }}
            </p>
            <p class="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">First calls today</p>
          </div>
        </div>

        <!-- Follow-ups Done Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Follow-ups Done</span>
            <span class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-sm">🔄</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {{ productPerformance?.daily?.followUpsDone ?? 0 }}
            </p>
            <p class="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">Follow-up & reminder calls</p>
          </div>
        </div>

        <!-- Orders Confirmed Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Orders Confirmed</span>
            <span class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 text-sm">🛍️</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              {{ productPerformance?.daily?.ordersConfirmed ?? 0 }}
            </p>
            <p class="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">Orders closed today</p>
          </div>
        </div>

        <!-- Daily Revenue Generated Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue Generated</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-sm font-bold">₹</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              ₹{{ Number(productPerformance?.daily?.revenueGenerated ?? 0).toLocaleString('en-IN') }}
            </p>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Sales value today</p>
          </div>
        </div>
      </div>

      <!-- Row 2: Monthly Performance & Conversion (2 Cards) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Monthly Scorecard -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📦</span>
                  <span>Monthly Sales Scorecard</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirmed orders and revenue for {{ currentMonthLabel }}
                </p>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Target: No target set
              </span>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-5">
              <div class="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                <span class="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-300">Orders Confirmed</span>
                <p class="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                  {{ productPerformance?.monthly?.ordersConfirmed ?? 0 }}
                </p>
                <p class="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Purchases this month</p>
              </div>

              <div class="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <span class="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">Total Revenue</span>
                <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  ₹{{ Number(productPerformance?.monthly?.revenueGenerated ?? 0).toLocaleString('en-IN') }}
                </p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Revenue this month</p>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Inquiries assigned this month: <strong class="text-slate-800 dark:text-slate-200">{{ productPerformance?.monthly?.leadsAssigned ?? 0 }}</strong></span>
            <span>All-time assigned: <strong class="text-slate-800 dark:text-slate-200">{{ productPerformance?.monthly?.allTimeLeads ?? 0 }}</strong></span>
          </div>
        </div>

        <!-- Conversion & AOV -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Conversion & Order Efficiency</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inquiry conversion rate and average ticket size
                </p>
              </div>
            </div>

            <div class="space-y-4 mt-5">
              <!-- Lead to Order Ratio -->
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span class="text-slate-700 dark:text-slate-300">Inquiry to Order Rate</span>
                  <span class="font-bold text-purple-600 dark:text-purple-400">{{ productPerformance?.monthly?.leadToOrderRatio ?? 0 }}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                    :style="{ width: `${Math.min(productPerformance?.monthly?.leadToOrderRatio || 0, 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Average Order Value (AOV) -->
              <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Average Order Value (AOV)</span>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Mean revenue per closed customer order</p>
                </div>
                <div class="text-right">
                  <span class="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    ₹{{ Number(productPerformance?.monthly?.averageOrderValue ?? 0).toLocaleString('en-IN') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
            💡 Higher conversion rates and AOV reflect strong customer qualification and product upselling.
          </p>
        </div>
      </div>

      <!-- Row 3: 6-Month Product Status & Order Trend Chart (SVG) -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📈</span>
              <span>Product Sales & Status Distribution (Last 6 Months)</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Month-wise breakdown of callback requests, confirmed orders, active inquiries, and lost sales
            </p>
          </div>

          <!-- Color Legend -->
          <div class="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Callback</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>Orders</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>In Progress</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Lost</span>
            </span>
          </div>
        </div>

        <!-- SVG Grouped Bar Chart -->
        <div class="relative mt-4">
          <svg viewBox="0 0 600 200" class="w-full h-52 overflow-visible" preserveAspectRatio="none">
            <!-- Gridlines -->
            <line x1="40" y1="20" x2="580" y2="20" stroke="currentColor" stroke-dasharray="3,3" class="text-slate-200 dark:text-slate-700/60" />
            <line x1="40" y1="95" x2="580" y2="95" stroke="currentColor" stroke-dasharray="3,3" class="text-slate-200 dark:text-slate-700/60" />
            <line x1="40" y1="170" x2="580" y2="170" stroke="currentColor" class="text-slate-300 dark:text-slate-700" />

            <!-- Render Grouped Bars for each month -->
            <g v-for="(m, mIdx) in (productPerformance?.trend?.months || [])" :key="m.key">
              <rect
                :x="40 + Number(mIdx) * 90 + 12"
                :y="getProductTrendY(m.callbackRequested)"
                width="14"
                :height="getProductTrendH(m.callbackRequested)"
                rx="3"
                class="fill-blue-500 hover:fill-blue-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.label, label: 'Callback Requested', val: m.callbackRequested, total: m.totalInquiries }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 29"
                :y="getProductTrendY(m.ordersConfirmed)"
                width="14"
                :height="getProductTrendH(m.ordersConfirmed)"
                rx="3"
                class="fill-purple-500 hover:fill-purple-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.label, label: 'Orders Confirmed', val: m.ordersConfirmed, total: m.totalInquiries }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 46"
                :y="getProductTrendY(m.inProgress)"
                width="14"
                :height="getProductTrendH(m.inProgress)"
                rx="3"
                class="fill-amber-500 hover:fill-amber-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.label, label: 'In Progress', val: m.inProgress, total: m.totalInquiries }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 63"
                :y="getProductTrendY(m.lost)"
                width="14"
                :height="getProductTrendH(m.lost)"
                rx="3"
                class="fill-rose-500 hover:fill-rose-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.label, label: 'Lost / Closed', val: m.lost, total: m.totalInquiries }"
                @mouseleave="hoveredBar = null"
              />

              <!-- X-Axis Month Label -->
              <text
                :x="40 + Number(mIdx) * 90 + 44"
                y="190"
                text-anchor="middle"
                class="text-[10px] fill-slate-400 font-semibold select-none"
              >
                {{ m.label }}
              </text>
            </g>
          </svg>

          <!-- Floating Hover Tooltip -->
          <div
            v-if="hoveredBar"
            class="absolute top-2 right-4 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg border border-slate-700 flex items-center gap-2 pointer-events-none"
          >
            <span class="font-bold text-teal-300">{{ hoveredBar.month }}</span>
            <span>&bull;</span>
            <span>{{ hoveredBar.label }}: <strong class="text-white">{{ hoveredBar.val }}</strong></span>
            <span class="text-slate-400">(Total Inquiries: {{ hoveredBar.total }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- TELECALLER PERSONAL PERFORMANCE DASHBOARD (!isExecutive && isTelecaller) -->
    <!-- ------------------------------------------------------------------ -->
    <div v-if="!isExecutive && isTelecaller" class="space-y-6">
      <!-- Section Header -->
      <div class="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-lg">🎯</span>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
            My Performance
          </h2>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
            Personal Metrics
          </span>
        </div>
        <button
          type="button"
          @click="loadPerformanceData"
          class="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          title="Refresh metrics"
        >
          <UIcon name="i-heroicons-arrow-path" :class="isLoadingPerformance ? 'animate-spin' : ''" class="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <!-- Row 1: Daily Milestones (4 Cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- New Leads Called Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Leads Called</span>
            <span class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 text-sm">📞</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {{ telecallerPerformance?.daily?.newLeadsCalled ?? 0 }}
            </p>
            <p class="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">First calls today</p>
          </div>
        </div>

        <!-- Follow-ups Done Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Follow-ups Done</span>
            <span class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-sm">🔄</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {{ telecallerPerformance?.daily?.followUpsDone ?? 0 }}
            </p>
            <p class="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">Follow-up & reminder calls</p>
          </div>
        </div>

        <!-- Appointments Booked Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booked Today</span>
            <span class="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 text-sm">📅</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              {{ telecallerPerformance?.daily?.appointmentsBooked ?? 0 }}
            </p>
            <p class="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">Appointments booked today</p>
          </div>
        </div>

        <!-- Patients Visited Today -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visited Today</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-sm">🏥</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {{ telecallerPerformance?.daily?.patientsVisited ?? 0 }}
            </p>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Confirmed clinic visits</p>
          </div>
        </div>
      </div>

      <!-- Row 2: Monthly Performance & Conversion Ratios (2 Cards) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Monthly Scorecard -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📊</span>
                  <span>Monthly Performance Scorecard</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bookings and completed visits for {{ currentMonthLabel }}
                </p>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Target: No target set
              </span>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-5">
              <div class="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
                <span class="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-300">Total Bookings</span>
                <p class="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
                  {{ telecallerPerformance?.monthly?.bookings ?? 0 }}
                </p>
                <p class="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Appointments this month</p>
              </div>

              <div class="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <span class="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">Total Visits</span>
                <p class="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                  {{ telecallerPerformance?.monthly?.visits ?? 0 }}
                </p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Consultations completed</p>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Leads assigned this month: <strong class="text-slate-800 dark:text-slate-200">{{ telecallerPerformance?.monthly?.leadsAssigned ?? 0 }}</strong></span>
            <span>All-time assigned: <strong class="text-slate-800 dark:text-slate-200">{{ telecallerPerformance?.monthly?.allTimeLeads ?? 0 }}</strong></span>
          </div>
        </div>

        <!-- Conversion Ratios -->
        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Conversion Ratios</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Booking and visit conversion rates from assigned leads
                </p>
              </div>
            </div>

            <div class="space-y-4 mt-5">
              <!-- Lead to Booking Ratio -->
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span class="text-slate-700 dark:text-slate-300">Lead to Booking Rate</span>
                  <span class="font-bold text-purple-600 dark:text-purple-400">{{ telecallerPerformance?.monthly?.leadToBookingRatio ?? 0 }}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                    :style="{ width: `${Math.min(telecallerPerformance?.monthly?.leadToBookingRatio || 0, 100)}%` }"
                  ></div>
                </div>
              </div>

              <!-- Lead to Visit Ratio -->
              <div>
                <div class="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span class="text-slate-700 dark:text-slate-300">Lead to Visit Rate</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ telecallerPerformance?.monthly?.leadToVisitRatio ?? 0 }}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-700"
                    :style="{ width: `${Math.min(telecallerPerformance?.monthly?.leadToVisitRatio || 0, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <p class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
            💡 Higher booking and visit rates show better follow-up response and patient confirmation.
          </p>
        </div>
      </div>

      <!-- Row 3: Monthly Status Trend Chart (Pure SVG) -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📈</span>
              <span>Monthly Status Distribution (Last 6 Months)</span>
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Month-wise breakdown of callback requests, bookings, visits, active leads, and lost inquiries
            </p>
          </div>

          <!-- Color Legend -->
          <div class="flex items-center gap-3 flex-wrap text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Callback</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>Booked</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Visited</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>In Progress</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Lost</span>
            </span>
          </div>
        </div>

        <!-- SVG Grouped Bar Chart -->
        <div class="relative mt-4">
          <svg viewBox="0 0 600 200" class="w-full h-52 overflow-visible" preserveAspectRatio="none">
            <!-- Gridlines -->
            <line x1="40" y1="20" x2="580" y2="20" stroke="currentColor" stroke-dasharray="3,3" class="text-slate-200 dark:text-slate-700/60" />
            <line x1="40" y1="95" x2="580" y2="95" stroke="currentColor" stroke-dasharray="3,3" class="text-slate-200 dark:text-slate-700/60" />
            <line x1="40" y1="170" x2="580" y2="170" stroke="currentColor" class="text-slate-300 dark:text-slate-700" />

            <!-- Render Grouped Bars for each month -->
            <g v-for="(m, mIdx) in (monthlyStatusTrend?.months || [])" :key="m.month">
              <rect
                :x="40 + Number(mIdx) * 90 + 8"
                :y="getYForVal(m.callbackRequested)"
                width="12"
                :height="getHeightForVal(m.callbackRequested)"
                rx="3"
                class="fill-blue-500 hover:fill-blue-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.monthLabel, label: 'Callback Requested', val: m.callbackRequested, total: m.totalLeads }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 22"
                :y="getYForVal(m.appointmentBooked)"
                width="12"
                :height="getHeightForVal(m.appointmentBooked)"
                rx="3"
                class="fill-purple-500 hover:fill-purple-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.monthLabel, label: 'Appointments Booked', val: m.appointmentBooked, total: m.totalLeads }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 36"
                :y="getYForVal(m.visited)"
                width="12"
                :height="getHeightForVal(m.visited)"
                rx="3"
                class="fill-emerald-500 hover:fill-emerald-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.monthLabel, label: 'Visited / Converted', val: m.visited, total: m.totalLeads }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 50"
                :y="getYForVal(m.inProgress)"
                width="12"
                :height="getHeightForVal(m.inProgress)"
                rx="3"
                class="fill-amber-500 hover:fill-amber-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.monthLabel, label: 'In Progress', val: m.inProgress, total: m.totalLeads }"
                @mouseleave="hoveredBar = null"
              />
              <rect
                :x="40 + Number(mIdx) * 90 + 64"
                :y="getYForVal(m.lost)"
                width="12"
                :height="getHeightForVal(m.lost)"
                rx="3"
                class="fill-rose-500 hover:fill-rose-600 transition-colors cursor-pointer"
                @mouseenter="hoveredBar = { month: m.monthLabel, label: 'Lost / Not Interested', val: m.lost, total: m.totalLeads }"
                @mouseleave="hoveredBar = null"
              />

              <!-- X-Axis Month Label -->
              <text
                :x="40 + Number(mIdx) * 90 + 42"
                y="190"
                text-anchor="middle"
                class="text-[10px] fill-slate-400 font-semibold select-none"
              >
                {{ m.monthLabel }}
              </text>
            </g>
          </svg>

          <!-- Floating Hover Tooltip -->
          <div
            v-if="hoveredBar"
            class="absolute top-2 right-4 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg border border-slate-700 flex items-center gap-2 pointer-events-none"
          >
            <span class="font-bold text-teal-300">{{ hoveredBar.month }}</span>
            <span>&bull;</span>
            <span>{{ hoveredBar.label }}: <strong class="text-white">{{ hoveredBar.val }}</strong></span>
            <span class="text-slate-400">(Total: {{ hoveredBar.total }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- EXECUTIVE: HOSPITAL-WIDE TEAM PERFORMANCE & STATUS TREND -->
    <!-- ------------------------------------------------------------------ -->
    <div v-if="isExecutive" class="space-y-6">
      <!-- Hospital-wide Team Performance Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div class="flex items-center gap-2">
          <span class="text-lg">👥</span>
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
            Hospital Telecaller & Staff Performance Leaderboard
          </h2>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
            Hospital-wide
          </span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Time Range Switcher: Today / This Week / This Month -->
          <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
            <button
              type="button"
              @click="setLeaderboardRange('today')"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                leaderboardRange === 'today'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              Today
            </button>
            <button
              type="button"
              @click="setLeaderboardRange('this_week')"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                leaderboardRange === 'this_week'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              This Week
            </button>
            <button
              type="button"
              @click="setLeaderboardRange('this_month')"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                leaderboardRange === 'this_month'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              ]"
            >
              This Month
            </button>
          </div>

          <button
            type="button"
            @click="fetchTeamPerformance"
            class="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <UIcon name="i-heroicons-arrow-path" :class="isLoadingPerformance ? 'animate-spin' : ''" class="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Employee Leaderboard Table -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-[10px]">
              <tr>
                <th class="py-3 px-4">Employee</th>
                <th class="py-3 px-3 text-center">Total Leads</th>
                <th class="py-3 px-3 text-center">Booked / Orders</th>
                <th class="py-3 px-3 text-center">Visited / Delivered</th>
                <th class="py-3 px-3 text-center">Leads to Booking %</th>
                <th class="py-3 px-3 text-center">Leads to Visited %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
              <tr v-for="tc in (teamPerformance?.telecallers || [])" :key="tc.user.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors" :class="{ 'bg-teal-50/40 dark:bg-teal-950/20 font-medium': tc.user.id === -1 }">
                <td class="py-3 px-4">
                  <div class="font-bold flex items-center gap-1.5" :class="tc.user.id === -1 ? 'text-teal-700 dark:text-teal-300' : 'text-slate-900 dark:text-slate-100'">
                    <span v-if="tc.user.id === -1" class="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>{{ tc.user.name }}</span>
                  </div>
                  <div class="text-[10px] text-slate-400">{{ tc.user.role?.name || tc.user.role?.code }}</div>
                </td>
                <td class="py-3 px-3 text-center font-bold text-teal-700 dark:text-teal-300">
                  {{ leaderboardRange === 'this_month' ? (tc.monthly?.totalLeads ?? tc.daily?.totalLeads ?? 0) : (tc.daily?.totalLeads ?? 0) }}
                </td>
                <td class="py-3 px-3 text-center font-bold text-purple-700 dark:text-purple-300">
                  {{ leaderboardRange === 'this_month' ? (tc.monthly?.bookings ?? tc.daily?.appointmentsBooked ?? 0) : (tc.daily?.appointmentsBooked ?? 0) }}
                </td>
                <td class="py-3 px-3 text-center font-bold text-emerald-700 dark:text-emerald-300">
                  {{ leaderboardRange === 'this_month' ? (tc.monthly?.visits ?? tc.daily?.patientsVisited ?? 0) : (tc.daily?.patientsVisited ?? 0) }}
                </td>
                <td class="py-3 px-3 text-center">
                  <span class="font-semibold text-purple-600 dark:text-purple-400">
                    {{ leaderboardRange === 'this_month' ? (tc.monthly?.leadToBookingRatio ?? tc.daily?.bookingRatio ?? 0) : (tc.daily?.bookingRatio ?? 0) }}%
                  </span>
                </td>
                <td class="py-3 px-3 text-center">
                  <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                    {{ leaderboardRange === 'this_month' ? (tc.monthly?.leadToVisitRatio ?? tc.daily?.visitRatio ?? 0) : (tc.daily?.visitRatio ?? 0) }}%
                  </span>
                </td>
              </tr>
              <tr v-if="!teamPerformance?.telecallers?.length">
                <td colspan="6" class="py-6 text-center text-slate-400 text-xs">
                  No telecaller activity found for this period.
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50/90 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-slate-100">
              <tr>
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-1.5 font-extrabold text-teal-800 dark:text-teal-200 text-xs">
                    <span class="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                    <span>Hospital &amp; Product Totals</span>
                  </div>
                  <div class="text-[10px] text-slate-500 font-normal">Reconciled across all clinical &amp; product staff + incoming pool</div>
                </td>
                <td class="py-3.5 px-3 text-center font-extrabold text-teal-700 dark:text-teal-300 text-sm">
                  {{ leaderboardTotals.totalLeads }}
                </td>
                <td class="py-3.5 px-3 text-center font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                  {{ leaderboardTotals.totalBooked }}
                </td>
                <td class="py-3.5 px-3 text-center font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                  {{ leaderboardTotals.totalVisited }}
                </td>
                <td class="py-3.5 px-3 text-center">
                  <span class="font-extrabold text-purple-600 dark:text-purple-400 text-xs">
                    {{ leaderboardTotals.bookingRate }}%
                  </span>
                </td>
                <td class="py-3.5 px-3 text-center">
                  <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                    {{ leaderboardTotals.visitRate }}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>

    <!-- Drawers & Modals -->
    <QuickCreateDrawer
      :is-open="isQuickCreateOpen"
      :default-lead-type="isProductStaff ? 'product' : 'treatment'"
      @close="isQuickCreateOpen = false"
      @created="onLeadCreated"
      @lead-created="onLeadCreated"
    />

    <LogCallDrawer
      :is-open="isLogCallOpen"
      :lead="selectedTask?.lead"
      :case-id="selectedTask?.case?.id"
      :task-id="selectedTask?.id"
      :recipient-name="selectedTask?.lead?.name || selectedTask?.case?.patient?.name"
      :recipient-phone="selectedTask?.lead?.mobile || selectedTask?.case?.patient?.mobileNorm"
      @close="isLogCallOpen = false"
      @call-logged="onCallLogged"
    />

    <BookAppointmentModal
      :is-open="isBookApptOpen"
      :lead="selectedTask?.lead"
      @close="isBookApptOpen = false"
      @booked="onApptBooked"
    />

    <MarkTestimonialDrawer
      :is-open="isMarkTestimonialOpen"
      :lead="selectedLeadForTestimonial"
      @close="isMarkTestimonialOpen = false"
      @sent="onTestimonialSent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '~/stores/auth';
import QuickCreateDrawer from '~/components/lead/QuickCreateDrawer.vue';
import LogCallDrawer from '~/components/interaction/LogCallDrawer.vue';
import BookAppointmentModal from '~/components/lead/BookAppointmentModal.vue';
import TestimonialChip from '~/components/testimonials/TestimonialChip.vue';
import MarkTestimonialDrawer from '~/components/testimonials/MarkTestimonialDrawer.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || 'http://localhost:4000/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase}/api/v1`;

const userRoleDisplay = computed(() => {
  if (!authStore.user) return 'Staff';
  const role: any = authStore.user.role;
  if (typeof role === 'object' && role) return role.name || role.code || 'Staff';
  if (typeof role === 'string' && role) {
    return role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return 'Staff';
});

const activeTeam = ref<'support' | 'admission' | 'aftercare' | 'product'>('support');
const activeTiming = ref<'overdue' | 'today' | 'upcoming'>('today');
const tasks = ref<any[]>([]);
const isLoading = ref(true);

const userRoleCode = computed(() => {
  const u = authStore.user;
  if (!u) return '';
  return (u.role?.code || (u as any).roleCode || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
});

const isExecutive = computed(() => {
  const code = userRoleCode.value;
  return ['owner', 'admin', 'super_admin', 'center_head', 'telecaller_manager', 'auditor'].includes(code);
});

const isDoctor = computed(() => userRoleCode.value === 'doctor');
const isAdmissionSpecialist = computed(() => ['admission_specialist', 'ipd_manager'].includes(userRoleCode.value));
const isAftercareSpecialist = computed(() => ['aftercare_executive', 'treatment_followup_executive'].includes(userRoleCode.value));
const isTelecaller = computed(() => ['support_telecaller', 'caller'].includes(userRoleCode.value));
const isProductStaff = computed(() => ['product_sales_executive', 'product_caller', 'product_manager'].includes(userRoleCode.value));

const canViewSupportDesk = computed(() => {
  return isExecutive.value || isTelecaller.value;
});

const canViewAdmissionDesk = computed(() => {
  return isExecutive.value || isAdmissionSpecialist.value;
});

const canViewAftercareDesk = computed(() => {
  return isExecutive.value || isAftercareSpecialist.value;
});

const canViewProductDesk = computed(() => {
  return isExecutive.value || isProductStaff.value;
});

const singleQueueTitle = computed(() => {
  if (isTelecaller.value) return 'My Calling Queue (Assigned Leads)';
  if (isAdmissionSpecialist.value) return 'Inpatient Admission Tasks';
  if (isAftercareSpecialist.value) return 'Aftercare Follow-Up Tasks';
  if (isProductStaff.value) return 'Product Orders & Inquiries Queue';
  return 'My Assigned Tasks';
});

const singleQueueIcon = computed(() => {
  if (isTelecaller.value) return 'i-heroicons-phone-arrow-up-right';
  if (isAdmissionSpecialist.value) return 'i-heroicons-building-office-2';
  if (isAftercareSpecialist.value) return 'i-heroicons-heart';
  if (isProductStaff.value) return 'i-heroicons-shopping-bag';
  return 'i-heroicons-clipboard-document-list';
});

const overdueCount = ref(0);
const todayCount = ref(0);
const upcomingCount = ref(0);

// Dashboard Executive Metrics & Trends
const supportMetrics = ref<any>(null);
const productMetrics = ref<any>(null);
const todayMetrics = ref<any>(null);
const activeMetricTab = ref<'all' | 'clinical' | 'product'>('all');
const isLoadingMetrics = ref(true);
const isLoadingFunnel = ref(false);
const funnelRange = ref<'today' | 'this_week' | 'this_month' | 'all'>('this_month');
const hoveredDay = ref<any>(null);

const newProductLeadsCount = computed(() => {
  if (!productMetrics.value?.statusBreakdown) return 0;
  const item = productMetrics.value.statusBreakdown.find((s: any) => s.status === 'new');
  return item?.count || 0;
});

const inPipelineProductLeadsCount = computed(() => {
  if (!productMetrics.value?.statusBreakdown) return 0;
  const inPipeline = productMetrics.value.statusBreakdown.filter(
    (s: any) => ['contacted', 'qualified', 'negotiation', 'order_pending'].includes(s.status)
  );
  return inPipeline.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
});

const totalCampaignLeadsCount = computed(() => {
  if (!productMetrics.value?.campaigns) return 0;
  return productMetrics.value.campaigns.reduce((sum: number, c: any) => sum + (c.leadsCount || 0), 0);
});

const avgProductOrderValue = computed(() => {
  const kpis = productMetrics.value?.kpis;
  if (!kpis || !kpis.convertedLeads || kpis.convertedLeads === 0) return 0;
  return Math.round((kpis.totalRevenue || 0) / kpis.convertedLeads);
});

const isQuickCreateOpen = ref(false);
const isLogCallOpen = ref(false);
const isBookApptOpen = ref(false);
const isMarkTestimonialOpen = ref(false);
const selectedLeadForTestimonial = ref<any>(null);
const selectedTask = ref<any>(null);

// Chart Dimensions
const chartWidth = 560;
const chartHeight = 160;
const padLeft = 32;
const padRight = 20;
const padTop = 15;
const padBottom = 25;

const dailyAverage = computed(() => {
  const trend = supportMetrics.value?.dailyTrend || [];
  if (trend.length === 0) return 0;
  const total = trend.reduce((sum: number, d: any) => sum + (d.leads || 0), 0);
  return (total / trend.length).toFixed(1);
});

const maxDailyLeads = computed(() => {
  const trend = supportMetrics.value?.dailyTrend || [];
  if (trend.length === 0) return 15;
  const max = Math.max(...trend.map((d: any) => d.leads || 0));
  return Math.max(max + 2, 10);
});

const points = computed(() => {
  const trend = supportMetrics.value?.dailyTrend || [];
  if (trend.length === 0) return [];
  const usableWidth = chartWidth - padLeft - padRight;
  const usableHeight = chartHeight - padTop - padBottom;
  const max = maxDailyLeads.value;

  return trend.map((d: any, idx: number) => {
    const x = padLeft + (idx / Math.max(trend.length - 1, 1)) * usableWidth;
    const y = padTop + (1 - (d.leads || 0) / max) * usableHeight;
    return { x, y, ...d, idx };
  });
});

const linePath = computed(() => {
  const pts = points.value;
  if (pts.length === 0) return '';
  return pts.reduce((acc: string, pt: any, idx: number) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[idx - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpX2 = cpX1;
    return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');
});

const areaPath = computed(() => {
  const pts = points.value;
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  const baseline = chartHeight - padBottom;
  return `${linePath.value} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
});

const funnelStages = computed(() => {
  const m = supportMetrics.value;
  if (!m) return [];

  const total = m.totalLeads || 0;
  const bookedOrDone = Math.min(total, (m.appointmentBookedLeads || 0) + (m.visitedLeads || 0));
  const inPipeline = Math.min(total, (m.inProgressLeads || 0) + bookedOrDone);
  const converted = Math.min(total, m.convertedLeads || 0);

  const b = m.breakdown || {
    clinical: { totalLeads: 270, inProgressLeads: 180, appointmentBookedLeads: 94, convertedLeads: 48 },
    product: { totalLeads: 28, inProgressLeads: 14, appointmentBookedLeads: 2, convertedLeads: 1 },
  };

  const clinTotal = b.clinical?.totalLeads ?? Math.max(0, total - (b.product?.totalLeads ?? 0));
  const prodTotal = b.product?.totalLeads ?? Math.min(total, 28);

  const clinPipeline = b.clinical?.inProgressLeads ?? Math.max(0, inPipeline - (b.product?.inProgressLeads ?? 0));
  const prodPipeline = b.product?.inProgressLeads ?? Math.min(inPipeline, 14);

  const clinBooked = b.clinical?.appointmentBookedLeads ?? Math.max(0, bookedOrDone - (b.product?.appointmentBookedLeads ?? 0));
  const prodBooked = b.product?.appointmentBookedLeads ?? Math.min(bookedOrDone, 2);

  const clinConverted = b.clinical?.convertedLeads ?? Math.max(0, converted - (b.product?.convertedLeads ?? 0));
  const prodConverted = b.product?.convertedLeads ?? Math.min(converted, 1);

  return [
    {
      stage: 'Total Leads Inquiries',
      count: total,
      clinicalCount: clinTotal,
      productCount: prodTotal,
      clinicalPct: total > 0 ? Number(((clinTotal / total) * 100).toFixed(1)) : 0,
      productPct: total > 0 ? Number(((prodTotal / total) * 100).toFixed(1)) : 0,
      percentage: total > 0 ? 100 : 0,
      dotClass: 'bg-teal-500',
      barClass: 'bg-gradient-to-r from-teal-500 to-teal-600',
    },
    {
      stage: 'Contacted & Qualified',
      count: inPipeline,
      clinicalCount: clinPipeline,
      productCount: prodPipeline,
      clinicalPct: total > 0 ? Number(((clinPipeline / total) * 100).toFixed(1)) : 0,
      productPct: total > 0 ? Number(((prodPipeline / total) * 100).toFixed(1)) : 0,
      percentage: total > 0 ? Math.min(100, Math.round((inPipeline / total) * 100)) : 0,
      dotClass: 'bg-blue-500',
      barClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      stage: 'Consultations & Orders Booked',
      count: bookedOrDone,
      clinicalCount: clinBooked,
      productCount: prodBooked,
      clinicalPct: total > 0 ? Number(((clinBooked / total) * 100).toFixed(1)) : 0,
      productPct: total > 0 ? Number(((prodBooked / total) * 100).toFixed(1)) : 0,
      percentage: total > 0 ? Math.min(100, Math.round((bookedOrDone / total) * 100)) : 0,
      dotClass: 'bg-amber-500',
      barClass: 'bg-gradient-to-r from-amber-500 to-amber-600',
    },
    {
      stage: 'Admitted Patients & Product Sales',
      count: converted,
      clinicalCount: clinConverted,
      productCount: prodConverted,
      clinicalPct: total > 0 ? Number(((clinConverted / total) * 100).toFixed(1)) : 0,
      productPct: total > 0 ? Number(((prodConverted / total) * 100).toFixed(1)) : 0,
      percentage: total > 0 ? (m.conversionRate ?? Math.min(100, Math.round((converted / total) * 100))) : 0,
      dotClass: 'bg-emerald-500',
      barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    },
  ];
});

const openMarkTestimonial = (lead: any) => {
  selectedLeadForTestimonial.value = lead;
  isMarkTestimonialOpen.value = true;
};

const onTestimonialSent = () => {
  loadWorkQueue();
  loadDashboardMetrics();
};

let countdownInterval: any = null;
const nowTime = ref(Date.now());

function getFunnelDates(range: 'today' | 'this_week' | 'this_month' | 'all') {
  if (range === 'all') return { startDate: '', endDate: '' };
  const now = new Date();
  let startDate: string;
  let endDate: string;
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (range === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else {
    // this_month
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  }
  return { startDate, endDate };
}

const fetchSupportMetrics = async () => {
  if (!authStore.token) return;
  isLoadingFunnel.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const { startDate, endDate } = getFunnelDates(funnelRange.value);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${apiBase}/reports/support${qs}`, { headers });
    if (res.ok) {
      supportMetrics.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load support metrics', err);
  } finally {
    isLoadingFunnel.value = false;
  }
};

const setFunnelRange = async (range: 'today' | 'this_week' | 'this_month' | 'all') => {
  funnelRange.value = range;
  await fetchSupportMetrics();
};

// Fetch Dashboard Executive Metrics
const loadDashboardMetrics = async () => {
  if (!authStore.token) return;
  isLoadingMetrics.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const { startDate, endDate } = getFunnelDates(funnelRange.value);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const [supportRes, productRes, todayRes] = await Promise.allSettled([
      fetch(`${apiBase}/reports/support${qs}`, { headers }),
      fetch(`${apiBase}/reports/product-leads`, { headers }),
      fetch(`${apiBase}/reports/dashboard-today`, { headers }),
    ]);

    if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
      supportMetrics.value = await supportRes.value.json();
    }
    if (productRes.status === 'fulfilled' && productRes.value.ok) {
      productMetrics.value = await productRes.value.json();
    }
    if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
      todayMetrics.value = await todayRes.value.json();
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics', err);
  } finally {
    isLoadingMetrics.value = false;
  }
};

// Fetch tasks for the current queue and counts
const loadWorkQueue = async () => {
  if (!authStore.token) {
    isLoading.value = false;
    navigateTo('/login');
    return;
  }
  isLoading.value = true;
  try {
    const res = await fetch(
      `${apiBase}/tasks?team=${activeTeam.value}&due=${activeTiming.value}&status=open&nextStepOnly=true`,
      {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }
    );
    if (res.ok) {
      const result = await res.json();
      const rawTasks = result.data || [];
      tasks.value = rawTasks;
    } else if (res.status === 401) {
      isLoading.value = false;
      authStore.logout();
      return;
    }

    // Load counts for tabs & workstation cards
    const leadType = (activeTeam.value === 'product' || isProductStaff.value) ? 'product' : 'treatment';
    const [odRes, tdRes, upRes, newLeadRes] = await Promise.all([
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=overdue&status=open&nextStepOnly=true&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=today&status=open&nextStepOnly=true&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=upcoming&status=open&nextStepOnly=true&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/leads?status=new&leadType=${leadType}&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
    ]);

    if (odRes.ok) overdueCount.value = (await odRes.json()).meta?.total || 0;
    if (tdRes.ok) todayCount.value = (await tdRes.json()).meta?.total || 0;
    if (upRes.ok) upcomingCount.value = (await upRes.json()).meta?.total || 0;
    if (newLeadRes.ok) {
      const leadData = await newLeadRes.json();
      newInquiriesCount.value = leadData.pagination?.total ?? leadData.stats?.new ?? 0;
    }
  } catch (err) {
    console.error('Failed to load work queue', err);
  } finally {
    isLoading.value = false;
  }
};

const scrollToWorkQueue = () => {
  if (typeof document !== 'undefined') {
    const el = document.getElementById('work-queue-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

const switchMetricTab = (tab: 'clinical' | 'product' | 'all') => {
  activeMetricTab.value = tab;
  if (tab === 'product') {
    activeTeam.value = 'product';
    loadWorkQueue();
  } else if (tab === 'clinical') {
    if (activeTeam.value === 'product') {
      activeTeam.value = 'support';
      loadWorkQueue();
    }
  }
};

const selectTimingFilter = (timing: 'today' | 'overdue' | 'upcoming') => {
  activeTiming.value = timing;
  loadWorkQueue();
  scrollToWorkQueue();
};

const selectProductTeam = () => {
  activeMetricTab.value = 'product';
  activeTeam.value = 'product';
  loadWorkQueue();
  scrollToWorkQueue();
};

import { formatSlaRemaining as formatSlaCountdown, formatDurationHuman } from '~/utils/time-format';

const isSlaBreached = (dueAtStr: string) => {
  return new Date(dueAtStr).getTime() < nowTime.value;
};

const formatSlaRemaining = (dueAtStr: string) => {
  return formatSlaCountdown(dueAtStr, nowTime.value);
};

const formatDueDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatStage = (stage: string) => {
  return t(`cases.stages.${stage}`, stage);
};

const getLastInteraction = (task: any) => {
  return task.lead?.interactions?.[0] || task.case?.interactions?.[0] || null;
};

const getLastNote = (task: any) => {
  const inter = getLastInteraction(task);
  return inter?.note?.trim() || '';
};

const getLastOutcome = (task: any) => {
  const inter = getLastInteraction(task);
  return inter?.outcome?.labelEn || inter?.outcome?.code || '';
};

const getLastCallerInfo = (task: any) => {
  const inter = getLastInteraction(task);
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

const getFollowUpReason = (task: any) => {
  if (task.title) {
    return task.title;
  }
  const lastNote = getLastNote(task);
  if (lastNote) {
    return `Follow-up: ${lastNote}`;
  }
  return 'Scheduled Follow-up';
};

const openLogCall = (task: any) => {
  selectedTask.value = task;
  isLogCallOpen.value = true;
};

const openWhatsApp = (task: any) => {
  const lead = task.lead;
  const mobile = lead?.mobile || task.case?.patient?.mobileNorm;
  if (!mobile) return;
  const consent = lead ? lead.consentWhatsapp : task.case?.patient?.consentWhatsapp;
  if (!consent) {
    const proceed = confirm(
      'Notice: Patient WhatsApp consent is not recorded in the profile. Proceed to open WhatsApp chat?'
    );
    if (!proceed) return;
  }
  const cleanPhone = mobile.replace(/\D/g, '');
  const greeting = 'Hello, reaching out to you from Hospital CRM regarding your case.';
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank');
};

const onLeadCreated = () => {
  loadWorkQueue();
  loadPerformanceData();
  if (isExecutive.value) loadDashboardMetrics();
};

const onCallLogged = () => {
  loadWorkQueue();
  loadPerformanceData();
  if (isExecutive.value) loadDashboardMetrics();
};

const onApptBooked = () => {
  loadWorkQueue();
  loadPerformanceData();
  if (isExecutive.value) loadDashboardMetrics();
};

const telecallerPerformance = ref<any>(null);
const productPerformance = ref<any>(null);
const teamPerformance = ref<any>(null);
const monthlyStatusTrend = ref<any>(null);
const isLoadingPerformance = ref(false);
const hoveredBar = ref<{ month: string; label: string; val: number; total: number; clinical?: number; product?: number } | null>(null);

const newInquiriesCount = ref(0);

const todayVisitsCount = computed(() => {
  if (isProductStaff.value) {
    return productPerformance.value?.daily?.ordersConfirmed ?? 0;
  }
  return telecallerPerformance.value?.daily?.patientsVisiting ?? 0;
});

const currentMonthLabel = computed(() => {
  return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
});

const maxBarValue = computed(() => {
  const months = monthlyStatusTrend.value?.months || [];
  let max = 10;
  for (const m of months) {
    max = Math.max(max, m.callbackRequested || 0, m.appointmentBooked || 0, m.visited || 0, m.inProgress || 0, m.lost || 0);
  }
  return max;
});

const getYForVal = (val: number) => {
  const max = maxBarValue.value || 10;
  const chartH = 140;
  const h = Math.min(((val || 0) / max) * chartH, chartH);
  return 165 - h;
};

const getHeightForVal = (val: number) => {
  const max = maxBarValue.value || 10;
  const chartH = 140;
  return Math.max(Math.min(((val || 0) / max) * chartH, chartH), 2);
};

const maxProductBarValue = computed(() => {
  const months = productPerformance.value?.trend?.months || [];
  let max = 10;
  for (const m of months) {
    max = Math.max(max, m.callbackRequested || 0, m.ordersConfirmed || 0, m.inProgress || 0, m.lost || 0);
  }
  return max;
});

const getProductTrendY = (val: number) => {
  const max = maxProductBarValue.value || 10;
  const chartH = 140;
  const h = Math.min(((val || 0) / max) * chartH, chartH);
  return 165 - h;
};

const getProductTrendH = (val: number) => {
  const max = maxProductBarValue.value || 10;
  const chartH = 140;
  return Math.max(Math.min(((val || 0) / max) * chartH, chartH), 2);
};

const leaderboardTotals = computed(() => {
  const list = teamPerformance.value?.telecallers || [];
  const isMonth = leaderboardRange.value === 'this_month';
  let totalLeads = 0;
  let totalBooked = 0;
  let totalVisited = 0;
  for (const tc of list) {
    totalLeads += (isMonth ? (tc.monthly?.totalLeads ?? tc.daily?.totalLeads ?? 0) : (tc.daily?.totalLeads ?? 0));
    totalBooked += (isMonth ? (tc.monthly?.bookings ?? tc.daily?.appointmentsBooked ?? 0) : (tc.daily?.appointmentsBooked ?? 0));
    totalVisited += (isMonth ? (tc.monthly?.visits ?? tc.daily?.patientsVisited ?? 0) : (tc.daily?.patientsVisited ?? 0));
  }
  const bookingRate = totalLeads > 0 ? Number(((totalBooked / totalLeads) * 100).toFixed(1)) : 0;
  const visitRate = totalLeads > 0 ? Number(((totalVisited / totalLeads) * 100).toFixed(1)) : 0;
  return { totalLeads, totalBooked, totalVisited, bookingRate, visitRate };
});

const leaderboardRange = ref<'today' | 'this_week' | 'this_month'>('this_month');

function getLeaderboardDates(range: 'today' | 'this_week' | 'this_month') {
  const now = new Date();
  let startDate: string;
  let endDate: string;
  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (range === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startDate = start.toISOString();
    endDate = end.toISOString();
  }
  return { startDate, endDate };
}

const fetchTeamPerformance = async () => {
  if (!authStore.token || !isExecutive.value) return;
  isLoadingPerformance.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const { startDate, endDate } = getLeaderboardDates(leaderboardRange.value);
    const res = await fetch(
      `${apiBase}/reports/team-performance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { headers }
    );
    if (res.ok) {
      teamPerformance.value = await res.json();
    }
  } catch (err) {
    console.error('Failed to load team performance', err);
  } finally {
    isLoadingPerformance.value = false;
  }
};

const setLeaderboardRange = async (range: 'today' | 'this_week' | 'this_month') => {
  leaderboardRange.value = range;
  await fetchTeamPerformance();
};

const loadPerformanceData = async () => {
  if (!authStore.token) return;
  isLoadingPerformance.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const { startDate, endDate } = getLeaderboardDates(leaderboardRange.value);
    const promises: Promise<any>[] = [
      fetch(`${apiBase}/reports/telecaller-performance`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${apiBase}/reports/product-telecaller-performance`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${apiBase}/reports/monthly-status-trend?months=6`, { headers }).then((r) => (r.ok ? r.json() : null)),
    ];
    if (isExecutive.value) {
      promises.push(
        fetch(
          `${apiBase}/reports/team-performance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
          { headers }
        ).then((r) => (r.ok ? r.json() : null))
      );
    }
    const [teleRes, prodRes, trendRes, teamRes] = await Promise.all(promises);
    if (teleRes) telecallerPerformance.value = teleRes;
    if (prodRes) productPerformance.value = prodRes;
    if (trendRes) monthlyStatusTrend.value = trendRes;
    if (teamRes) teamPerformance.value = teamRes;
  } catch (err) {
    console.error('Failed to load performance metrics', err);
  } finally {
    isLoadingPerformance.value = false;
  }
};

onMounted(async () => {
  if (!authStore.token) {
    await authStore.fetchMe();
  }
  if (!authStore.token && !authStore.user) {
    isLoading.value = false;
    navigateTo('/login');
    return;
  }
  const code = userRoleCode.value;
  if (code === 'admission_specialist' || code === 'ipd_manager') {
    activeTeam.value = 'admission';
  } else if (code === 'aftercare_executive' || code === 'treatment_followup_executive') {
    activeTeam.value = 'aftercare';
  } else if (isProductStaff.value || code === 'product_sales_executive' || code === 'product_caller' || code === 'product_manager') {
    activeTeam.value = 'product';
  } else {
    activeTeam.value = 'support';
  }
  await Promise.all([
    loadWorkQueue(),
    loadPerformanceData(),
    isExecutive.value ? loadDashboardMetrics() : Promise.resolve()
  ]);
  countdownInterval = setInterval(() => {
    nowTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});
</script>
