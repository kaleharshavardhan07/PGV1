import { Link } from 'react-router-dom';
import { BedDouble, Users, MessageSquare, ShieldAlert, DoorOpen, Plus, FileText, ArrowRight } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { ComplaintStatusBadge } from '../components/Badge';
import { useAppStore } from '../store/appStore';
import { formatRelative } from '../utils/format';

/** Shared landing page for owners and managers. */
export default function StaffDashboard({ role }: { role: 'owner' | 'manager' }) {
  const { data, session } = useAppStore();
  const s = data.summary;
  const base = `/app/${role}`;

  const total = s?.totalBeds ?? data.beds.length;
  const occupied = s?.occupiedBeds ?? data.beds.filter((b) => b.status !== 'vacant').length;
  const pct = total ? Math.round((occupied / total) * 100) : 0;

  const openComplaints = data.complaints.filter((c) => c.status !== 'Resolved').slice(0, 4);
  const vacantRooms = data.rooms.filter((r) => r.totalBeds > r.occupiedBeds);
  const user = (session?.user ?? {}) as Record<string, string | undefined>;
  const firstName = (user.ownerName ?? user.fullName ?? '').split(' ')[0];

  return (
    <AppLayout
      role={role}
      title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
      subtitle={data.settings.name ? `Here is how ${data.settings.name} is doing today.` : undefined}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Occupancy" value={`${pct}%`} icon={BedDouble} hint={`${occupied} of ${total} beds filled`} />
        <StatCard label="Vacant beds" value={total - occupied} icon={DoorOpen} color="success" hint={`${data.rooms.length} rooms`} />
        <StatCard label="Active tenants" value={s?.activeTenants ?? data.tenants.filter((t) => t.status === 'Active').length} icon={Users} color="secondary" hint={s?.noticeTenants ? `${s.noticeTenants} on notice` : undefined} />
        <StatCard label="Open complaints" value={s?.openComplaints ?? openComplaints.length} icon={MessageSquare} color={(s?.openComplaints ?? 0) > 0 ? 'warning' : 'success'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark-900">Occupancy</h2>
              <Link to={`${base}/rooms`} className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">Rooms & beds <ArrowRight size={14} /></Link>
            </div>
            <div className="h-2.5 rounded-full bg-dark-100 overflow-hidden mb-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Occupancy">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            {data.rooms.length === 0 ? (
              <EmptyState icon={DoorOpen} title="No rooms yet" description={role === 'owner' ? 'Add rooms and beds to start placing tenants.' : 'The owner has not added rooms yet.'} action={role === 'owner' ? <Link to={`${base}/rooms`} className="btn-primary"><Plus size={16} /> Add a room</Link> : undefined} />
            ) : vacantRooms.length === 0 ? (
              <p className="text-sm text-dark-500">Every bed is occupied. 🎉</p>
            ) : (
              <>
                <div className="text-sm font-medium text-dark-700 mb-2">Rooms with vacancy</div>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {vacantRooms.slice(0, 6).map((r) => (
                    <li key={r.id} className="flex items-center justify-between rounded-lg border border-dark-200 px-3 py-2 text-sm">
                      <span className="font-medium text-dark-800">Room {r.roomNumber}</span>
                      <span className="badge bg-success-light text-success">{r.totalBeds - r.occupiedBeds} free</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-200">
              <h2 className="font-semibold text-dark-900">Open complaints</h2>
              <Link to={`${base}/complaints`} className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>
            </div>
            {openComplaints.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-dark-500">No open complaints.</p>
            ) : (
              <ul className="divide-y divide-dark-100">
                {openComplaints.map((c) => (
                  <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-dark-800 truncate">{c.category} · Room {c.roomNumber}</div>
                      <div className="text-xs text-dark-500 truncate">{c.tenantName} · {formatRelative(c.submittedAt)}</div>
                    </div>
                    <ComplaintStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-dark-900 mb-3">Quick actions</h2>
            <div className="space-y-2">
              {role === 'owner' && <Link to={`${base}/rooms`} className="btn-secondary w-full !justify-start"><DoorOpen size={16} /> Manage rooms & beds</Link>}
              <Link to={`${base}/tenants`} className="btn-secondary w-full !justify-start"><Users size={16} /> Add or manage tenants</Link>
              <Link to={`${base}/documents`} className="btn-secondary w-full !justify-start"><FileText size={16} /> Upload documents</Link>
            </div>
          </div>

          {(s?.pendingVerification ?? 0) > 0 && (
            <Link to={`${base}/tenants`} className="card p-5 flex items-start gap-3 hover:border-warning/40 transition">
              <div className="w-9 h-9 rounded-lg bg-warning-light text-warning flex items-center justify-center shrink-0"><ShieldAlert size={18} /></div>
              <div>
                <div className="font-semibold text-dark-900 text-sm">{s!.pendingVerification} verification{s!.pendingVerification === 1 ? '' : 's'} pending</div>
                <div className="text-xs text-dark-500 mt-0.5">Police verification is not complete for these tenants.</div>
              </div>
            </Link>
          )}
          <div className="card p-5">
            <div className="text-sm text-dark-500">Documents on file</div>
            <div className="text-2xl font-bold text-dark-900 mt-1">{s?.documents ?? data.documents.length}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
