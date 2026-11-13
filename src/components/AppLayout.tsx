import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { UserRole } from '../types';

interface AppLayoutProps {
  role: UserRole;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

// Tenant routes that don't require an APPROVED + ACTIVE membership
const TENANT_OPEN_ROUTES = ['/app/tenant/admission', '/app/notifications'];

export default function AppLayout({ role, title, subtitle, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, syncTenantSession } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if no role selected
  useEffect(() => {
    if (!data.activeRole) {
      navigate('/app/login');
    } else if (data.activeRole !== role) {
      navigate(`/app/${data.activeRole}`);
    }
  }, [data.activeRole, role, navigate]);

  // Access control: tenants without an approved, active membership may only
  // reach the admission status / notifications screens. The membership check
  // reads the platform registry (server-side equivalent), not just UI state.
  useEffect(() => {
    if (role !== 'tenant' || !data.activeRole) return;
    const membership = data.platform.memberships.find(
      (m) =>
        m.pgId === data.activePgId &&
        m.tenantUserId === data.activeTenantUserId &&
        m.status === 'Active'
    );
    if (membership) {
      // Keep the active tenant record aligned with the approved membership
      if (membership.tenantId !== data.activeTenantId) syncTenantSession();
      return;
    }
    const path = location.pathname;
    const isOpen = TENANT_OPEN_ROUTES.some((r) => path.startsWith(r));
    if (!isOpen) {
      navigate('/app/tenant/admission', { replace: true });
    }
  }, [role, data.activeRole, data.platform.memberships, data.activePgId, data.activeTenantUserId, data.activeTenantId, location.pathname, navigate, syncTenantSession]);

  return (
    <div className="min-h-screen bg-background-200 flex">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar role={role} onMenuClick={() => setSidebarOpen(true)} title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
