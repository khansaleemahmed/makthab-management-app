import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import type { Expense, Staff, SalaryPayment } from '@/types/domain';
import type { ExpenseCreateInput, StaffCreateInput, SalaryRunInput } from '@/lib/schemas';

export interface ListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ---- Expenses ---------------------------------------------------------------
export function useExpenses(params: ListParams = {}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const payload = unwrap((await api.get('/expenses', { params })).data) as {
        items?: Expense[];
        total?: number;
        totalAmount?: number;
      };
      return {
        items: payload.items ?? [],
        total: payload.total ?? payload.items?.length ?? 0,
        totalAmount: payload.totalAmount ?? 0,
      };
    },
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCreateInput) => unwrap<Expense>((await api.post('/expenses', input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ExpenseCreateInput>) =>
      unwrap<Expense>((await api.patch(`/expenses/${id}`, input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

// ---- Staff ------------------------------------------------------------------
export function useStaff(params: ListParams = {}) {
  return useQuery({
    queryKey: ['staff', params],
    queryFn: async () => {
      const payload = unwrap((await api.get('/staff', { params })).data) as {
        items?: Staff[];
        total?: number;
      };
      return { items: payload.items ?? [], total: payload.total ?? payload.items?.length ?? 0 };
    },
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
export interface SalaryListParams extends ListParams {
  staff_id?: number;
  month?: number;
  year?: number;
}

export function useSalaries(params: SalaryListParams = {}) {
  return useQuery({
    queryKey: ['salaries', params],
    queryFn: async () => {
      const payload = unwrap((await api.get('/salaries', { params })).data) as {
        items?: SalaryPayment[];
        total?: number;
      };
      return { items: payload.items ?? [], total: payload.total ?? payload.items?.length ?? 0 };
    },
  });
}

export function useRunPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalaryRunInput) => (await api.post('/salaries', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salaries'] }),
  });
}
