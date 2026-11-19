import { NavLink } from 'react-router-dom';
import {
  X, Home, MessageSquare, UtensilsCrossed, User, DoorOpen, Users, Settings, Bell, FileText, Building2, Receipt, Wallet,
  UserCog, Inbox, Download, ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Feature, Permission, UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number }>;
  feature?: Feature;
  permission?: Permission;
  ownerOnly?: boolean;
}

const staffNav = (role: 'owner' | 'manager'): NavItem[] => [
  { to: `/app/${role}`, label: 'Dashboard', icon: Home },
  { to: `/app/${role}/rooms`, label: 'Rooms & Beds', icon: DoorOpen, feature: 'rooms' },
  { to: `/app/${role}/tenants`, label: 'Tenants', icon: Users, permission: 'tenants' },
  { to: `/app/${role}/documents`, label: 'Documents', icon: FileText, feature: 'documents', permission: 'documents' },
  { to: `/app/${role}/expenses`, label: 'Expenses', icon: Wallet, feature: 'expenses', permission: 'expenses' },
  { to: `/app/${role}/invoices`, label: 'Invoices', icon: Receipt, feature: 'billing', permission: 'billing' },
  { to: `/app/${role}/food`, label: 'Food Menu', icon: UtensilsCrossed, feature: 'food', permission: 'food' },
  { to: `/app/${role}/complaints`, label: 'Complaints', icon: MessageSquare, feature: 'complaints', permission: 'complaints' },
  { to: '/app/owner/enquiries', label: 'Enquiries', icon: Inbox, ownerOnly: true },
  { to: '/app/owner/managers', label: 'Managers', icon: UserCog, ownerOnly: true },
  { to: `/app/${role}/exports`, label: 'Export data', icon: Download, feature: 'exports', permission: 'exports' },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/owner/settings', label: 'Settings', icon: Settings, ownerOnly: true },
];

const tenantNav: NavItem[] = [
  { to: '/app/tenant', label: 'Home', icon: Home },
  { to: '/app/tenant/invoices', label: 'Invoices', icon: Receipt, feature: 'billing' },
  { to: '/app/tenant/expenses', label: 'Expenses', icon: Wallet, feature: 'expenses' },
  { to: '/app/tenant/documents', label: 'My Documents', icon: FileText, feature: 'documents' },
  { to: '/app/tenant/food', label: 'Food Menu', icon: UtensilsCrossed, feature: 'food' },
  { to: '/app/tenant/complaints', label: 'Complaints', icon: MessageSquare, feature: 'complaints' },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/tenant/profile', label: 'Profile', icon: User },
];

const adminNav: NavItem[] = [{ to: '/app/admin', label: 'PGs & features', icon: ShieldCheck }];

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const { data } = useAppStore();
  const unread = data.notifications.filter((n) => !n.read).length;

  // Navigation mirrors what the API will allow: disabled modules and ungranted permissions are hidden.
  const visible = (item: NavItem) => {
    if (item.ownerOnly && role !== 'owner') return false;
    if (item.feature && data.features[item.feature] === false) return false;
    if (item.permission && role !== 'tenant' && role !== 'owner' && !data.permissions[item.permission]) return false;
    return true;
  };
  const items = (role === 'admin' ? adminNav : role === 'tenant' ? tenantNav : staffNav(role)).filter(visible);

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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0"><Building2 size={17} /></div>
            <div className="min-w-0">
              <div className="font-bold text-dark-900 leading-tight">Aapka PG</div>
              <div className="text-[11px] text-dark-400 capitalize leading-tight">{role === 'admin' ? 'Platform admin' : `${role} portal`}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="lg:hidden p-1.5 rounded-lg hover:bg-dark-100 text-dark-500"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
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
                  {to === '/app/owner/enquiries' && data.enquiries.some((e) => e.status === 'New') && <span className="w-2 h-2 rounded-full bg-primary" aria-label="New enquiries" />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-5 py-4 border-t border-dark-200 text-xs text-dark-400 truncate">{role === 'admin' ? 'Aapka PG platform' : data.settings.name}</div>
      </aside>
    </>
  );
}
