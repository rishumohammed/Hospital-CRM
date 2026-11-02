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
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono" :class="activeMetricTab === 'clinical' ? 'bg-teal-100 text-teal-800' : 'bg-teal-900 text-teal-200'">{{ supportMetrics?.totalLeads || 0 }}</span>
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
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono" :class="activeMetricTab === 'product' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-900 text-teal-200'">{{ productMetrics?.kpis?.totalLeads || 0 }}</span>
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
              to="/reports/products"
              class="text-xs font-semibold text-teal-100 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl bg-teal-800/50 hover:bg-teal-700/60 border border-teal-500/30 shadow-xs"
            >
              <UIcon name="i-heroicons-chart-pie" class="w-3.5 h-3.5 text-teal-300" />
              <span>Product Reports</span>
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5" />
            </NuxtLink>

            <NuxtLink
              to="/reports"
              class="text-xs font-semibold text-teal-100 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl bg-teal-800/50 hover:bg-teal-700/60 border border-teal-500/30 shadow-xs"
            >
              <UIcon name="i-heroicons-chart-bar" class="w-3.5 h-3.5 text-teal-300" />
              <span>Hospital Reports</span>
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

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <!-- 1. Total Leads -->
            <div
              @click="navigateTo('/leads')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view all leads"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Total Leads</p>
                <p class="mt-1 font-bold text-2xl text-white tracking-tight">
                  {{ supportMetrics?.totalLeads ?? '—' }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/80 mt-2 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                <span>New Inquiries: {{ supportMetrics?.newLeads || 0 }}</span>
              </span>
            </div>

            <!-- 2. Conversion Ratio -->
            <div
              @click="navigateTo('/reports')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view conversion report"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Conversion Ratio</p>
                <p class="mt-1 font-bold text-2xl text-emerald-300 tracking-tight">
                  {{ supportMetrics?.conversionRate ?? 0 }}%
                </p>
              </div>
              <div>
                <div class="w-full bg-teal-950/60 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div class="bg-emerald-400 h-1 rounded-full transition-all" :style="{ width: `${Math.min(supportMetrics?.conversionRate || 0, 100)}%` }"></div>
                </div>
                <span class="text-[10px] text-emerald-200/90 mt-1.5 flex items-center gap-1 font-normal">
                  <span>✓ {{ supportMetrics?.convertedLeads || 0 }} converted</span>
                </span>
              </div>
            </div>

            <!-- 3. Today Due -->
            <div
              @click="selectTimingFilter('today')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-amber-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view today's tasks queue"
            >
              <UIcon name="i-heroicons-arrow-down" class="w-3.5 h-3.5 text-amber-300/40 group-hover:text-amber-200 group-hover:translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">{{ t('common.today') }} Due</p>
                <p class="mt-1 font-bold text-2xl tracking-tight" :class="todayCount > 0 ? 'text-amber-300' : 'text-teal-100'">
                  {{ todayCount }}
                </p>
              </div>
              <span class="text-[10px] mt-2 flex items-center gap-1 font-normal" :class="todayCount > 0 ? 'text-amber-200/90' : 'text-teal-300/80'">
                <span v-if="todayCount > 0" class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>{{ todayCount > 0 ? 'Current shift queue' : '✓ Shift queue clear' }}</span>
              </span>
            </div>

            <!-- 4. Overdue Tasks -->
            <div
              @click="selectTimingFilter('overdue')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-rose-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view overdue alerts queue"
            >
              <UIcon name="i-heroicons-arrow-down" class="w-3.5 h-3.5 text-rose-300/40 group-hover:text-rose-200 group-hover:translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">{{ t('common.overdue') }}</p>
                <p class="mt-1 font-bold text-2xl tracking-tight" :class="overdueCount > 0 ? 'text-rose-300 animate-pulse' : 'text-teal-100'">
                  {{ overdueCount }}
                </p>
              </div>
              <span class="text-[10px] mt-2 flex items-center gap-1 font-normal" :class="overdueCount > 0 ? 'text-rose-200 font-semibold' : 'text-emerald-300'">
                <span v-if="overdueCount > 0" class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                <span>{{ overdueCount > 0 ? 'SLA breach alerts' : '✓ Zero overdue tasks' }}</span>
              </span>
            </div>

            <!-- 5. Consultations Booked -->
            <div
              @click="navigateTo('/cases')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view booked appointments"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Booked Appts</p>
                <p class="mt-1 font-bold text-2xl text-teal-100 tracking-tight">
                  {{ (supportMetrics?.appointmentBookedLeads || 0) + (supportMetrics?.visitedLeads || 0) }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2 flex items-center gap-1 font-normal">
                <span>Booking Rate: {{ supportMetrics?.bookingRate || 0 }}%</span>
              </span>
            </div>

            <!-- 6. Response SLA -->
            <div
              @click="navigateTo('/reports')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view SLA metrics report"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">SLA Compliance</p>
                <p class="mt-1 font-bold text-2xl text-emerald-300 tracking-tight">
                  {{ supportMetrics?.sla?.complianceRate ?? 96 }}%
                </p>
              </div>
              <div class="mt-2 flex items-center space-x-1.5 text-[10px] text-teal-200/90 font-normal">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Avg ~{{ supportMetrics?.sla?.avgResponseMinutes ?? 12 }}m Response</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Product & Formulation Leads Grid -->
        <div v-if="activeMetricTab === 'all' || activeMetricTab === 'product'" class="space-y-2.5">
          <div v-if="activeMetricTab === 'all'" class="flex items-center justify-between pt-1">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-800/80 border border-teal-500/30 text-teal-100">
              <UIcon name="i-heroicons-shopping-bag" class="w-3.5 h-3.5 text-emerald-300" />
              <span>Product Sales &amp; Campaigns</span>
            </span>
            <NuxtLink to="/reports/products" class="text-[11px] text-teal-200 hover:text-white font-medium flex items-center gap-1">
              <span>View full product analytics</span>
              <UIcon name="i-heroicons-arrow-right" class="w-3 h-3" />
            </NuxtLink>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <!-- P1. Total Product Leads -->
            <div
              @click="selectProductTeam()"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product desk tasks"
            >
              <UIcon name="i-heroicons-arrow-down" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Product Leads</p>
                <p class="mt-1 font-bold text-2xl text-white tracking-tight">
                  {{ productMetrics?.kpis?.totalLeads ?? 0 }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/80 mt-2 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
                <span>New Inquiries: {{ newProductLeadsCount }}</span>
              </span>
            </div>

            <!-- P2. Product Conversion Rate -->
            <div
              @click="navigateTo('/reports/products')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product analytics"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Product Conversion</p>
                <p class="mt-1 font-bold text-2xl text-emerald-300 tracking-tight">
                  {{ productMetrics?.kpis?.conversionRate ?? '0%' }}
                </p>
              </div>
              <div>
                <div class="w-full bg-teal-950/60 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div class="bg-emerald-400 h-1 rounded-full transition-all" :style="{ width: `${productMetrics?.kpis?.conversionRate || '0%'}` }"></div>
                </div>
                <span class="text-[10px] text-emerald-200/90 mt-1.5 flex items-center gap-1 font-normal">
                  <span>✓ {{ productMetrics?.kpis?.convertedLeads || 0 }} converted</span>
                </span>
              </div>
            </div>

            <!-- P3. Total Confirmed Revenue -->
            <div
              @click="navigateTo('/reports/products')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-amber-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view sales revenue report"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-amber-300/40 group-hover:text-amber-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Product Revenue</p>
                <p class="mt-1 font-bold text-2xl text-amber-300 tracking-tight">
                  ₹{{ (productMetrics?.kpis?.totalRevenue || 0).toLocaleString() }}
                </p>
              </div>
              <span class="text-[10px] text-amber-200/90 mt-2 flex items-center gap-1 font-normal">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Confirmed orders</span>
              </span>
            </div>

            <!-- P4. Campaign Volume -->
            <div
              @click="navigateTo('/products/campaigns')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view campaigns"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Campaign Leads</p>
                <p class="mt-1 font-bold text-2xl text-teal-100 tracking-tight">
                  {{ totalCampaignLeadsCount }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2 flex items-center gap-1 font-normal">
                <span>Across {{ productMetrics?.campaigns?.length || 0 }} campaigns</span>
              </span>
            </div>

            <!-- P5. Average Order Value -->
            <div
              @click="navigateTo('/reports/products')"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-teal-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product analytics"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="w-3.5 h-3.5 text-teal-300/40 group-hover:text-teal-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Avg Order Value</p>
                <p class="mt-1 font-bold text-2xl text-teal-100 tracking-tight">
                  ₹{{ avgProductOrderValue.toLocaleString() }}
                </p>
              </div>
              <span class="text-[10px] text-teal-200/90 mt-2 flex items-center gap-1 font-normal">
                <span>Per converted buyer</span>
              </span>
            </div>

            <!-- P6. Active Pipeline Inquiries -->
            <div
              @click="selectProductTeam()"
              class="group relative cursor-pointer rounded-2xl p-4 bg-teal-900/40 hover:bg-teal-900/70 border border-teal-500/20 hover:border-emerald-400/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
              title="Click to view product queue"
            >
              <UIcon name="i-heroicons-arrow-down" class="w-3.5 h-3.5 text-emerald-300/40 group-hover:text-emerald-200 group-hover:translate-y-0.5 transition-all opacity-0 group-hover:opacity-100 absolute top-3.5 right-3.5" />
              <div>
                <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Active Pipeline</p>
                <p class="mt-1 font-bold text-2xl text-emerald-300 tracking-tight">
                  {{ inPipelineProductLeadsCount }}
                </p>
              </div>
              <div class="mt-2 flex items-center space-x-1.5 text-[10px] text-teal-200/90 font-normal">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Contacted &amp; negotiating</span>
              </div>
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
          <!-- Calls Due Today -->
          <div class="rounded-2xl p-4 bg-teal-900/40 border border-teal-500/20 backdrop-blur-sm flex flex-col justify-between">
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Calls Due Today</p>
            <p class="mt-1 font-bold text-2xl text-white tracking-tight">{{ todayCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Scheduled follow-ups</span>
            </span>
          </div>

          <!-- Overdue Tasks -->
          <div class="rounded-2xl p-4 bg-teal-900/40 border border-teal-500/20 backdrop-blur-sm flex flex-col justify-between" :class="overdueCount > 0 ? 'border-rose-400/50' : ''">
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Overdue Tasks</p>
            <p class="mt-1 font-bold text-2xl tracking-tight" :class="overdueCount > 0 ? 'text-rose-300' : 'text-emerald-300'">{{ overdueCount }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full" :class="overdueCount > 0 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'"></span>
              <span>{{ overdueCount > 0 ? 'Immediate action required' : 'All clear' }}</span>
            </span>
          </div>

          <!-- Active Queue Size -->
          <div class="rounded-2xl p-4 bg-teal-900/40 border border-teal-500/20 backdrop-blur-sm flex flex-col justify-between">
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Current Queue Items</p>
            <p class="mt-1 font-bold text-2xl text-white tracking-tight">{{ tasks.length }}</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
              <span>In {{ activeTiming }} filter</span>
            </span>
          </div>

          <!-- SLA Guidelines -->
          <div class="rounded-2xl p-4 bg-teal-900/40 border border-teal-500/20 backdrop-blur-sm flex flex-col justify-between">
            <p class="text-[11px] text-teal-200/90 font-semibold uppercase tracking-wider">Target SLA</p>
            <p class="mt-1 font-bold text-lg text-emerald-300 tracking-tight">&lt; 5m Ads &bull; 15m Web</p>
            <span class="text-[10px] text-teal-200/80 mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Calling hours: 9 AM - 8 PM</span>
            </span>
          </div>
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
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🎯</span>
                <span>Lead-to-Conversion Ratio &amp; Pipeline</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion velocity from initial lead to admitted patient
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {{ supportMetrics?.conversionRate ?? 0 }}% Conversion Ratio
              </span>
            </div>
          </div>

          <!-- Loading State for Graph 2 -->
          <div v-if="isLoadingMetrics" class="h-48 flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Funnel Stages & Progress Bars -->
          <div v-else class="space-y-3.5 mt-4">
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
                  <span class="text-[11px]">({{ stg.percentage }}%)</span>
                </div>
              </div>

              <!-- Horizontal Progress Bar -->
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                <div
                  class="h-full rounded-full transition-all duration-700 shadow-xs"
                  :class="stg.barClass"
                  :style="{ width: `${stg.percentage > 0 ? Math.max(stg.percentage, 4) : 0}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Funnel Summary Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Booking Rate: <strong class="text-slate-800 dark:text-slate-200 font-semibold">{{ supportMetrics?.bookingRate || 0 }}%</strong></span>
            <span>&bull;</span>
            <span>Admitted: <strong class="text-emerald-600 font-semibold">{{ supportMetrics?.convertedLeads || 0 }} Patients</strong></span>
          </div>
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
            <span>★ Target: &gt;50%</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Desk Tabs Navigation / Queue Header -->
    <div id="work-queue-section" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 scroll-mt-6">
      <!-- Team Queue Tabs (Only for Management/Executives who oversee multiple desks) -->
      <div v-if="isExecutive" class="flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          v-if="canViewSupportDesk"
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'support'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'support'; loadWorkQueue()"
        >
          {{ t('desks.support_title') }}
        </button>
        <button
          v-if="canViewAdmissionDesk"
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'admission'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'admission'; loadWorkQueue()"
        >
          {{ t('desks.admission_title') }}
        </button>
        <button
          v-if="canViewAftercareDesk"
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTeam === 'aftercare'
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'aftercare'; loadWorkQueue()"
        >
          {{ t('desks.aftercare_title') }}
        </button>
        <button
          v-if="canViewProductDesk"
          type="button"
          :class="[
            'px-4 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap min-h-[44px] flex items-center gap-1.5',
            activeTeam === 'product'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          ]"
          @click="activeTeam = 'product'; loadWorkQueue()"
        >
          <UIcon name="i-heroicons-shopping-bag" class="w-4 h-4" />
          <span>Product Desk</span>
        </button>
      </div>

      <!-- Operational Staff: Clean Single Queue Title (No other department tabs) -->
      <div v-else class="flex items-center gap-2.5 py-1">
        <span class="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
          <UIcon :name="singleQueueIcon" class="w-4 h-4" />
        </span>
        <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
          {{ singleQueueTitle }}
        </h2>
      </div>

      <!-- Timing Sub-Filter: Overdue / Today / Upcoming -->
      <div class="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'overdue'; loadWorkQueue()"
        >
          {{ t('common.overdue') }} ({{ overdueCount }})
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'today'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'today'; loadWorkQueue()"
        >
          {{ t('common.today') }} ({{ todayCount }})
        </button>
        <button
          type="button"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px]',
            activeTiming === 'upcoming'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          ]"
          @click="activeTiming = 'upcoming'; loadWorkQueue()"
        >
          {{ t('common.upcoming') }} ({{ upcomingCount }})
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 flex justify-center items-center">
      <div class="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="tasks.length === 0"
      class="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700"
    >
      <div class="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl mb-4">
        ✨
      </div>
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200">
        {{ t('tasks.no_tasks') }}
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        Great job! You have cleared all {{ activeTiming }} items for this desk queue.
      </p>
    </div>

    <!-- Task Cards List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>
          <!-- Top Row: Priority Badge & SLA Countdown -->
          <div class="flex items-center justify-between mb-3">
            <span
              :class="[
                'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full',
                task.priority === 'hot'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : task.priority === 'cold'
                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              ]"
            >
              {{ task.priority }}
            </span>

            <!-- SLA Timer for New Leads -->
            <div
              v-if="task.lead?.firstResponseDueAt && !task.lead.firstResponseAt"
              class="flex items-center gap-1.5 text-xs font-mono font-semibold"
            >
              <span
                :class="[
                  'px-2 py-0.5 rounded-md text-[11px]',
                  isSlaBreached(task.lead.firstResponseDueAt)
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                ]"
              >
                {{ formatSlaRemaining(task.lead.firstResponseDueAt) }}
              </span>
            </div>
            <div v-else class="text-xs text-slate-400 font-medium">
              Due: {{ formatDueDate(task.dueAt) }}
            </div>
          </div>

          <!-- Patient Information -->
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600">
              <NuxtLink v-if="task.lead" :to="`/leads/${task.lead.id}`">
                {{ task.lead.name }}
              </NuxtLink>
              <NuxtLink v-else-if="task.case" :to="`/cases/${task.case.id}`">
                {{ task.case.patient?.name || 'Patient Case' }}
              </NuxtLink>
              <span v-else>{{ task.case?.patient?.name || 'Patient Case' }}</span>
            </h3>

            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="font-mono">{{ task.lead?.mobile || task.case?.patient?.mobileNorm || '—' }}</span>
              <span v-if="task.lead?.leadType === 'product'" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                📦 Product
              </span>
              <span v-if="task.lead?.language || task.case?.patient?.preferredLang" class="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-semibold">
                {{ (task.lead?.language || task.case?.patient?.preferredLang || 'en').toUpperCase() }}
              </span>
            </div>
          </div>

          <!-- Task Title & Concern -->
          <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {{ task.title }}
            </p>
            <p v-if="task.lead?.concern || task.case?.planNote" class="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              {{ task.lead?.concern || task.case?.planNote }}
            </p>
            <div v-if="task.lead?.productInterests?.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="interest in task.lead.productInterests"
                :key="interest.id"
                class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                {{ interest.product?.name || 'Product' }} (x{{ interest.quantity }})
              </span>
            </div>
            <div class="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span v-if="task.lead?.department || task.case?.department">
                🏥 {{ task.lead?.department?.labelEn || task.case?.department?.labelEn }}
              </span>
              <span v-if="task.lead?.source">
                &bull; {{ task.lead.source.labelEn }}
              </span>
              <span v-else-if="task.case">
                &bull; {{ formatStage(task.case.stage) }}
              </span>
            </div>
          </div>

          <!-- Testimonials Status Chip -->
          <div v-if="task.lead && task.lead.leadType !== 'product'" class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {{ t('testimonials.title') }}:
            </span>
            <TestimonialChip
              :sent-count="task.lead.testimonialsSentCount || 0"
              :last-sent-at="task.lead.testimonialsLastSentAt"
              :show-action-button="true"
              @mark-sent="openMarkTestimonial(task.lead)"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
          <!-- Call Button (tel: link) -->
          <a
            :href="`tel:${task.lead?.mobileNorm || task.lead?.mobile || task.case?.patient?.mobileNorm || ''}`"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
          >
            📞 {{ t('common.call') }}
          </a>

          <!-- WhatsApp Button (wa.me link with consent check) -->
          <button
            type="button"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold text-xs hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
            @click="openWhatsApp(task)"
          >
            💬 {{ t('common.whatsapp') }}
          </button>

          <!-- Log Call Button -->
          <button
            type="button"
            class="min-h-[44px] flex items-center justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs"
            @click="openLogCall(task)"
          >
            📝 {{ t('common.log_call') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Drawers & Modals -->
    <QuickCreateDrawer
      :is-open="isQuickCreateOpen"
      :default-lead-type="isProductStaff ? 'product' : 'treatment'"
      @close="isQuickCreateOpen = false"
      @lead-created="onLeadCreated"
    />

    <LogCallDrawer
      :is-open="isLogCallOpen"
      :lead="selectedTask?.lead"
      :case-id="selectedTask?.case?.id"
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
const activeMetricTab = ref<'all' | 'clinical' | 'product'>('all');
const isLoadingMetrics = ref(true);
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
  const inPipeline = (m.inProgressLeads || 0) + (m.appointmentBookedLeads || 0) + (m.visitedLeads || 0) + (m.convertedLeads || 0);
  const bookedOrDone = (m.appointmentBookedLeads || 0) + (m.visitedLeads || 0) + (m.convertedLeads || 0);
  const converted = m.convertedLeads || 0;

  return [
    {
      stage: 'Total Leads Inquiries',
      count: total,
      percentage: total > 0 ? 100 : 0,
      dotClass: 'bg-teal-500',
      barClass: 'bg-gradient-to-r from-teal-500 to-teal-600',
    },
    {
      stage: 'Contacted & Qualified',
      count: inPipeline,
      percentage: total > 0 ? Math.min(100, Math.round((inPipeline / total) * 100)) : 0,
      dotClass: 'bg-blue-500',
      barClass: 'bg-gradient-to-r from-blue-500 to-blue-600',
    },
    {
      stage: 'Consultations Booked',
      count: bookedOrDone,
      percentage: total > 0 ? Math.min(100, Math.round((bookedOrDone / total) * 100)) : 0,
      dotClass: 'bg-amber-500',
      barClass: 'bg-gradient-to-r from-amber-500 to-amber-600',
    },
    {
      stage: 'Admitted / Converted',
      count: converted,
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

// Fetch Dashboard Executive Metrics
const loadDashboardMetrics = async () => {
  if (!authStore.token) return;
  isLoadingMetrics.value = true;
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` };
    const [supportRes, productRes] = await Promise.allSettled([
      fetch(`${apiBase}/reports/support`, { headers }),
      fetch(`${apiBase}/reports/product-leads`, { headers }),
    ]);

    if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
      supportMetrics.value = await supportRes.value.json();
    }
    if (productRes.status === 'fulfilled' && productRes.value.ok) {
      productMetrics.value = await productRes.value.json();
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
      `${apiBase}/tasks?team=${activeTeam.value}&due=${activeTiming.value}&status=open`,
      {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }
    );
    if (res.ok) {
      const result = await res.json();
      tasks.value = result.data || [];
    } else if (res.status === 401) {
      isLoading.value = false;
      authStore.logout();
      return;
    }

    // Load counts for tabs
    const [odRes, tdRes, upRes] = await Promise.all([
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=overdue&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=today&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
      fetch(`${apiBase}/tasks?team=${activeTeam.value}&due=upcoming&status=open&pageSize=1`, {
        headers: { Authorization: `Bearer ${authStore.token}` },
      }),
    ]);

    if (odRes.ok) overdueCount.value = (await odRes.json()).meta?.total || 0;
    if (tdRes.ok) todayCount.value = (await tdRes.json()).meta?.total || 0;
    if (upRes.ok) upcomingCount.value = (await upRes.json()).meta?.total || 0;
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

const isSlaBreached = (dueAtStr: string) => {
  return new Date(dueAtStr).getTime() < nowTime.value;
};

const formatSlaRemaining = (dueAtStr: string) => {
  const diff = new Date(dueAtStr).getTime() - nowTime.value;
  if (diff <= 0) {
    const overdueMin = Math.floor(Math.abs(diff) / 60000);
    return `BREACHED (-${overdueMin}m)`;
  }
  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s left`;
};

const formatDueDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatStage = (stage: string) => {
  return t(`cases.stages.${stage}`, stage);
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
  loadDashboardMetrics();
};

const onCallLogged = () => {
  loadWorkQueue();
  loadDashboardMetrics();
};

const onApptBooked = () => {
  loadWorkQueue();
  loadDashboardMetrics();
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
  } else if (code === 'product_sales_executive' || code === 'product_caller') {
    activeTeam.value = 'product';
  } else {
    activeTeam.value = 'support';
  }
  await Promise.all([
    loadWorkQueue(),
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
