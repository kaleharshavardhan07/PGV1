import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
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
    if (photos.length > 2) return setFormError('Choose a maximum of 2 PG photos.');
    setBusy(true);
    const body = new FormData();
    body.append('owner', JSON.stringify({ fullName: form.fullName.trim(), mobile: form.mobile, email: form.email.trim() }));
    body.append('pg', JSON.stringify({
        pgName: form.pgName.trim(), pgType: form.pgType, address: loc.address.trim(), area: loc.area.trim(), city: loc.city.trim(), state: loc.state.trim(), pinCode: loc.pinCode.trim(),
        ...(loc.latitude != null && loc.longitude != null ? { latitude: loc.latitude, longitude: loc.longitude } : {}),
      }));
    body.append('pgUsername', usernameValue.trim().toLowerCase());
    body.append('password', form.password);
    photos.forEach((photo) => body.append('photos', photo));
    const res = await ownerRegister(body);
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    setSubmitted(true);
  };

  const input = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`r-${k}`}>{label}</label>
      <input id={`r-${k}`} className={`input-field ${errors[k] ? '!border-error' : ''}`} value={k === 'pgUsername' ? usernameValue : form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-error mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <AuthShell wide title={submitted ? 'Registration submitted' : 'Register your PG'} subtitle={submitted ? 'Your PG will be visible after an admin approves it.' : 'Create your owner account and start adding rooms, beds and tenants.'}>
      {submitted ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e6f2ec] text-[#1f6b55]"><ShieldCheck size={30} /></div>
          <h2 className="mt-5 text-2xl font-bold text-[#20251f]">Thanks for registering!</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-[#687066]">An admin will review your PG details and photos. Once approved, you can log in and manage your PG.</p>
          <Link to="/app/login" className="mt-7 inline-flex rounded-full bg-[#1f6b55] px-6 py-3 text-sm font-bold text-white">Go to login</Link>
        </div>
      ) : <form onSubmit={submit} className="space-y-7" noValidate>
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

        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-dark-400">PG photos <span className="font-normal normal-case">(optional, max 2)</span></legend>
          <label htmlFor="pg-photos" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed border-[#cfd8d0] bg-[#f7fbf8] px-4 py-4 transition hover:border-[#1f6b55]">
            <div><p className="text-sm font-semibold text-[#334238]">Add photos of your PG</p><p className="mt-1 text-xs text-[#687066]">JPG, PNG or WebP · up to 5 MB each</p></div>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#1f6b55] shadow-sm">Choose files</span>
            <input id="pg-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              if (next.length > 2) { setFormError('Choose a maximum of 2 PG photos.'); setPhotos(next.slice(0, 2)); return; }
              if (next.some((file) => file.size > 5 * 1024 * 1024)) { setFormError('Each PG photo must be 5 MB or smaller.'); return; }
              setFormError(''); setPhotos(next);
            }} />
          </label>
          {photos.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{photos.map((photo) => <div key={`${photo.name}-${photo.lastModified}`} className="flex items-center gap-2 rounded-lg bg-dark-50 px-3 py-2 text-xs text-dark-600"><span className="truncate">{photo.name}</span></div>)}</div>}
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
      </form>}
    </AuthShell>
  );
}
