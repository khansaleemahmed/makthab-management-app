import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FileText, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { useToast } from '@/components/ui/use-toast';
import { useClasses } from '@/api/reference';
import { useUiStore } from '@/store/uiStore';
import { useDebounce } from '@/lib/useDebounce';
import { formatDate } from '@/lib/format';
import { extractApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useStudents, useDeleteStudent, downloadAdmissionLetter } from './api';
import { StudentForm } from './StudentForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Student } from '@/types/domain';

export function StudentsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState<string>('all');
  const [status, setStatus] = useState<string>('active');
  const q = useDebounce(search);
  const role = useAuthStore((s) => s.user?.role);
  const academicYearId = useUiStore((s) => s.academicYearId);

  const { data: classes } = useClasses();
  const del = useDeleteStudent();

  const { data, isLoading, isError, refetch } = useStudents({
    q: q || undefined,
    class_id: classId !== 'all' ? Number(classId) : undefined,
    status: status !== 'all' ? status : undefined,
    academicYearId: academicYearId ?? undefined,
  });

  const canManage = role === 'Admin';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast({ title: t('students.deleted'), variant: 'success' });
        setDeleting(null);
      },
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  };

  const handleLetter = async (s: Student) => {
    try {
      await downloadAdmissionLetter(s);
    } catch (err) {
      toast({ title: extractApiError(err).message, variant: 'destructive' });
    }
  };

  return (
    <>
      <PageHeader
        title={t('students.title')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('students.admit')}
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingRows cols={6} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('students.admissionNo')}</TableHead>
                  <TableHead>{t('students.fullName')}</TableHead>
                  <TableHead>{t('students.fatherName')}</TableHead>
                  <TableHead>{t('students.class')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-end">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.admissionNo}</TableCell>
                    <TableCell>{s.fullName}</TableCell>
                    <TableCell>{s.fatherName}</TableCell>
                    <TableCell>{s.class?.name ?? s.classId}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>
                        {t(`common.${s.status === 'active' ? 'active' : 'inactive'}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title={t('students.admissionLetter')} onClick={() => handleLetter(s)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.edit')}
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.delete')}
                              onClick={() => setDeleting(s)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {data && data.items.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.total} · {formatDate(new Date(), i18n.language)}
            </p>
          )}
        </CardContent>
      </Card>

      <StudentForm open={formOpen} onOpenChange={setFormOpen} student={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={confirmDelete}
        title={t('students.confirmDeleteTitle')}
        message={t('students.confirmDelete', { name: deleting?.fullName ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        pending={del.isPending}
      />
    </>
  );
}
