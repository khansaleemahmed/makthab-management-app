import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from './Field';

export interface Option {
  value: string | number;
  label: string;
}

interface SelectFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

/** RHF-controlled wrapper around the shadcn Select. */
export function SelectField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  error,
  required,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} error={error} required={required}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value != null && field.value !== '' ? String(field.value) : undefined}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder ?? '—'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}
