import { useState } from 'react';
import { Building2, Zap, Bell, Globe, Save, Copy, Check } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { ChangePasswordCard } from './TenantProfilePage';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'UTC'];

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-dark-300'}`}
  >
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

  const [form, setForm] = useState({
    name: s.name, ownerName: s.ownerName, address: s.address, city: s.city, contactPhone: s.contactPhone,
    contactEmail: s.contactEmail, electricityRate: String(s.electricityRate), timezone: s.timezone,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hours, setHours] = useState(String(data.reminderSchedule.complaintUnresolvedHours));
  const [retries, setRetries] = useState(String(data.reminderSchedule.retryAttempts));

  const vacancyLink = `${window.location.origin}/vacancy?pg=${data.visibility.pgUsername}`;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'PG name is required';
    if (!form.city.trim()) err.city = 'City is required';
    if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) err.contactEmail = 'Enter a valid email';
    if (form.electricityRate === '' || Number(form.electricityRate) < 0) err.electricityRate = 'Enter a rate of 0 or more';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const res = await updateSettings({ ...form, name: form.name.trim(), city: form.city.trim(), electricityRate: Number(form.electricityRate) });
    setBusy(false);
    toast.show(res.ok ? 'Settings saved' : res.error, res.ok ? 'success' : 'error');
  };

  const text = (id: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`s-${id}`}>{label}</label>
      <input id={`s-${id}`} className={`input-field ${errors[id] ? '!border-error' : ''}`} value={form[id]} onChange={(e) => setForm({ ...form, [id]: e.target.value })} {...props} />
      {errors[id] && <p className="text-xs text-error mt-1">{errors[id]}</p>}
    </div>
  );

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(vacancyLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const saveReminders = async () => {
    const res = await updateReminderSchedule({ complaintUnresolvedHours: Math.max(1, Number(hours) || 48), retryAttempts: Math.max(0, Number(retries) || 0) });
    toast.show(res.ok ? 'Notification rules saved' : res.error, res.ok ? 'success' : 'error');
  };

  return (
    <AppLayout role="owner" title="Settings" subtitle="Your PG’s details, rates, public visibility and notifications.">
      <div className="space-y-6 max-w-3xl">
        <form onSubmit={save} className="card p-6 space-y-6">
          <div>
            <SectionTitle icon={Building2} title="Property details" hint="Shown to tenants and on the public vacancy page" />
            <div className="grid sm:grid-cols-2 gap-4">
              {text('name', 'PG name')}
              {text('ownerName', 'Owner name')}
              <div className="sm:col-span-2">{text('address', 'Address')}</div>
              {text('city', 'City')}
              {text('contactPhone', 'Contact phone')}
              {text('contactEmail', 'Contact email', { type: 'email' })}
              <div>
                <label className="field-label" htmlFor="s-tz"><Globe size={13} className="inline -mt-0.5 mr-1" />Timezone</label>
                <select id="s-tz" className="input-field" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                  {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="border-t border-dark-200 pt-6">
            <SectionTitle icon={Zap} title="Electricity" hint="Default rate used when recording meter readings" />
            <div className="max-w-xs">{text('electricityRate', 'Rate (₹ per unit)', { type: 'number', step: '0.1', min: 0 })}</div>
          </div>
          <div className="flex justify-end"><button className="btn-primary" disabled={busy}><Save size={16} /> {busy ? 'Saving…' : 'Save settings'}</button></div>
        </form>

        <div className="card p-6">
          <SectionTitle icon={Globe} title="Public vacancy page" hint="Let prospective tenants see which beds are free" />
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">List my PG in the public directory</span><Toggle label="List in directory" checked={data.visibility.isDiscoverable} onChange={(v) => updateSettings({ isDiscoverable: v })} /></div>
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-dark-700">Show available beds</span><Toggle label="Show available beds" checked={data.visibility.showAvailableBeds} onChange={(v) => updateSettings({ showAvailableBeds: v })} /></div>
            <div className="flex gap-2 pt-1">
              <input readOnly aria-label="Public vacancy link" className="input-field text-dark-500" value={vacancyLink} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn-secondary shrink-0" onClick={copyLink}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}</button>
            </div>
          </div>
        </div>

        <div className="card p-6" id="notifications">
          <SectionTitle icon={Bell} title="Notifications" hint="Delivery channels and escalation rules" />
          <div className="space-y-4 mb-6">
            {([['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email']] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <span className="text-sm text-dark-700">{label} <span className="text-xs text-dark-400">(simulated — no provider connected)</span></span>
                <Toggle label={label} checked={s.channels[k]} onChange={(v) => updateSettings({ channels: { [k]: v } })} />
              </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><th className="table-head py-2">Tenant</th>{['WhatsApp', 'SMS', 'Email'].map((h) => <th key={h} className="table-head py-2 text-center">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-dark-100">
                    {data.tenants.filter((t) => t.status !== 'Left').map((t) => {
                      const pref = data.notificationPrefs.find((p) => p.tenantId === t.id) ?? { whatsapp: true, sms: true, email: true };
                      return (
                        <tr key={t.id}>
                          <td className="py-2.5 text-dark-800">{t.fullName}</td>
                          {(['whatsapp', 'sms', 'email'] as const).map((k) => (
                            <td key={k} className="py-2.5 text-center"><input type="checkbox" aria-label={`${t.fullName} ${k}`} checked={pref[k]} onChange={() => updateNotificationPrefs(t.id, { [k]: !pref[k] })} className="rounded border-dark-300 text-primary focus:ring-primary-200" /></td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <ChangePasswordCard />
      </div>
    </AppLayout>
  );
}
