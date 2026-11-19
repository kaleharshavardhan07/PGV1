import { Link } from 'react-router-dom';
import { BedDouble, Users, MessageSquare, DoorOpen, Plus, FileText, ArrowRight, Wallet, Receipt, Inbox, UserCog, Layers, ShieldAlert, Download } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { CardsSkeleton } from '../components/PageLoader';
import { ComplaintStatusBadge } from '../components/Badge';
import { useAppStore } from '../store/appStore';
import type { DashboardSummary } from '../types';
import { formatINR, formatRelative } from '../utils/format';

/** Landing page for owners and managers. Each section appears only if the module is on and the user may use it. */
export default function StaffDashboard({ role }: { role: 'owner' | 'manager' }) {
  const { data, session, ready } = useAppStore();
  const s = data.summary && data.summary.role !== 'tenant' ? (data.summary as DashboardSummary) : null;
  const base = `/app/${role}`;
  const user = (session?.user ?? {}) as Record<string, string | undefined>;
  const firstName = (user.ownerName ?? user.fullName ?? '').split(' ')[0];

  const f = data.features;
  const can = (perm: keyof typeof data.permissions) => role === 'owner' || data.permissions[perm];
  const canRooms = f.rooms && can('rooms');
  const canExpenses = f.expenses && can('expenses');
  const canBilling = f.billing && can('billing');

  const pct = s?.occupancyPercent ?? 0;
  const vacantRooms = data.rooms.filter((r) => r.vacantBeds > 0);
  const openComplaints = data.complaints.filter((c) => c.status !== 'Resolved').slice(0, 4);
  const newEnquiries = data.enquiries.filter((e) => e.status === 'New').slice(0, 3);

  return (
    <AppLayout role={role} title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'} subtitle={data.settings.name ? `Here is how ${data.settings.name} is doing today.` : undefined}>
      {!ready || !s ? <CardsSkeleton /> : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total rooms" value={s.totalRooms} icon={DoorOpen} />
            <StatCard label="Total beds" value={s.totalBeds} icon={BedDouble} color="secondary" hint={s.unavailableBeds ? `${s.unavailableBeds} unavailable` : undefined} />
            <StatCard label="Occupied beds" value={s.occupiedBeds} icon={BedDouble} color="primary" hint={`${pct}% occupancy`} />
            <StatCard label="Vacant beds" value={s.vacantBeds} icon={BedDouble} color="success" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total tenants" value={s.totalTenants} icon={Users} color="secondary" hint={s.noticeTenants ? `${s.noticeTenants} on notice` : undefined} />
            {s.expenses && <StatCard label="Pending expenses" value={s.expenses.pendingCount} icon={Wallet} color={s.expenses.pendingCount ? 'warning' : 'success'} hint={formatINR(s.expenses.pendingAmount)} />}
            {s.invoices && <StatCard label="Invoices outstanding" value={formatINR(s.invoices.outstandingAmount)} icon={Receipt} color={s.invoices.overdueCount ? 'error' : 'primary'} hint={`${s.invoices.outstandingCount} open · ${s.invoices.overdueCount} overdue`} />}
            {s.openComplaints != null && <StatCard label="Open complaints" value={s.openComplaints} icon={MessageSquare} color={s.openComplaints ? 'warning' : 'success'} />}
            {s.newEnquiries != null && !s.invoices && <StatCard label="New enquiries" value={s.newEnquiries} icon={Inbox} />}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-dark-900">Occupancy</h2><Link to={`${base}/rooms`} className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">Floor plan <ArrowRight size={14} /></Link></div>
                <div className="h-2.5 rounded-full bg-dark-100 overflow-hidden mb-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Occupancy"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                {data.rooms.length === 0 ? (
                  <EmptyState icon={DoorOpen} title="No rooms yet" description={canRooms ? 'Add rooms and beds, or create many at once.' : 'No rooms have been added yet.'} action={canRooms ? <div className="flex gap-2 justify-center"><Link to={`${base}/rooms`} className="btn-primary"><Plus size={16} /> Add rooms</Link></div> : undefined} />
                ) : vacantRooms.length === 0 ? <p className="text-sm text-dark-500">Every available bed is occupied.</p> : (
                  <><div className="text-sm font-medium text-dark-700 mb-2">Rooms with vacancy</div><ul className="grid sm:grid-cols-2 gap-2">
                    {vacantRooms.slice(0, 6).map((r) => <li key={r.id} className="flex items-center justify-between rounded-lg border border-dark-200 px-3 py-2 text-sm"><span className="font-medium text-dark-800">Room {r.roomNumber}</span><span className="badge bg-success-light text-success">{r.vacantBeds} free</span></li>)}
                  </ul></>
                )}
              </div>

              {s.invoices && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-dark-900">Billing overview</h2><Link to={`${base}/invoices`} className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">Invoices <ArrowRight size={14} /></Link></div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div><dt className="text-dark-500">Outstanding</dt><dd className="text-lg font-bold text-dark-900 mt-0.5">{formatINR(s.invoices.outstandingAmount)}</dd></div>
                    <div><dt className="text-dark-500">Overdue</dt><dd className={`text-lg font-bold mt-0.5 ${s.invoices.overdueCount ? 'text-error' : 'text-dark-900'}`}>{formatINR(s.invoices.overdueAmount)}</dd></div>
                    <div><dt className="text-dark-500">Paid this month</dt><dd className="text-lg font-bold text-success mt-0.5">{formatINR(s.invoices.paidThisMonth)}</dd></div>
                    <div><dt className="text-dark-500">Drafts</dt><dd className="text-lg font-bold text-dark-900 mt-0.5">{s.invoices.drafts}</dd></div>
                  </dl>
                </div>
              )}

              {s.openComplaints != null && (
                <div className="card">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-dark-200"><h2 className="font-semibold text-dark-900">Open complaints</h2><Link to={`${base}/complaints`} className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link></div>
                  {openComplaints.length === 0 ? <p className="px-5 py-8 text-center text-sm text-dark-500">No open complaints.</p> : (
                    <ul className="divide-y divide-dark-100">{openComplaints.map((c) => (
                      <li key={c.id} className="px-5 py-3 flex items-center gap-3"><div className="min-w-0 flex-1"><div className="text-sm font-medium text-dark-800 truncate">{c.category} · Room {c.roomNumber}</div><div className="text-xs text-dark-500 truncate">{c.tenantName} · {formatRelative(c.submittedAt)}</div></div><ComplaintStatusBadge status={c.status} /></li>
                    ))}</ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="font-semibold text-dark-900 mb-3">Quick actions</h2>
                <div className="space-y-2">
                  {can('tenants') && <Link to={`${base}/tenants`} className="btn-secondary w-full !justify-start"><Users size={16} /> Add a tenant</Link>}
                  {canRooms && <Link to={`${base}/rooms`} className="btn-secondary w-full !justify-start"><Layers size={16} /> Bulk add rooms</Link>}
                  {canExpenses && <Link to={`${base}/expenses`} className="btn-secondary w-full !justify-start"><Wallet size={16} /> Post an expense</Link>}
                  {canBilling && <Link to={`${base}/invoices`} className="btn-secondary w-full !justify-start"><Receipt size={16} /> Create invoices</Link>}
                  {f.documents && can('documents') && <Link to={`${base}/documents`} className="btn-secondary w-full !justify-start"><FileText size={16} /> Upload documents</Link>}
                  {f.exports && can('exports') && <Link to={`${base}/exports`} className="btn-secondary w-full !justify-start"><Download size={16} /> Export data</Link>}
                  {role === 'owner' && <Link to="/app/owner/managers" className="btn-secondary w-full !justify-start"><UserCog size={16} /> Manage managers</Link>}
                </div>
              </div>

              {role === 'owner' && (
                <div className="card">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-dark-200"><h2 className="font-semibold text-dark-900">New enquiries</h2><Link to="/app/owner/enquiries" className="text-sm text-primary font-medium hover:underline">All</Link></div>
                  {newEnquiries.length === 0 ? <p className="px-5 py-6 text-center text-sm text-dark-500">No new enquiries.</p> : (
                    <ul className="divide-y divide-dark-100">{newEnquiries.map((e) => <li key={e.id} className="px-5 py-3"><div className="text-sm font-medium text-dark-800">{e.name}</div><div className="text-xs text-dark-500">{e.mobile} · {formatRelative(e.createdAt)}</div></li>)}</ul>
                  )}
                </div>
              )}

              {s.pendingVerification > 0 && can('tenants') && (
                <Link to={`${base}/tenants`} className="card p-5 flex items-start gap-3 hover:border-warning/40 transition">
                  <div className="w-9 h-9 rounded-lg bg-warning-light text-warning flex items-center justify-center shrink-0"><ShieldAlert size={18} /></div>
                  <div><div className="font-semibold text-dark-900 text-sm">{s.pendingVerification} verification{s.pendingVerification === 1 ? '' : 's'} pending</div><div className="text-xs text-dark-500 mt-0.5">Police verification is not complete for these tenants.</div></div>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
