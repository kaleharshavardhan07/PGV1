import { useState } from 'react';
import { Building2, Bell, Globe, Save, Copy, Check, MapPin, ToggleRight, Lock } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import LocationPicker, { type LocationValue } from '../components/LocationPicker';
import { ChangePasswordCard } from './TenantProfilePage';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { FEATURES, FEATURE_LABELS } from '../types';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'UTC'];
const FEATURE_HINTS: Record<(typeof FEATURES)[number], string> = {
  rooms: 'Floor plan, bulk room creation and bed management',
  food: 'Weekly mess menu, opt-outs and ratings',
  expenses: 'Post expenses and collect receipts',
  documents: 'Tenant document uploads',
  billing: 'Invoices and billing records',
  complaints: 'Tenant complaints and resolution',
  exports: 'CSV / Excel data export',
};

const Toggle = ({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-primary' : 'bg-dark-300'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-4' : ''}`} />
  </button>
);

const SectionTitle = ({ icon: Icon, title, hint }: { icon: typeof Building2; title: string; hint: string }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center"><Icon size={18} /></div>
    <div><h2 className="font-semibold text-dark-900">{title}</h2><p className="text-xs text-dark-500">{hint}</p></div>
  </div>
);

export default function OwnerSettingsPage() {
  const { data, updateSettings, updateReminderSchedule, updateNotificationPrefs } = useAppStore();
  const toast = useToast();
  const s = data.settings;

  const [form, setForm] = useState({ name: s.name, ownerName: s.ownerName, contactPhone: s.contactPhone, contactEmail: s.contactEmail, timezone: s.timezone });
  const [loc, setLoc] = useState<LocationValue>(data.location);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hours, setHours] = useState(String(data.reminderSchedule.complaintUnresolvedHours));
  const [retries, setRetries] = useState(String(data.reminderSchedule.retryAttempts));

  const link = `${window.location.origin}/find-pg/${data.visibility.pgUsername}`;

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'PG name is required';
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) err.contactEmail = 'Enter a valid email';
    if (loc.address.trim().length < 3) err.address = 'Enter the street address';
    if (loc.city.trim().length < 2) err.city = 'Enter the city';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const res = await updateSettings({
      ...form, name: form.name.trim(),
      location: { address: loc.address.trim(), area: loc.area.trim(), city: loc.city.trim(), state: loc.state.trim(), pinCode: loc.pinCode.trim(), latitude: loc.latitude, longitude: loc.longitude },
    });
    setBusy(false);
    toast.show(res.ok ? 'Saved' : res.error, res.ok ? 'success' : 'error');
  };

  const text = (id: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`s-${id}`}>{label}</label>
      <input id={`s-${id}`} className={`input-field ${errors[id] ? '!border-error' : ''}`} value={form[id]} onChange={(e) => setForm({ ...form, [id]: e.target.value })} {...props} />
      {errors[id] && <p className="text-xs text-error mt-1">{errors[id]}</p>}
    </div>
  );

  const flip = async (key: string, value: boolean, label: string) => {
    const res = await updateSettings({ featuresEnabled: { [key]: value } });
    toast.show(res.ok ? `${label} ${value ? 'enabled' : 'disabled'}` : res.error, res.ok ? 'success' : 'error');
  };

  const saveReminders = async () => {
    const res = await updateReminderSchedule({ complaintUnresolvedHours: Math.max(1, Number(hours) || 48), retryAttempts: Math.max(0, Number(retries) || 0) });
    toast.show(res.ok ? 'Notification rules saved' : res.error, res.ok ? 'success' : 'error');
  };

  const setVis = (patch: Record<string, unknown>) => updateSettings(patch).then((r) => { if (!r.ok) toast.show(r.error, 'error'); });

  return (
    <AppLayout role="owner" title="Settings" subtitle="Your PG’s details, location, modules and notifications.">
      <div className="space-y-6 max-w-3xl">
        <form onSubmit={saveDetails} className="card p-6 space-y-7">
          <div>
            <SectionTitle icon={Building2} title="Property details" hint="Shown to tenants and on Find PG" />
            <div className="grid sm:grid-cols-2 gap-4">
              {text('name', 'PG name')}
              {text('ownerName', 'Owner name')}
              {text('contactPhone', 'Contact phone')}
              {text('contactEmail', 'Contact email', { type: 'email' })}
              <div><label className="field-label" htmlFor="s-tz"><Globe size={13} className="inline -mt-0.5 mr-1" />Timezone</label><select id="s-tz" className="input-field" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>{TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}</select></div>
            </div>
          </div>
          <div className="border-t border-dark-200 pt-6">
            <SectionTitle icon={MapPin} title="Location" hint="Search or drop a pin. Used for Find PG search and distance filters." />
            <LocationPicker value={loc} onChange={setLoc} errors={{ address: errors.address, city: errors.city }} />
          </div>
          <div className="flex justify-end"><button className="btn-primary" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save details & location'}</button></div>
        </form>

        <div className="card p-6">
          <SectionTitle icon={ToggleRight} title="Modules" hint="Switch optional features on or off for your PG" />
          <ul className="divide-y divide-dark-100">
            {FEATURES.map((f) => {
              const allowed = data.featureState.allowed[f];
              return (
                <li key={f} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-dark-800 flex items-center gap-2">{FEATURE_LABELS[f]}{!allowed && <span className="badge bg-dark-100 text-dark-500 inline-flex items-center gap-1"><Lock size={11} /> Disabled by platform admin</span>}</div>
                    <div className="text-xs text-dark-500">{FEATURE_HINTS[f]}</div>
                  </div>
                  <Toggle label={FEATURE_LABELS[f]} checked={allowed && data.featureState.enabled[f]} disabled={!allowed} onChange={(v) => flip(f, v, FEATURE_LABELS[f])} />
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-dark-400 mt-3">A switched-off module disappears from navigation and is blocked for everyone in your PG, including managers and tenants.</p>
        </div>

        <div className="card p-6">
          <SectionTitle icon={Globe} title="Find PG listing" hint="Let prospective tenants discover and contact you" />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">List my PG on Find PG</span><Toggle label="List on Find PG" checked={data.visibility.isDiscoverable} onChange={(v) => setVis({ isDiscoverable: v })} /></div>
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">Show available beds and prices</span><Toggle label="Show available beds" checked={data.visibility.showAvailableBeds} onChange={(v) => setVis({ showAvailableBeds: v })} /></div>
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">Show my phone number<span className="block text-xs text-dark-400">When off, people can still send you an enquiry.</span></span><Toggle label="Show phone number" checked={data.visibility.contactPublic} onChange={(v) => setVis({ contactPublic: v })} /></div>
            <div className="flex gap-2 pt-1">
              <input readOnly aria-label="Public listing link" className="input-field text-dark-500" value={link} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-secondary shrink-0" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button>
            </div>
          </div>
        </div>

        <div className="card p-6" id="notifications">
          <SectionTitle icon={Bell} title="Notifications" hint="Delivery channels and escalation rules" />
          <div className="space-y-4 mb-6">
            {([['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email']] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">{label} <span className="text-xs text-dark-400">(simulated: no provider connected)</span></span><Toggle label={label} checked={s.channels[k]} onChange={(v) => setVis({ channels: { [k]: v } })} /></div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 border-t border-dark-200 pt-5">
            <div><label className="field-label" htmlFor="s-hours">Escalate unresolved complaints after (hours)</label><input id="s-hours" type="number" min={1} className="input-field" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
            <div><label className="field-label" htmlFor="s-retry">Delivery retry attempts</label><input id="s-retry" type="number" min={0} max={10} className="input-field" value={retries} onChange={(e) => setRetries(e.target.value)} /></div>
          </div>
          <div className="flex justify-end mt-4"><button className="btn-secondary" onClick={saveReminders}>Save rules</button></div>
          {data.tenants.filter((t) => t.status !== 'Left').length > 0 && (
            <div className="border-t border-dark-200 mt-6 pt-5">
              <h3 className="text-sm font-semibold text-dark-800 mb-3">Tenant channel preferences</h3>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="table-head py-2">Tenant</th>{['WhatsApp', 'SMS', 'Email'].map((h) => <th key={h} className="table-head py-2 text-center">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-dark-100">{data.tenants.filter((t) => t.status !== 'Left').map((t) => {
                  const pref = data.notificationPrefs.find((p) => p.tenantId === t.id) ?? { whatsapp: true, sms: true, email: true };
                  return (<tr key={t.id}><td className="py-2.5 text-dark-800">{t.fullName}</td>{(['whatsapp', 'sms', 'email'] as const).map((k) => <td key={k} className="py-2.5 text-center"><input type="checkbox" aria-label={`${t.fullName} ${k}`} checked={pref[k]} onChange={() => updateNotificationPrefs(t.id, { [k]: !pref[k] })} className="rounded border-dark-300 text-primary" /></td>)}</tr>);
                })}</tbody></table></div>
            </div>
          )}
        </div>

        <ChangePasswordCard />
      </div>
    </AppLayout>
  );
}
