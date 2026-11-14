<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
      @click="close"
    />

    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div class="w-screen max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
        <!-- Header -->
        <div class="px-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <span class="text-xl">{{ form.leadType === 'product' ? '📦' : '⚡' }}</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ form.leadType === 'product' ? 'Quick Create Product Lead' : 'Quick Create Treatment Lead' }}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Register a new customer inquiry
              </p>
            </div>
          </div>
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="close"
          >
            <span class="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="submitLead" class="flex-1 overflow-y-auto p-6 space-y-4">
          <!-- Lead Type Toggle: Only shown for Management/Admins who oversee both departments -->
          <div
            v-if="canToggleLeadType"
            class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                form.leadType === 'treatment'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              ]"
              @click="form.leadType = 'treatment'"
            >
              <span>🏥</span>
              <span>Treatment</span>
            </button>
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                form.leadType === 'product'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              ]"
              @click="form.leadType = 'product'"
            >
              <span>📦</span>
              <span>Product Lead</span>
            </button>
          </div>

          <!-- Registered Patient(s) Found (Household / Returning Patient) -->
          <div
            v-if="existingPatients.length > 0"
            class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5 transition-all animate-fadeIn"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                <span>👤</span>
                <span>Registered Patient Found ({{ existingPatients.length }})</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono font-semibold">
                Permanent Record
              </span>
            </div>

            <!-- Selected Patient Confirmation Pill -->
            <div
              v-if="selectedExistingPatient"
              class="p-2.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between"
            >
              <div class="text-xs text-emerald-900 dark:text-emerald-200">
                <span class="font-bold">✓ Booking for: {{ selectedExistingPatient.name }}</span>
                <span class="font-mono text-[11px] ml-1.5 opacity-80">({{ selectedExistingPatient.patientCode }})</span>
              </div>
              <button
                type="button"
                @click="cancelReturningSelection"
                class="text-[11px] text-emerald-700 dark:text-emerald-300 hover:underline font-semibold cursor-pointer"
              >
                Change
              </button>
            </div>

            <!-- Patient Cards list if not yet chosen -->
            <div v-else class="space-y-2">
              <div
                v-for="p in existingPatients"
                :key="p.id"
                class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 shadow-xs"
              >
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {{ p.name }}
                    <span class="font-mono font-normal text-[11px] text-slate-500 ml-1">({{ p.patientCode }})</span>
                  </p>
                  <p v-if="p.lastCase" class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Last visit: {{ p.lastCase.doctorName }} &bull; {{ p.lastCase.departmentName }}
                  </p>
                  <p v-else class="text-[11px] text-slate-400">
                    Registered patient &bull; {{ p.branchName || 'Main' }}
                  </p>
                </div>
                <button
                  type="button"
                  @click="selectReturningPatient(p)"
                  class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold whitespace-nowrap shadow-xs transition-colors cursor-pointer"
                >
                  Select Patient
                </button>
              </div>

              <!-- Family Member Option Button -->
              <div class="pt-1 flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800/60">
                <span class="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Calling for a family member?
                </span>
                <button
                  type="button"
                  @click="chooseNewFamilyMember"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer',
                    isFamilyMember
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50'
                  ]"
                >
                  👨‍👩‍👧 + Register Family Member
                </button>
              </div>
            </div>
          </div>

          <!-- Family Member Relation Selector (Standalone for both existing patients & duplicate leads) -->
          <div
            v-if="isFamilyMember"
            class="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2.5 animate-fadeIn"
          >
            <div class="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-semibold">
              <span class="flex items-center gap-1.5">
                <span>👨‍👩‍👧</span>
                <span>Family Member Registration (Shared Mobile: {{ form.mobile }})</span>
              </span>
              <button
                type="button"
                @click="cancelReturningSelection"
                class="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <p class="text-[11px] text-teal-700 dark:text-teal-400 leading-relaxed">
              Registering <strong class="font-semibold text-teal-900 dark:text-teal-200">{{ form.name || 'this patient' }}</strong> as a family member sharing phone with <strong class="font-semibold">{{ duplicateLead?.name || selectedExistingPatient?.name || 'existing contact' }}</strong>.
            </p>
            <div class="flex items-center gap-2 pt-1 flex-wrap">
              <span class="text-[11px] font-semibold text-slate-500">Relationship:</span>
              <button
                v-for="rel in ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']"
                :key="rel"
                type="button"
                @click="familyRelation = rel"
                :class="[
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                  familyRelation === rel
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                ]"
              >
                {{ rel }}
              </button>
            </div>
          </div>

          <!-- Live Duplicate Alert Banner (Only if unconverted in-progress lead exists) -->
          <div
            v-if="duplicateLead && !selectedExistingPatient && !isFamilyMember"
            class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3 animate-fadeIn"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2 font-semibold text-sm">
                <span>⚠️</span>
                <span>Active Lead In-Progress!</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold uppercase">
                Duplicate Phone
              </span>
            </div>
            <p class="text-xs leading-relaxed">
              Mobile number is already registered for <strong class="font-semibold">{{ duplicateLead.name }}</strong> (Status: <span class="uppercase font-semibold">{{ duplicateLead.status }}</span> &bull; Telecaller: {{ duplicateLead.ownerName || 'Unassigned' }}).
            </p>

            <!-- Family Member Quick Option -->
            <div class="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
              <div class="text-xs">
                <p class="font-semibold text-slate-800 dark:text-slate-100">Calling for a family member?</p>
                <p class="text-[11px] text-slate-500">Register as a family member under this shared number.</p>
              </div>
              <button
                type="button"
                @click="chooseNewFamilyMember"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <span>👨‍👩‍👧</span>
                <span>Family Member</span>
              </button>
            </div>

            <!-- Override Option -->
            <div class="pt-2 border-t border-amber-200 dark:border-amber-800/60">
              <label class="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.overrideDuplicate"
                  class="mt-1 rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span class="text-xs font-semibold">
                  Same patient / Override duplicate check
                </span>
              </label>
              <div v-if="form.overrideDuplicate" class="mt-2">
                <input
                  v-model="form.overrideReason"
                  type="text"
                  required
                  placeholder="Reason for duplicate override..."
                  class="w-full text-xs px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs"
          >
            {{ errorMessage }}
          </div>

          <!-- 1. Patient / Customer Name -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ form.leadType === 'product' ? 'Customer Name *' : 'Patient Name *' }}
              </label>
              <span v-if="selectedExistingPatient" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Permanent File: {{ selectedExistingPatient.patientCode }}
              </span>
              <span v-else-if="isFamilyMember" class="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                New Family Patient
              </span>
            </div>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              :placeholder="isFamilyMember ? 'e.g. Sita Kumar (Family Member)' : 'e.g. Fathima Rahman'"
            />
          </div>

          <!-- 2. Mobile Phone -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Phone *
              </label>
              <span v-if="existingPatients.length > 0" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {{ existingPatients.length }} patient(s) on file
              </span>
            </div>
            <div class="relative">
              <input
                v-model="form.mobile"
                type="tel"
                required
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="10-digit mobile number"
                @input="handlePhoneInput"
              />
              <span v-if="isCheckingDuplicate" class="absolute right-3 top-2.5 text-xs text-slate-400 animate-spin">
                ⟳
              </span>
            </div>
          </div>

          <!-- 3. Age & Location -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input
                v-model.number="form.age"
                type="number"
                min="0"
                max="120"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. 35"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Location / Place</label>
              <input
                v-model="form.location"
                type="text"
                maxlength="150"
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Kozhikode"
              />
            </div>
          </div>

          <!-- 4. Source & Department -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Source *</label>
              <select
                v-model.number="form.sourceId"
                required
                class="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
              >
                <option v-for="s in sources" :key="s.id" :value="s.id">
                  {{ s.labelEn }}
                </option>
              </select>
            </div>
            <div v-if="form.leadType !== 'product'">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department *</label>
              <select
                v-model.number="form.departmentId"
                required
                class="w-full h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal focus:ring-2 focus:ring-teal-500"
              >
                <option v-for="d in departments" :key="d.id" :value="d.id">
                  {{ d.labelEn }}
                </option>
              </select>
            </div>
          </div>

          <!-- 5. Assign Lead To (Only for Managing Director, Branch Manager, or Patient Experience Lead) -->
          <div v-if="canAssignLead" class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assign Lead To
            </label>
            <select
              v-model="form.ownerId"
              class="w-full h-10 px-3.5 rounded-xl border border-teal-200 dark:border-teal-700/70 bg-teal-50/40 dark:bg-teal-950/20 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option :value="null">⚡ Automatic Round-Robin (Default)</option>
              <option :value="authStore.user?.id">👤 Assign to Myself</option>
              <optgroup v-if="telecallers.length > 0" label="Support Telecallers">
                <option v-for="s in telecallers" :key="s.id" :value="s.id">
                  {{ s.name }} (Support Telecaller)
                </option>
              </optgroup>
              <optgroup v-if="otherStaff.length > 0" label="Other Staff & Managers">
                <option v-for="s in otherStaff" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.role?.name || s.role?.code || 'Staff' }})
                </option>
              </optgroup>
            </select>
            <p class="text-[11px] text-slate-400">
              Leave on Automatic Round-Robin to distribute evenly among on-duty telecallers.
            </p>
          </div>

          <!-- Product Fields when leadType is 'product' -->
          <div v-if="form.leadType === 'product'" class="space-y-3 p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60">
            <div>
              <label class="block text-xs font-semibold text-teal-900 dark:text-teal-200 mb-1">Marketing Campaign (Optional)</label>
              <select
                v-model="form.campaignId"
                class="w-full h-10 px-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-850 text-xs font-normal text-slate-800 dark:text-slate-100"
              >
                <option :value="null">Direct Inbound / No Campaign</option>
                <option v-for="c in campaigns" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ c.channel }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-teal-900 dark:text-teal-200 mb-1">Products Inquired</label>
              <div class="max-h-36 overflow-y-auto p-2 bg-white dark:bg-slate-850 rounded-xl border border-teal-200 dark:border-teal-800 divide-y divide-slate-100 dark:divide-slate-750">
                <label
                  v-for="p in products"
                  :key="p.id"
                  class="py-1 px-1.5 flex items-center justify-between text-xs cursor-pointer select-none"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ p.name }}</span>
                    <span class="text-[10px] text-slate-400 font-mono">({{ p.sku }})</span>
                  </div>
                  <input
                    type="checkbox"
                    :value="p.id"
                    v-model="form.productIds"
                    class="rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Notes / Concern -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {{ form.leadType === 'product' ? 'Caller Notes / Requested Remedies' : 'Medical Concern / Inquiry Details' }}
            </label>
            <textarea
              v-model="form.concern"
              rows="2"
              class="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-normal"
              placeholder="Notes, symptoms, or requested formulations..."
            />
          </div>

          <!-- Action Buttons -->
          <div class="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span v-if="isSubmitting" class="animate-spin text-xs">⟳</span>
              <span>Save Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  isOpen: boolean;
  defaultLeadType?: 'treatment' | 'product';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', lead: any): void;
  (e: 'lead-created', lead: any): void;
}>();

