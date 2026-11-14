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
    const res = await $fetch<{ user?: AuthUser; accessToken?: string; refreshToken?: string; mfaRequired?: boolean; tempToken?: string }>(
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
        if (res.refreshToken) {
          localStorage.setItem('hospital_crm_refresh_token', res.refreshToken);
        }
        localStorage.setItem('hospital_crm_user', JSON.stringify(res.user));
      }
      return { success: true };
    }

    return { success: false };
  }

  async function verifyMfa(tempToken: string, code: string) {
    const res = await $fetch<{ user: AuthUser; accessToken: string; refreshToken?: string }>(
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
      if (res.refreshToken) {
        localStorage.setItem('hospital_crm_refresh_token', res.refreshToken);
      }
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
      localStorage.removeItem('hospital_crm_refresh_token');
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
      // Attempt silent refresh if refresh token is available
      try {
        const savedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('hospital_crm_refresh_token') : null;
        if (savedRefreshToken) {
          const refRes = await $fetch<{ accessToken: string }>(`${apiBase}/auth/refresh`, {
            method: 'POST',
            body: { refreshToken: savedRefreshToken },
            credentials: 'include',
          });
          if (refRes?.accessToken) {
            accessToken.value = refRes.accessToken;
            if (typeof window !== 'undefined') {
              localStorage.setItem('hospital_crm_token', refRes.accessToken);
            }
            const retryRes = await $fetch<{ user: any; accessToken?: string }>(`${apiBase}/auth/me`, {
              credentials: 'include',
              headers: { Authorization: `Bearer ${refRes.accessToken}` },
            });
            if (retryRes?.user) {
              user.value = retryRes.user;
              if (typeof window !== 'undefined') {
                localStorage.setItem('hospital_crm_user', JSON.stringify(retryRes.user));
              }
              return;
            }
          }
        }
      } catch {
        // Refresh token also invalid or expired
      }

      user.value = null;
      accessToken.value = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hospital_crm_token');
        localStorage.removeItem('hospital_crm_refresh_token');
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
