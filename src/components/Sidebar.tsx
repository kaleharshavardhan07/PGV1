import { NavLink } from 'react-router-dom';
import { X, Home, Zap, MessageSquare, UtensilsCrossed, User, DoorOpen, Users, Settings, Bell, FileText, Building2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number }>;
}

const staffNav = (role: 'owner' | 'manager'): NavItem[] => [
  { to: `/app/${role}`, label: 'Dashboard', icon: Home },
  { to: `/app/${role}/rooms`, label: 'Rooms & Beds', icon: DoorOpen },
  { to: `/app/${role}/tenants`, label: 'Tenants', icon: Users },
  { to: `/app/${role}/documents`, label: 'Documents', icon: FileText },
  { to: `/app/${role}/meter`, label: 'Electricity', icon: Zap },
  { to: `/app/${role}/complaints`, label: 'Complaints', icon: MessageSquare },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  ...(role === 'owner' ? [{ to: '/app/owner/settings', label: 'Settings', icon: Settings }] : []),
];

const tenantNav: NavItem[] = [
  { to: '/app/tenant', label: 'Home', icon: Home },
  { to: '/app/tenant/documents', label: 'My Documents', icon: FileText },
  { to: '/app/tenant/electricity', label: 'Electricity', icon: Zap },
  { to: '/app/tenant/complaints', label: 'Complaints', icon: MessageSquare },
  { to: '/app/tenant/food', label: 'Food Menu', icon: UtensilsCrossed },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/tenant/profile', label: 'Profile', icon: User },
];

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const { data } = useAppStore();
  const items = role === 'tenant' ? tenantNav : staffNav(role);
  const unread = data.notifications.filter((n) => !n.read).length;

  return (
    <>
      {open && <div className="fixed inset-0 bg-dark-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-64 bg-white border-r border-dark-200 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-dark-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
              <Building2 size={17} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-dark-900 leading-tight">Aapka PG</div>
              <div className="text-[11px] text-dark-400 capitalize leading-tight">{role} portal</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="lg:hidden p-1.5 rounded-lg hover:bg-dark-100 text-dark-500">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === `/app/${role}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-dark-600 hover:bg-dark-100 hover:text-dark-900'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                  {to === '/app/notifications' && unread > 0 && (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-white min-w-[20px] text-center">{unread}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-dark-200 text-xs text-dark-400 truncate">{data.settings.name}</div>
      </aside>
    </>
  );
}
