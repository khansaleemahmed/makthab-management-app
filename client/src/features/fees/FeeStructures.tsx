import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/form/CurrencyInput';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useClasses, useAcademicYears } from '@/api/reference';
import { feeStructureCreateSchema, type FeeStructureCreateInput } from '@/lib/schemas';
import { useFeeStructures, useSaveFeeStructure } from './api';

const FEE_TYPES = ['admission', 'monthly', 'annual', 'other'] as const;

export function FeeStructures() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const { data: years = [] } = useAcademicYears();
  const { data: structures, isLoading, isError, refetch } = useFeeStructures();
  const save = useSaveFeeStructure();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FeeStructureCreateInput>({
    resolver: zodResolver(feeStructureCreateSchema),
    defaultValues: { feeType: 'monthly' } as Partial<FeeStructureCreateInput> as FeeStructureCreateInput,
  });

  const classNameFor = (id: number) => classes.find((c) => c.id === id)?.name ?? id;

  const onSubmit = handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: () => {
        toast({ title: t('common.save'), variant: 'success' });
        reset({ feeType: 'monthly' } as Partial<FeeStructureCreateInput> as FeeStructureCreateInput);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
          <SelectField
            name="classId"
            control={control}
            label={t('students.class')}
            error={errors.classId?.message}
            required
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            name="academicYearId"
            control={control}
            label={t('common.academicYear')}
            error={errors.academicYearId?.message}
            required
            options={years.map((y) => ({ value: y.id, label: y.name }))}
          />
          <SelectField
            name="feeType"
            control={control}
            label={t('fees.feeType')}
            error={errors.feeType?.message}
            required
            options={FEE_TYPES.map((v) => ({ value: v, label: v }))}
          />
          <Field label={t('fees.amountDue')} error={errors.amount?.message} required>
            <CurrencyInput step="0.01" {...register('amount')} />
          </Field>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </div>
        </form>

        {isLoading ? (
          <LoadingRows cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !structures || structures.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('students.class')}</TableHead>
                <TableHead>{t('fees.feeType')}</TableHead>
                <TableHead className="text-end">{t('fees.amountDue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{classNameFor(s.classId)}</TableCell>
                  <TableCell className="capitalize">{s.feeType}</TableCell>
                  <TableCell className="text-end">{formatCurrency(s.amount, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
