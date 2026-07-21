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
import { Field } from '@/components/form/Field';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { userPasswordResetSchema, type UserPasswordResetInput } from '@/lib/schemas';
import { extractApiError } from '@/api/client';
import { useResetUserPassword } from './api';
import type { User } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const reset = useResetUserPassword(user?.id ?? 0);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<UserPasswordResetInput>({
    resolver: zodResolver(userPasswordResetSchema),
  });

  useEffect(() => {
    if (open) resetForm({ password: '', confirmPassword: '' });
  }, [open, resetForm]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values.password);
      toast({ title: t('users.passwordReset'), variant: 'success' });
      onOpenChange(false);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.resetPasswordFor', { name: user?.fullName ?? '' })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label={t('users.newPassword')} error={errors.password?.message} required>
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label={t('users.confirmPassword')} error={errors.confirmPassword?.message} required>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={reset.isPending}>
              {reset.isPending && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
