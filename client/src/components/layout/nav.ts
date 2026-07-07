import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Receipt,
  CalendarCheck,
  Wallet,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/store/authStore';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Empty = all authenticated users. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/students', labelKey: 'nav.students', icon: Users },
  { to: '/classes', labelKey: 'nav.classes', icon: GraduationCap, roles: ['Admin'] },
  { to: '/fees', labelKey: 'nav.fees', icon: Receipt, roles: ['Admin', 'Accountant'] },
  { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, roles: ['Admin', 'Teacher'] },
  { to: '/finance', labelKey: 'nav.finance', icon: Wallet, roles: ['Admin', 'Accountant'] },
  { to: '/reports', labelKey: 'nav.reports', icon: FileBarChart, roles: ['Admin', 'Accountant'] },
];

export function visibleNavItems(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
