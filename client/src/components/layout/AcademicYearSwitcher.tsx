import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicYears } from '@/api/reference';
import { useUiStore } from '@/store/uiStore';

/** Header control that selects the active academic year used to scope queries. */
export function AcademicYearSwitcher() {
  const { t } = useTranslation();
  const { data: years } = useAcademicYears();
  const academicYearId = useUiStore((s) => s.academicYearId);
  const setAcademicYearId = useUiStore((s) => s.setAcademicYearId);

  // Default to the active year once the list loads.
  useEffect(() => {
    if (academicYearId == null && years && years.length > 0) {
      const active = years.find((y) => y.isActive) ?? years[0];
      setAcademicYearId(active.id);
    }
  }, [years, academicYearId, setAcademicYearId]);

  if (!years || years.length === 0) return null;

  return (
    <Select
      value={academicYearId ? String(academicYearId) : undefined}
      onValueChange={(v) => setAcademicYearId(Number(v))}
    >
      <SelectTrigger className="h-9 w-[150px]" aria-label={t('common.academicYear')}>
        <SelectValue placeholder={t('common.academicYear')} />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y.id} value={String(y.id)}>
            {y.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
