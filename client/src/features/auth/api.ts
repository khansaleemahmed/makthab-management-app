import { useMutation } from '@tanstack/react-query';
import type { LoginRequest, LoginResponse } from '@makthab/shared';
import { api, unwrap } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type { LoginRequest as LoginInput, LoginResponse };

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (input: LoginRequest) => {
      const res = await api.post('/auth/login', input);
      return unwrap<LoginResponse>(res.data);
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      // Ignore network errors on logout; clear local state regardless.
    }
    clear();
  };
}
