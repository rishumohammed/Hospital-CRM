<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {{ t('nav.admin') }}
        </h1>
        <p class="text-sm text-slate-500">
          User directory, master picklists, SLA settings, and audit logs
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center space-x-2">
        <button
          v-if="activeTab === 'users' && canManageUsers"
          @click="openCreateUserModal"
          class="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all shadow-teal-600/20 active:scale-95"
        >
          + Add New User
        </button>
        <button
          v-if="activeTab === 'settings' && canManageSettings"
          @click="saveSettings"
          :disabled="savingSettings"
          class="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
        >
          {{ savingSettings ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="border-b border-slate-200 dark:border-slate-700 flex space-x-6 overflow-x-auto">
      <button
        v-for="tab in tabList"
        :key="tab.id"
        @click="switchTab(tab.id)"
        :class="[
          'pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap min-h-[44px]',
          activeTab === tab.id
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB 1: USERS DIRECTORY -->
    <div v-if="activeTab === 'users' && canManageUsers" class="space-y-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <input
            v-model="userSearch"
            type="text"
            placeholder="Filter users by name or email..."
            class="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm max-w-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <span class="text-xs text-slate-500 font-medium">{{ users.length }} users loaded</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th class="py-3.5 px-4">Name & Email</th>
                <th class="py-3.5 px-4">Role</th>
                <th class="py-3.5 px-4">Teams</th>
                <th class="py-3.5 px-4">Branch</th>
                <th class="py-3.5 px-4">Status</th>
                <th class="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                <td class="py-3.5 px-4">
                  <div class="font-semibold text-slate-900 dark:text-slate-100">{{ u.name }}</div>
                  <div class="text-xs text-slate-500">{{ u.email }} • {{ u.mobile }}</div>
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                    {{ u.role?.name || u.role?.code }}
                  </span>
                </td>
                <td class="py-3.5 px-4">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="t in u.teams"
                      :key="t.id"
                      class="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {{ t.name }}
                    </span>
                    <span v-if="!u.teams || u.teams.length === 0" class="text-xs text-slate-400">—</span>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span v-for="b in u.branches" :key="b.id">{{ b.code }}</span>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                      u.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    ]"
                  >
                    ● {{ u.status }}
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Edit User Button -->
                    <button
                      type="button"
                      @click="openEditUserModal(u)"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                      title="Edit User"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
                    </button>

                    <!-- Deactivate / Reactivate Button -->
                    <button
                      v-if="u.status === 'active'"
                      type="button"
                      @click="initiateDeactivation(u)"
                      class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                      title="Deactivate with Reassignment"
                    >
                      <UIcon name="i-heroicons-pause-circle" class="w-4 h-4" />
                    </button>
                    <button
                      v-else
                      type="button"
                      @click="reactivateUser(u)"
                      class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                      title="Reactivate User"
                    >
                      <UIcon name="i-heroicons-play-circle" class="w-4 h-4" />
                    </button>

                    <!-- Soft Delete Button -->
                    <button
                      type="button"
                      @click="initiateSoftDelete(u)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Soft Delete User"
                    >
                      <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: MASTER PICKLISTS -->
    <div v-if="activeTab === 'picklists'" class="space-y-4">
      <!-- Picklist Type Selector Tabs -->
      <div class="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          v-for="pt in picklistTypes"
          :key="pt.id"
          @click="selectPicklistType(pt.id)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[38px] whitespace-nowrap',
            selectedPicklistType === pt.id
              ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
          ]"
        >
          {{ pt.label }}
        </button>
      </div>

      <!-- Picklist Items Card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <!-- Card Header with Search, Filter & Add Button -->
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              {{ currentPicklistMeta?.label }}
            </h2>
            <p class="text-xs text-slate-500">Configured options for system-wide picklists</p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Search Filter -->
            <div class="relative">
              <input
                v-model="picklistSearch"
                type="text"
                placeholder="Search code or label..."
                class="min-h-[38px] pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            <!-- Status Filter -->
            <select
              v-model="picklistStatusFilter"
              class="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <!-- Add Option Button -->
            <button
              v-if="canManagePicklists"
              @click="openCreatePicklistModal"
              class="inline-flex items-center gap-1 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors active:scale-95"
            >
              <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
              <span>Add Option</span>
            </button>

            <span class="text-xs text-slate-400 font-mono hidden md:inline">{{ filteredPicklistItems.length }} options</span>
          </div>
        </div>

        <!-- Table Loading State -->
        <div v-if="picklistLoading" class="py-12 flex justify-center items-center">
          <UIcon name="i-heroicons-arrow-path" class="w-7 h-7 text-teal-600 animate-spin" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredPicklistItems.length === 0" class="p-12 text-center text-slate-400">
          <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
            📋
          </div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No picklist options found</p>
          <p class="text-xs text-slate-400 mt-1">Try adjusting search criteria or add a new option above</p>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
                <th class="py-3 px-4">Code</th>
                <th class="py-3 px-4">Label</th>
                <th v-if="selectedPicklistType === 'call-outcomes'" class="py-3 px-4">Scope</th>
                <th class="py-3 px-4">Sort</th>
                <th class="py-3 px-4">Status</th>
                <th v-if="canManagePicklists" class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr
                v-for="item in filteredPicklistItems"
                :key="item.id"
                class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors"
              >
                <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {{ item.code }}
                </td>
                <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  {{ item.labelEn }}
                </td>
                <td v-if="selectedPicklistType === 'call-outcomes'" class="py-3 px-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                      item.scope === 'treatment'
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                        : item.scope === 'product'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    ]"
                  >
                    {{ item.scope === 'treatment' ? 'Treatment Only' : item.scope === 'product' ? 'Product Only' : 'Both (All Leads)' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-500 font-mono">
                  {{ item.sort || 0 }}
                </td>
                <td class="py-3 px-4">
                  <button
                    type="button"
                    @click="togglePicklistActive(item)"
                    :disabled="!canManagePicklists || togglingId === item.id"
                    :class="[
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                      canManagePicklists ? 'cursor-pointer hover:shadow-xs active:scale-95' : 'cursor-default',
                      item.active
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600'
                    ]"
                    :title="canManagePicklists ? 'Click to toggle status' : undefined"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="item.active ? 'bg-emerald-500' : 'bg-slate-400'" />
                    <span>{{ togglingId === item.id ? 'Saving...' : (item.active ? 'Active' : 'Inactive') }}</span>
                  </button>
                </td>
                <td v-if="canManagePicklists" class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end space-x-1.5">
                    <button
                      type="button"
                      @click="openEditPicklistModal(item)"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      @click="confirmDeletePicklistItem(item)"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: SYSTEM SETTINGS -->
    <div v-if="activeTab === 'settings' && canManageSettings" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Calling Hours Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">🕒</span>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Calling Hours</h2>
              <p class="text-xs text-slate-500">Permitted calling window for patient communications</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Window Start</label>
              <input
                v-model="settingsForm.calling_hours.start"
                type="time"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Window End</label>
              <input
                v-model="settingsForm.calling_hours.end"
                type="time"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400">Timezone: {{ settingsForm.calling_hours.timezone }} (Calls outside require override reason)</p>
        </div>

        <!-- First-Response SLA Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">⚡</span>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">First-Response SLA</h2>
              <p class="text-xs text-slate-500">Response target time within business hours</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Meta & Google Ads (Mins)</label>
              <input
                v-model.number="settingsForm.sla_minutes.meta_ads"
                type="number"
                min="1"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Other Sources (Mins)</label>
              <input
                v-model.number="settingsForm.sla_minutes.default"
                type="number"
                min="1"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400">Timers count during branch opening hours; breach alerts Telecaller Manager</p>
        </div>

        <!-- Contact Rules Soft Limits Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">📞</span>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Contact Rules (Soft Limits)</h2>
              <p class="text-xs text-slate-500">Call frequency guards and warning triggers</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Max Calls / Same Day</label>
              <input
                v-model.number="settingsForm.contact_rules.max_calls_per_day"
                type="number"
                min="1"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Max Attempts / Cadence</label>
              <input
                v-model.number="settingsForm.contact_rules.max_attempts_per_cycle"
                type="number"
                min="1"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400">Exceeding limits requires mandatory override reason saved in interaction</p>
        </div>

        <!-- Quiet Hours & Retention Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">🛡️</span>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Quiet Hours & Data Retention</h2>
              <p class="text-xs text-slate-500">Patient privacy and automated retention limits</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Leads Retention (Days)</label>
              <input
                v-model.number="settingsForm.retention_policies.leads_days"
                type="number"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Audit Log Retention (Days)</label>
              <input
                v-model.number="settingsForm.retention_policies.audit_days"
                type="number"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400">Default: 5 years for customer records, 7 years for compliance audit logs</p>
        </div>

        <!-- Testimonials Policy & Follow-up Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">📜</span>
            <div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-slate-100">Testimonials Policy & Follow-up</h2>
              <p class="text-xs text-slate-500">Automated cadence follow-up task scheduling and library management</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Follow-up Task Delay (Hours)</label>
              <input
                v-model.number="settingsForm.testimonial_followup_hours"
                type="number"
                min="0"
                class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div class="flex items-end pb-1">
              <NuxtLink
                to="/admin/testimonials"
                class="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span>📜 Manage Testimonial Library →</span>
              </NuxtLink>
            </div>
          </div>
          <p class="text-xs text-slate-400">Default: 24 hours. When > 0, automatically schedules a telecaller follow-up task 'Check if the testimonials were seen'. Set to 0 to disable.</p>
        </div>
      </div>
    </div>

    <!-- TAB 4: AUDIT LOGS -->
    <div v-if="activeTab === 'audit' && canViewAudit" class="space-y-4">
      <!-- Filter and Search Bar -->
      <div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-3">
        <!-- Quick Search -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Search Logs</label>
          <div class="relative">
            <input
              v-model="auditFilters.search"
              type="text"
              placeholder="Search user, action, entity, IP..."
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[38px]"
            />
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <!-- Entity Filter -->
        <div class="w-44">
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Entity</label>
          <select
            v-model="auditFilters.entity"
            @change="auditFilters.page = 1; fetchAuditLogs()"
            class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[38px]"
          >
            <option value="">All Entities</option>
            <option value="lead">Lead</option>
            <option value="case">Case</option>
            <option value="task">Task</option>
            <option value="interaction">Interaction</option>
            <option value="export">Export</option>
            <option value="user">User</option>
            <option value="auth">Auth</option>
            <option value="settings">Settings</option>
            <option value="departments">Department</option>
            <option value="sources">Source</option>
            <option value="call-outcomes">Call Outcome</option>
          </select>
        </div>

        <!-- Action Filter -->
        <div class="w-52">
          <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Action</label>
          <select
            v-model="auditFilters.action"
            @change="auditFilters.page = 1; fetchAuditLogs()"
            class="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 min-h-[38px]"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LEAD_CREATED">LEAD_CREATED</option>
            <option value="LEAD_CONVERTED">LEAD_CONVERTED</option>
            <option value="CALL_LOGGED">CALL_LOGGED</option>
            <option value="CASE_STAGE_ADVANCED">CASE_STAGE_ADVANCED</option>
            <option value="TREATMENT_COMPLETED">TREATMENT_COMPLETED</option>
            <option value="CASE_CLOSED">CASE_CLOSED</option>
            <option value="PICKLIST_ITEM_CREATED">PICKLIST_ITEM_CREATED</option>
            <option value="PICKLIST_ITEM_UPDATED">PICKLIST_ITEM_UPDATED</option>
            <option value="PICKLIST_ITEM_DEACTIVATED">PICKLIST_ITEM_DEACTIVATED</option>
            <option value="PICKLIST_ITEM_DELETED">PICKLIST_ITEM_DELETED</option>
            <option value="SCOPE_DENIED">SCOPE_DENIED</option>
            <option value="PERMISSION_GRANTED">PERMISSION_GRANTED</option>
            <option value="EXPORT_REQUESTED">EXPORT_REQUESTED</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="self-end flex items-center space-x-2">
          <button
            @click="resetAuditFilters"
            class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[38px] transition-colors"
          >
            Reset
          </button>
          <button
            @click="fetchAuditLogs"
            :disabled="auditLoading"
            class="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold min-h-[38px] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <UIcon name="i-heroicons-arrow-path" :class="['w-3.5 h-3.5', auditLoading ? 'animate-spin' : '']" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Audit Logs Table Card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center space-x-2">
            <span class="text-base font-semibold text-slate-900 dark:text-slate-100">Forensic Audit Trails</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {{ auditTotal }} total records
            </span>
          </div>
          <span class="text-xs text-slate-400">Click any row to inspect detail payloads and diffs</span>
        </div>

        <!-- Loading spinner -->
        <div v-if="auditLoading" class="py-16 flex justify-center items-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-teal-600 animate-spin" />
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredAuditLogs.length === 0" class="p-12 text-center text-slate-400">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400">
            🛡️
          </div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">No audit records found</p>
          <p class="text-xs text-slate-400 mt-1">Try resetting or broadening your filter criteria</p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-700">
                <th class="py-3 px-4">Timestamp (Kolkata)</th>
                <th class="py-3 px-4">Action</th>
                <th class="py-3 px-4">Entity</th>
                <th class="py-3 px-4">Actor</th>
                <th class="py-3 px-4">IP Address</th>
                <th class="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <template v-for="log in filteredAuditLogs" :key="log.id">
                <tr
                  class="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                  @click="toggleAuditExpand(log.id)"
                >
                  <td class="py-3 px-4 text-slate-500 whitespace-nowrap font-mono">
                    {{ new Date(log.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) }}
                  </td>
                  <td class="py-3 px-4">
                    <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-md font-mono', getAuditBadgeClass(log.action)]">
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                    <span class="uppercase">{{ log.entity }}</span>
                    <span v-if="log.entityId" class="text-slate-400 font-mono ml-1">#{{ log.entityId }}</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">
                      {{ log.user?.name || log.user?.email || 'System' }}
                    </div>
                    <div v-if="log.user?.name && log.user?.email" class="text-[10px] text-slate-400">
                      {{ log.user.email }}
                    </div>
                  </td>
                  <td class="py-3 px-4 text-slate-400 font-mono">
                    {{ log.ip || '—' }}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <button class="text-slate-400 hover:text-teal-600 transition-colors">
                      <UIcon
                        :name="expandedAuditIds.has(log.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                        class="w-4 h-4"
                      />
                    </button>
                  </td>
                </tr>

                <!-- Expanded Detail Drawer -->
                <tr v-if="expandedAuditIds.has(log.id)" class="bg-slate-50/80 dark:bg-slate-900/60">
                  <td colspan="6" class="p-4 border-t border-slate-100 dark:border-slate-800">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div class="text-[11px] font-semibold uppercase text-slate-400 mb-1">Forensic Metadata</div>
                        <div class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                          <div><span class="text-slate-400">Record ID:</span> <span class="text-slate-800 dark:text-slate-200 font-semibold">#{{ log.id }}</span></div>
                          <div><span class="text-slate-400">Timestamp UTC:</span> <span class="text-slate-600 dark:text-slate-300">{{ log.createdAt }}</span></div>
                          <div><span class="text-slate-400">Actor ID:</span> <span class="text-slate-600 dark:text-slate-300">{{ log.userId ? '#' + log.userId : 'System' }}</span></div>
                          <div><span class="text-slate-400">IP Address:</span> <span class="text-slate-600 dark:text-slate-300">{{ log.ip || 'Localhost / Internal' }}</span></div>
                          <div v-if="log.userAgent" class="truncate"><span class="text-slate-400">User Agent:</span> <span class="text-slate-600 dark:text-slate-300" :title="log.userAgent">{{ log.userAgent }}</span></div>
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] font-semibold uppercase text-slate-400 mb-1">State Mutation & Payload</div>
                        <div class="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 font-mono text-[11px] max-h-48 overflow-y-auto">
                          <pre v-if="log.details" class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{{ JSON.stringify(log.details, null, 2) }}</pre>
                          <span v-else class="text-slate-400 italic">No additional mutation payload recorded</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="p-3.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
          <span class="text-slate-500">
            Page {{ auditFilters.page }} of {{ auditTotalPages || 1 }}
          </span>
          <div class="flex items-center space-x-1.5">
            <button
              :disabled="auditFilters.page <= 1 || auditLoading"
              @click="auditFilters.page--; fetchAuditLogs()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <button
              :disabled="auditFilters.page >= auditTotalPages || auditLoading"
              @click="auditFilters.page++; fetchAuditLogs()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT PICKLIST OPTION -->
    <div
      v-if="showPicklistModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ isEditingPicklist ? 'Edit Picklist Option' : 'Add New Picklist Option' }}
            </h3>
            <p class="text-xs text-slate-500">{{ currentPicklistMeta?.label }}</p>
          </div>
          <button
            @click="showPicklistModal = false"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="savePicklistItem" class="space-y-4">
          <!-- Code -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Code <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="picklistForm.code"
              type="text"
              :disabled="isEditingPicklist"
              required
              placeholder="e.g. WHATSAPP_LEAD"
              class="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800"
            />
            <p class="text-[11px] text-slate-400 mt-1">Unique alphanumeric uppercase key used in system logic</p>
          </div>

          <!-- Label -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Label <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="picklistForm.labelEn"
              type="text"
              required
              placeholder="e.g. WhatsApp Inbound"
              class="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <!-- Scope (Call Outcomes only) -->
          <div v-if="selectedPicklistType === 'call-outcomes'">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Applicable Scope
            </label>
            <select
              v-model="picklistForm.scope"
              class="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              <option value="both">Both (Treatment & Product Leads)</option>
              <option value="treatment">Treatment Leads Only</option>
              <option value="product">Product Leads Only</option>
            </select>
          </div>

          <!-- Sort Order & Active Flag -->
          <div class="grid grid-cols-2 gap-4 items-center">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sort Order
              </label>
              <input
                v-model.number="picklistForm.sort"
                type="number"
                min="0"
                class="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div class="pt-5">
              <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  v-model="picklistForm.active"
                  type="checkbox"
                  class="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Active status</span>
              </label>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="picklistModalError" class="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs border border-rose-200">
            {{ picklistModalError }}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              @click="showPicklistModal = false"
              class="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingPicklist"
              class="inline-flex items-center gap-1.5 px-5 py-2 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm shadow-teal-600/20"
            >
              <UIcon v-if="savingPicklist" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <span>{{ savingPicklist ? 'Saving...' : (isEditingPicklist ? 'Update Option' : 'Create Option') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DELETE / DEACTIVATE CONFIRMATION -->
    <div
      v-if="deletingPicklistItem"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
          <div class="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              {{ picklistDeleteInUse ? 'Cannot Delete Referenced Option' : 'Delete Picklist Option' }}
            </h3>
            <p class="text-xs text-slate-500">{{ currentPicklistMeta?.label }}</p>
          </div>
        </div>

        <!-- Normal confirmation state -->
        <div v-if="!picklistDeleteInUse" class="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>
            Are you sure you want to delete <strong class="text-slate-900 dark:text-slate-100 font-semibold">{{ deletingPicklistItem.labelEn }}</strong> (<span class="font-mono text-slate-500">{{ deletingPicklistItem.code }}</span>)?
          </p>
          <p class="text-slate-400">
            If this option is already referenced by existing leads or cases, the system will prevent data loss and offer to deactivate it instead.
          </p>
        </div>

        <!-- In-Use conflict state -->
        <div v-else class="space-y-3">
          <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <div class="font-semibold">Option In Use ({{ picklistInUseCount }} records)</div>
            <p>
              This option is referenced by historical records. Permanently deleting it would break database relationships.
            </p>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Would you like to <strong>deactivate</strong> this option instead? Inactive options remain safely linked to existing records but won't appear in new dropdowns.
          </p>
        </div>

        <!-- Error display if any -->
        <div v-if="picklistDeleteError" class="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {{ picklistDeleteError }}
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            @click="deletingPicklistItem = null; picklistDeleteInUse = false; picklistDeleteError = null"
            class="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          
          <!-- If in use, offer Deactivate button -->
          <button
            v-if="picklistDeleteInUse"
            type="button"
            @click="executeDeletePicklistItem(true)"
            :disabled="deletingPicklistLoading"
            class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            <UIcon v-if="deletingPicklistLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ deletingPicklistLoading ? 'Deactivating...' : 'Deactivate Option' }}</span>
          </button>

          <!-- Normal delete button -->
          <button
            v-else
            type="button"
            @click="executeDeletePicklistItem(false)"
            :disabled="deletingPicklistLoading"
            class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            <UIcon v-if="deletingPicklistLoading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ deletingPicklistLoading ? 'Deleting...' : 'Delete Permanently' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: DEACTIVATE & REASSIGN WIZARD FOR USERS -->
    <div
      v-if="deactivatingUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Deactivate User: {{ deactivatingUser.name }}
        </h3>
        <p class="text-xs text-slate-500">
          Reassign open leads, cases, and tasks currently owned by this user to another active colleague.
        </p>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reassign Open Records To
          </label>
          <select
            v-model="reassignTargetUserId"
            class="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option :value="null">Do not reassign (Leave unassigned)</option>
            <option
              v-for="target in eligibleTargets"
              :key="target.id"
              :value="target.id"
            >
              {{ target.name }} ({{ target.role?.name }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Deactivation
          </label>
          <textarea
            v-model="deactivationReason"
            rows="2"
            placeholder="e.g. Employee resignation or role transition"
            class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
          ></textarea>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            @click="deactivatingUser = null"
            class="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            @click="confirmDeactivation"
            :disabled="!deactivationReason"
            class="px-4 py-2 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            Confirm Deactivation
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT USER -->
    <div
      v-if="showUserModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UIcon :name="isEditingUser ? 'i-heroicons-pencil-square' : 'i-heroicons-user-plus'" class="w-5 h-5 text-teal-600" />
            <span>{{ isEditingUser ? `Edit User: ${userForm.name}` : 'Add New User' }}</span>
          </h3>
          <button
            type="button"
            @click="showUserModal = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <div v-if="userModalError" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {{ userModalError }}
        </div>

        <form @submit.prevent="saveUser" class="space-y-4">
          <!-- Name & Email -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                v-model="userForm.name"
                type="text"
                required
                placeholder="e.g. Dr. Ramesh Kumar"
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                v-model="userForm.email"
                type="email"
                required
                placeholder="name@hospital.test"
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <!-- Mobile & Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number *
              </label>
              <input
                v-model="userForm.mobile"
                type="tel"
                required
                placeholder="+919800000000"
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role *
              </label>
              <select
                v-model="userForm.roleId"
                required
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option :value="null" disabled>Select a role...</option>
                <option v-for="r in roles" :key="r.id" :value="r.id">
                  {{ r.name || r.code }}
                </option>
              </select>
            </div>
          </div>

          <!-- Branches Assignment -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Branches Assignment *
            </label>
            <div class="flex flex-wrap gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <label
                v-for="b in branches"
                :key="b.id"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
                :class="userForm.branchIds.includes(b.id) ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950 dark:border-teal-700 dark:text-teal-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
              >
                <input
                  type="checkbox"
                  :value="b.id"
                  v-model="userForm.branchIds"
                  class="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>{{ b.name }} ({{ b.code }})</span>
              </label>
              <span v-if="branches.length === 0" class="text-xs text-slate-400">No branches loaded</span>
            </div>
          </div>

          <!-- Teams Assignment -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Teams Assignment
            </label>
            <div class="flex flex-wrap gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <label
                v-for="t in teams"
                :key="t.id"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
                :class="userForm.teamCodes.includes(t.code) ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950 dark:border-teal-700 dark:text-teal-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
              >
                <input
                  type="checkbox"
                  :value="t.code"
                  v-model="userForm.teamCodes"
                  class="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>{{ t.name }}</span>
              </label>
              <span v-if="teams.length === 0" class="text-xs text-slate-400">No teams loaded</span>
            </div>
          </div>

          <!-- Password & Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {{ isEditingUser ? 'New Password (Optional)' : 'Password *' }}
              </label>
              <input
                v-model="userForm.password"
                type="password"
                :required="!isEditingUser"
                :placeholder="isEditingUser ? 'Leave blank to keep unchanged' : 'Min 8 characters'"
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                v-model="userForm.status"
                class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <!-- Clinical Toggles & Language -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <div class="flex items-center gap-4">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="userForm.dutyDoctor" class="rounded text-teal-600 focus:ring-teal-500" />
                <span class="text-slate-700 dark:text-slate-300 font-medium">Duty Doctor</span>
              </label>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" v-model="userForm.dutyNurse" class="rounded text-teal-600 focus:ring-teal-500" />
                <span class="text-slate-700 dark:text-slate-300 font-medium">Duty Nurse</span>
              </label>
            </div>

            <div class="flex items-center gap-2">
              <label class="font-semibold text-slate-500 uppercase text-[11px]">Lang:</label>
              <select
                v-model="userForm.language"
                class="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="en">English</option>
                <option value="ml">Malayalam</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              @click="showUserModal = false"
              class="px-4 py-2 min-h-[42px] rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingUser"
              class="inline-flex items-center gap-2 px-5 py-2 min-h-[42px] rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm shadow-teal-600/20"
            >
              <UIcon v-if="savingUser" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
              <span>{{ savingUser ? 'Saving...' : (isEditingUser ? 'Update User' : 'Create User') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: SOFT DELETE USER -->
    <div
      v-if="deletingUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-trash" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
              Soft Delete User
            </h3>
            <p class="text-xs text-slate-500">
              Archive {{ deletingUser.name }} ({{ deletingUser.email }})
            </p>
          </div>
        </div>

        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          This user will be soft-deleted and removed from the active directory. They will immediately lose access to log in.
        </p>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reassign Open Records (Leads, Cases, Tasks) To:
          </label>
          <select
            v-model="deleteReassignTargetUserId"
            class="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
          >
            <option :value="null">Do not reassign (Leave unassigned)</option>
            <option
              v-for="target in eligibleDeleteTargets"
              :key="target.id"
              :value="target.id"
            >
              {{ target.name }} ({{ target.role?.name || target.role?.code }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Deletion Reason (Audit Log)
          </label>
          <input
            v-model="deleteReason"
            type="text"
            placeholder="e.g. Employee offboarding / role termination"
            class="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            @click="deletingUser = null"
            class="px-4 py-2 min-h-[42px] rounded-xl text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmSoftDelete"
            :disabled="executingDelete"
            class="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-sm"
          >
            <UIcon v-if="executingDelete" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            <span>{{ executingDelete ? 'Deleting...' : 'Confirm Soft Delete' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const route = useRoute();
const router = useRouter();

const userRoleCode = computed(() => {
  if (!authStore.user) return '';
  if (typeof authStore.user.role === 'object' && authStore.user.role?.code) {
    return authStore.user.role.code;
  }
  return String(authStore.user.role || '');
});

const canManagePicklists = computed(() => {
  const role = userRoleCode.value;
  return (
    ['owner', 'admin', 'center_head', 'telecaller_manager', 'product_manager'].includes(role) ||
    authStore.hasPermission('settings.manage')
  );
});

const canManageUsers = computed(() => {
  const role = userRoleCode.value;
  return ['owner', 'admin'].includes(role) || authStore.hasPermission('user.manage');
});

const canManageSettings = computed(() => {
  const role = userRoleCode.value;
  return ['owner', 'admin'].includes(role) || authStore.hasPermission('settings.manage');
});

const canViewAudit = computed(() => {
  const role = userRoleCode.value;
  return ['owner', 'admin', 'center_head'].includes(role) || authStore.hasPermission('audit.view');
});

const validTabs = ['users', 'picklists', 'settings', 'audit'] as const;
type TabType = typeof validTabs[number];

const tabList = computed(() => {
  const list: { id: TabType; label: string }[] = [];
  if (canManageUsers.value) list.push({ id: 'users', label: 'Users Directory' });
  if (canManagePicklists.value) list.push({ id: 'picklists', label: 'Master Picklists' });
  if (canManageSettings.value) list.push({ id: 'settings', label: 'System Settings' });
  if (canViewAudit.value) list.push({ id: 'audit', label: 'Audit Logs' });
  if (list.length === 0) list.push({ id: 'picklists', label: 'Master Picklists' });
  return list;
});

const initialTab = (route.query.tab as string) || (canManageUsers.value ? 'users' : 'picklists');
const activeTab = ref<TabType>(
  validTabs.includes(initialTab as any) ? (initialTab as TabType) : (canManageUsers.value ? 'users' : 'picklists')
);

function switchTab(tabId: TabType) {
  activeTab.value = tabId;
  router.replace({ query: { ...route.query, tab: tabId } });
  if (tabId === 'audit') {
    fetchAuditLogs();
  }
}

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && validTabs.includes(newTab as any) && newTab !== activeTab.value) {
      activeTab.value = newTab as TabType;
      if (newTab === 'audit') {
        fetchAuditLogs();
      }
    }
  }
);

const userSearch = ref('');

const picklistTypes = [
  { id: 'departments', label: '15 Departments', singular: 'Department' },
  { id: 'sources', label: 'Lead Sources', singular: 'Lead Source' },
  { id: 'call-outcomes', label: 'Call Outcomes', singular: 'Call Outcome' },
  { id: 'lost-reasons', label: 'Lost Reasons', singular: 'Lost Reason' },
  { id: 'decline-reasons', label: 'Decline Reasons', singular: 'Decline Reason' },
  { id: 'closure-codes', label: 'Closure Codes', singular: 'Closure Code' },
] as const;

const selectedPicklistType = ref<string>('departments');
const currentPicklistItems = ref<any[]>([]);
const picklistSearch = ref('');
const picklistStatusFilter = ref<'all' | 'active' | 'inactive'>('all');
const picklistLoading = ref(false);
const togglingId = ref<number | null>(null);

const showPicklistModal = ref(false);
const isEditingPicklist = ref(false);
const savingPicklist = ref(false);
const picklistModalError = ref<string | null>(null);

const picklistForm = ref({
  id: 0,
  code: '',
  labelEn: '',
  labelMl: '',
  scope: 'both' as 'treatment' | 'product' | 'both',
  sort: 0,
  active: true,
});

const deletingPicklistItem = ref<any | null>(null);
const picklistDeleteInUse = ref(false);
const picklistInUseCount = ref(0);
const picklistDeleteError = ref<string | null>(null);
const deletingPicklistLoading = ref(false);

const currentPicklistMeta = computed(() => {
  return picklistTypes.find((p) => p.id === selectedPicklistType.value) || picklistTypes[0];
});

const currentPicklistSingularName = computed(() => {
  return (currentPicklistMeta.value as any)?.singular || 'Option';
});

const filteredPicklistItems = computed(() => {
  let items = currentPicklistItems.value || [];
  if (picklistStatusFilter.value === 'active') {
    items = items.filter((i) => i.active);
  } else if (picklistStatusFilter.value === 'inactive') {
    items = items.filter((i) => !i.active);
  }
  if (!picklistSearch.value.trim()) return items;
  const q = picklistSearch.value.toLowerCase().trim();
  return items.filter(
    (i) =>
      (i.code && i.code.toLowerCase().includes(q)) ||
      (i.labelEn && i.labelEn.toLowerCase().includes(q))
  );
});

const users = ref<any[]>([]);
const roles = ref<any[]>([]);
const branches = ref<any[]>([]);
const teams = ref<any[]>([]);
const auditLogs = ref<any[]>([]);
const auditTotal = ref(0);
const auditLoading = ref(false);
const savingSettings = ref(false);

const auditFilters = ref({
  entity: '',
  action: '',
  search: '',
  page: 1,
  pageSize: 20,
});
const expandedAuditIds = ref<Set<number>>(new Set());

function toggleAuditExpand(id: number) {
  if (expandedAuditIds.value.has(id)) {
    expandedAuditIds.value.delete(id);
  } else {
    expandedAuditIds.value.add(id);
  }
}

function resetAuditFilters() {
  auditFilters.value = {
    entity: '',
    action: '',
    search: '',
    page: 1,
    pageSize: 20,
  };
  fetchAuditLogs();
}

async function fetchAuditLogs() {
  auditLoading.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    const params: Record<string, any> = {
      page: auditFilters.value.page,
      pageSize: auditFilters.value.pageSize,
    };
    if (auditFilters.value.entity) params.entity = auditFilters.value.entity;
    if (auditFilters.value.action) params.action = auditFilters.value.action;

    const res = await $fetch<any>(`${apiBase}/audit-logs`, {
      headers,
      credentials: 'include',
      params,
    });

    auditLogs.value = res.items || [];
    auditTotal.value = res.total ?? (res.items?.length || 0);
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
  } finally {
    auditLoading.value = false;
  }
}

const filteredAuditLogs = computed(() => {
  if (!auditFilters.value.search) return auditLogs.value;
  const q = auditFilters.value.search.toLowerCase().trim();
  return auditLogs.value.filter((log) => {
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.entity && log.entity.toLowerCase().includes(q)) ||
      (log.entityId && String(log.entityId).includes(q)) ||
      (log.user?.name && log.user.name.toLowerCase().includes(q)) ||
      (log.user?.email && log.user.email.toLowerCase().includes(q)) ||
      (log.ip && log.ip.toLowerCase().includes(q))
    );
  });
});

const auditTotalPages = computed(() => {
  return Math.ceil((auditTotal.value || 1) / auditFilters.value.pageSize);
});

function getAuditBadgeClass(action: string) {
  if (!action) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('CONVERTED') || action.includes('COMPLETED')) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
  }
  if (action.includes('FAILED') || action.includes('DENIED') || action.includes('CLOSED') || action.includes('DEACTIVATED') || action.includes('DELETED')) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
  }
  if (action.includes('CALL') || action.includes('ADVANCED') || action.includes('STAGE') || action.includes('GRANT') || action.includes('UPDATED')) {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
  }
  return 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
}

const settingsForm = ref({
  calling_hours: {
    start: '09:00',
    end: '20:00',
    timezone: 'Asia/Kolkata',
    enforce: true,
  },
  sla_minutes: {
    meta_ads: 5,
    google_ads: 5,
    default: 15,
    business_hours_only: true,
  },
  contact_rules: {
    max_calls_per_day: 1,
    max_attempts_per_cycle: 3,
    warn_on_excess: true,
  },
  retention_policies: {
    leads_days: 1825,
    audit_days: 2555,
  },
  testimonial_followup_hours: 24,
});

const showUserModal = ref(false);
const isEditingUser = ref(false);
const savingUser = ref(false);
const userModalError = ref<string | null>(null);

const userForm = ref({
  id: 0,
  name: '',
  email: '',
  mobile: '',
  roleId: null as number | null,
  branchIds: [] as number[],
  teamCodes: [] as string[],
  language: 'en' as 'en' | 'ml',
  status: 'active' as 'active' | 'inactive',
  password: '',
  dutyNurse: false,
  dutyDoctor: false,
});

const deactivatingUser = ref<any | null>(null);
const reassignTargetUserId = ref<number | null>(null);
const deactivationReason = ref('');

const deletingUser = ref<any | null>(null);
const deleteReassignTargetUserId = ref<number | null>(null);
const deleteReason = ref('');
const executingDelete = ref(false);

const eligibleDeleteTargets = computed(() => {
  if (!deletingUser.value) return [];
  return users.value.filter((u) => u.id !== deletingUser.value.id && u.status === 'active');
});

const filteredUsers = computed(() => {
  if (!userSearch.value.trim()) return users.value;
  const q = userSearch.value.toLowerCase();
  return users.value.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
});

const eligibleTargets = computed(() => {
  if (!deactivatingUser.value) return [];
  return users.value.filter(
    (u) => u.id !== deactivatingUser.value.id && u.status === 'active'
  );
});

async function selectPicklistType(type: string) {
  selectedPicklistType.value = type;
  picklistSearch.value = '';
  picklistLoading.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};
    const res = await $fetch<any[]>(`${apiBase}/picklists/${type}/all`, {
      headers,
      credentials: 'include',
    }).catch(async () => {
      return await $fetch<any[]>(`${apiBase}/picklists/${type}`, { credentials: 'include' });
    });
    currentPicklistItems.value = res || [];
  } catch (err) {
    console.error('Failed to load picklist items:', err);
    currentPicklistItems.value = [];
  } finally {
    picklistLoading.value = false;
  }
}

