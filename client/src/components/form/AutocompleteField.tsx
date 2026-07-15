import * as React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Field } from './Field';
import type { Option } from './SelectField';

interface AutocompleteFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  /** Message shown when the query matches no options. Defaults to common.noResults. */
  emptyText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * RHF-controlled type-to-filter picker. A text Input filters an Option[] list
 * as you type and shows a dropdown of matches; selecting one sets the field
 * value (the Option's `value`). Keyboard nav (up/down/enter/esc), click-select,
 * closes on outside click, and shows the selected label when a value is set.
 * A lightweight, accessible replacement for stuffing hundreds of items into a
 * plain Select. RTL-safe (start-/end- utilities only).
 */
export function AutocompleteField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  emptyText,
  error,
  required,
  disabled,
}: AutocompleteFieldProps<T>) {
  return (
    <Field label={label} error={error} required={required}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <AutocompleteControl
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            options={options}
            placeholder={placeholder}
            emptyText={emptyText}
            disabled={disabled}
          />
        )}
      />
    </Field>
  );
}

interface ControlProps {
  value: unknown;
  onChange: (value: Option['value']) => void;
  onBlur: () => void;
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

function AutocompleteControl({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  emptyText,
  disabled,
}: ControlProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = React.useId();

  const selected = React.useMemo(
    () =>
      value == null || value === ''
        ? undefined
        : options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Input shows the live query while open, otherwise the selected label.
  const inputText = open ? query : selected?.label ?? '';

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  // Keep the highlighted option in view.
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openList = () => {
    if (disabled) return;
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  };

  const select = (opt: Option) => {
    onChange(opt.value);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[activeIndex]) select(filtered[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="pe-9"
        placeholder={placeholder}
        disabled={disabled}
        value={inputText}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <ChevronsUpDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              {emptyText ?? t('common.noResults')}
            </li>
          ) : (
            filtered.map((o, i) => {
              const isSelected = selected?.value === o.value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(o)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pe-8 ps-2 text-sm outline-none',
                    i === activeIndex && 'bg-accent text-accent-foreground',
                  )}
                >
                  {o.label}
                  {isSelected && (
                    <span className="absolute end-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
