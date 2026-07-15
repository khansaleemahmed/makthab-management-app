import { useMemo } from 'react';
import { useStudents } from './api';
import type { Option } from '@/components/form/SelectField';

/**
 * Provides student options for pickers. Loads a large page and filters
 * client-side; adequate for a single madrasa's roster size.
 */
export function useStudentOptions(): { options: Option[]; isLoading: boolean } {
  const { data, isLoading } = useStudents({ status: 'active', limit: 200 });
  const options = useMemo<Option[]>(
    () =>
      (data?.items ?? []).map((s) => ({
        value: s.id,
        label: `${s.admissionNo} — ${s.fullName}`,
      })),
    [data],
  );
  return { options, isLoading };
}
