import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/store/authStore';

/** Gate that redirects unauthenticated users to /login. */
export function RequireAuth() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Gate that restricts a route subtree to specific roles. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
