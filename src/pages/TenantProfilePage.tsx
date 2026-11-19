import { useState } from 'react';
import { Phone, Mail, User, KeyRound, Eye, EyeOff } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { formatDate, formatINR, initialsOf } from '../utils/format';

export function ChangePasswordCard() {
  const { changePassword } = useAppStore();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setError('New password must be at least 8 characters');
    if (next !== confirm) return setError('The new passwords do not match');
    setBusy(true);
    const res = await changePassword(current, next);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setError('');
    setCurrent(''); setNext(''); setConfirm('');
    toast.show('Password updated', 'success');
  };

  return (
    <form onSubmit={submit} className="card p-6 space-y-4" aria-label="Change password">
      <h2 className="font-semibold text-dark-900 flex items-center gap-2"><KeyRound size={17} className="text-primary" /> Change password</h2>
      <div>
        <label className="field-label" htmlFor="cp-current">Current password</label>
        <input id="cp-current" type={show ? 'text' : 'password'} autoComplete="current-password" className="input-field" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label" htmlFor="cp-new">New password</label>
          <input id="cp-new" type={show ? 'text' : 'password'} autoComplete="new-password" className="input-field" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="cp-confirm">Confirm new password</label>
          <input id="cp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>
      <button type="button" className="text-xs text-dark-500 inline-flex items-center gap-1.5 hover:text-dark-800" onClick={() => setShow(!show)}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />} {show ? 'Hide' : 'Show'} passwords
      </button>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
      <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></div>
    </form>
  );
}

export default function TenantProfilePage() {
  const { data } = useAppStore();
  const me = data.tenants[0];

  return (
    <AppLayout role="tenant" title="Profile" subtitle="Your details are managed by your PG owner.">
      {me && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center">{initialsOf(me.fullName)}</div>
              <div><div className="font-bold text-dark-900 text-lg">{me.fullName}</div><div className="text-sm text-dark-500">{me.roomNumber ? `Room ${me.roomNumber} · Bed ${me.bedNumber}` : 'No bed assigned'}</div></div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5"><Phone size={15} className="text-dark-400" /><dt className="sr-only">Mobile</dt><dd>{me.mobile}</dd></div>
              <div className="flex items-center gap-2.5"><Mail size={15} className="text-dark-400" /><dt className="sr-only">Email</dt><dd>{me.email || '—'}</dd></div>
              <div className="flex items-center gap-2.5"><User size={15} className="text-dark-400" /><dt className="sr-only">Emergency contact</dt><dd>{me.emergencyContact || '—'} <span className="text-dark-400">(emergency)</span></dd></div>
            </dl>
            <div className="mt-5 pt-5 border-t border-dark-200 grid grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-dark-500">Joined</div><div className="font-medium">{formatDate(me.joiningDate)}</div></div>
              <div><div className="text-xs text-dark-500">Rent</div><div className="font-medium">{formatINR(me.monthlyRent)}</div></div>
              <div><div className="text-xs text-dark-500">Deposit</div><div className="font-medium">{formatINR(me.securityDeposit)}</div></div>
            </div>
          </div>
          <ChangePasswordCard />
        </div>
      )}
    </AppLayout>
  );
}
