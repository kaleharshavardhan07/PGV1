import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import {
  Building2,
  Save,
  RotateCcw,
  Zap,
  UtensilsCrossed,
  Phone,
  Mail,
  MapPin,
  User,
  Bell,
  Clock,
  Globe,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { formatINR } from '../utils/format';

const parseDayList = (value: string): number[] =>
  value
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'UTC'];

export default function OwnerSettingsPage() {
  const { data, updateSettings, resetData, updateReminderSchedule, updateNotificationPrefs } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: data.settings.name,
    ownerName: data.settings.ownerName,
    address: data.settings.address,
    city: data.settings.city,
    contactPhone: data.settings.contactPhone,
    contactEmail: data.settings.contactEmail,
    electricityRate: String(data.settings.electricityRate),
    foodCharge: String(data.settings.foodCharge),
    timezone: data.settings.timezone,
  });

  // Notification schedule form (comma-separated day lists)
  const [scheduleForm, setScheduleForm] = useState({
    rentDaysBefore: data.reminderSchedule.rentDaysBefore.join(', '),
    rentOverdueDays: data.reminderSchedule.rentOverdueDays.join(', '),
    electricityDueDaysBefore: data.reminderSchedule.electricityDueDaysBefore.join(', '),
    electricityOverdueDays: data.reminderSchedule.electricityOverdueDays.join(', '),
    electricityDueInDays: String(data.reminderSchedule.electricityDueInDays),
    complaintUnresolvedHours: String(data.reminderSchedule.complaintUnresolvedHours),
    gracePeriodDays: String(data.reminderSchedule.gracePeriodDays),
    retryAttempts: String(data.reminderSchedule.retryAttempts),
  });
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'PG name is required';
    if (!form.ownerName.trim()) e.ownerName = 'Owner name is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!/^[6-9]\d{9}$/.test(form.contactPhone.replace(/\s/g, '').replace('+91', ''))) e.contactPhone = 'Enter a valid 10-digit mobile number';
    if (form.contactEmail && !/^\S+@\S+\.\S+$/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email';
    const rate = parseFloat(form.electricityRate);
    if (Number.isNaN(rate) || rate <= 0) e.electricityRate = 'Rate must be greater than 0';
    const food = parseFloat(form.foodCharge);
    if (Number.isNaN(food) || food < 0) e.foodCharge = 'Food charge cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    updateSettings({
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      electricityRate: parseFloat(form.electricityRate),
      foodCharge: parseFloat(form.foodCharge),
      timezone: form.timezone,
    });
    toast.show('Settings saved. New rates apply to future calculations.', 'success');
  };

  const validateSchedule = () => {
    const e: Record<string, string> = {};
    if (parseDayList(scheduleForm.rentDaysBefore).length === 0) e.rentDaysBefore = 'Enter at least one day (e.g. 5, 1)';
    if (parseDayList(scheduleForm.rentOverdueDays).length === 0) e.rentOverdueDays = 'Enter at least one day (e.g. 1, 3, 7)';
    if (parseDayList(scheduleForm.electricityDueDaysBefore).length === 0) e.electricityDueDaysBefore = 'Enter at least one day';
    if (parseDayList(scheduleForm.electricityOverdueDays).length === 0) e.electricityOverdueDays = 'Enter at least one day';
    for (const [key, label] of [
      ['electricityDueInDays', 'Electricity due window'],
      ['complaintUnresolvedHours', 'Complaint escalation'],
      ['gracePeriodDays', 'Grace period'],
      ['retryAttempts', 'Retry attempts'],
    ] as const) {
      const v = parseInt(scheduleForm[key], 10);
      if (Number.isNaN(v) || v < 0) e[key] = `${label} must be 0 or more`;
    }
    setScheduleErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveSchedule = () => {
    if (!validateSchedule()) return;
    updateReminderSchedule({
      rentDaysBefore: parseDayList(scheduleForm.rentDaysBefore),
      rentOverdueDays: parseDayList(scheduleForm.rentOverdueDays),
      electricityDueDaysBefore: parseDayList(scheduleForm.electricityDueDaysBefore),
      electricityOverdueDays: parseDayList(scheduleForm.electricityOverdueDays),
      electricityDueInDays: parseInt(scheduleForm.electricityDueInDays, 10),
      complaintUnresolvedHours: parseInt(scheduleForm.complaintUnresolvedHours, 10),
      gracePeriodDays: parseInt(scheduleForm.gracePeriodDays, 10),
      retryAttempts: parseInt(scheduleForm.retryAttempts, 10),
    });
    toast.show('Notification schedule saved. The automation engine uses it from the next scan.', 'success');
  };

  const toggleChannel = (channel: 'whatsapp' | 'sms' | 'email') => {
    updateSettings({
      channels: { ...data.settings.channels, [channel]: !data.settings.channels[channel] },
    });
  };

  const toggleTenantPref = (tenantId: string, key: 'whatsapp' | 'sms' | 'email') => {
    const pref = data.notificationPrefs.find((p) => p.tenantId === tenantId);
    if (!pref) return;
    updateNotificationPrefs(tenantId, { [key]: !pref[key] });
  };

  const handleReset = () => {
    resetData();
    toast.show('Reloaded the latest data from the server', 'info');
  };

  return (
    <AppLayout role="owner" title="PG Settings">
      <div className="space-y-6 max-w-4xl">
        <form onSubmit={handleSave} className="card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-dark-900">Property Details</h2>
              <p className="text-xs text-dark-500">Shown to tenants and on the public vacancy page</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">PG / Hostel Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`input-field ${errors.name ? 'border-error' : ''}`}
              />
              {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Owner Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className={`input-field pl-9 ${errors.ownerName ? 'border-error' : ''}`}
                />
              </div>
              {errors.ownerName && <p className="text-xs text-error mt-1">{errors.ownerName}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-700 mb-1">Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field pl-9" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">City *</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={`input-field ${errors.city ? 'border-error' : ''}`}
              />
              {errors.city && <p className="text-xs text-error mt-1">{errors.city}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className={`input-field pl-9 ${errors.contactPhone ? 'border-error' : ''}`}
                />
              </div>
              {errors.contactPhone && <p className="text-xs text-error mt-1">{errors.contactPhone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Contact Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className={`input-field pl-9 ${errors.contactEmail ? 'border-error' : ''}`}
                />
              </div>
              {errors.contactEmail && <p className="text-xs text-error mt-1">{errors.contactEmail}</p>}
            </div>
          </div>

          <div className="h-px bg-background-300" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-dark-900">Regional</h2>
              <p className="text-xs text-dark-500">Timezone used for billing schedules and notification timing</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="input-field"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-background-300" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-light text-warning flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-dark-900">Charges & Rates</h2>
              <p className="text-xs text-dark-500">Used for automatic electricity and rent calculations</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Electricity Rate (₹ per unit) *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.electricityRate}
                onChange={(e) => setForm({ ...form, electricityRate: e.target.value })}
                className={`input-field ${errors.electricityRate ? 'border-error' : ''}`}
              />
              {errors.electricityRate ? (
                <p className="text-xs text-error mt-1">{errors.electricityRate}</p>
              ) : (
                <p className="text-xs text-dark-400 mt-1">
                  Example: 214 units × {form.electricityRate || 0} = {formatINR(Math.round(214 * (parseFloat(form.electricityRate) || 0)))}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Monthly Food Charge (₹) *</label>
              <div className="relative">
                <UtensilsCrossed size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                <input
                  type="number"
                  min="0"
                  value={form.foodCharge}
                  onChange={(e) => setForm({ ...form, foodCharge: e.target.value })}
                  className={`input-field pl-9 ${errors.foodCharge ? 'border-error' : ''}`}
                />
              </div>
              {errors.foodCharge && <p className="text-xs text-error mt-1">{errors.foodCharge}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              <Save size={16} /> Save Settings
            </button>
          </div>
        </form>

        {/* Notification settings */}
        <div className="card p-6 space-y-6" id="notifications">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg text-dark-900">Notification Automation</h2>
                <p className="text-xs text-dark-500">
                  Reminder schedules, delivery channels and retry rules — used by the notification engine
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/app/notifications')} className="text-primary hover:underline text-sm shrink-0">
              View delivery log
            </button>
          </div>

          {/* Schedule */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-dark-800 mb-3">
              <Clock size={15} /> Reminder Schedule (days)
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {(
                [
                  ['rentDaysBefore', 'Rent reminders before due date', 'e.g. 5, 1'],
                  ['rentOverdueDays', 'Rent overdue follow-ups', 'e.g. 1, 3, 7 (7 escalates to owner)'],
                  ['electricityDueDaysBefore', 'Electricity reminders before due date', 'e.g. 5, 1'],
                  ['electricityOverdueDays', 'Electricity overdue follow-ups', 'e.g. 1, 3, 7'],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-dark-700 mb-1">{label}</label>
                  <input
                    value={scheduleForm[key]}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, [key]: e.target.value })}
                    className={`input-field ${scheduleErrors[key] ? 'border-error' : ''}`}
                    placeholder={hint}
                  />
                  {scheduleErrors[key] ? (
                    <p className="text-xs text-error mt-1">{scheduleErrors[key]}</p>
                  ) : (
                    <p className="text-xs text-dark-400 mt-1">{hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {(
              [
                ['electricityDueInDays', 'Electricity bill due window (days after publish)'],
                ['complaintUnresolvedHours', 'Complaint escalation (hours unresolved)'],
                ['gracePeriodDays', 'Subscription grace period (days)'],
                ['retryAttempts', 'Delivery retry attempts'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-dark-700 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={scheduleForm[key]}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, [key]: e.target.value })}
                  className={`input-field ${scheduleErrors[key] ? 'border-error' : ''}`}
                />
                {scheduleErrors[key] && <p className="text-xs text-error mt-1">{scheduleErrors[key]}</p>}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSaveSchedule} className="btn-primary">
              <Save size={16} /> Save Notification Schedule
            </button>
          </div>

          <div className="h-px bg-background-300" />

          {/* Channels */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-dark-800 mb-3">
              <Smartphone size={15} /> Delivery Channels
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {(
                [
                  ['whatsapp', 'WhatsApp', 'WhatsApp Business API (Growth plan+)', MessageCircle],
                  ['sms', 'SMS', 'SMS provider (all plans)', Smartphone],
                  ['email', 'Email', 'Email service (all plans)', Mail],
                ] as const
              ).map(([key, label, hint, Icon]) => {
                const enabled = data.settings.channels[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleChannel(key)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      enabled ? 'border-primary bg-primary-50' : 'border-background-300 bg-white hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-primary text-white' : 'bg-background-200 text-dark-400'}`}>
                        <Icon size={15} />
                      </div>
                      <span
                        className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                            enabled ? 'left-4.5 translate-x-0' : 'left-0.5'
                          }`}
                          style={{ left: enabled ? '18px' : '2px' }}
                        />
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-dark-900">{label}</div>
                    <div className="text-xs text-dark-500">{hint}</div>
                    <div className="text-[11px] mt-1 font-medium text-dark-400">
                      {enabled ? 'Simulated delivery in demo' : 'Disabled'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-background-300" />

          {/* Tenant communication preferences */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-dark-800 mb-1">
              <User size={15} /> Tenant Communication Preferences
            </div>
            <p className="text-xs text-dark-500 mb-3">
              Respect each tenant's preferred optional channels. In-app notifications are always delivered.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-400 border-b border-background-300">
                    <th className="py-2 pr-4 font-medium">Tenant</th>
                    <th className="py-2 pr-4 font-medium text-center">WhatsApp</th>
                    <th className="py-2 pr-4 font-medium text-center">SMS</th>
                    <th className="py-2 font-medium text-center">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((t) => {
                    const pref = data.notificationPrefs.find((p) => p.tenantId === t.id);
                    if (!pref) return null;
                    return (
                      <tr key={t.id} className="border-b border-background-200">
                        <td className="py-2.5 pr-4 font-medium text-dark-800">{t.fullName}</td>
                        {(['whatsapp', 'sms', 'email'] as const).map((k) => (
                          <td key={k} className="py-2.5 pr-4 text-center">
                            <button
                              onClick={() => toggleTenantPref(t.id, k)}
                              className={`w-9 h-5 rounded-full relative transition-colors ${
                                pref[k] ? 'bg-primary' : 'bg-gray-300'
                              }`}
                              aria-label={`Toggle ${k} for ${t.fullName}`}
                            >
                              <span
                                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                                style={{ left: pref[k] ? '18px' : '2px' }}
                              />
                            </button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-2">Data Refresh</h3>
          <p className="text-sm text-dark-500 mb-4">
            All records live in MongoDB and are served by the Aapka PG API. Reload the latest state if another
            device changed something.
          </p>
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw size={16} /> Refresh Data
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
