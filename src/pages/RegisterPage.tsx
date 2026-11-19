import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAppStore } from '../store/appStore';
import { authApi } from '../api/endpoints';
import LocationPicker, { type LocationValue } from '../components/LocationPicker';
import type { PGType } from '../types';

interface Form {
  fullName: string; mobile: string; email: string;
  pgName: string; pgType: PGType;
  pgUsername: string; password: string;
}

const initial: Form = { fullName: '', mobile: '', email: '', pgName: '', pgType: 'Co-living', pgUsername: '', password: '' };
const initialLoc: LocationValue = { address: '', area: '', city: '', state: '', pinCode: '', latitude: null, longitude: null };

/** Owner sign-up: one form, no payment step. Creates the PG account and signs the owner in. */
export default function RegisterPage() {
  const { ownerRegister, data, ready } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(initial);
  const [loc, setLoc] = useState<LocationValue>(initialLoc);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState<{ state: 'idle' | 'checking' | 'ok' | 'bad'; message?: string; suggestions?: string[] }>({ state: 'idle' });
  const [usernameTouched, setUsernameTouched] = useState(false);
  // Until the owner edits it, the username is suggested from the PG name.
  const suggested = form.pgName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
  const usernameValue = usernameTouched ? form.pgUsername : suggested;

  useEffect(() => {
    if (ready && data.activeRole) navigate(`/app/${data.activeRole}`, { replace: true });
  }, [ready, data.activeRole, navigate]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Debounced availability check.
  useEffect(() => {
    const u = usernameValue.trim().toLowerCase();
    if (!u) return setUsername({ state: 'idle' });
    setUsername({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const r = await authApi.usernameAvailable(u);
        setUsername(r.available ? { state: 'ok', message: 'Username is available' } : { state: 'bad', message: r.error ?? 'Not available', suggestions: r.suggestions });
      } catch {
        setUsername({ state: 'idle' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [usernameValue]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.pgName.trim().length < 2) e.pgName = 'Enter your PG’s name';
    if (!/^[a-z][a-z0-9_]{3,29}$/.test(usernameValue.trim().toLowerCase())) e.pgUsername = 'Start with a letter; 4–30 letters, numbers or underscores';
    else if (username.state === 'bad') e.pgUsername = username.message ?? 'Username is not available';
    if (form.password.length < 8) e.password = 'Use at least 8 characters';
    return e;
  };
  const locErrors = () => ({
    ...(loc.address.trim().length < 5 ? { address: 'Enter the street address' } : {}),
    ...(loc.city.trim().length < 2 ? { city: 'Enter the city' } : {}),
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    const le = locErrors();
    setErrors({ ...e, ...le });
    setFormError('');
    if (Object.keys(e).length || Object.keys(le).length) return;
    setBusy(true);
    const res = await ownerRegister({
      owner: { fullName: form.fullName.trim(), mobile: form.mobile, email: form.email.trim() },
      pg: {
        pgName: form.pgName.trim(), pgType: form.pgType, address: loc.address.trim(), area: loc.area.trim(), city: loc.city.trim(), state: loc.state.trim(), pinCode: loc.pinCode.trim(),
        ...(loc.latitude != null && loc.longitude != null ? { latitude: loc.latitude, longitude: loc.longitude } : {}),
      },
      pgUsername: usernameValue.trim().toLowerCase(),
      password: form.password,
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    navigate('/app/owner', { replace: true });
  };

  const input = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`r-${k}`}>{label}</label>
      <input id={`r-${k}`} className={`input-field ${errors[k] ? '!border-error' : ''}`} value={k === 'pgUsername' ? usernameValue : form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-error mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <AuthShell wide title="Register your PG" subtitle="Create your owner account and start adding rooms, beds and tenants.">
      <form onSubmit={submit} className="space-y-7" noValidate>
        <fieldset className="grid sm:grid-cols-2 gap-4">
          <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">About you</legend>
          <div className="sm:col-span-2">{input('fullName', 'Full name', { autoComplete: 'name' })}</div>
          {input('mobile', 'Mobile number', { inputMode: 'numeric', maxLength: 10, autoComplete: 'tel' })}
          {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
        </fieldset>

        <fieldset className="grid sm:grid-cols-2 gap-4">
          <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Your PG</legend>
          {input('pgName', 'PG name')}
          <div>
            <label className="field-label" htmlFor="r-pgType">Type</label>
            <select id="r-pgType" className="input-field" value={form.pgType} onChange={set('pgType')}>
              <option>Co-living</option><option>Boys</option><option>Girls</option><option>Other</option>
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Location</legend>
          <LocationPicker value={loc} onChange={setLoc} errors={{ address: errors.address as string | undefined, city: errors.city as string | undefined }} />
        </fieldset>

        <fieldset className="grid sm:grid-cols-2 gap-4">
          <legend className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Your login</legend>
          <div>
            {input('pgUsername', 'PG username', { onChange: (e) => { setUsernameTouched(true); set('pgUsername')(e); }, autoComplete: 'username' })}
            {!errors.pgUsername && username.state !== 'idle' && (
              <p className={`text-xs mt-1 ${username.state === 'ok' ? 'text-success' : username.state === 'bad' ? 'text-error' : 'text-dark-400'}`}>
                {username.state === 'checking' ? 'Checking…' : username.message}
              </p>
            )}
            {username.state === 'bad' && username.suggestions?.length ? (
              <p className="text-xs text-dark-500 mt-1">Try: {username.suggestions.map((s) => (
                <button type="button" key={s} className="text-primary hover:underline mr-2" onClick={() => { setUsernameTouched(true); setForm((f) => ({ ...f, pgUsername: s })); }}>{s}</button>
              ))}</p>
            ) : null}
          </div>
          {input('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
        </fieldset>

        {formError && <p role="alert" className="text-sm text-error bg-error-light rounded-lg px-3 py-2">{formError}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
        <p className="text-sm text-dark-500 text-center">Already registered? <Link to="/app/login" className="text-primary font-medium hover:underline">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
