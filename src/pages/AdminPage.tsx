import { useCallback, useEffect, useState } from 'react';
import { Search, Building2, Users, BedDouble, Mail, MailX, ShieldCheck, ChevronDown } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { ListSkeleton } from '../components/PageLoader';
import { ChangePasswordCard } from './TenantProfilePage';
import { useToast } from '../components/Toast';
import { adminApi, type AdminPg } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { FEATURES, FEATURE_LABELS, type Feature } from '../types';

const Switch = ({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${on ? 'bg-primary' : 'bg-dark-300'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${on ? 'translate-x-4' : ''}`} />
  </button>
);

/** Centralised platform administration: every PG, its status, and which modules it may use. */
export default function AdminPage() {
  const toast = useToast();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminApi.overview>> | null>(null);
  const [pgs, setPgs] = useState<AdminPg[] | null>(null);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    try {
      const [o, p] = await Promise.all([adminApi.overview(), adminApi.pgs(q)]);
      setOverview(o);
      setPgs(p.pgs);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      setPgs([]);
    }
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => load(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, load]);

  const update = async (pg: AdminPg, body: Record<string, unknown>, ok: string) => {
    setSaving(pg.id);
    try {
      await adminApi.updatePg(pg.id, body);
      toast.show(ok, 'success');
      await load(search);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  const o = overview?.overview;

  return (
    <AppLayout role="admin" title="Platform administration" subtitle="Manage every PG and decide which modules each one can use.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="PGs" value={o?.pgs ?? '—'} icon={Building2} hint={o ? `${o.activePgs} active` : undefined} />
        <StatCard label="Tenants" value={o?.tenants ?? '—'} icon={Users} color="secondary" />
        <StatCard label="Beds" value={o?.beds ?? '—'} icon={BedDouble} color="success" hint={o ? `${o.occupiedBeds} occupied` : undefined} />
        <StatCard label="Email" value={overview ? (overview.emailConfigured ? 'Connected' : 'Not set up') : '—'} icon={overview?.emailConfigured ? Mail : MailX} color={overview?.emailConfigured ? 'success' : 'warning'} hint="Proton SMTP" />
      </div>

      <div className="card p-3 mb-5 relative">
        <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-dark-400" />
        <input className="input-field !pl-9" placeholder="Search by PG, owner, city or username…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search PGs" />
      </div>

      {pgs === null ? <ListSkeleton /> : pgs.length === 0 ? (
        <div className="card"><EmptyState icon={Building2} title="No PGs found" /></div>
      ) : (
        <ul className="space-y-3">
          {pgs.map((pg) => {
            const open = openId === pg.id;
            return (
              <li key={pg.id} className="card overflow-hidden">
                <button className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-dark-50" aria-expanded={open} onClick={() => setOpenId(open ? null : pg.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-dark-900 flex flex-wrap items-center gap-2">{pg.pgName}
                      <span className={`badge ${pg.isActive ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>{pg.isActive ? 'Active' : 'Suspended'}</span>
                    </div>
                    <div className="text-xs text-dark-500 mt-0.5">@{pg.pgUsername} · {[pg.area, pg.city].filter(Boolean).join(', ')} · {pg.ownerName} ({pg.ownerEmail})</div>
                  </div>
                  <div className="hidden sm:flex gap-5 text-sm text-dark-600 shrink-0">
                    <span>{pg.rooms} rooms</span><span>{pg.beds} beds</span><span>{pg.tenants} tenants</span><span>{pg.managers} managers</span>
                  </div>
                  <ChevronDown size={18} className={`text-dark-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="border-t border-dark-200 px-5 py-5 bg-dark-50/50 space-y-5">
                    <div>
                      <h4 className="font-semibold text-dark-900 flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-primary" /> Feature access</h4>
                      <p className="text-xs text-dark-500 mb-3">Switching a module off blocks it for this PG everywhere, including direct API calls. The owner can only use what you allow.</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {FEATURES.map((f: Feature) => (
                          <div key={f} className="flex items-center justify-between gap-3 bg-white border border-dark-200 rounded-lg px-3 py-2.5">
                            <div className="text-sm"><div className="text-dark-800 font-medium">{FEATURE_LABELS[f]}</div>
                              {pg.featuresAllowed[f] && !pg.featuresEnabled[f] && <div className="text-[11px] text-dark-400">Allowed, switched off by owner</div>}
                            </div>
                            <Switch label={`${FEATURE_LABELS[f]} for ${pg.pgName}`} on={pg.featuresAllowed[f]} disabled={saving === pg.id}
                              onChange={(v) => update(pg, { featuresAllowed: { [f]: v } }, `${FEATURE_LABELS[f]} ${v ? 'allowed' : 'blocked'} for ${pg.pgName}`)} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      <button className={pg.isActive ? 'btn-secondary text-error' : 'btn-primary'} disabled={saving === pg.id}
                        onClick={() => update(pg, { isActive: !pg.isActive }, pg.isActive ? `${pg.pgName} suspended` : `${pg.pgName} reactivated`)}>
                        {pg.isActive ? 'Suspend PG' : 'Reactivate PG'}
                      </button>
                      <button className="btn-secondary" disabled={saving === pg.id}
                        onClick={() => update(pg, { isDiscoverable: !pg.isDiscoverable }, pg.isDiscoverable ? 'Hidden from Find PG' : 'Listed on Find PG')}>
                        {pg.isDiscoverable ? 'Hide from Find PG' : 'List on Find PG'}
                      </button>
                      <span className="text-xs text-dark-400">Suspending signs out the owner, managers and tenants of this PG.</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 max-w-xl"><ChangePasswordCard /></div>
    </AppLayout>
  );
}
