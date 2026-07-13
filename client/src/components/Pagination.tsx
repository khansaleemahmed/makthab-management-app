import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export const DEFAULT_PAGE_SIZE = 50;

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({ page, limit, total, onPageChange, onLimitChange }: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('pagination.rowsPerPage')}</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-9 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {t('pagination.range', { from, to, total })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title={t('pagination.previous')}
            aria-label={t('pagination.previous')}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title={t('pagination.next')}
            aria-label={t('pagination.next')}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}