function openCreatePicklistModal() {
  isEditingPicklist.value = false;
  picklistModalError.value = null;
  const maxSort = (currentPicklistItems.value || []).reduce((acc, curr) => Math.max(acc, curr.sort || 0), 0);
  picklistForm.value = {
    id: 0,
    code: '',
    labelEn: '',
    labelMl: '',
    scope: 'both',
    sort: maxSort + 1,
    active: true,
  };
  showPicklistModal.value = true;
}

function openEditPicklistModal(item: any) {
  isEditingPicklist.value = true;
  picklistModalError.value = null;
  picklistForm.value = {
    id: item.id,
    code: item.code,
    labelEn: item.labelEn,
    labelMl: item.labelMl || '',
    scope: item.scope || 'both',
    sort: item.sort || 0,
    active: item.active !== false,
  };
  showPicklistModal.value = true;
}

async function savePicklistItem() {
  picklistModalError.value = null;
  savingPicklist.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};
    const type = selectedPicklistType.value;

    if (isEditingPicklist.value) {
      const payload: any = {
        labelEn: picklistForm.value.labelEn,
        labelMl: picklistForm.value.labelEn,
        sort: picklistForm.value.sort,
        active: picklistForm.value.active,
      };
      if (type === 'call-outcomes') {
        payload.scope = picklistForm.value.scope;
      }
      await $fetch(`${apiBase}/picklists/${type}/${picklistForm.value.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: payload,
      });
    } else {
      const payload: any = {
        code: picklistForm.value.code,
        labelEn: picklistForm.value.labelEn,
        labelMl: picklistForm.value.labelEn,
        sort: picklistForm.value.sort,
        active: picklistForm.value.active,
      };
      if (type === 'call-outcomes') {
        payload.scope = picklistForm.value.scope;
      }
      await $fetch(`${apiBase}/picklists/${type}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: payload,
      });
    }

    showPicklistModal.value = false;
    await selectPicklistType(type);
  } catch (err: any) {
    picklistModalError.value =
      err.data?.error?.message || err.message || 'Failed to save picklist option';
  } finally {
    savingPicklist.value = false;
  }
}

