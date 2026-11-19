import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Users, UserCog } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAppStore } from '../store/appStore';

type Tab = 'tenant' | 'owner' | 'manager';

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'tenant', label: 'Tenant', icon: Users },
  { id: 'owner', label: 'PG Owner', icon: Building2 },
  { id: 'manager', label: 'Manager', icon: UserCog },
];

const copy: Record<Tab, { id: string; label: string; placeholder: string; type: string; inputMode?: 'numeric' | 'email' | 'text' }> = {
  tenant: { id: 'mobile', label: 'Mobile number', placeholder: '10-digit mobile number', type: 'tel', inputMode: 'numeric' },
  owner: { id: 'identifier', label: 'PG username or email', placeholder: 'e.g. shreeganesh_pg', type: 'text' },
  manager: { id: 'email', label: 'Email', placeholder: 'you@example.com', type: 'email', inputMode: 'email' },
};

export default function LoginPage() {
  const { data, ready, ownerLogin, managerLogin, tenantLogin } = useAppStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('tenant');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in → go straight to the right area.
  useEffect(() => {
    if (ready && data.activeRole) navigate(`/app/${data.activeRole}`, { replace: true });
  }, [ready, data.activeRole, navigate]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = tab === 'owner' ? await ownerLogin(identifier, password) : tab === 'manager' ? await managerLogin(identifier, password) : await tenantLogin(identifier, password);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  const f = copy[tab];

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Aapka PG account">
      <div className="flex rounded-lg bg-dark-100 p-1 mb-6" role="tablist" aria-label="Account type">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => switchTab(id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition ${tab === id ? 'bg-white text-dark-900 shadow-soft' : 'text-dark-500 hover:text-dark-800'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="field-label" htmlFor={f.id}>{f.label}</label>
          <input id={f.id} className="input-field" type={f.type} inputMode={f.inputMode} placeholder={f.placeholder} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" className="input-field !pr-10" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-error bg-error-light rounded-lg px-3 py-2">{error}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy || !identifier || !password}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form>

      <p className="text-sm text-dark-500 text-center mt-6">
        {tab === 'tenant' ? (
          <>Tenant accounts are created by your PG owner. Ask them for your mobile number and password.</>
        ) : tab === 'owner' ? (
          <>New to Aapka PG? <Link to="/register" className="text-primary font-medium hover:underline">Register your PG</Link></>
        ) : (
          <>Manager accounts are set up by the PG owner.</>
        )}
      </p>
    </AuthShell>
  );
}
