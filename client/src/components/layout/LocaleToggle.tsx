import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/uiStore';
import { applyLocale } from '@/i18n';

/** Toggles between English (LTR) and Arabic (RTL). */
export function LocaleToggle() {
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);

  const toggle = () => {
    const next = locale === 'en' ? 'ar' : 'en';
    setLocale(next);
    applyLocale(next);
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-2">
      <Languages className="h-4 w-4" />
      <span>{locale === 'en' ? 'العربية' : 'English'}</span>
    </Button>
  );
}
