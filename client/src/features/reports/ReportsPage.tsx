import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { monthName } from '@/lib/format';
import { downloadFile } from '@/lib/download';
import { extractApiError } from '@/api/client';

const now = new Date();

interface ReportDef {
  key: string;
  titleKey: string;
  path: string;
  needs: ('month' | 'year' | 'period')[];
  pdfOnly?: boolean;
}

const REPORTS: ReportDef[] = [
  { key: 'fee-collection', titleKey: 'reports.feeCollection', path: 'fee-collection', needs: ['month', 'year'] },
  { key: 'defaulters', titleKey: 'reports.defaulters', path: 'defaulters', needs: ['month', 'year'] },
  { key: 'attendance', titleKey: 'reports.attendance', path: 'attendance', needs: ['month', 'year'] },
  { key: 'expenses', titleKey: 'reports.expenses', path: 'expenses', needs: ['period'] },
  { key: 'salary-register', titleKey: 'reports.salaryRegister', path: 'salary-register', needs: ['month', 'year'] },
  { key: 'financial-summary', titleKey: 'reports.financialSummary', path: 'financial-summary', needs: ['year'], pdfOnly: true },
];

export function ReportsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const download = async (r: ReportDef, format?: 'xlsx') => {
    const params: Record<string, unknown> = {};
    if (r.needs.includes('month')) params.month = month;
    if (r.needs.includes('year') || r.needs.includes('period')) {
      if (r.needs.includes('period')) params.period = year;
      else params.year = year;
    }
    if (format) params.format = format;
    const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
    try {
      await downloadFile(`/reports/${r.path}`, `${r.key}.${ext}`, params);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader title={t('reports.title')} />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t('fees.month')}</p>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t('fees.year')}</p>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <CardHeader>
              <CardTitle className="text-base">{t(r.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => download(r)}>
                <FileText className="h-4 w-4" />{t('common.pdf')}
              </Button>
              {!r.pdfOnly && (
                <Button variant="outline" size="sm" onClick={() => download(r, 'xlsx')}>
                  <FileSpreadsheet className="h-4 w-4" />{t('common.excel')}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
