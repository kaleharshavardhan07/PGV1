import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, KeyRound, LogOut as MoveOutIcon, Trash2, Shuffle, BellRing } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import DocumentPanel from '../components/DocumentPanel';
import CredentialsCard from '../components/CredentialsCard';
import { TenantStatusBadge, VerificationBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import type { PoliceVerification, Tenant } from '../types';
import { formatDate, formatINR, todayISO } from '../utils/format';
import type { Credentials } from '../api/endpoints';

interface TenantForm {
  fullName: string; mobile: string; email: string; gender: string; emergencyContact: string;
  roomId: string; bedId: string; monthlyRent: string; securityDeposit: string; joiningDate: string;
  policeVerification: PoliceVerification; password: string;
}

const emptyForm = (): TenantForm => ({
  fullName: '', mobile: '', email: '', gender: '', emergencyContact: '', roomId: '', bedId: '',
  monthlyRent: '', securityDeposit: '', joiningDate: todayISO(), policeVerification: 'Pending', password: '',
});

const MOBILE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TenantsPage({ role }: { role: 'owner' | 'manager' }) {
  const { data, addTenant, updateTenant, resetTenantPassword, markTenantNotice, moveOutTenant, reallocateBed, deleteTenant } = useAppStore();
  const toast = useToast();
  const isOwner = role === 'owner';

  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Current' | 'Left' | 'All'>('Current');

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<TenantForm>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState<{ tenant: Tenant; credentials: Credentials } | null>(null);
  const [busy, setBusy] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'details' | 'account' | 'documents'>('details');
  const [edit, setEdit] = useState<Partial<Record<string, string>>>({});
  const [editError, setEditError] = useState('');
  const [resetResult, setResetResult] = useState<Credentials | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [moveBed, setMoveBed] = useState('');
  const [confirm, setConfirm] = useState<'moveout' | 'delete' | null>(null);

  const selected = data.tenants.find((t) => t.id === selectedId) ?? null;

  const tenants = useMemo(
    () =>
      data.tenants
        .filter((t) => (statusFilter === 'All' ? true : statusFilter === 'Left' ? t.status === 'Left' : t.status !== 'Left'))
        .filter((t) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return t.fullName.toLowerCase().includes(q) || t.mobile.includes(q) || (t.roomNumber ?? '').toLowerCase().includes(q);
        }),
    [data.tenants, search, statusFilter]
  );

  const vacantBeds = data.beds.filter((b) => b.status === 'vacant');
  const roomsWithVacancy = data.rooms.filter((r) => r.beds.some((b) => b.status === 'vacant'));

  // Arriving from the floor plan with ?bed=<id> opens the form with that bed selected.
  const preBed = params.get('bed');
  useEffect(() => {
    if (!preBed) return;
    const bed = data.beds.find((b) => b.id === preBed && b.status === 'vacant');
    if (bed) {
      setForm({ ...emptyForm(), roomId: bed.roomId, bedId: bed.id, monthlyRent: bed.rent != null ? String(bed.rent) : '' });
      setErrors({}); setFormError(''); setCreated(null); setAddOpen(true);
    }
    setParams({}, { replace: true });
  }, [preBed, data.beds, setParams]);

  // ---------- Create ----------
  const openAdd = () => {
    setForm(emptyForm());
    setErrors({});
    setFormError('');
    setCreated(null);
    setAddOpen(true);
  };

  const pickBed = (bedId: string) => {
    const bed = vacantBeds.find((b) => b.id === bedId);
    setForm((f) => ({ ...f, bedId, monthlyRent: f.monthlyRent || (bed?.rent != null ? String(bed.rent) : '') }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter the tenant’s full name';
    if (!MOBILE.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (form.email && !EMAIL.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.bedId) e.bedId = 'Choose a vacant bed';
    if (form.monthlyRent === '' || Number(form.monthlyRent) < 0) e.monthlyRent = 'Enter the monthly rent';
    if (!form.joiningDate) e.joiningDate = 'Choose a joining date';
    if (form.password && form.password.length < 8) e.password = 'Use at least 8 characters, or leave blank to auto-generate';
    return e;
  };

  const submitAdd = async () => {
    const e = validate();
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await addTenant({
      fullName: form.fullName.trim(), mobile: form.mobile, email: form.email.trim(), ...(form.gender ? { gender: form.gender } : {}),
      emergencyContact: form.emergencyContact.trim(), bedId: form.bedId, monthlyRent: Number(form.monthlyRent),
      securityDeposit: Number(form.securityDeposit) || 0, joiningDate: form.joiningDate,
      policeVerification: form.policeVerification, ...(form.password ? { password: form.password } : {}),
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setCreated({ tenant: res.tenant, credentials: res.credentials });
  };

  // ---------- Detail ----------
  const openDetail = (t: Tenant) => {
    setSelectedId(t.id);
    setTab('details');
    setEditError('');
    setResetResult(null);
    setCustomPassword('');
    setMoveBed('');
    setEdit({
      fullName: t.fullName, mobile: t.mobile, email: t.email, emergencyContact: t.emergencyContact,
      monthlyRent: String(t.monthlyRent), securityDeposit: String(t.securityDeposit), joiningDate: t.joiningDate,
      policeVerification: t.policeVerification, gender: t.gender ?? '',
    });
  };

  const saveDetails = async () => {
    if (!selected) return;
    if ((edit.fullName ?? '').trim().length < 2) return setEditError('Enter the tenant’s full name');
    if (!MOBILE.test(edit.mobile ?? '')) return setEditError('Enter a valid 10-digit mobile number');
    if (edit.email && !EMAIL.test(edit.email)) return setEditError('Enter a valid email address');
    setBusy(true);
    const res = await updateTenant(selected.id, {
      fullName: edit.fullName!.trim(), mobile: edit.mobile, email: edit.email ?? '', emergencyContact: edit.emergencyContact ?? '',
      monthlyRent: Number(edit.monthlyRent) || 0, securityDeposit: Number(edit.securityDeposit) || 0,
      joiningDate: edit.joiningDate, policeVerification: edit.policeVerification, ...(edit.gender ? { gender: edit.gender } : {}),
    });
    setBusy(false);
    if (!res.ok) return setEditError(res.error);
    setEditError('');
    toast.show('Tenant details saved', 'success');
  };

  const doReset = async () => {
    if (!selected) return;
    if (customPassword && customPassword.length < 8) return setEditError('Password must be at least 8 characters');
    setBusy(true);
    const res = await resetTenantPassword(selected.id, customPassword || undefined);
    setBusy(false);
    if (!res.ok) return setEditError(res.error);
    setEditError('');
    setCustomPassword('');
    setResetResult(res.credentials);
  };

  const run = async (fn: () => Promise<{ ok: boolean } & Record<string, unknown>>, okMsg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) toast.show(okMsg, 'success');
    else toast.show(String(res.error), 'error');
    return res.ok;
  };

  const confirmAction = async () => {
    if (!selected || !confirm) return;
    const ok =
      confirm === 'moveout'
        ? await run(() => moveOutTenant(selected.id), `${selected.fullName} has moved out. Their login is now disabled.`)
        : await run(() => deleteTenant(selected.id), 'Tenant deleted');
    setConfirm(null);
    if (ok && confirm === 'delete') setSelectedId(null);
  };

  const field = (id: keyof TenantForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label className="field-label" htmlFor={`t-${id}`}>{label}</label>
      <input id={`t-${id}`} className={`input-field ${errors[id] ? '!border-error' : ''}`} value={form[id]} onChange={(e) => setForm({ ...form, [id]: e.target.value })} aria-invalid={!!errors[id]} {...props} />
      {errors[id] ? <p className="text-xs text-error mt-1">{errors[id]}</p> : hint ? <p className="text-xs text-dark-400 mt-1">{hint}</p> : null}
    </div>
  );

  const editField = (id: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`e-${id}`}>{label}</label>
      <input id={`e-${id}`} className="input-field" value={edit[id] ?? ''} onChange={(e) => setEdit({ ...edit, [id]: e.target.value })} {...props} />
    </div>
  );

  return (
    <AppLayout
      role={role}
      title="Tenants"
      subtitle="Create tenant accounts and manage their details, login and documents."
      actions={<button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add tenant</button>}
    >
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field !pl-9" placeholder="Search by name, mobile or room…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tenants" />
        </div>
        <div className="flex rounded-lg bg-dark-100 p-0.5" role="tablist" aria-label="Tenant status">
          {(['Current', 'Left', 'All'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={statusFilter === s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${statusFilter === s ? 'bg-white text-dark-900 shadow-soft' : 'text-dark-500 hover:text-dark-800'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {tenants.length === 0 ? (
          <EmptyState
            icon={Users}
            title={data.tenants.length === 0 ? 'No tenants yet' : 'No tenants match'}
            description={data.tenants.length === 0 ? 'Create the first tenant account. They will sign in with their mobile number and the password you give them.' : undefined}
            action={data.tenants.length === 0 ? <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add tenant</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 border-b border-dark-200">
                <tr>
                  {['Tenant', 'Room · Bed', 'Rent', 'Joined', 'Verification', 'Status'].map((h) => <th key={h} className="table-head px-5 py-3 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-50 cursor-pointer" onClick={() => openDetail(t)}>
                    <td className="px-5 py-3.5">
                      <button className="text-left" onClick={(e) => { e.stopPropagation(); openDetail(t); }}>
                        <div className="font-medium text-dark-900">{t.fullName}</div>
                        <div className="text-xs text-dark-500">{t.mobile}</div>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{t.roomNumber ? `Room ${t.roomNumber} · Bed ${t.bedNumber}` : <span className="text-dark-400">—</span>}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{formatINR(t.monthlyRent)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{formatDate(t.joiningDate)}</td>
                    <td className="px-5 py-3.5"><VerificationBadge status={t.policeVerification} /></td>
                    <td className="px-5 py-3.5"><TenantStatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add tenant */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={created ? 'Tenant account created' : 'Add tenant'}
        size="lg"
        footer={
          created ? (
            <button className="btn-primary" onClick={() => setAddOpen(false)}>Done</button>
          ) : (
            <><button className="btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn-primary" onClick={submitAdd} disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button></>
          )
        }
      >
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-dark-600">
              <strong>{created.tenant.fullName}</strong> was added to Room {created.tenant.roomNumber}, Bed {created.tenant.bedNumber}.
            </p>
            <CredentialsCard credentials={created.credentials} heading="Login details" />
          </div>
        ) : (
          <div className="space-y-5">
            {vacantBeds.length === 0 && (
              <div className="rounded-lg bg-warning-light text-warning text-sm px-4 py-3">No vacant beds. {isOwner ? 'Add a room or bed on the Rooms & Beds page first.' : 'Ask the owner to add beds first.'}</div>
            )}
            <fieldset className="grid sm:grid-cols-2 gap-4">
              <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Personal details</legend>
              {field('fullName', 'Full name', { autoFocus: true })}
              {field('mobile', 'Mobile number', { inputMode: 'numeric', maxLength: 10 }, 'Used as the tenant’s login.')}
              {field('email', 'Email (optional)', { type: 'email' })}
              <div>
                <label className="field-label" htmlFor="t-gender">Gender (optional)</label>
                <select id="t-gender" className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              {field('emergencyContact', 'Emergency contact (optional)')}
            </fieldset>

            <fieldset className="grid sm:grid-cols-2 gap-4">
              <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Room & rent</legend>
              <div>
                <label className="field-label" htmlFor="t-room">Room</label>
                <select id="t-room" className="input-field" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value, bedId: '' })}>
                  <option value="">Select room…</option>
                  {roomsWithVacancy.map((r) => <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.beds.filter((b) => b.status === 'vacant').length} free)</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="t-bed">Bed</label>
                <select id="t-bed" className={`input-field ${errors.bedId ? '!border-error' : ''}`} value={form.bedId} onChange={(e) => pickBed(e.target.value)} disabled={!form.roomId}>
                  <option value="">Select bed…</option>
                  {vacantBeds.filter((b) => b.roomId === form.roomId).map((b) => <option key={b.id} value={b.id}>Bed {b.bedNumber}{b.label ? ` — ${b.label}` : ''}</option>)}
                </select>
                {errors.bedId && <p className="text-xs text-error mt-1">{errors.bedId}</p>}
              </div>
              {field('monthlyRent', 'Monthly rent (₹)', { type: 'number', min: 0 })}
              {field('securityDeposit', 'Security deposit (₹)', { type: 'number', min: 0 })}
              {field('joiningDate', 'Joining date', { type: 'date' })}
              <div>
                <label className="field-label" htmlFor="t-pv">Police verification</label>
                <select id="t-pv" className="input-field" value={form.policeVerification} onChange={(e) => setForm({ ...form, policeVerification: e.target.value as PoliceVerification })}>
                  <option>Pending</option><option>Verified</option><option>Not Required</option>
                </select>
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Login</legend>
              {field('password', 'Password (optional)', { type: 'text', autoComplete: 'off' }, 'Leave blank and a secure password is generated for you.')}
            </fieldset>
            {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
          </div>
        )}
      </Modal>

      {/* Tenant detail */}
      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? selected.fullName : ''} size="xl">
        {selected && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
              <TenantStatusBadge status={selected.status} />
              <span className="text-dark-500">{selected.roomNumber ? `Room ${selected.roomNumber} · Bed ${selected.bedNumber}` : 'No bed assigned'}</span>
            </div>
            <div className="flex gap-1 border-b border-dark-200 mb-5" role="tablist">
              {([['details', 'Details'], ['account', 'Account & actions'], ['documents', 'Documents']] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === k ? 'border-primary text-primary-700' : 'border-transparent text-dark-500 hover:text-dark-800'}`}>{label}</button>
              ))}
            </div>

            {tab === 'details' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {editField('fullName', 'Full name')}
                  {editField('mobile', 'Mobile (login)', { inputMode: 'numeric', maxLength: 10 })}
                  {editField('email', 'Email', { type: 'email' })}
                  {editField('emergencyContact', 'Emergency contact')}
                  {editField('monthlyRent', 'Monthly rent (₹)', { type: 'number', min: 0 })}
                  {editField('securityDeposit', 'Security deposit (₹)', { type: 'number', min: 0 })}
                  {editField('joiningDate', 'Joining date', { type: 'date' })}
                  <div>
                    <label className="field-label" htmlFor="e-pv">Police verification</label>
                    <select id="e-pv" className="input-field" value={edit.policeVerification} onChange={(e) => setEdit({ ...edit, policeVerification: e.target.value })}>
                      <option>Pending</option><option>Verified</option><option>Not Required</option>
                    </select>
                  </div>
                </div>
                {editError && <p role="alert" className="text-sm text-error">{editError}</p>}
                <div className="flex justify-end"><button className="btn-primary" onClick={saveDetails} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
              </div>
            )}

            {tab === 'account' && (
              <div className="space-y-6">
                <section>
                  <h4 className="font-semibold text-dark-900 flex items-center gap-2 mb-1"><KeyRound size={16} className="text-primary" /> Login credentials</h4>
                  <p className="text-sm text-dark-500 mb-3">
                    {selected.fullName.split(' ')[0]} signs in with mobile <strong className="text-dark-800">{selected.mobile}</strong> and a password. Passwords are stored hashed, so they can only be reset, never viewed.
                  </p>
                  {selected.status === 'Left' ? (
                    <p className="text-sm text-dark-500">This tenant has moved out, so their login is disabled.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <input aria-label="New password (optional)" className="input-field !w-64" type="text" autoComplete="off" placeholder="New password (blank = auto-generate)" value={customPassword} onChange={(e) => setCustomPassword(e.target.value)} />
                        <button className="btn-secondary" onClick={doReset} disabled={busy}>Reset password</button>
                      </div>
                      {resetResult && <CredentialsCard credentials={resetResult} heading="Password reset" />}
                    </div>
                  )}
                  {editError && <p role="alert" className="text-sm text-error mt-2">{editError}</p>}
                </section>

                {selected.status !== 'Left' && (
                  <section className="border-t border-dark-200 pt-5">
                    <h4 className="font-semibold text-dark-900 mb-3">Stay</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selected.status === 'Active' && (
                        <button className="btn-secondary" disabled={busy} onClick={() => run(() => markTenantNotice(selected.id), 'Marked on notice period')}><BellRing size={15} /> Mark notice period</button>
                      )}
                      <button className="btn-secondary" onClick={() => setConfirm('moveout')}><MoveOutIcon size={15} /> Move out</button>
                      {isOwner && <button className="btn-secondary text-error" onClick={() => setConfirm('delete')}><Trash2 size={15} /> Delete tenant</button>}
                    </div>
                    <label className="field-label" htmlFor="move-bed"><Shuffle size={13} className="inline -mt-0.5 mr-1" /> Move to another bed</label>
                    <div className="flex flex-wrap gap-2">
                      <select id="move-bed" className="input-field !w-64" value={moveBed} onChange={(e) => setMoveBed(e.target.value)}>
                        <option value="">Select a vacant bed…</option>
                        {vacantBeds.map((b) => <option key={b.id} value={b.id}>Room {data.rooms.find((r) => r.id === b.roomId)?.roomNumber} · Bed {b.bedNumber}</option>)}
                      </select>
                      <button className="btn-secondary" disabled={!moveBed || busy} onClick={async () => { if (await run(() => reallocateBed(selected.id, moveBed), 'Tenant moved')) setMoveBed(''); }}>Move</button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {tab === 'documents' && <DocumentPanel tenantId={selected.id} compact />}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        danger
        busy={busy}
        title={confirm === 'delete' ? 'Delete tenant?' : 'Move tenant out?'}
        message={
          confirm === 'delete'
            ? <>This permanently deletes <strong>{selected?.fullName}</strong> along with their documents and complaints. This cannot be undone.</>
            : <><strong>{selected?.fullName}</strong> will be marked as left, their bed becomes vacant and their login stops working. Their record and documents are kept.</>
        }
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Move out'}
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  );
}
