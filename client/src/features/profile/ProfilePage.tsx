import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingRows, ErrorState } from '@/components/QueryState';
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog';
import { useMyProfile } from './api';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useMyProfile();

  return (
    <>
      <PageHeader title={t('profile.title')} />

      <Card>
        <CardContent className="space-y-6 pt-6">
          {isLoading ? (
            <LoadingRows cols={3} />
          ) : isError || !data ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg">{initials(data.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{data.fullName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{data.role}</Badge>
                    <Badge variant={data.status === 'active' ? 'success' : 'secondary'}>
                      {data.status === 'active'
                        ? t('common.active')
                        : data.status === 'inactive'
                          ? t('common.inactive')
                          : data.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('profile.username')} value={data.username} />
                <Field label={t('profile.email')} value={data.email ?? '—'} />
                <Field label={t('profile.phone')} value={data.phone ?? '—'} />
                <Field label={t('profile.whatsappNo')} value={data.whatsappNo ?? '—'} />
                <Field label={t('profile.address')} value={data.address ?? '—'} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('auth.changePassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t('profile.changePasswordHint')}</p>
          <Button onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="h-4 w-4" />
            {t('auth.changePassword')}
          </Button>
        </CardContent>
      </Card>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
