import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, RotateCcw, ChevronRight, Building2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import type { UserRole } from '../types';
import { initialsOf, formatRelative } from '../utils/format';
import { Link } from 'react-router-dom';
import { getPlan } from '../data/plans';

interface TopBarProps {
  role: UserRole;
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

export default function TopBar({ role, onMenuClick, title, subtitle }: TopBarProps) {
  const { data, login, logout, markAllNotificationsRead, markNotificationRead, resetData } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const userId = role === 'tenant' ? data.activeTenantId : role === 'manager' ? 'manager' : 'owner';
  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);
  const tenantUser = data.platform.tenantUsers.find((u) => u.id === data.activeTenantUserId);
  const displayName =
    role === 'tenant'
      ? tenantUser?.fullName ?? tenant?.fullName ?? 'Tenant'
      : role === 'manager'
      ? 'PG Manager'
      : data.settings.ownerName;

  const myNotifications = data.notifications
    .filter(
      (n) =>
        n.userRole === role &&
        (n.userId === userId ||
          (role === 'tenant' && n.userId === data.activeTenantUserId) ||
          n.userId === 'all')
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = myNotifications.filter((n) => !n.read).length;

  const sub = data.subscription;
  const subPill =
    role === 'owner'
      ? {
          label: `${getPlan(sub.planId).name} · ${sub.status}`,
          warn: ['Payment Pending', 'Past Due', 'Suspended', 'Expired'].includes(sub.status),
          trial: sub.status === 'Trial',
        }
      : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const switchRole = (target: UserRole) => {
    login(target);
    navigate(`/app/${target}`);
  };

  return (
    <header className="bg-white border-b border-background-300 px-4 lg:px-8 py-3 flex items-center gap-3 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl hover:bg-background-200 text-dark-600"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        {title ? (
          <>
            <div className="text-xs text-dark-400 hidden sm:block">{data.settings.name}</div>
            <div className="font-semibold text-dark-800 truncate">{title}</div>
            {subtitle && <div className="text-xs text-dark-500 truncate">{subtitle}</div>}
          </>
        ) : (
          <div className="font-semibold text-dark-800">Welcome back, {displayName.split(' ')[0]}</div>
        )}
      </div>

      {/* Subscription pill (owner only) */}
      {subPill && (
        <button
          onClick={() => navigate('/app/owner/subscription')}
          title="Manage subscription"
          className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
            subPill.warn
              ? 'bg-error-light text-error hover:bg-error hover:text-white'
              : subPill.trial
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'bg-success-light text-success hover:bg-success hover:text-white'
          }`}
        >
          <CreditCard size={13} />
          {subPill.label}
        </button>
      )}

      {/* Role switcher (demo) */}
      <div className="hidden md:flex items-center bg-background-200 rounded-xl p-1 text-xs font-medium">
        {(['tenant', 'manager', 'owner'] as UserRole[]).map((r) => (
          <button
            key={r}
            onClick={() => switchRole(r)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
              role === r ? 'bg-white text-primary shadow-soft' : 'text-dark-500 hover:text-dark-800'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-xl hover:bg-background-200 text-dark-600"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-error text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-background-300 rounded-2xl shadow-glow overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-300">
              <div className="font-semibold text-sm text-dark-800">Notifications</div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsRead(userId, role)}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {myNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-dark-400">No notifications</div>
              ) : (
                myNotifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.link) {
                        navigate(n.link);
                        setNotifOpen(false);
                      }
                    }}
                    className={`px-4 py-3 border-b border-background-300 cursor-pointer hover:bg-background-200 ${
                      !n.read ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'success'
                            ? 'bg-success'
                            : n.type === 'warning'
                            ? 'bg-warning'
                            : n.type === 'error'
                            ? 'bg-error'
                            : 'bg-primary'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-dark-800">{n.title}</div>
                        <div className="text-xs text-dark-500 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[11px] text-dark-400 mt-1">{formatRelative(n.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/app/notifications"
              onClick={() => setNotifOpen(false)}
              className="block text-center py-2.5 text-xs font-medium text-primary border-t border-background-300 hover:bg-background-200"
            >
              View all notifications
            </Link>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserOpen(!userOpen)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-background-200"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold text-xs flex items-center justify-center">
            {initialsOf(displayName)}
          </div>
          <ChevronRight size={14} className={`text-dark-400 transition-transform ${userOpen ? 'rotate-90' : ''}`} />
        </button>
        {userOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-background-300 rounded-2xl shadow-glow overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-background-300">
              <div className="font-semibold text-sm text-dark-800">{displayName}</div>
              <div className="text-xs text-dark-500 capitalize">{role}</div>
            </div>
            <button
              onClick={() => {
                navigate(role === 'tenant' ? '/app/tenant/profile' : role === 'manager' ? '/app/manager/tenants' : '/app/owner/settings');
                setUserOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark-700 hover:bg-background-200"
            >
              <Building2 size={14} /> {data.settings.name}
            </button>
            <button
              onClick={() => {
                if (confirm('Reset all demo data back to defaults?')) {
                  resetData();
                  setUserOpen(false);
                }
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark-700 hover:bg-background-200"
            >
              <RotateCcw size={14} /> Reset Demo Data
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-light border-t border-background-300"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
