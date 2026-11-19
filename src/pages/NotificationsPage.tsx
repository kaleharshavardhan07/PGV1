// Dedicated Notifications module – history, category filters, delivery log.
// Available to every role; shows only the current role's notifications.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Wallet,
  Receipt,
  MessageSquare,
  Users,
  BedDouble,
  Info,
  CheckCheck,
  ListChecks,
  Smartphone,
  Mail,
  Globe,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAppStore } from '../store/appStore';
import { formatDateTime, formatRelative } from '../utils/format';
import type { NotificationCategory, NotificationChannel } from '../types';

const CATEGORIES: Array<NotificationCategory | 'All'> = [
  'All',
  'Expense',
  'Invoice',
  'Complaint',
  'Tenant',
  'Bed',
  'System',
];

const categoryIcon: Record<NotificationCategory, React.FC<{ size?: number }>> = {
  Expense: Wallet,
  Invoice: Receipt,
  Complaint: MessageSquare,
  Tenant: Users,
  Bed: BedDouble,
  System: Info,
};

const channelIcon: Record<NotificationChannel, React.FC<{ size?: number }>> = {
  'In-App': Smartphone,
  WhatsApp: Globe,
  SMS: Smartphone,
  Email: Mail,
};

const statusStyle: Record<string, string> = {
  Delivered: 'bg-success-light text-success',
  Simulated: 'bg-primary-50 text-primary',
  Retried: 'bg-warning-light text-warning',
  Failed: 'bg-error-light text-error',
  Skipped: 'bg-dark-100 text-dark-400',
};

export default function NotificationsPage() {
  const { data, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const navigate = useNavigate();
  const role = data.activeRole ?? 'tenant';

  const [tab, setTab] = useState<'notifications' | 'log'>('notifications');
  const [category, setCategory] = useState<NotificationCategory | 'All'>('All');

  const notifications = useMemo(
    () =>
      data.notifications
        // The API already returns only what this user may see.
        .filter((n) => category === 'All' || n.category === category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.notifications, category]
  );

  const unread = notifications.filter((n) => !n.read).length;

  const log = useMemo(
    () =>
      data.notificationLog
        .filter((l) => category === 'All' || l.category === category)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.notificationLog, category]
  );

  const openNotification = (id: string, link?: string) => {
    markNotificationRead(id);
    if (link) navigate(link);
  };

  return (
    <AppLayout role={role} title="Notifications">
      <div className="space-y-4 max-w-4xl">
        {/* Tabs + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-background-200 rounded-xl p-1 text-sm font-medium w-fit">
            <button
              onClick={() => setTab('notifications')}
              className={`px-4 py-1.5 rounded-lg transition-colors ${
                tab === 'notifications' ? 'bg-white text-primary shadow-soft' : 'text-dark-500'
              }`}
            >
              Notifications {unread > 0 && (
                <span className="ml-1 bg-error text-white text-[10px] px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </button>
            {role !== 'tenant' && (
              <button
                onClick={() => setTab('log')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${
                  tab === 'log' ? 'bg-white text-primary shadow-soft' : 'text-dark-500'
                }`}
              >
                Delivery Log
              </button>
            )}
          </div>
          {tab === 'notifications' && unread > 0 && (
            <button
              onClick={() => markAllNotificationsRead()}
              className="btn-secondary text-sm"
            >
              <CheckCheck size={16} /> Mark all as read
            </button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === c
                  ? 'bg-primary text-white'
                  : 'bg-white text-dark-500 border border-background-300 hover:border-primary-200'
              }`}
            >
              {c === 'All' ? 'All' : `${c}s`}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {tab === 'notifications' && (
          <div className="card divide-y divide-background-200 overflow-hidden">
            {notifications.length === 0 && (
              <div className="py-16 text-center">
                <Bell size={36} className="mx-auto text-dark-200 mb-3" />
                <div className="text-dark-400 text-sm">No notifications in this category.</div>
              </div>
            )}
            {notifications.map((n) => {
              const Icon = categoryIcon[n.category ?? 'System'];
              return (
                <button
                  key={n.id}
                  onClick={() => openNotification(n.id, n.link ?? undefined)}
                  className={`w-full text-left px-5 py-4 flex gap-4 hover:bg-background-100 transition-colors ${
                    !n.read ? 'bg-primary-50/40' : ''
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      n.type === 'success'
                        ? 'bg-success-light text-success'
                        : n.type === 'warning'
                        ? 'bg-warning-light text-warning'
                        : n.type === 'error'
                        ? 'bg-error-light text-error'
                        : 'bg-primary-50 text-primary'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${n.read ? 'text-dark-700' : 'text-dark-900'}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      {n.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-dark-400 bg-background-200 px-2 py-0.5 rounded-full">
                          {n.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-dark-600 mt-0.5">{n.message}</p>
                    <div className="text-[11px] text-dark-400 mt-1.5" title={formatDateTime(n.createdAt)}>
                      {formatRelative(n.createdAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Delivery log */}
        {tab === 'log' && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <ListChecks size={18} className="text-primary" />
              <h3 className="font-bold text-dark-900">Notification Delivery Log</h3>
            </div>
            <p className="text-xs text-dark-500 mb-4">
              Every automated notification with its channel and delivery status. WhatsApp, SMS and Email are
              simulated — real providers connect through the notification service layer.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-400 border-b border-background-300">
                    <th className="py-2.5 pr-4 font-medium">Notification</th>
                    <th className="py-2.5 pr-4 font-medium">Recipient</th>
                    <th className="py-2.5 pr-4 font-medium">Channel</th>
                    <th className="py-2.5 pr-4 font-medium">Status</th>
                    <th className="py-2.5 pr-4 font-medium">Attempts</th>
                    <th className="py-2.5 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {log.slice(0, 50).map((l) => {
                    const ChIcon = channelIcon[l.channel];
                    return (
                      <tr key={l.id} className="border-b border-background-200 align-top">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-dark-800">{l.title}</div>
                          <div className="text-xs text-dark-400">{l.category}</div>
                          {l.note && <div className="text-xs text-dark-400 mt-0.5">{l.note}</div>}
                        </td>
                        <td className="py-3 pr-4 text-dark-600">{l.recipient}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center gap-1 text-xs text-dark-600">
                            <ChIcon size={13} /> {l.channel}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle[l.status] ?? 'bg-gray-100'}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-dark-600">{l.attempts}</td>
                        <td className="py-3 text-xs text-dark-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {log.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-dark-400">
                        No deliveries logged in this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {role === 'owner' && (
          <div className="text-xs text-dark-400">
            Tip: configure complaint reminders, delivery channels and retry rules in{' '}
            <button onClick={() => navigate('/app/owner/settings')} className="text-primary hover:underline font-medium">
              Settings → Notifications
            </button>
            .
          </div>
        )}
      </div>
    </AppLayout>
  );
}
