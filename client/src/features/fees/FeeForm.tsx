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
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { feePaymentCreateSchema, type FeePaymentCreateInput } from '@/lib/schemas';
import { useStudentOptions } from '@/features/students/useStudentOptions';
import { toDateInput, monthName } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useRecordPayment } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetStudentId?: number;
}

const FEE_TYPES = ['admission', 'monthly', 'annual', 'other'] as const;
const METHODS = ['cash', 'upi', 'bank', 'cheque', 'card'] as const;

export function FeeForm({ open, onOpenChange, presetStudentId }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const record = useRecordPayment();
  const { options: studentOptions } = useStudentOptions();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FeePaymentCreateInput>({
    resolver: zodResolver(feePaymentCreateSchema),
    defaultValues: {
      studentId: presetStudentId,
      feeType: 'monthly',
      feeYear: new Date().getFullYear(),
      paymentMethod: 'cash',
      paymentDate: toDateInput(new Date()),
      waiverAmount: 0,
    } as Partial<FeePaymentCreateInput> as FeePaymentCreateInput,
  });

  const feeType = watch('feeType');

  const onSubmit = handleSubmit((values) => {
    record.mutate(values, {
      onSuccess: () => {
        toast({ title: t('fees.created'), variant: 'success' });
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('fees.collect')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <SelectField
              name="studentId"
              control={control}
              label={t('fees.student')}
              error={errors.studentId?.message}
              required
              placeholder={t('fees.student')}
              options={studentOptions}
            />
          </div>
          <SelectField
            name="feeType"
            control={control}
            label={t('fees.feeType')}
            error={errors.feeType?.message}
            required
            options={FEE_TYPES.map((v) => ({ value: v, label: v }))}
          />
          {feeType === 'monthly' && (
            <SelectField
              name="feeMonth"
              control={control}
              label={t('fees.month')}
              error={errors.feeMonth?.message}
              options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthName(i + 1) }))}
            />
          )}
          <Field label={t('fees.year')} error={errors.feeYear?.message} required>
            <Input type="number" {...register('feeYear')} />
          </Field>
          <Field label={t('fees.amountDue')} error={errors.amountDue?.message} required>
            <Input type="number" step="0.01" {...register('amountDue')} />
          </Field>
          <Field label={t('fees.amountPaid')} error={errors.amountPaid?.message} required>
            <Input type="number" step="0.01" {...register('amountPaid')} />
          </Field>
          <Field label={t('fees.waiver')} error={errors.waiverAmount?.message}>
            <Input type="number" step="0.01" {...register('waiverAmount')} />
          </Field>
          <Field label={t('fees.paymentDate')} error={errors.paymentDate?.message} required>
            <Input type="date" {...register('paymentDate')} />
          </Field>
          <SelectField
            name="paymentMethod"
            control={control}
            label={t('fees.paymentMethod')}
            error={errors.paymentMethod?.message}
            required
            options={METHODS.map((v) => ({ value: v, label: v }))}
          />

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
