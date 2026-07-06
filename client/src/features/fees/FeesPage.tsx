import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, monthName } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { openWhatsApp } from '@/lib/download';
import { useFees, useDefaulters, downloadReceipt, sendReceiptWhatsApp } from './api';
import { FeeForm } from './FeeForm';
import { FeeStructures } from './FeeStructures';
import type { FeePayment } from '@/types/domain';

const now = new Date();

function MonthYearPicker({
  month,
  year,
  onMonth,
  onYear,
}: {
  month: number;
  year: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}) {
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  return (
    <div className="flex gap-2">
      <Select value={String(month)} onValueChange={(v) => onMonth(Number(v))}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYear(Number(v))}>
        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function PaymentsTab() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading, isError, refetch } = useFees({ month, year });

  const receipt = async (f: FeePayment) => {
    try {
      await downloadReceipt(f);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  };

  const whatsapp = async (f: FeePayment) => {
    try {
      await sendReceiptWhatsApp(f.id);
      toast({ title: t('fees.whatsapp'), variant: 'success' });
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <MonthYearPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />
        {isLoading ? (
          <LoadingRows cols={6} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fees.receiptNo')}</TableHead>
                <TableHead>{t('fees.student')}</TableHead>
                <TableHead>{t('fees.feeType')}</TableHead>
                <TableHead className="text-end">{t('fees.amountPaid')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.receiptNo}</TableCell>
                  <TableCell>{f.student?.fullName ?? f.studentId}</TableCell>
                  <TableCell className="capitalize">{f.feeType}</TableCell>
                  <TableCell className="text-end">{formatCurrency(f.amountPaid, i18n.language)}</TableCell>
                  <TableCell>
                    <Badge variant={f.amountPaid >= f.amountDue ? 'success' : 'warning'}>
                      {f.amountPaid >= f.amountDue ? t('fees.paid') : t('fees.unpaid')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title={t('fees.receipt')} onClick={() => receipt(f)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={t('fees.whatsapp')} onClick={() => whatsapp(f)}>
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DefaultersTab() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading, isError, refetch } = useDefaulters(month, year);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <MonthYearPicker month={month} year={year} onMonth={setMonth} onYear={setYear} />
        {isLoading ? (
          <LoadingRows cols={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('students.admissionNo')}</TableHead>
                <TableHead>{t('students.fullName')}</TableHead>
                <TableHead className="text-end">{t('fees.amountDue')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.studentId}>
                  <TableCell className="font-medium">{d.admissionNo}</TableCell>
                  <TableCell>{d.fullName}</TableCell>
                  <TableCell className="text-end">{formatCurrency(d.amountDue, i18n.language)}</TableCell>
                  <TableCell className="text-end">
                    {d.whatsappNo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t('fees.whatsapp')}
                        onClick={() =>
                          openWhatsApp(
                            d.whatsappNo!,
                            `Dear parent, fee of ${d.amountDue} for ${d.fullName} (${monthName(month)} ${year}) is pending.`,
                          )
                        }
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function FeesPage() {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={t('fees.title')}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('fees.collect')}
          </Button>
        }
      />
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">{t('fees.title')}</TabsTrigger>
          <TabsTrigger value="defaulters">{t('fees.defaulters')}</TabsTrigger>
          <TabsTrigger value="structures">{t('fees.structures')}</TabsTrigger>
        </TabsList>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="defaulters"><DefaultersTab /></TabsContent>
        <TabsContent value="structures"><FeeStructures /></TabsContent>
      </Tabs>
      <FeeForm open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
