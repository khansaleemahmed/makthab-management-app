import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@makthab/shared';
import { api, unwrap } from '@/api/client';

export type MyProfile = MeResponse;

export function useMyProfile() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => unwrap<MeResponse>((await api.get('/auth/me')).data),
  });
}
