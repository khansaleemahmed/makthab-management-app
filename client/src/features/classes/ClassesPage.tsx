import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingRows, ErrorState, EmptyState } from '@/components/QueryState';
import { useToast } from '@/components/ui/use-toast';
import { useClasses, useDeleteClass } from '@/api/reference';
import { useStaff } from '@/features/finance/api';
import { extractApiError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { ClassForm } from './ClassForm';
import type { Class } from '@/types/domain';

export function ClassesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const role = useAuthStore((s) => s.user?.role);

  const { data, isLoading, isError, refetch } = useClasses();
  const { data: staff } = useStaff();
  const del = useDeleteClass();

  const canManage = role === 'Admin';

  const teacherName = useMemo(() => {
    const map = new Map((staff ?? []).map((s) => [s.id, s.fullName]));
    return (id?: number | null) => (id != null ? map.get(id) ?? String(id) : '—');
  }, [staff]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: Class) => {
    setEditing(c);
    setFormOpen(true);
  };

  const handleDelete = (c: Class) => {
    del.mutate(c.id, {
      onSuccess: () => toast({ title: t('common.delete'), variant: 'success' }),
      onError: (err) => toast({ title: extractApiError(err).message, variant: 'destructive' }),
    });
  };

  return (
    <>
      <PageHeader
        title={t('classes.title')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('classes.add')}
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <LoadingRows cols={3} />
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : !data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('classes.name')}</TableHead>
                  <TableHead>{t('classes.teacher')}</TableHead>
                  <TableHead className="text-end">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{teacherName(c.teacherId)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.edit')}
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={t('common.delete')}
                              onClick={() => handleDelete(c)}
                              disabled={del.isPending}
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
        </CardContent>
      </Card>

      <ClassForm open={formOpen} onOpenChange={setFormOpen} classItem={editing} />
    </>
  );
}
