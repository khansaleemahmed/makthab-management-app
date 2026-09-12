import { useMutation } from '@tanstack/react-query';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResendOtpRequest,
  ChangePasswordRequest,
} from '@makthab/shared';
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

export function useSignup() {
  return useMutation({
    mutationFn: async (input: SignupRequest) =>
      unwrap<SignupResponse>((await api.post('/auth/signup', input)).data),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (input: VerifyOtpRequest) =>
      unwrap<VerifyOtpResponse>((await api.post('/auth/verify-otp', input)).data),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: async (input: ResendOtpRequest) =>
      unwrap<SignupResponse>((await api.post('/auth/resend-otp', input)).data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordRequest) =>
      unwrap<ForgotPasswordResponse>((await api.post('/auth/forgot-password', input)).data),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordRequest) =>
      unwrap<{ ok: boolean; message: string }>((await api.post('/auth/reset-password', input)).data),
  });
}

export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: ChangePasswordRequest) =>
      unwrap<{ accessToken: string; refreshToken: string; message: string }>(
        (await api.post('/auth/change-password', input)).data,
      ),
    onSuccess: (data) => {
      // Password change revokes every refresh session including this one;
      // the server issues a fresh pair so the current tab stays signed in.
      setSession(data.accessToken, data.refreshToken);
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
