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
import { studentCreateSchema, type StudentCreateInput } from '@/lib/schemas';
import { useClasses, useAcademicYears } from '@/api/reference';
import { useUiStore } from '@/store/uiStore';
import { extractApiError } from '@/api/client';
import { useAdmitStudent } from './api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentForm({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const admit = useAdmitStudent();
  const { data: classes } = useClasses();
  const { data: years } = useAcademicYears();
  const academicYearId = useUiStore((s) => s.academicYearId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      gender: 'male',
      academicYearId: academicYearId ?? undefined,
    } as Partial<StudentCreateInput> as StudentCreateInput,
  });

  const onSubmit = handleSubmit((values) => {
    admit.mutate(values, {
      onSuccess: () => {
        toast({ title: t('students.created'), variant: 'success' });
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
          <DialogTitle>{t('students.admit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label={t('students.admissionNo')} error={errors.admissionNo?.message} required>
            <Input {...register('admissionNo')} />
          </Field>
          <Field label={t('students.fullName')} error={errors.fullName?.message} required>
            <Input {...register('fullName')} />
          </Field>
          <Field label={t('students.fatherName')} error={errors.fatherName?.message} required>
            <Input {...register('fatherName')} />
          </Field>
          <Field label={t('students.dateOfBirth')} error={errors.dateOfBirth?.message} required>
            <Input type="date" {...register('dateOfBirth')} />
          </Field>
          <SelectField
            name="gender"
            control={control}
            label={t('students.gender')}
            error={errors.gender?.message}
            required
            options={[
              { value: 'male', label: t('students.male') },
              { value: 'female', label: t('students.female') },
            ]}
          />
          <SelectField
            name="classId"
            control={control}
            label={t('students.class')}
            error={errors.classId?.message}
            required
            placeholder={t('common.all')}
            options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            name="academicYearId"
            control={control}
            label={t('common.academicYear')}
            error={errors.academicYearId?.message}
            required
            options={(years ?? []).map((y) => ({ value: y.id, label: y.name }))}
          />
          <Field label={t('students.contactNo')} error={errors.contactNo?.message} required>
            <Input {...register('contactNo')} />
          </Field>
          <Field label={t('students.whatsappNo')} error={errors.whatsappNo?.message} required>
            <Input {...register('whatsappNo')} />
          </Field>
          <Field label={t('students.address')} error={errors.address?.message} className="sm:col-span-2">
            <Input {...register('address')} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={admit.isPending}>
              {admit.isPending && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
