import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  language: string;
  role: {
    id: number;
    code: string;
    name: string;
    maskPhone: boolean;
  };
  branchIds: number[];
  teamCodes: string[];
  roleName?: string;
  roleCode?: string;
  center?: {
    id?: number;
    code?: string;
    name?: string;
  };
  permissions?: Record<string, string>;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  // Synchronously restore session from localStorage in browser
  if (typeof window !== 'undefined') {
    try {
      const savedToken = localStorage.getItem('hospital_crm_token');
      const savedUser = localStorage.getItem('hospital_crm_user');
      if (savedToken) accessToken.value = savedToken;
      if (savedUser) user.value = JSON.parse(savedUser);
    } catch (e) {
      console.warn('Failed to restore auth from localStorage', e);
    }
  }

  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  async function login(identifier: string, password: string) {
    const res = await $fetch<{ user?: AuthUser; accessToken?: string; mfaRequired?: boolean; tempToken?: string }>(
      `${apiBase}/auth/login`,
      {
        method: 'POST',
        body: { identifier, password },
        credentials: 'include',
      }
    );

    if (res.mfaRequired) {
      return { mfaRequired: true, tempToken: res.tempToken };
    }

    if (res.user && res.accessToken) {
      user.value = res.user;
      accessToken.value = res.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hospital_crm_token', res.accessToken);
        localStorage.setItem('hospital_crm_user', JSON.stringify(res.user));
      }
      return { success: true };
    }

    return { success: false };
  }

  async function verifyMfa(tempToken: string, code: string) {
    const res = await $fetch<{ user: AuthUser; accessToken: string }>(
      `${apiBase}/auth/mfa/verify`,
      {
        method: 'POST',
        body: { tempToken, code },
        credentials: 'include',
      }
    );

    user.value = res.user;
    accessToken.value = res.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hospital_crm_token', res.accessToken);
      localStorage.setItem('hospital_crm_user', JSON.stringify(res.user));
    }
    return { success: true };
  }

  async function logout() {
    try {
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
    user.value = null;
    accessToken.value = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hospital_crm_token');
      localStorage.removeItem('hospital_crm_user');
    }
    navigateTo('/login');
  }

  const token = computed(() => accessToken.value || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null));

  async function fetchMe() {
    try {
      const activeToken = accessToken.value || (typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_token') : null);
      const headers: Record<string, string> = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
      const res = await $fetch<{ user: any; accessToken?: string }>(`${apiBase}/auth/me`, {
        credentials: 'include',
        headers,
      });
      if (res && res.user) {
        user.value = res.user;
        if (res.accessToken) {
          accessToken.value = res.accessToken;
          if (typeof window !== 'undefined') {
            localStorage.setItem('hospital_crm_token', res.accessToken);
          }
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('hospital_crm_user', JSON.stringify(res.user));
        }
      }
    } catch {
      user.value = null;
      accessToken.value = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hospital_crm_token');
        localStorage.removeItem('hospital_crm_user');
      }
    }
  }

  function hasPermission(permission: string): boolean {
    if (!user.value) return false;
    const roleCode = user.value.role?.code || (user.value as any).roleCode || (typeof user.value.role === 'string' ? user.value.role : '');
    if (roleCode === 'owner') return true;
    if (user.value.permissions && user.value.permissions[permission]) {
      return user.value.permissions[permission] !== 'none';
    }
    return false;
  }

  return {
    user,
    accessToken,
    token,
    isAuthenticated,
    hasPermission,
    login,
    verifyMfa,
    logout,
    fetchMe,
  };
});
