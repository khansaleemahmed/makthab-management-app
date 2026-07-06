import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { Spinner } from '@/components/ui/spinner';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, monthName } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useExpenseCategories } from '@/api/reference';
import {
  expenseCreateSchema,
  type ExpenseCreateInput,
  staffCreateSchema,
  type StaffCreateInput,
  salaryRunSchema,
  type SalaryRunInput,
} from '@/lib/schemas';
import { toDateInput } from '@/lib/format';
import {
  useExpenses,
  useAddExpense,
  useStaff,
  useAddStaff,
  useSalaries,
  useRunPayroll,
} from './api';

const now = new Date();

function ExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: categories = [] } = useExpenseCategories();
  const add = useAddExpense();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { expenseDate: toDateInput(now) } as Partial<ExpenseCreateInput> as ExpenseCreateInput,
  });

  const onSubmit = handleSubmit((values) => {
    add.mutate(values, {
      onSuccess: () => {
        toast({ title: t('expenses.created'), variant: 'success' });
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('expenses.add')}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <SelectField
            name="categoryId"
            control={control}
            label={t('expenses.category')}
            error={errors.categoryId?.message}
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field label={t('expenses.amount')} error={errors.amount?.message} required>
            <Input type="number" step="0.01" {...register('amount')} />
          </Field>
          <Field label={t('expenses.date')} error={errors.expenseDate?.message} required>
            <Input type="date" {...register('expenseDate')} />
          </Field>
          <Field label={t('expenses.payee')} error={errors.payee?.message} required>
            <Input {...register('payee')} />
          </Field>
          <Field label={t('expenses.description')} error={errors.description?.message} className="sm:col-span-2">
            <Input {...register('description')} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Spinner className="me-2" />}{t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpensesTab() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useExpenses();
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t('expenses.add')}</Button>
        </div>
        {isLoading ? (
          <LoadingRows cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('expenses.voucherNo')}</TableHead>
                <TableHead>{t('expenses.category')}</TableHead>
                <TableHead>{t('expenses.payee')}</TableHead>
                <TableHead className="text-end">{t('expenses.amount')}</TableHead>
                <TableHead>{t('expenses.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.voucherNo}</TableCell>
                  <TableCell>{e.category?.name ?? e.categoryId}</TableCell>
                  <TableCell>{e.payee}</TableCell>
                  <TableCell className="text-end">{formatCurrency(e.amount, i18n.language)}</TableCell>
                  <TableCell>{formatDate(e.expenseDate, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ExpenseDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function StaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const add = useAddStaff();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffCreateInput>({ resolver: zodResolver(staffCreateSchema) });

  const onSubmit = handleSubmit((values) => {
    add.mutate(values, {
      onSuccess: () => {
        toast({ title: t('staff.created'), variant: 'success' });
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('staff.add')}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label={t('staff.fullName')} error={errors.fullName?.message} required>
            <Input {...register('fullName')} />
          </Field>
          <Field label={t('staff.role')} error={errors.role?.message} required>
            <Input {...register('role')} />
          </Field>
          <Field label={t('staff.baseSalary')} error={errors.baseSalary?.message} required>
            <Input type="number" step="0.01" {...register('baseSalary')} />
          </Field>
          <Field label={t('staff.contactNo')} error={errors.contactNo?.message} required>
            <Input {...register('contactNo')} />
          </Field>
          <Field label={t('staff.whatsappNo')} error={errors.whatsappNo?.message} required>
            <Input {...register('whatsappNo')} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending && <Spinner className="me-2" />}{t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffTab() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useStaff();
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t('staff.add')}</Button>
        </div>
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
                <TableHead>{t('staff.fullName')}</TableHead>
                <TableHead>{t('staff.role')}</TableHead>
                <TableHead className="text-end">{t('staff.baseSalary')}</TableHead>
                <TableHead>{t('staff.contactNo')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell>{s.role}</TableCell>
                  <TableCell className="text-end">{formatCurrency(s.baseSalary, i18n.language)}</TableCell>
                  <TableCell>{s.contactNo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <StaffDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function SalariesTab() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const run = useRunPayroll();
  const { data, isLoading, isError, refetch } = useSalaries();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SalaryRunInput>({
    resolver: zodResolver(salaryRunSchema),
    defaultValues: {
      salaryMonth: now.getMonth() + 1,
      salaryYear: now.getFullYear(),
      deductions: 0,
      paymentDate: toDateInput(now),
    } as Partial<SalaryRunInput> as SalaryRunInput,
  });

  const onSubmit = handleSubmit((values) => {
    run.mutate(values, {
      onSuccess: () => toast({ title: t('salaries.processed'), variant: 'success' }),
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  });

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-4">
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
          <Field label={t('salaries.deductions')} error={errors.deductions?.message}>
            <Input type="number" step="0.01" {...register('deductions')} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={run.isPending}>
              {run.isPending && <Spinner className="me-2" />}{t('salaries.run')}
            </Button>
          </div>
        </form>

        {isLoading ? (
          <LoadingRows cols={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('salaries.staff')}</TableHead>
                <TableHead>{t('salaries.month')}</TableHead>
                <TableHead className="text-end">{t('salaries.gross')}</TableHead>
                <TableHead className="text-end">{t('salaries.deductions')}</TableHead>
                <TableHead className="text-end">{t('salaries.net')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.staff?.fullName ?? p.staffId}</TableCell>
                  <TableCell>{monthName(p.salaryMonth)} {p.salaryYear}</TableCell>
                  <TableCell className="text-end">{formatCurrency(p.grossAmount, i18n.language)}</TableCell>
                  <TableCell className="text-end">{formatCurrency(p.deductions, i18n.language)}</TableCell>
                  <TableCell className="text-end">{formatCurrency(p.netAmount, i18n.language)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.finance')} />
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">{t('expenses.title')}</TabsTrigger>
          <TabsTrigger value="staff">{t('staff.title')}</TabsTrigger>
          <TabsTrigger value="salaries">{t('salaries.title')}</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="staff"><StaffTab /></TabsContent>
        <TabsContent value="salaries"><SalariesTab /></TabsContent>
      </Tabs>
    </>
  );
}
