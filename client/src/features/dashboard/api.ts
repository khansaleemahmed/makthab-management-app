import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import type { DashboardStats } from '@/types/domain';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => unwrap<DashboardStats>((await api.get('/dashboard')).data),
  });
}
