import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortOrder = 'asc' | 'desc';

export interface SortState {
  sortBy: string;
  sortOrder: SortOrder;
}

/**
 * Sort state for a list. Clicking the active column toggles asc/desc;
 * clicking a new column selects it (starting asc). Feeds sortBy/sortOrder
 * straight into a list query's params.
 */
export function useSort(initial: SortState) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (sortBy: string) =>
    setSort((prev) =>
      prev.sortBy === sortBy
        ? { sortBy, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }
        : { sortBy, sortOrder: 'asc' },
    );
  return { sort, toggle, setSort };
}

interface Props {
  sortKey: string;
  sort: SortState;
  onSort: (sortKey: string) => void;
  children: ReactNode;
  className?: string;
}

export function SortableTableHead({ sortKey, sort, onSort, children, className }: Props) {
  const active = sort.sortBy === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.sortOrder === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-sort={active ? (sort.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(
          'inline-flex items-center gap-1.5 select-none hover:text-foreground transition-colors',
          active && 'text-foreground',
        )}
      >
        {children}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', !active && 'opacity-50')} />
      </button>
    </TableHead>
  );
}
