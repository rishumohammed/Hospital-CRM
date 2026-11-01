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
  permissions?: Record<string, string>;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(null);
  const isAuthenticated = computed(() => !!user.value);

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
    navigateTo('/login');
  }

  async function fetchMe() {
    try {
      const headers: Record<string, string> = accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {};
      const res = await $fetch<{ user: any }>(`${apiBase}/auth/me`, {
        credentials: 'include',
        headers,
      });
      if (res && res.user) {
        user.value = res.user;
      }
    } catch {
      user.value = null;
      accessToken.value = null;
    }
  }

  function hasPermission(permission: string): boolean {
    if (!user.value) return false;
    if (user.value.role?.code === 'owner') return true;
    if (user.value.permissions && user.value.permissions[permission]) {
      return user.value.permissions[permission] !== 'none';
    }
    return false;
  }

  return {
    user,
    accessToken,
    token: accessToken,
    isAuthenticated,
    hasPermission,
    login,
    verifyMfa,
    logout,
    fetchMe,
  };
});