const authStore = useAuthStore();
const config = useRuntimeConfig();
const rawApiBase = config.public.apiBase || '/api/v1';
const apiBase = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api/v1`;

const departments = ref<any[]>([]);
const sources = ref<any[]>([]);
const campaigns = ref<any[]>([]);
const products = ref<any[]>([]);

const isCheckingDuplicate = ref(false);
const duplicateLead = ref<any | null>(null);
const existingPatients = ref<any[]>([]);
const selectedExistingPatient = ref<any | null>(null);
const isFamilyMember = ref(false);
const familyRelation = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const form = reactive({
  leadType: 'treatment' as 'treatment' | 'product',
  name: '',
  mobile: '',
  age: null as number | null,
  location: '',
  language: 'en',
  concern: '',
  departmentId: 1,
  sourceId: 1,
  branchId: 1,
  ownerId: null as number | null,
  campaignId: null as number | null,
  productIds: [] as number[],
  overrideDuplicate: false,
  overrideReason: '',
});

const userRoleCode = computed(() => {
  const u = authStore.user;
  if (!u) return '';
  return (u.role?.code || (u as any).roleCode || (typeof u.role === 'string' ? u.role : '')).toLowerCase();
});

const canAssignLead = computed(() => {
  const role = userRoleCode.value;
  return (
    ['owner', 'admin', 'center_head', 'telecaller_manager'].includes(role) ||
    authStore.hasPermission('lead.reassign')
  );
});

const staffMembers = ref<any[]>([]);

const telecallers = computed(() => {
  const list = Array.isArray(staffMembers.value) ? staffMembers.value : [];
  return list.filter(
    (s) => s.role?.code === 'support_telecaller' || s.role?.code === 'caller'
  );
});

const otherStaff = computed(() => {
  const list = Array.isArray(staffMembers.value) ? staffMembers.value : [];
  return list.filter(
    (s) => s.role?.code !== 'support_telecaller' && s.role?.code !== 'caller'
  );
});

const isProductStaff = computed(() => {
  return ['product_sales_executive', 'product_caller', 'product_manager'].includes(userRoleCode.value);
});

const isTreatmentStaff = computed(() => {
  return ['support_telecaller', 'caller', 'doctor', 'admission_specialist', 'aftercare_executive'].includes(userRoleCode.value);
});

const canToggleLeadType = computed(() => {
  const isMgmt = ['owner', 'admin', 'super_admin', 'center_head', 'telecaller_manager', 'auditor'].includes(userRoleCode.value);
  return isMgmt && authStore.hasPermission('lead.create') && authStore.hasPermission('product_lead.create');
});

const getAuthHeaders = (): Record<string, string> => {
  const token = authStore.token || authStore.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

watch(
  () => [props.isOpen, props.defaultLeadType],
  ([open, defaultType]) => {
    if (open) {
      if (defaultType) {
        form.leadType = defaultType as 'treatment' | 'product';
      } else if (isProductStaff.value) {
        form.leadType = 'product';
      } else {
        form.leadType = 'treatment';
      }

      const userBranch = authStore.user?.branchIds?.[0] || (authStore.user?.center?.id) || 1;
      form.branchId = userBranch;

      if (departments.value.length === 0 || sources.value.length === 0) {
        fetchPicklists();
      }
    }
  },
  { immediate: true }
);

let debounceTimer: any = null;

const fetchPicklists = async () => {
  try {
    const headers = getAuthHeaders();

    const [deptRes, srcRes, campRes, prodRes] = await Promise.all([
      fetch(`${apiBase}/picklists/departments`, { headers, credentials: 'include' }),
      fetch(`${apiBase}/picklists/sources`, { headers, credentials: 'include' }),
      fetch(`${apiBase}/product-campaigns`, { headers, credentials: 'include' }),
      fetch(`${apiBase}/products?pageSize=50`, { headers, credentials: 'include' }),
    ]);

    if (deptRes.ok) {
      const deptData = await deptRes.json();
      departments.value = Array.isArray(deptData) ? deptData : (deptData.items || []);
      if (departments.value.length > 0 && !form.departmentId) {
        form.departmentId = departments.value[0].id;
      }
    }
    if (srcRes.ok) {
      const srcData = await srcRes.json();
      sources.value = Array.isArray(srcData) ? srcData : (srcData.items || []);
      if (sources.value.length > 0 && !form.sourceId) {
        form.sourceId = sources.value[0].id;
      }
    }
    if (campRes.ok) {
      const campData = await campRes.json();
      campaigns.value = Array.isArray(campData) ? campData : (campData.campaigns || []);
    }
    if (prodRes.ok) {
      const prodData = await prodRes.json();
      products.value = Array.isArray(prodData) ? prodData : (prodData.products || []);
    }

    if (canAssignLead.value && (!Array.isArray(staffMembers.value) || staffMembers.value.length === 0)) {
      const staffRes = await fetch(`${apiBase}/users/staff`, { headers, credentials: 'include' }).catch(() => null);
      if (staffRes && staffRes.ok) {
        const staffData = await staffRes.json();
        staffMembers.value = Array.isArray(staffData) ? staffData : (staffData.items || []);
      }
    }
  } catch (err) {
    console.error('Failed to load picklists', err);
  }
};

onMounted(() => {
  fetchPicklists();
});

const selectReturningPatient = (patient: any) => {
  selectedExistingPatient.value = patient;
  isFamilyMember.value = false;
  familyRelation.value = '';
  form.name = patient.name;
  if (patient.dateOfBirth) {
    const birthYear = new Date(patient.dateOfBirth).getFullYear();
    const age = new Date().getFullYear() - birthYear;
    if (age > 0 && age < 120) form.age = age;
  }
};

const chooseNewFamilyMember = () => {
  const previousPatient = selectedExistingPatient.value;
  selectedExistingPatient.value = null;
  isFamilyMember.value = true;
  if (!familyRelation.value) {
    familyRelation.value = 'Family Member';
  }
  // Only reset the name/age if it was auto-populated from an existing patient
  if (previousPatient && form.name === previousPatient.name) {
    form.name = '';
    form.age = null;
  }
};

const cancelReturningSelection = () => {
  selectedExistingPatient.value = null;
  isFamilyMember.value = false;
  familyRelation.value = '';
};

const handlePhoneInput = () => {
  clearTimeout(debounceTimer);
  duplicateLead.value = null;
  existingPatients.value = [];
  selectedExistingPatient.value = null;
  isFamilyMember.value = false;
  familyRelation.value = '';

  if (form.mobile.trim().length < 8) return;

  debounceTimer = setTimeout(async () => {
    isCheckingDuplicate.value = true;
    try {
      const headers = getAuthHeaders();

      const res = await fetch(
        `${apiBase}/leads/check-duplicate?mobile=${encodeURIComponent(form.mobile.trim())}`,
        { headers, credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.duplicate && data.existingLead) {
          duplicateLead.value = data.existingLead;
        } else {
          duplicateLead.value = null;
        }
        if (Array.isArray(data.existingPatients) && data.existingPatients.length > 0) {
          existingPatients.value = data.existingPatients;
        }
      }
    } catch (err) {
      console.error('Duplicate check failed', err);
    } finally {
      isCheckingDuplicate.value = false;
    }
  }, 400);
};

const close = () => {
  emit('close');
};

const submitLead = async () => {
  errorMessage.value = '';
  isSubmitting.value = true;

  try {
    const payload: any = {
      leadType: form.leadType,
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      age: form.age !== null && form.age !== undefined && (form.age as any) !== '' ? Number(form.age) : null,
      location: form.location?.trim() || null,
      language: 'en',
      concern: form.concern.trim() || undefined,
      departmentId: form.departmentId || (departments.value[0]?.id || 1),
      sourceId: form.sourceId || (sources.value[0]?.id || 1),
      branchId: form.branchId || (authStore.user?.branchIds?.[0] || 1),
      overrideDuplicate: form.overrideDuplicate || isFamilyMember.value,
      overrideReason: isFamilyMember.value
        ? `Family member (${familyRelation.value || 'Family Member'}) of ${duplicateLead.value?.name || selectedExistingPatient.value?.name || 'existing contact'}`
        : (form.overrideDuplicate ? form.overrideReason : undefined),
      existingPatientId: selectedExistingPatient.value?.id || null,
      isFamilyMember: isFamilyMember.value,
      familyRelation: isFamilyMember.value ? (familyRelation.value || 'Family Member') : null,
    };

    if (form.ownerId) {
      payload.ownerId = form.ownerId;
    }

    if (form.leadType === 'product') {
      if (form.campaignId) payload.campaignId = form.campaignId;
      if (form.productIds.length > 0) payload.productIds = form.productIds;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    };

    const res = await fetch(`${apiBase}/leads`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        duplicateLead.value = data.error?.details?.existingLead;
        errorMessage.value = data.error?.message || 'A lead with this phone number already exists.';
        return;
      }
      if (data.error?.details) {
        const details = data.error.details;
        const fieldErrors: string[] = [];
        for (const [key, val] of Object.entries<any>(details)) {
          if (key === '_errors') continue;
          if (Array.isArray(val?._errors) && val._errors.length > 0) {
            fieldErrors.push(`${key}: ${val._errors.join(', ')}`);
          }
        }
        if (fieldErrors.length > 0) {
          errorMessage.value = fieldErrors.join(' | ');
          return;
        }
      }
      errorMessage.value = data.error?.message || 'Failed to create lead.';
      return;
    }

    // Reset form fields
    form.name = '';
    form.mobile = '';
    form.age = null;
    form.location = '';
    form.concern = '';
    form.campaignId = null;
    form.productIds = [];
    form.ownerId = null;
    form.overrideDuplicate = false;
    form.overrideReason = '';
    duplicateLead.value = null;
    selectedExistingPatient.value = null;
    existingPatients.value = [];
    isFamilyMember.value = false;
    familyRelation.value = '';
    errorMessage.value = '';

    emit('created', data);
    close();
  } catch (err: any) {
    errorMessage.value = err.message || 'Network error occurred.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>
