import { NavLink, useLocation } from 'react-router-dom';
import { X, Home, Wallet, Zap, MessageSquare, UtensilsCrossed, User, DoorOpen, TrendingUp, BedDouble, Users, Settings, Bell, CreditCard, UserPlus, KeyRound } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ size?: number }>;
  badge?: number;
}

const tenantNav: NavItem[] = [
  { to: '/app/tenant', label: 'Dashboard', icon: Home },
  { to: '/app/tenant/rent', label: 'Rent', icon: Wallet },
  { to: '/app/tenant/electricity', label: 'Electricity', icon: Zap },
  { to: '/app/tenant/complaints', label: 'Complaints', icon: MessageSquare },
  { to: '/app/tenant/food', label: 'Food Menu', icon: UtensilsCrossed },
  { to: '/app/tenant/profile', label: 'Profile', icon: User },
  { to: '/app/tenant/admission', label: 'My PG Access', icon: KeyRound },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
];

const managerNav: NavItem[] = [
  { to: '/app/manager', label: 'Dashboard', icon: Home },
  { to: '/app/manager/rooms', label: 'Rooms & Beds', icon: DoorOpen },
  { to: '/app/manager/meter', label: 'Meter Readings', icon: Zap },
  { to: '/app/manager/complaints', label: 'Complaints', icon: MessageSquare },
  { to: '/app/manager/tenants', label: 'Tenants', icon: Users },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
];

const ownerNav: NavItem[] = [
  { to: '/app/owner', label: 'Dashboard', icon: Home },
  { to: '/app/owner/admissions', label: 'Admission Requests', icon: UserPlus },
  { to: '/app/owner/tenants', label: 'Tenants', icon: Users },
  { to: '/app/owner/finance', label: 'Rent & Deposits', icon: TrendingUp },
  { to: '/app/owner/beds', label: 'Bed Availability', icon: BedDouble },
  { to: '/app/owner/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/owner/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const items = role === 'tenant' ? tenantNav : role === 'manager' ? managerNav : ownerNav;
  const location = useLocation();
  const { data } = useAppStore();

  // Unread notifications badge for this role
  const userId = role === 'tenant' ? data.activeTenantId : 'all';
  const unread = data.notifications.filter(
    (n) =>
      n.userRole === role &&
      (n.userId === userId || (role === 'tenant' && n.userId === data.activeTenantUserId) || n.userId === 'all') &&
      !n.read
  ).length;

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-dark-900/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-background-300 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-background-300">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <div className="font-bold text-dark-800">Aapka PG</div>
              <div className="text-xs text-dark-400 capitalize">{role}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-background-200 text-dark-500"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to ||
                (item.to !== `/app/${role}` && location.pathname.startsWith(item.to));
              const showBadge = item.to === '/app/notifications' && unread > 0;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-dark-600 hover:bg-background-200'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                    {showBadge && (
                      <span
                        className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-white text-primary' : 'bg-error text-white'
                        }`}
                      >
                        {unread}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-background-300">
          <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-4 text-white">
            <div className="font-semibold text-sm mb-1">Need help?</div>
            <div className="text-xs opacity-90 mb-3">
              Reach out to our support team anytime.
            </div>
            <a
              href="https://wa.me/919167263576"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-xs font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
