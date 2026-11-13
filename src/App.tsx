import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CheckoutPage from './pages/CheckoutPage';
import PublicVacancyPage from './pages/PublicVacancyPage';
import NotificationsPage from './pages/NotificationsPage';
import TenantDashboard from './pages/TenantDashboard';
import TenantRentPage from './pages/TenantRentPage';
import TenantElectricityPage from './pages/TenantElectricityPage';
import TenantComplaintsPage from './pages/TenantComplaintsPage';
import TenantFoodPage from './pages/TenantFoodPage';
import TenantProfilePage from './pages/TenantProfilePage';
import TenantAdmissionPage from './pages/TenantAdmissionPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerRoomsPage from './pages/ManagerRoomsPage';
import ManagerMeterPage from './pages/ManagerMeterPage';
import ManagerComplaintsPage from './pages/ManagerComplaintsPage';
import ManagerTenantsPage from './pages/ManagerTenantsPage';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerBedsPage from './pages/OwnerBedsPage';
import OwnerFinancePage from './pages/OwnerFinancePage';
import OwnerTenantsPage from './pages/OwnerTenantsPage';
import OwnerSettingsPage from './pages/OwnerSettingsPage';
import OwnerSubscriptionPage from './pages/OwnerSubscriptionPage';
import OwnerAdmissionsPage from './pages/OwnerAdmissionsPage';
import { useAppStore } from './store/appStore';

function App() {
  const { runNotificationEngine } = useAppStore();

  // Prototype of the production background scheduler: run the notification
  // automation engine when the app loads (idempotent thanks to dedupe keys).
  useEffect(() => {
    runNotificationEngine();
  }, [runNotificationEngine]);

  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/subscribe" element={<CheckoutPage />} />
          <Route path="/vacancy" element={<PublicVacancyPage />} />

          {/* Tenant routes */}
          <Route path="/app/tenant" element={<TenantDashboard />} />
          <Route path="/app/tenant/rent" element={<TenantRentPage />} />
          <Route path="/app/tenant/electricity" element={<TenantElectricityPage />} />
          <Route path="/app/tenant/complaints" element={<TenantComplaintsPage />} />
          <Route path="/app/tenant/food" element={<TenantFoodPage />} />
          <Route path="/app/tenant/profile" element={<TenantProfilePage />} />
          <Route path="/app/tenant/admission" element={<TenantAdmissionPage />} />

          {/* Manager routes */}
          <Route path="/app/manager" element={<ManagerDashboard />} />
          <Route path="/app/manager/rooms" element={<ManagerRoomsPage />} />
          <Route path="/app/manager/meter" element={<ManagerMeterPage />} />
          <Route path="/app/manager/complaints" element={<ManagerComplaintsPage />} />
          <Route path="/app/manager/tenants" element={<ManagerTenantsPage />} />

          {/* Owner routes */}
          <Route path="/app/owner" element={<OwnerDashboard />} />
          <Route path="/app/owner/beds" element={<OwnerBedsPage />} />
          <Route path="/app/owner/finance" element={<OwnerFinancePage />} />
          <Route path="/app/owner/tenants" element={<OwnerTenantsPage />} />
          <Route path="/app/owner/settings" element={<OwnerSettingsPage />} />
          <Route path="/app/owner/subscription" element={<OwnerSubscriptionPage />} />
          <Route path="/app/owner/admissions" element={<OwnerAdmissionsPage />} />

          {/* Shared */}
          <Route path="/app/notifications" element={<NotificationsPage />} />

          {/* Shortcuts and fallbacks */}
          <Route path="/app" element={<Navigate to="/app/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
