import { useQuery } from '@tanstack/react-query';
import type {
  FeeCollectionYearSummary,
  FeeCollectionAllSummary,
  SalaryRegisterYearSummary,
  SalaryRegisterAllSummary,
  FinancialSummaryYearSummary,
  FinancialSummaryAllSummary,
} from '@makthab/shared';
import { api, unwrap } from '@/api/client';

export function useFeeCollectionYearSummary(year: number, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'fee-collection', 'summary', 'year', year],
    enabled,
    queryFn: async () =>
      unwrap<FeeCollectionYearSummary>(
        (await api.get('/reports/fee-collection/summary', { params: { view: 'year', year } })).data,
      ),
  });
}

export function useFeeCollectionAllSummary(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'fee-collection', 'summary', 'all'],
    enabled,
    queryFn: async () =>
      unwrap<FeeCollectionAllSummary>(
        (await api.get('/reports/fee-collection/summary', { params: { view: 'all' } })).data,
      ),
  });
}

export function useSalaryRegisterYearSummary(year: number, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'salary-register', 'summary', 'year', year],
    enabled,
    queryFn: async () =>
      unwrap<SalaryRegisterYearSummary>(
        (await api.get('/reports/salary-register/summary', { params: { view: 'year', year } })).data,
      ),
  });
}

export function useSalaryRegisterAllSummary(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'salary-register', 'summary', 'all'],
    enabled,
    queryFn: async () =>
      unwrap<SalaryRegisterAllSummary>(
        (await api.get('/reports/salary-register/summary', { params: { view: 'all' } })).data,
      ),
  });
}

export function useFinancialSummaryYearSummary(year: number, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'financial-summary', 'summary', 'year', year],
    enabled,
    queryFn: async () =>
      unwrap<FinancialSummaryYearSummary>(
        (await api.get('/reports/financial-summary/summary', { params: { view: 'year', year } })).data,
      ),
  });
}

export function useFinancialSummaryAllSummary(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'financial-summary', 'summary', 'all'],
    enabled,
    queryFn: async () =>
      unwrap<FinancialSummaryAllSummary>(
        (await api.get('/reports/financial-summary/summary', { params: { view: 'all' } })).data,
      ),
  });
}
