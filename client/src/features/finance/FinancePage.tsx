import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form/Field';
import { SelectField } from '@/components/form/SelectField';
import { CurrencyInput } from '@/components/form/CurrencyInput';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/ui/spinner';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { Pagination, DEFAULT_PAGE_SIZE } from '@/components/Pagination';
import { SortableTableHead, useSort } from '@/components/SortableTableHead';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, monthName } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useExpenseCategories } from '@/api/reference';
import { useAuthStore } from '@/store/authStore';
import {
  expenseCreateSchema,
  type ExpenseCreateInput,
  staffCreateSchema,
  type StaffCreateInput,
  salaryRunSchema,
  type SalaryRunInput,
} from '@/lib/schemas';
import { toDateInput } from '@/lib/format';
import type { Expense } from '@/types/domain';
import {
  useExpenses,
  useAddExpense,
  useUpdateExpense,
  useDeleteExpense,
  useStaff,
  useAddStaff,
  useSalaries,
  useRunPayroll,
} from './api';

const now = new Date();

function ExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expense?: Expense | null;
}) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: categories = [] } = useExpenseCategories();
  const isEdit = expense != null;
  const add = useAddExpense();
  const update = useUpdateExpense(expense?.id ?? 0);
  const mutation = isEdit ? update : add;
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { expenseDate: toDateInput(now) } as Partial<ExpenseCreateInput> as ExpenseCreateInput,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? ({
            categoryId: expense.categoryId,
            cost: expense.cost ?? undefined,
            quantity: expense.quantity ?? undefined,
            expenseDate: expense.expenseDate?.slice(0, 10),
            payee: expense.payee,
            description: expense.description ?? undefined,
          } as ExpenseCreateInput)
        : ({ expenseDate: toDateInput(now) } as Partial<ExpenseCreateInput> as ExpenseCreateInput),
    );
  }, [open, expense, reset]);

  const cost = Number(watch('cost')) || 0;
  const quantity = Number(watch('quantity')) || 0;
  const amount = cost * quantity;

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) await update.mutateAsync(values);
      else await add.mutateAsync(values);
      toast({ title: t(isEdit ? 'expenses.updated' : 'expenses.created'), variant: 'success' });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t(isEdit ? 'expenses.edit' : 'expenses.add')}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <SelectField
            name="categoryId"
            control={control}
            label={t('expenses.category')}
            error={errors.categoryId?.message}
            required
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field label={t('expenses.payee')} error={errors.payee?.message} required>
            <Input {...register('payee')} />
          </Field>
          <Field label={t('expenses.cost')} error={errors.cost?.message} required>
            <CurrencyInput step="0.01" {...register('cost')} />
          </Field>
          <Field label={t('expenses.quantity')} error={errors.quantity?.message} required>
            <Input type="number" step="0.01" min="0" {...register('quantity')} />
          </Field>
          <Field label={t('expenses.amount')}>
            <Input type="text" readOnly value={formatCurrency(amount, i18n.language)} tabIndex={-1} />
          </Field>
          <Field label={t('expenses.date')} error={errors.expenseDate?.message} required>
            <Input type="date" {...register('expenseDate')} />
          </Field>
          <Field label={t('expenses.description')} error={errors.description?.message} className="sm:col-span-2">
            <Input {...register('description')} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="me-2" />}{t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpensesTab() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'Admin';
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const { sort, toggle } = useSort({ sortBy: '', sortOrder: 'asc' });
  const { data, isLoading, isError, refetch } = useExpenses({
    page,
    limit,
    sortBy: sort.sortBy || undefined,
    sortOrder: sort.sortBy ? sort.sortOrder : undefined,
  });
  const del = useDeleteExpense();

  const onSort = (key: string) => {
    toggle(key);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast({ title: t('expenses.deleted'), variant: 'success' });
        setDeleting(null);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          {data && (
            <div className="text-sm text-muted-foreground">
              {t('common.total')}:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(data.totalAmount, i18n.language)}
              </span>
            </div>
          )}
          <Button onClick={openCreate} className="ms-auto"><Plus className="h-4 w-4" />{t('expenses.add')}</Button>
        </div>
        {isLoading ? (
          <LoadingRows cols={7} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="voucherNo" sort={sort} onSort={onSort}>
                  {t('expenses.voucherNo')}
                </SortableTableHead>
                <SortableTableHead sortKey="category" sort={sort} onSort={onSort}>
                  {t('expenses.category')}
                </SortableTableHead>
                <SortableTableHead sortKey="payee" sort={sort} onSort={onSort}>
                  {t('expenses.payee')}
                </SortableTableHead>
                <SortableTableHead sortKey="cost" sort={sort} onSort={onSort} className="text-end">
                  {t('expenses.cost')}
                </SortableTableHead>
                <SortableTableHead sortKey="quantity" sort={sort} onSort={onSort} className="text-end">
                  {t('expenses.quantity')}
                </SortableTableHead>
                <SortableTableHead sortKey="amount" sort={sort} onSort={onSort} className="text-end">
                  {t('expenses.amount')}
                </SortableTableHead>
                <SortableTableHead sortKey="expenseDate" sort={sort} onSort={onSort}>
                  {t('expenses.date')}
                </SortableTableHead>
                {canManage && <TableHead className="text-end">{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.voucherNo}</TableCell>
                  <TableCell>{e.category?.name ?? e.categoryId}</TableCell>
                  <TableCell>{e.payee}</TableCell>
                  <TableCell className="text-end">
                    {e.cost != null ? formatCurrency(e.cost, i18n.language) : '—'}
                  </TableCell>
                  <TableCell className="text-end">{e.quantity ?? '—'}</TableCell>
                  <TableCell className="text-end">{formatCurrency(e.amount, i18n.language)}</TableCell>
                  <TableCell>{formatDate(e.expenseDate, i18n.language)}</TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title={t('common.edit')} onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => setDeleting(e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data && data.total > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={data.total}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </CardContent>
      <ExpenseDialog open={open} onOpenChange={setOpen} expense={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        onConfirm={confirmDelete}
        title={t('expenses.confirmDeleteTitle')}
        message={t('expenses.confirmDelete', { voucher: deleting?.voucherNo ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        pending={del.isPending}
      />
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const { sort, toggle } = useSort({ sortBy: '', sortOrder: 'asc' });
  const { data, isLoading, isError, refetch } = useStaff({
    page,
    limit,
    sortBy: sort.sortBy || undefined,
    sortOrder: sort.sortBy ? sort.sortOrder : undefined,
  });

  const onSort = (key: string) => {
    toggle(key);
    setPage(1);
  };

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
        ) : !data || data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="fullName" sort={sort} onSort={onSort}>
                  {t('staff.fullName')}
                </SortableTableHead>
                <SortableTableHead sortKey="role" sort={sort} onSort={onSort}>
                  {t('staff.role')}
                </SortableTableHead>
                <SortableTableHead sortKey="baseSalary" sort={sort} onSort={onSort} className="text-end">
                  {t('staff.baseSalary')}
                </SortableTableHead>
                <TableHead>{t('staff.contactNo')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((s) => (
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
        {data && data.total > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={data.total}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const { sort, toggle } = useSort({ sortBy: '', sortOrder: 'asc' });
  const { data, isLoading, isError, refetch } = useSalaries({
    page,
    limit,
    sortBy: sort.sortBy || undefined,
    sortOrder: sort.sortBy ? sort.sortOrder : undefined,
  });

  const onSort = (key: string) => {
    toggle(key);
    setPage(1);
  };

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
        ) : !data || data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="staff" sort={sort} onSort={onSort}>
                  {t('salaries.staff')}
                </SortableTableHead>
                <SortableTableHead sortKey="salaryMonth" sort={sort} onSort={onSort}>
                  {t('salaries.month')}
                </SortableTableHead>
                <SortableTableHead sortKey="grossAmount" sort={sort} onSort={onSort} className="text-end">
                  {t('salaries.gross')}
                </SortableTableHead>
                <SortableTableHead sortKey="deductions" sort={sort} onSort={onSort} className="text-end">
                  {t('salaries.deductions')}
                </SortableTableHead>
                <SortableTableHead sortKey="netAmount" sort={sort} onSort={onSort} className="text-end">
                  {t('salaries.net')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
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
        {data && data.total > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={data.total}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
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
