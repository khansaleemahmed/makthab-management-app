import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/uiStore';
import { AcademicYearSwitcher } from './AcademicYearSwitcher';
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <AcademicYearSwitcher />
      <LocaleToggle />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
