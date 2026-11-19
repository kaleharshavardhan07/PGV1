import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicVacancyPage from './pages/PublicVacancyPage';
import NotificationsPage from './pages/NotificationsPage';
import StaffDashboard from './pages/StaffDashboard';
import RoomsBedsPage from './pages/RoomsBedsPage';
import TenantsPage from './pages/TenantsPage';
import DocumentsPage from './pages/DocumentsPage';
import ManagerMeterPage from './pages/ManagerMeterPage';
import ManagerComplaintsPage from './pages/ManagerComplaintsPage';
import OwnerSettingsPage from './pages/OwnerSettingsPage';
import TenantDashboard from './pages/TenantDashboard';
import TenantElectricityPage from './pages/TenantElectricityPage';
import TenantComplaintsPage from './pages/TenantComplaintsPage';
import TenantFoodPage from './pages/TenantFoodPage';
import TenantProfilePage from './pages/TenantProfilePage';
import { useAppStore } from './store/appStore';

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
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/vacancy" element={<PublicVacancyPage />} />

          {/* Owner & manager share the same screens; the owner can additionally edit rooms and see settings */}
          {(['owner', 'manager'] as const).map((r) => [
            <Route key={`${r}-home`} path={`/app/${r}`} element={<StaffDashboard role={r} />} />,
            <Route key={`${r}-rooms`} path={`/app/${r}/rooms`} element={<RoomsBedsPage role={r} />} />,
            <Route key={`${r}-tenants`} path={`/app/${r}/tenants`} element={<TenantsPage role={r} />} />,
            <Route key={`${r}-docs`} path={`/app/${r}/documents`} element={<DocumentsPage role={r} />} />,
            <Route key={`${r}-meter`} path={`/app/${r}/meter`} element={<ManagerMeterPage role={r} />} />,
            <Route key={`${r}-complaints`} path={`/app/${r}/complaints`} element={<ManagerComplaintsPage role={r} />} />,
          ])}
          <Route path="/app/owner/settings" element={<OwnerSettingsPage />} />

          {/* Tenant */}
          <Route path="/app/tenant" element={<TenantDashboard />} />
          <Route path="/app/tenant/documents" element={<DocumentsPage role="tenant" />} />
          <Route path="/app/tenant/electricity" element={<TenantElectricityPage />} />
          <Route path="/app/tenant/complaints" element={<TenantComplaintsPage />} />
          <Route path="/app/tenant/food" element={<TenantFoodPage />} />
          <Route path="/app/tenant/profile" element={<TenantProfilePage />} />

          {/* Shared */}
          <Route path="/app/notifications" element={<NotificationsPage />} />

          <Route path="/app" element={<Navigate to="/app/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
