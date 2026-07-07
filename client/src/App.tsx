import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth, RequireRole } from '@/components/RequireAuth';
import { Toaster } from '@/components/ui/toaster';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { StudentsPage } from '@/features/students/StudentsPage';
import { ClassesPage } from '@/features/classes/ClassesPage';
import { FeesPage } from '@/features/fees/FeesPage';
import { AttendancePage } from '@/features/attendance/AttendancePage';
import { FinancePage } from '@/features/finance/FinancePage';
import { ReportsPage } from '@/features/reports/ReportsPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />

            <Route element={<RequireRole roles={['Admin']} />}>
              <Route path="classes" element={<ClassesPage />} />
            </Route>

            <Route element={<RequireRole roles={['Admin', 'Accountant']} />}>
              <Route path="fees" element={<FeesPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route element={<RequireRole roles={['Admin', 'Teacher']} />}>
              <Route path="attendance" element={<AttendancePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
