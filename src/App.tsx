import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import FeatureGate from './components/FeatureGate';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
import FindPgPage from './pages/FindPgPage';
const PgDetailPage = lazy(() => import('./pages/PgDetailPage'));
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import StaffDashboard from './pages/StaffDashboard';
import RoomsBedsPage from './pages/RoomsBedsPage';
import TenantsPage from './pages/TenantsPage';
import DocumentsPage from './pages/DocumentsPage';
import ExpensesPage from './pages/ExpensesPage';
import InvoicesPage from './pages/InvoicesPage';
import FoodManagePage from './pages/FoodManagePage';
import ManagersPage from './pages/ManagersPage';
import EnquiriesPage from './pages/EnquiriesPage';
import ExportsPage from './pages/ExportsPage';
import ManagerComplaintsPage from './pages/ManagerComplaintsPage';
const OwnerSettingsPage = lazy(() => import('./pages/OwnerSettingsPage'));
import TenantDashboard from './pages/TenantDashboard';
import TenantComplaintsPage from './pages/TenantComplaintsPage';
import TenantFoodPage from './pages/TenantFoodPage';
import TenantProfilePage from './pages/TenantProfilePage';
import { useAppStore } from './store/appStore';

/** Old shareable links (/vacancy?pg=name) keep working. */
function LegacyVacancyRedirect() {
  const [sp] = useSearchParams();
  const pg = sp.get('pg');
  return <Navigate to={pg ? `/find-pg/${pg}` : '/find-pg'} replace />;
}

function App() {
  const { runNotificationEngine, session } = useAppStore();

  // Run the (idempotent) notification engine once per staff session.
  const role = session?.role;
  useEffect(() => {
    if (role === 'owner' || role === 'manager') runNotificationEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <ToastProvider>
      <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-dark-500" role="status">Loading…</div>}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage adminMode />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/find-pg" element={<FindPgPage />} />
          <Route path="/find-pg/:username" element={<PgDetailPage />} />
          <Route path="/vacancy" element={<LegacyVacancyRedirect />} />

          {/* Platform admin */}
          <Route path="/app/admin" element={<AdminPage />} />

          {/* Owner & manager share screens; every page enforces the same feature/permission rules as the API */}
          {(['owner', 'manager'] as const).map((r) => [
            <Route key={`${r}-home`} path={`/app/${r}`} element={<StaffDashboard role={r} />} />,
            <Route key={`${r}-rooms`} path={`/app/${r}/rooms`} element={<RoomsBedsPage role={r} />} />,
            <Route key={`${r}-tenants`} path={`/app/${r}/tenants`} element={<FeatureGate role={r} permission="tenants" title="Tenants"><TenantsPage role={r} /></FeatureGate>} />,
            <Route key={`${r}-docs`} path={`/app/${r}/documents`} element={<FeatureGate role={r} feature="documents" permission="documents" title="Documents"><DocumentsPage role={r} /></FeatureGate>} />,
            <Route key={`${r}-expenses`} path={`/app/${r}/expenses`} element={<ExpensesPage role={r} />} />,
            <Route key={`${r}-invoices`} path={`/app/${r}/invoices`} element={<InvoicesPage role={r} />} />,
            <Route key={`${r}-food`} path={`/app/${r}/food`} element={<FoodManagePage role={r} />} />,
            <Route key={`${r}-complaints`} path={`/app/${r}/complaints`} element={<FeatureGate role={r} feature="complaints" permission="complaints" title="Complaints"><ManagerComplaintsPage role={r} /></FeatureGate>} />,
            <Route key={`${r}-exports`} path={`/app/${r}/exports`} element={<ExportsPage role={r} />} />,
          ])}
          <Route path="/app/owner/managers" element={<ManagersPage />} />
          <Route path="/app/owner/enquiries" element={<EnquiriesPage />} />
          <Route path="/app/owner/settings" element={<OwnerSettingsPage />} />

          {/* Tenant */}
          <Route path="/app/tenant" element={<TenantDashboard />} />
          <Route path="/app/tenant/documents" element={<FeatureGate role="tenant" feature="documents" title="My Documents"><DocumentsPage role="tenant" /></FeatureGate>} />
          <Route path="/app/tenant/expenses" element={<ExpensesPage role="tenant" />} />
          <Route path="/app/tenant/invoices" element={<InvoicesPage role="tenant" />} />
          <Route path="/app/tenant/complaints" element={<FeatureGate role="tenant" feature="complaints" title="Complaints"><TenantComplaintsPage /></FeatureGate>} />
          <Route path="/app/tenant/food" element={<FeatureGate role="tenant" feature="food" title="Food Menu"><TenantFoodPage /></FeatureGate>} />
          <Route path="/app/tenant/profile" element={<TenantProfilePage />} />

          {/* Shared */}
          <Route path="/app/notifications" element={<NotificationsPage />} />

          <Route path="/app" element={<Navigate to="/app/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
