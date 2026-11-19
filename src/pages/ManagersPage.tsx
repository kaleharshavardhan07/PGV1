import { useState } from 'react';
import { Plus, UserCog, KeyRound, Trash2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import CredentialsCard from '../components/CredentialsCard';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { PERMISSIONS, PERMISSION_LABELS, type Manager, type PermissionMap } from '../types';
import type { Credentials } from '../api/endpoints';

const DEFAULTS: PermissionMap = { tenants: true, rooms: false, food: true, expenses: false, billing: false, documents: true, complaints: true, exports: false };

function PermissionGrid({ value, onChange, features }: { value: PermissionMap; onChange: (v: PermissionMap) => void; features: Record<string, boolean> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {PERMISSIONS.map((p) => {
        const off = features[p] === false; // module switched off for the whole PG
        return (
          <label key={p} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${off ? 'border-dark-100 bg-dark-50 text-dark-400' : 'border-dark-200 cursor-pointer hover:bg-dark-50'}`}>
            <input type="checkbox" className="rounded border-dark-300 text-primary" checked={value[p]} disabled={off} onChange={(e) => onChange({ ...value, [p]: e.target.checked })} />
            <span>{PERMISSION_LABELS[p]}{off && <span className="block text-[11px]">Module is turned off</span>}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Owner-only: create managers and decide exactly what each may do. Enforced by the API. */
export default function ManagersPage() {
  const { data, addManager, updateManager, resetManagerPassword, deleteManager } = useAppStore();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', password: '', permissions: DEFAULTS });
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<{ manager: Manager; credentials: Credentials } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [perms, setPerms] = useState<PermissionMap>(DEFAULTS);
  const [reset, setReset] = useState<Credentials | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = data.managers.find((m) => m.id === selectedId) ?? null;
  const featureOn = data.features as unknown as Record<string, boolean>;

  const submitAdd = async () => {
    if (form.fullName.trim().length < 2) return setFormError('Enter the manager’s name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Enter a valid email address');
    if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) return setFormError('Enter a valid 10-digit mobile number or leave it blank');
    if (form.password && form.password.length < 8) return setFormError('Password must be at least 8 characters, or leave blank to auto-generate');
    setBusy(true);
    const res = await addManager({ fullName: form.fullName.trim(), email: form.email.trim(), ...(form.mobile ? { mobile: form.mobile } : {}), ...(form.password ? { password: form.password } : {}), permissions: form.permissions });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setCreated({ manager: res.manager, credentials: res.credentials });
  };

  const open = (m: Manager) => { setSelectedId(m.id); setPerms(m.permissions); setReset(null); };

  const run = async (fn: () => Promise<{ ok: boolean } & Record<string, unknown>>, ok: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    toast.show(res.ok ? ok : String(res.error), res.ok ? 'success' : 'error');
    return res;
  };

  return (
    <AppLayout role="owner" title="Managers" subtitle="Give staff their own login and choose what they can manage."
      actions={<button className="btn-primary" onClick={() => { setForm({ fullName: '', email: '', mobile: '', password: '', permissions: DEFAULTS }); setFormError(''); setCreated(null); setAddOpen(true); }}><Plus size={16} /> Add manager</button>}>
      <div className="card overflow-hidden">
        {data.managers.length === 0 ? (
          <EmptyState icon={UserCog} title="No managers yet" description="Add a manager to let someone help run the PG without giving them full control." />
        ) : (
          <ul className="divide-y divide-dark-100">
            {data.managers.map((m) => (
              <li key={m.id}>
                <button className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-dark-50" onClick={() => open(m)}>
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center shrink-0">{m.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-dark-900 flex items-center gap-2">{m.fullName}{!m.isActive && <span className="badge bg-dark-100 text-dark-500">Deactivated</span>}</div>
                    <div className="text-xs text-dark-500 truncate">{m.email}{m.mobile ? ` · ${m.mobile}` : ''}</div>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1 justify-end max-w-xs">
                    {PERMISSIONS.filter((p) => m.permissions[p]).map((p) => <span key={p} className="badge bg-primary-50 text-primary-700">{p}</span>)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={created ? 'Manager created' : 'Add manager'} size="lg"
        footer={created ? <button className="btn-primary" onClick={() => setAddOpen(false)}>Done</button> : <><button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={submitAdd}>{busy ? 'Creating…' : 'Create account'}</button></>}>
        {created ? (
          <div className="space-y-4"><p className="text-sm text-dark-600"><strong>{created.manager.fullName}</strong> can now sign in as a manager.</p><CredentialsCard credentials={created.credentials} heading="Login details" /></div>
        ) : (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="field-label" htmlFor="m-name">Full name</label><input id="m-name" className="input-field" autoFocus value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><label className="field-label" htmlFor="m-email">Email (their login)</label><input id="m-email" type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="field-label" htmlFor="m-mobile">Mobile <span className="text-dark-400 font-normal">(optional)</span></label><input id="m-mobile" className="input-field" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
              <div><label className="field-label" htmlFor="m-pass">Password <span className="text-dark-400 font-normal">(blank = auto-generate)</span></label><input id="m-pass" className="input-field" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div><div className="field-label">What can this manager do?</div><PermissionGrid value={form.permissions} features={featureOn} onChange={(permissions) => setForm({ ...form, permissions })} /></div>
            {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
          </div>
        )}
      </Modal>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.fullName ?? ''} size="lg">
        {selected && (
          <div className="space-y-6">
            <div className="text-sm text-dark-500">{selected.email}{selected.mobile ? ` · ${selected.mobile}` : ''}</div>
            <section>
              <h4 className="font-semibold text-dark-900 mb-3">Permissions</h4>
              <PermissionGrid value={perms} features={featureOn} onChange={setPerms} />
              <div className="flex justify-end mt-3"><button className="btn-primary" disabled={busy} onClick={() => run(() => updateManager(selected.id, { permissions: perms }), 'Permissions saved')}>Save permissions</button></div>
            </section>
            <section className="border-t border-dark-200 pt-5 space-y-3">
              <h4 className="font-semibold text-dark-900 flex items-center gap-2"><KeyRound size={16} className="text-primary" /> Account</h4>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" disabled={busy} onClick={async () => { const r = await run(() => resetManagerPassword(selected.id), 'Password reset'); if (r.ok) setReset((r as unknown as { credentials: Credentials }).credentials); }}>Reset password</button>
                <button className="btn-secondary" disabled={busy} onClick={() => run(() => updateManager(selected.id, { isActive: !selected.isActive }), selected.isActive ? 'Manager deactivated' : 'Manager reactivated')}>{selected.isActive ? 'Deactivate' : 'Reactivate'}</button>
                <button className="btn-secondary text-error" onClick={() => setConfirmDel(true)}><Trash2 size={15} /> Delete</button>
              </div>
              {reset && <CredentialsCard credentials={reset} heading="Password reset" />}
              {selected.isActive ? <p className="text-xs text-dark-400">Deactivating signs the manager out immediately.</p> : <p className="text-xs text-warning">This manager cannot sign in.</p>}
            </section>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={confirmDel} danger busy={busy} title="Delete manager?" confirmLabel="Delete" message={<><strong>{selected?.fullName}</strong> will lose access immediately. This can’t be undone.</>}
        onCancel={() => setConfirmDel(false)} onConfirm={async () => { if (!selected) return; const r = await run(() => deleteManager(selected.id), 'Manager deleted'); setConfirmDel(false); if (r.ok) setSelectedId(null); }} />
    </AppLayout>
  );
}
