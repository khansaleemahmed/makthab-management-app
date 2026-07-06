import { useTranslation } from 'react-i18next';
import { Users, CalendarCheck, Wallet, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingRows, ErrorState } from '@/components/QueryState';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import { useDashboard } from './api';

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`rounded-lg p-3 ${accent ?? 'bg-primary/10 text-primary'}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <>
      <PageHeader title={t('dashboard.title')} />
      {isLoading ? (
        <LoadingRows rows={2} cols={4} />
      ) : isError || !data ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label={t('dashboard.totalStudents')}
              value={formatNumber(data.totalStudents, lang)}
            />
            <StatCard
              icon={CalendarCheck}
              label={t('dashboard.todayAttendance')}
              value={`${formatNumber(data.todayPresent, lang)} / ${formatNumber(
                data.todayPresent + data.todayAbsent,
                lang,
              )}`}
              accent="bg-emerald-500/10 text-emerald-600"
            />
            <StatCard
              icon={Wallet}
              label={t('dashboard.monthCollection')}
              value={formatCurrency(data.monthCollection, lang)}
              accent="bg-sky-500/10 text-sky-600"
            />
            <StatCard
              icon={AlertTriangle}
              label={t('dashboard.outstanding')}
              value={formatCurrency(data.outstanding, lang)}
              accent="bg-amber-500/10 text-amber-600"
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!data.recentActivity || data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
              ) : (
                <ul className="divide-y">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span>{a.description}</span>
                      <span className="text-muted-foreground">{formatDate(a.date, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
