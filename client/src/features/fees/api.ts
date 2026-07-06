import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/api/client';
import { downloadFile } from '@/lib/download';
import type { FeePayment, Defaulter, FeeStructure } from '@/types/domain';
import type { FeePaymentCreateInput, FeeStructureCreateInput } from '@/lib/schemas';

export interface FeeListParams {
  student_id?: number;
  month?: number;
  year?: number;
  status?: 'paid' | 'unpaid';
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const p = data as { items?: T[] };
  return p.items ?? [];
}

export function useFees(params: FeeListParams = {}) {
  return useQuery({
    queryKey: ['fees', params],
    queryFn: async () => toArray<FeePayment>(unwrap((await api.get('/fees', { params })).data)),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeePaymentCreateInput) =>
      unwrap<FeePayment>((await api.post('/fees', input)).data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      qc.invalidateQueries({ queryKey: ['fees', 'defaulters'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDefaulters(month: number, year: number) {
  return useQuery({
    queryKey: ['fees', 'defaulters', month, year],
    queryFn: async () =>
      toArray<Defaulter>(unwrap((await api.get('/fees/defaulters', { params: { month, year } })).data)),
  });
}

export function useFeeStructures() {
  return useQuery({
    queryKey: ['fees', 'structures'],
    queryFn: async () => toArray<FeeStructure>(unwrap((await api.get('/fees/structures')).data)),
  });
}

export function useSaveFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FeeStructureCreateInput) =>
      unwrap<FeeStructure>((await api.post('/fees/structures', input)).data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fees', 'structures'] }),
  });
}

export function downloadReceipt(fee: FeePayment) {
  return downloadFile(`/fees/${fee.id}/receipt`, `receipt-${fee.receiptNo}.pdf`);
}

/** Ask the server to dispatch the receipt to the student's WhatsApp (wa.me for MVP). */
export function sendReceiptWhatsApp(feeId: number) {
  return api.post(`/fees/${feeId}/whatsapp`);
}
