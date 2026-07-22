import { useEffect, useState, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { CurrencyInput } from '@/components/form/CurrencyInput';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { staffCreateSchema, type StaffCreateInput } from '@/lib/schemas';
import { api, extractApiError } from '@/api/client';
import { useAddStaff, useUpdateStaff, useUploadStaffPhoto, useUploadStaffSignature } from './api';
import type { Staff } from '@/types/domain';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
}

const ROLES = ['Admin', 'Accountant', 'Teacher'] as const;

export function StaffForm({ open, onOpenChange, staff }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = staff != null;
  const add = useAddStaff();
  const update = useUpdateStaff(staff?.id ?? 0);
  const uploadPhoto = useUploadStaffPhoto();
  const uploadSignature = useUploadStaffSignature();
  const mutation = isEdit ? update : add;

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StaffCreateInput>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: { status: 'active' } as Partial<StaffCreateInput> as StaffCreateInput,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      staff
        ? ({
            fullName: staff.fullName,
            role: staff.role,
            baseSalary: staff.baseSalary,
            contactNo: staff.contactNo,
            whatsappNo: staff.whatsappNo,
            status: staff.status === 'inactive' ? 'inactive' : 'active',
          } as StaffCreateInput)
        : ({ status: 'active' } as Partial<StaffCreateInput> as StaffCreateInput),
    );
  }, [open, staff, reset]);

  // Load an existing staff member's photo for the preview (authed blob fetch —
  // a plain <img src> can't send the Bearer token). Clears any locally-picked file first.
  useEffect(() => {
    if (!open) return;
    setPhotoFile(null);
    setPreviewUrl(null);
    if (!staff?.photoPath) return;
    let active = true;
    api
      .get(`/staff/${staff.id}/photo`, { responseType: 'blob' })
      .then((res) => {
        if (active) setPreviewUrl(URL.createObjectURL(res.data as Blob));
      })
      .catch(() => {
        /* no photo / not found — leave preview empty */
      });
    return () => {
      active = false;
    };
  }, [open, staff]);

  // Revoke the previous object URL whenever the preview changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Load an existing signature for the preview — same authed-blob-fetch
  // pattern as the photo above, since signatures live on the same endpoint
  // family (/staff/:id/signature).
  useEffect(() => {
    if (!open) return;
    setSignatureFile(null);
    setSignaturePreviewUrl(null);
    if (!staff?.signaturePath) return;
    let active = true;
    api
      .get(`/staff/${staff.id}/signature`, { responseType: 'blob' })
      .then((res) => {
        if (active) setSignaturePreviewUrl(URL.createObjectURL(res.data as Blob));
      })
      .catch(() => {
        /* no signature / not found — leave preview empty */
      });
    return () => {
      active = false;
    };
  }, [open, staff]);

  useEffect(() => {
    return () => {
      if (signaturePreviewUrl) URL.revokeObjectURL(signaturePreviewUrl);
    };
  }, [signaturePreviewUrl]);

  function onPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function onSignatureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreviewUrl(URL.createObjectURL(file));
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = isEdit
        ? await update.mutateAsync(values)
        : await add.mutateAsync(values);
      if (photoFile) {
        await uploadPhoto.mutateAsync({ id: saved.id, file: photoFile });
      }
      if (signatureFile) {
        await uploadSignature.mutateAsync({ id: saved.id, file: signatureFile });
      }
      toast({ title: t(isEdit ? 'staff.updated' : 'staff.created'), variant: 'success' });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? 'staff.edit' : 'staff.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="flex items-start justify-between gap-4 sm:col-span-2">
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-16 w-16 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted text-center text-xs text-muted-foreground">
                  {t('staff.photo')}
                </div>
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoChange}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <input
                    id="staff-status"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={field.value !== 'inactive'}
                    onChange={(e) => field.onChange(e.target.checked ? 'active' : 'inactive')}
                  />
                )}
              />
              <Label htmlFor="staff-status">{t('common.active')}</Label>
            </div>
          </div>

          <Field label={t('staff.fullName')} error={errors.fullName?.message} required>
            <Input {...register('fullName')} />
          </Field>
          <SelectField
            name="role"
            control={control}
            label={t('staff.role')}
            error={errors.role?.message}
            required
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <Field label={t('staff.baseSalary')} error={errors.baseSalary?.message} required>
            <CurrencyInput step="0.01" {...register('baseSalary')} />
          </Field>
          <Field label={t('staff.contactNo')} error={errors.contactNo?.message} required>
            <Input {...register('contactNo')} />
          </Field>
          <Field label={t('staff.whatsappNo')} error={errors.whatsappNo?.message} required>
            <Input {...register('whatsappNo')} />
          </Field>

          <div className="flex items-center gap-4 sm:col-span-2">
            {signaturePreviewUrl ? (
              <img
                src={signaturePreviewUrl}
                alt=""
                className="h-12 w-28 rounded-md border object-contain bg-white"
              />
            ) : (
              <div className="flex h-12 w-28 items-center justify-center rounded-md border bg-muted text-center text-xs text-muted-foreground">
                {t('staff.signature')}
              </div>
            )}
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">{t('staff.signature')}</Label>
              <Input type="file" accept="image/jpeg" onChange={onSignatureChange} className="max-w-xs" />
            </div>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || uploadPhoto.isPending || uploadSignature.isPending}>
              {(mutation.isPending || uploadPhoto.isPending || uploadSignature.isPending) && <Spinner className="me-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
