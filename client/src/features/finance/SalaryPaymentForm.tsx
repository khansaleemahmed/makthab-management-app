import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/form/CurrencyInput';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { salaryPaymentCreateSchema, type SalaryPaymentCreateInput } from '@/lib/schemas';
import { toDateInput, monthName } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useStaff, useAddSalaryPayment, useUpdateSalary } from './api';
import type { SalaryPayment } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: SalaryPayment | null;
}

const now = new Date();

export function SalaryPaymentForm({ open, onOpenChange, payment }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = payment != null;
  const add = useAddSalaryPayment();
  const update = useUpdateSalary(payment?.id ?? 0);
  const mutation = isEdit ? update : add;
  const { data: staff } = useStaff({ limit: 200 });
  const staffOptions = (staff?.items ?? [])
    .filter((s) => s.status === 'active' || s.id === payment?.staffId)
    .map((s) => ({ value: s.id, label: s.fullName }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SalaryPaymentCreateInput>({
    resolver: zodResolver(salaryPaymentCreateSchema),
    defaultValues: {
      salaryMonth: now.getMonth() + 1,
      salaryYear: now.getFullYear(),
      deductions: 0,
      paymentDate: toDateInput(now),
    } as Partial<SalaryPaymentCreateInput> as SalaryPaymentCreateInput,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      payment
        ? ({
            staffId: payment.staffId,
            salaryMonth: payment.salaryMonth,
            salaryYear: payment.salaryYear,
            grossAmount: payment.grossAmount,
            deductions: payment.deductions,
            paymentDate: payment.paymentDate.slice(0, 10),
          } as SalaryPaymentCreateInput)
        : ({
            salaryMonth: now.getMonth() + 1,
            salaryYear: now.getFullYear(),
            deductions: 0,
            paymentDate: toDateInput(now),
          } as Partial<SalaryPaymentCreateInput> as SalaryPaymentCreateInput),
    );
  }, [open, payment, reset]);

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: () => {
        toast({ title: t(isEdit ? 'salaries.updated' : 'salaries.created'), variant: 'success' });
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'salaries.edit' : 'salaries.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <SelectField
              name="staffId"
              control={control}
              label={t('salaries.staff')}
              error={errors.staffId?.message}
              required
              options={staffOptions}
            />
          </div>
          <SelectField
            name="salaryMonth"
            control={control}
            label={t('salaries.month')}
            error={errors.salaryMonth?.message}
            required
            options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }))}
          />
          <Field label={t('salaries.year')} error={errors.salaryYear?.message} required>
            <Input type="number" {...register('salaryYear')} />
          </Field>
          <Field label={t('salaries.grossAmount')} error={errors.grossAmount?.message} required>
            <CurrencyInput step="0.01" {...register('grossAmount')} />
          </Field>
          <Field label={t('salaries.deductions')} error={errors.deductions?.message}>
            <CurrencyInput step="0.01" {...register('deductions')} />
          </Field>
          <Field label={t('salaries.paymentDate')} error={errors.paymentDate?.message} required>
            <Input type="date" {...register('paymentDate')} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
