import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import type { Expense, Staff, SalaryPayment } from '@/types/domain';
import type { ExpenseCreateInput, StaffCreateInput, SalaryRunInput } from '@/lib/schemas';

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const p = data as { items?: T[] };
  return p.items ?? [];
}

// ---- Expenses ---------------------------------------------------------------
export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => toArray<Expense>(unwrap((await api.get('/expenses', { params: { limit: 200 } })).data)),
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCreateInput) => unwrap<Expense>((await api.post('/expenses', input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

// ---- Staff ------------------------------------------------------------------
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => toArray<Staff>(unwrap((await api.get('/staff')).data)),
  });
}

export function useAddStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StaffCreateInput) => unwrap<Staff>((await api.post('/staff', input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

// ---- Salaries ---------------------------------------------------------------
export function useSalaries() {
  return useQuery({
    queryKey: ['salaries'],
    queryFn: async () => toArray<SalaryPayment>(unwrap((await api.get('/salaries')).data)),
  });
}

export function useRunPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalaryRunInput) => (await api.post('/salaries', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  });
}
