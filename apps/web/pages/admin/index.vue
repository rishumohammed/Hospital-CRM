<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {{ t('nav.admin') }}
        </h1>
        <p class="text-sm text-slate-500">
          User directory, RBAC roles, master picklists, SLA settings, and audit logs
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center space-x-2">
        <button
          v-if="activeTab === 'users'"
          @click="showCreateUserModal = true"
          class="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all shadow-teal-600/20 active:scale-95"
        >
          + Add New User
        </button>
        <button
          v-if="activeTab === 'grants'"
          @click="showCreateGrantModal = true"
          class="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all shadow-indigo-600/20 active:scale-95"
        >
          + Grant Temp Permission
        </button>
        <button
          v-if="activeTab === 'settings'"
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
        @click="activeTab = tab.id"
        :class="[
          'pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap min-h-[44px]',
          activeTab === tab.id
            ? 'border-teal-600 text-teal-600 dark:text-teal-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB 1: USERS DIRECTORY -->
    <div v-if="activeTab === 'users'" class="space-y-4">
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
                  <div class="font-bold text-slate-900 dark:text-slate-100">{{ u.name }}</div>
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
                  <button
                    v-if="u.status === 'active'"
                    @click="initiateDeactivation(u)"
                    class="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
                  >
                    Deactivate
                  </button>
                  <span v-else class="text-xs text-slate-400">Deactivated</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: ROLES & PERMISSIONS MATRIX -->
    <div v-if="activeTab === 'roles'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="role in roles"
          :key="role.id"
          class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                {{ role.code }}
              </span>
              <span class="text-xs text-slate-500 font-medium">{{ role.userCount || 0 }} assigned</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">{{ role.name }}</h3>
            <p class="text-xs text-slate-500 mt-1">Phone masking: {{ role.maskPhone ? 'Enabled (Last 3 digits)' : 'Off' }}</p>

            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <p class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Permissions ({{ role.permissions?.length || 0 }})
              </p>
              <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div
                  v-for="p in role.permissions"
                  :key="p.id"
                  class="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                >
                  <span class="font-mono text-[11px] text-slate-700 dark:text-slate-300">{{ p.permission }}</span>
                  <span class="font-bold uppercase text-[10px] text-teal-600 dark:text-teal-400">{{ p.scope }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PERMISSION GRANTS -->
    <div v-if="activeTab === 'grants'" class="space-y-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Temporary Permission Grants</h2>
          <p class="text-xs text-slate-500 mt-0.5">Time-limited elevated permissions granted by Owner or Admins</p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th class="py-3 px-4">User</th>
                <th class="py-3 px-4">Permission</th>
                <th class="py-3 px-4">Scope</th>
                <th class="py-3 px-4">Timeframe</th>
                <th class="py-3 px-4">Reason</th>
                <th class="py-3 px-4">Granted By</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="g in grants" :key="g.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  {{ g.user?.name || g.user?.email }}
                </td>
                <td class="py-3 px-4 font-mono text-xs text-teal-600 dark:text-teal-400">
                  {{ g.permission }}
                </td>
                <td class="py-3 px-4 font-bold text-xs uppercase">
                  {{ g.scope }}
                </td>
                <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                  Ends: {{ new Date(g.endsAt).toLocaleString() }}
                </td>
                <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                  {{ g.reason }}
                </td>
                <td class="py-3 px-4 text-xs text-slate-500">
                  {{ g.granter?.name || g.granter?.email }}
                </td>
              </tr>
              <tr v-if="grants.length === 0">
                <td colspan="6" class="py-8 text-center text-slate-400 text-sm">
                  No active or past temporary permission grants found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: MASTER PICKLISTS -->
    <div v-if="activeTab === 'picklists'" class="space-y-4">
      <div class="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          v-for="pt in picklistTypes"
          :key="pt.id"
          @click="selectPicklistType(pt.id)"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] whitespace-nowrap',
            selectedPicklistType === pt.id
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          ]"
        >
          {{ pt.label }}
        </button>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
              {{ picklistTypes.find((p) => p.id === selectedPicklistType)?.label }}
            </h2>
            <p class="text-xs text-slate-500">Bilingual options supporting English and Malayalam</p>
          </div>
          <span class="text-xs text-slate-500 font-medium">{{ currentPicklistItems.length }} options</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th class="py-3 px-4">Code</th>
                <th class="py-3 px-4">English Label</th>
                <th class="py-3 px-4">Malayalam Label (മലയാളം)</th>
                <th class="py-3 px-4">Sort</th>
                <th class="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
              <tr v-for="item in currentPicklistItems" :key="item.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ item.code }}
                </td>
                <td class="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  {{ item.labelEn }}
                </td>
                <td class="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium font-sans">
                  {{ item.labelMl }}
                </td>
                <td class="py-3 px-4 text-xs text-slate-500 font-mono">
                  {{ item.sort || 0 }}
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                      item.active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    ]"
                  >
                    ● {{ item.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: SYSTEM SETTINGS -->
    <div v-if="activeTab === 'settings'" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Calling Hours Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <span class="text-xl">🕒</span>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Calling Hours</h2>
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
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">First-Response SLA</h2>
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
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Contact Rules (Soft Limits)</h2>
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
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Quiet Hours & Data Retention</h2>
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
      </div>
    </div>

    <!-- TAB 6: AUDIT LOGS -->
    <div v-if="activeTab === 'audit'" class="space-y-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Audit Logs Telemetry</h2>
          <span class="text-xs text-slate-500 font-medium">{{ auditLogs.length }} events</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th class="py-3 px-4">Timestamp</th>
                <th class="py-3 px-4">User</th>
                <th class="py-3 px-4">Action</th>
                <th class="py-3 px-4">Entity</th>
                <th class="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
              <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-slate-50/60 dark:hover:bg-slate-700/40">
                <td class="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                  {{ new Date(log.createdAt).toLocaleString() }}
                </td>
                <td class="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {{ log.user?.email || 'System' }}
                </td>
                <td class="py-2.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                  {{ log.action }}
                </td>
                <td class="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                  {{ log.entity }} #{{ log.entityId || '—' }}
                </td>
                <td class="py-2.5 px-4 text-slate-400 font-mono">
                  {{ log.ip || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: DEACTIVATE & REASSIGN WIZARD -->
    <div
      v-if="deactivatingUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const activeTab = ref<'users' | 'roles' | 'grants' | 'picklists' | 'settings' | 'audit'>('users');
const userSearch = ref('');

const tabList = [
  { id: 'users', label: 'Users Directory' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'grants', label: 'Permission Grants' },
  { id: 'picklists', label: 'Master Picklists' },
  { id: 'settings', label: 'System Settings' },
  { id: 'audit', label: 'Audit Logs' },
] as const;

const picklistTypes = [
  { id: 'departments', label: '15 Departments' },
  { id: 'sources', label: 'Lead Sources' },
  { id: 'call-outcomes', label: 'Call Outcomes' },
  { id: 'lost-reasons', label: 'Lost Reasons' },
  { id: 'decline-reasons', label: 'Decline Reasons' },
  { id: 'closure-codes', label: 'Closure Codes' },
] as const;

const selectedPicklistType = ref<string>('departments');
const currentPicklistItems = ref<any[]>([]);

const users = ref<any[]>([]);
const roles = ref<any[]>([]);
const grants = ref<any[]>([]);
const auditLogs = ref<any[]>([]);
const savingSettings = ref(false);

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
});

const showCreateUserModal = ref(false);
const showCreateGrantModal = ref(false);
const deactivatingUser = ref<any | null>(null);
const reassignTargetUserId = ref<number | null>(null);
const deactivationReason = ref('');

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
  try {
    const res = await $fetch<any[]>(`${apiBase}/picklists/${type}`, { credentials: 'include' });
    currentPicklistItems.value = res || [];
  } catch {
    currentPicklistItems.value = [];
  }
}

async function loadData() {
  try {
    const headers: Record<string, string> = authStore.accessToken
      ? { Authorization: `Bearer ${authStore.accessToken}` }
      : {};

    const [uRes, rRes, gRes, aRes, setRes, deptRes] = await Promise.all([
      $fetch<any>(`${apiBase}/users`, { headers, credentials: 'include' }).catch(() => ({ items: [] })),
      $fetch<any>(`${apiBase}/roles`, { headers, credentials: 'include' }).catch(() => []),
      $fetch<any>(`${apiBase}/permission-grants`, { headers, credentials: 'include' }).catch(() => []),
      $fetch<any>(`${apiBase}/audit-logs`, { headers, credentials: 'include' }).catch(() => ({ items: [] })),
      $fetch<any>(`${apiBase}/settings`, { headers, credentials: 'include' }).catch(() => null),
      $fetch<any>(`${apiBase}/picklists/departments`, { credentials: 'include' }).catch(() => []),
    ]);

    users.value = uRes.items || [];
    roles.value = rRes || [];
    grants.value = gRes || [];
    auditLogs.value = aRes.items || [];
    currentPicklistItems.value = deptRes || [];

    if (setRes) {
      if (setRes.calling_hours) settingsForm.value.calling_hours = { ...settingsForm.value.calling_hours, ...setRes.calling_hours };
      if (setRes.sla_minutes) settingsForm.value.sla_minutes = { ...settingsForm.value.sla_minutes, ...setRes.sla_minutes };
      if (setRes.contact_rules) settingsForm.value.contact_rules = { ...settingsForm.value.contact_rules, ...setRes.contact_rules };
      if (setRes.retention_policies) settingsForm.value.retention_policies = { ...settingsForm.value.retention_policies, ...setRes.retention_policies };
    }
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

onMounted(() => {
  loadData();
});
</script>