async function togglePicklistActive(item: any) {
  if (!canManagePicklists.value) return;
  togglingId.value = item.id;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};
    const type = selectedPicklistType.value;
    const nextActive = !item.active;
    await $fetch(`${apiBase}/picklists/${type}/${item.id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: { active: nextActive },
    });
    item.active = nextActive;
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to update status');
  } finally {
    togglingId.value = null;
  }
}

function confirmDeletePicklistItem(item: any) {
  deletingPicklistItem.value = item;
  picklistDeleteInUse.value = false;
  picklistInUseCount.value = 0;
  picklistDeleteError.value = null;
}

async function executeDeletePicklistItem(forceDeactivate: boolean) {
  if (!deletingPicklistItem.value) return;
  deletingPicklistLoading.value = true;
  picklistDeleteError.value = null;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};
    const type = selectedPicklistType.value;
    const url = `${apiBase}/picklists/${type}/${deletingPicklistItem.value.id}${forceDeactivate ? '?deactivateIfInUse=true' : ''}`;

    await $fetch<any>(url, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    deletingPicklistItem.value = null;
    picklistDeleteInUse.value = false;
    await selectPicklistType(type);
  } catch (err: any) {
    if (err.data?.error?.code === 'ITEM_IN_USE') {
      picklistDeleteInUse.value = true;
      picklistInUseCount.value = err.data.error.usageCount || 1;
    } else {
      picklistDeleteError.value = err.data?.error?.message || err.message || 'Failed to delete option';
    }
  } finally {
    deletingPicklistLoading.value = false;
  }
}

async function loadData() {
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    const [uRes, rRes, aRes, setRes, bRes, tRes] = await Promise.all([
      canManageUsers.value ? $fetch<any>(`${apiBase}/users`, { headers, credentials: 'include' }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      $fetch<any>(`${apiBase}/roles`, { headers, credentials: 'include' }).catch(() => []),
      canViewAudit.value ? $fetch<any>(`${apiBase}/audit-logs`, { headers, credentials: 'include' }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      canManageSettings.value ? $fetch<any>(`${apiBase}/settings`, { headers, credentials: 'include' }).catch(() => null) : Promise.resolve(null),
      $fetch<any>(`${apiBase}/branches`, { headers, credentials: 'include' }).catch(() => []),
      $fetch<any>(`${apiBase}/teams`, { headers, credentials: 'include' }).catch(() => []),
    ]);

    users.value = uRes.items || [];
    roles.value = rRes || [];
    branches.value = bRes || [];
    teams.value = tRes || [];
    auditLogs.value = aRes.items || [];
    auditTotal.value = aRes.total ?? (aRes.items?.length || 0);

    if (setRes) {
      if (setRes.calling_hours) settingsForm.value.calling_hours = { ...settingsForm.value.calling_hours, ...setRes.calling_hours };
      if (setRes.sla_minutes) settingsForm.value.sla_minutes = { ...settingsForm.value.sla_minutes, ...setRes.sla_minutes };
      if (setRes.contact_rules) settingsForm.value.contact_rules = { ...settingsForm.value.contact_rules, ...setRes.contact_rules };
      if (setRes.retention_policies) settingsForm.value.retention_policies = { ...settingsForm.value.retention_policies, ...setRes.retention_policies };
      if (setRes.testimonial_followup_hours !== undefined) settingsForm.value.testimonial_followup_hours = Number(setRes.testimonial_followup_hours);
    }

    await selectPicklistType(selectedPicklistType.value);
  } catch {
    // Handled silently
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    await Promise.all([
      $fetch(`${apiBase}/settings/calling_hours`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: { value: settingsForm.value.calling_hours },
      }),
      $fetch(`${apiBase}/settings/sla_minutes`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: { value: settingsForm.value.sla_minutes },
      }),
      $fetch(`${apiBase}/settings/contact_rules`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: { value: settingsForm.value.contact_rules },
      }),
      $fetch(`${apiBase}/settings/retention_policies`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: { value: settingsForm.value.retention_policies },
      }),
      $fetch(`${apiBase}/settings/testimonial_followup_hours`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: { value: settingsForm.value.testimonial_followup_hours },
      }),
    ]);

    alert('Settings updated successfully!');
    await loadData();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to update settings');
  } finally {
    savingSettings.value = false;
  }
}

function initiateDeactivation(user: any) {
  deactivatingUser.value = user;
  reassignTargetUserId.value = null;
  deactivationReason.value = '';
}

async function confirmDeactivation() {
  if (!deactivatingUser.value) return;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    await $fetch(`${apiBase}/users/${deactivatingUser.value.id}/deactivate`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: {
        reassignToUserId: reassignTargetUserId.value,
        reason: deactivationReason.value,
      },
    });

    deactivatingUser.value = null;
    await loadData();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to deactivate user');
  }
}

function openCreateUserModal() {
  isEditingUser.value = false;
  userModalError.value = null;
  const defaultBranchId = branches.value[0]?.id ? [branches.value[0].id] : [];
  userForm.value = {
    id: 0,
    name: '',
    email: '',
    mobile: '',
    roleId: roles.value[0]?.id || null,
    branchIds: defaultBranchId,
    teamCodes: [],
    language: 'en',
    status: 'active',
    password: '',
    dutyNurse: false,
    dutyDoctor: false,
  };
  showUserModal.value = true;
}

function openEditUserModal(user: any) {
  isEditingUser.value = true;
  userModalError.value = null;
  userForm.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    roleId: user.role?.id || null,
    branchIds: (user.branches || []).map((b: any) => b.id),
    teamCodes: (user.teams || []).map((t: any) => t.code || t.name),
    language: user.language || 'en',
    status: user.status || 'active',
    password: '',
    dutyNurse: Boolean(user.dutyNurse),
    dutyDoctor: Boolean(user.dutyDoctor),
  };
  showUserModal.value = true;
}

async function saveUser() {
  userModalError.value = null;
  savingUser.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    if (userForm.value.branchIds.length === 0) {
      userModalError.value = 'Please select at least one branch';
      savingUser.value = false;
      return;
    }

    if (isEditingUser.value) {
      const payload: any = {
        name: userForm.value.name,
        email: userForm.value.email,
        mobile: userForm.value.mobile,
        roleId: userForm.value.roleId,
        branchIds: userForm.value.branchIds,
        teamCodes: userForm.value.teamCodes,
        language: userForm.value.language,
        status: userForm.value.status,
        dutyNurse: userForm.value.dutyNurse,
        dutyDoctor: userForm.value.dutyDoctor,
      };
      if (userForm.value.password && userForm.value.password.trim().length >= 8) {
        payload.password = userForm.value.password.trim();
      }

      await $fetch(`${apiBase}/users/${userForm.value.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: payload,
      });
    } else {
      const payload: any = {
        name: userForm.value.name,
        email: userForm.value.email,
        mobile: userForm.value.mobile,
        password: userForm.value.password,
        roleId: userForm.value.roleId,
        branchIds: userForm.value.branchIds,
        teamCodes: userForm.value.teamCodes,
        language: userForm.value.language,
        dutyNurse: userForm.value.dutyNurse,
        dutyDoctor: userForm.value.dutyDoctor,
      };

      await $fetch(`${apiBase}/users`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: payload,
      });
    }

    showUserModal.value = false;
    await loadData();
  } catch (err: any) {
    userModalError.value = err.data?.error?.message || err.message || 'Failed to save user';
  } finally {
    savingUser.value = false;
  }
}

function initiateSoftDelete(user: any) {
  deletingUser.value = user;
  deleteReassignTargetUserId.value = null;
  deleteReason.value = '';
}

async function confirmSoftDelete() {
  if (!deletingUser.value) return;
  executingDelete.value = true;
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    await $fetch(`${apiBase}/users/${deletingUser.value.id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
      body: {
        reassignToUserId: deleteReassignTargetUserId.value,
        reason: deleteReason.value,
      },
    });

    deletingUser.value = null;
    await loadData();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to soft delete user');
  } finally {
    executingDelete.value = false;
  }
}

async function reactivateUser(user: any) {
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    await $fetch(`${apiBase}/users/${user.id}/reactivate`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    await loadData();
  } catch (err: any) {
    alert(err.data?.error?.message || 'Failed to reactivate user');
  }
}

onMounted(() => {
  loadData();
  if (activeTab.value === 'audit') {
    fetchAuditLogs();
  }
});
</script>
