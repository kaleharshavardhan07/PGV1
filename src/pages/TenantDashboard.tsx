import { Link } from 'react-router-dom';
import { BedDouble, FileText, MessageSquare, UtensilsCrossed, Zap, ShieldCheck, Phone, CalendarDays } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { ComplaintStatusBadge, VerificationBadge } from '../components/Badge';
import { useAppStore } from '../store/appStore';
import { formatDate, formatINR } from '../utils/format';

export default function TenantDashboard() {
  const { data } = useAppStore();
  const me = data.tenants[0];
  const open = data.complaints.filter((c) => c.status !== 'Resolved');
  const docCount = data.documents.length;

  if (!me) {
    return (
      <AppLayout role="tenant" title="Home">
        <div className="card p-10 text-center text-dark-500">Your tenant profile could not be loaded. Please log in again.</div>
      </AppLayout>
    );
  }

  const tiles = [
    { to: '/app/tenant/documents', icon: FileText, label: 'My documents', hint: `${docCount} uploaded` },
    { to: '/app/tenant/electricity', icon: Zap, label: 'Electricity', hint: 'View your share' },
    { to: '/app/tenant/complaints', icon: MessageSquare, label: 'Complaints', hint: open.length ? `${open.length} open` : 'Raise an issue' },
    { to: '/app/tenant/food', icon: UtensilsCrossed, label: 'Food menu', hint: 'Meals & opt-outs' },
  ];

  return (
    <AppLayout role="tenant" title={`Hi ${me.fullName.split(' ')[0]} 👋`} subtitle={`Welcome to ${data.settings.name}.`}>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center"><BedDouble size={22} /></div>
            <div>
              <div className="text-xs text-dark-500">Your stay</div>
              <div className="text-lg font-bold text-dark-900">{me.roomNumber ? `Room ${me.roomNumber} · Bed ${me.bedNumber}` : 'No bed assigned'}</div>
            </div>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><dt className="text-dark-500 flex items-center gap-1.5"><CalendarDays size={14} /> Joined</dt><dd className="font-medium text-dark-900 mt-0.5">{formatDate(me.joiningDate)}</dd></div>
            <div><dt className="text-dark-500">Monthly rent</dt><dd className="font-medium text-dark-900 mt-0.5">{formatINR(me.monthlyRent)}</dd></div>
            <div><dt className="text-dark-500">Security deposit</dt><dd className="font-medium text-dark-900 mt-0.5">{formatINR(me.securityDeposit)}</dd></div>
            <div><dt className="text-dark-500 flex items-center gap-1.5"><ShieldCheck size={14} /> Police verification</dt><dd className="mt-0.5"><VerificationBadge status={me.policeVerification} /></dd></div>
          </dl>
        </div>

        <div className="card p-6">
          <div className="text-xs text-dark-500 mb-1">Your PG</div>
          <div className="font-bold text-dark-900">{data.settings.name}</div>
          <div className="text-sm text-dark-500 mt-1">{[data.settings.address, data.settings.city].filter(Boolean).join(', ')}</div>
          {data.settings.contactPhone && (
            <a href={`tel:${data.settings.contactPhone}`} className="btn-secondary mt-4 w-full"><Phone size={15} /> {data.settings.contactPhone}</a>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {tiles.map(({ to, icon: Icon, label, hint }) => (
          <Link key={to} to={to} className="card p-5 hover:border-primary-300 hover:shadow-glow transition group">
            <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition"><Icon size={19} /></div>
            <div className="font-semibold text-dark-900">{label}</div>
            <div className="text-xs text-dark-500 mt-0.5">{hint}</div>
          </Link>
        ))}
      </div>

      {open.length > 0 && (
        <div className="card mt-6">
          <div className="px-5 py-4 border-b border-dark-200 font-semibold text-dark-900">Your open complaints</div>
          <ul className="divide-y divide-dark-100">
            {open.slice(0, 3).map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-dark-800">{c.category}</div><div className="text-xs text-dark-500 truncate">{c.description}</div></div>
                <ComplaintStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppLayout>
  );
}
