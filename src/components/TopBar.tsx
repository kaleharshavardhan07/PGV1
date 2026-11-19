import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, ChevronDown, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import type { UserRole } from '../types';
import { initialsOf, formatRelative } from '../utils/format';

interface TopBarProps {
  role: UserRole;
  onMenuClick: () => void;
}

const dot = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error', info: 'bg-primary' } as const;

export default function TopBar({ role, onMenuClick }: TopBarProps) {
  const { data, session, logout, markAllNotificationsRead, markNotificationRead } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const user = (session?.user ?? {}) as Record<string, string | undefined>;
  const displayName =
    role === 'owner' ? user.ownerName ?? data.settings.ownerName : user.fullName ?? data.tenants[0]?.fullName ?? 'User';
  const unread = data.notifications.filter((n) => !n.read);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const profilePath = role === 'tenant' ? '/app/tenant/profile' : '/app/owner/settings';

  return (
    <header className="bg-white/90 backdrop-blur border-b border-dark-200 px-4 lg:px-8 h-16 flex items-center gap-3 sticky top-0 z-20">
      <button onClick={onMenuClick} aria-label="Open menu" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-dark-100 text-dark-600">
        <Menu size={20} />
      </button>
      <div className="flex-1 min-w-0 text-sm text-dark-500 truncate">
        <span className="font-semibold text-dark-800">{data.settings.name}</span>
      </div>

      <div className="relative" ref={notifRef}>
        <button onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications" className="relative p-2 rounded-lg hover:bg-dark-100 text-dark-600">
          <Bell size={19} />
          {unread.length > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-primary text-white text-[10px] font-semibold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
              {unread.length}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-dark-200 rounded-xl shadow-glow overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-200">
              <div className="font-semibold text-sm text-dark-800">Notifications</div>
              {unread.length > 0 && (
                <button onClick={() => markAllNotificationsRead()} className="text-xs text-primary font-medium hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-dark-400">You're all caught up</div>
              ) : (
                data.notifications.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.link) navigate(n.link);
                      setNotifOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-dark-100 last:border-0 hover:bg-dark-50 ${!n.read ? 'bg-primary-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-dark-200' : dot[n.type]}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-dark-800">{n.title}</div>
                        <div className="text-xs text-dark-500 mt-0.5 line-clamp-2">{n.message}</div>
                        <div className="text-[11px] text-dark-400 mt-1">{formatRelative(n.createdAt)}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <Link to="/app/notifications" onClick={() => setNotifOpen(false)} className="block text-center py-2.5 text-xs font-medium text-primary border-t border-dark-200 hover:bg-dark-50">
              View all
            </Link>
          </div>
        )}
      </div>

      <div className="relative" ref={userRef}>
        <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-dark-100">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center">{initialsOf(displayName || 'U')}</div>
          <ChevronDown size={14} className={`text-dark-400 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
        </button>
        {userOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-dark-200 rounded-xl shadow-glow overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-dark-200">
              <div className="font-semibold text-sm text-dark-800 truncate">{displayName}</div>
              <div className="text-xs text-dark-500 capitalize">{role}</div>
            </div>
            <button
              onClick={() => { navigate(profilePath); setUserOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50"
            >
              <KeyRound size={14} /> {role === 'tenant' ? 'Profile & password' : 'Settings'}
            </button>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-light border-t border-dark-200"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
