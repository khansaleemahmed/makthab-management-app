import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './client';
import type { AcademicYear, Class, ExpenseCategory } from '@/types/domain';

/**
 * Reference/lookup data used to populate select inputs across forms.
 * Endpoints are lightweight GETs; results are cached aggressively.
 */

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap<Class[]>((await api.get('/classes')).data),
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academic-years'],
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap<AcademicYear[]>((await api.get('/academic-years')).data),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => unwrap<ExpenseCategory[]>((await api.get('/expense-categories')).data),
  });
}
