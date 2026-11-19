import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import type { UserRole } from '../types';

interface AppLayoutProps {
  /** Role the page is meant for. Mismatching users are redirected to their own area. */
  role: UserRole;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppLayout({ role, title, subtitle, actions, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, ready } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Guard: wait for the session to resolve so a signed-in user is never bounced during the first load.
  useEffect(() => {
    if (!ready) return;
    if (!data.activeRole) {
      navigate('/app/login', { replace: true });
    } else if (data.activeRole !== role) {
      // Owners and managers share screens, so a notification link for one lands on the other's equivalent
      // page. Anything else (owner-only pages, tenant pages) goes to the user's own home.
      const staff = (r: string) => r === 'owner' || r === 'manager';
      const page = location.pathname.split('/')[3];
      const shared = ['rooms', 'tenants', 'documents', 'expenses', 'invoices', 'food', 'complaints', 'exports'];
      const canMap = staff(role) && staff(data.activeRole) && shared.includes(page);
      navigate(canMap ? `/app/${data.activeRole}/${page}` : `/app/${data.activeRole}`, { replace: true });
    }
  }, [ready, data.activeRole, role, navigate, location.pathname]);

  if (!ready || data.activeRole !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-dark-500">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar role={role} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {(title || actions) && (
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                <div className="min-w-0">
                  {title && <h1 className="text-2xl font-bold text-dark-900 tracking-tight">{title}</h1>}
                  {subtitle && <p className="text-sm text-dark-500 mt-1">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
