// Public PG owner onboarding wizard (simulated payment gateway).
// Owner Registration → Subscription Payment (verified callback) → Unique PG
// Username → Owner Password → PG Activation → Owner Dashboard.
// The in-progress registration is persisted in the store, so the flow survives
// a browser refresh ("payment succeeded but browser closed" edge case).

import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CircleCheck,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Copy,
  TriangleAlert,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
} from 'lucide-react';
import { PLANS, FREE_TRIAL_DAYS, ANNUAL_DISCOUNT_PERCENT, getPlan } from '../data/plans';
import type { BillingCycle, PlanId, PGType, SaaSPaymentMethod } from '../types';
import { useAppStore } from '../store/appStore';
import { passwordStrength, validatePassword } from '../services/authService';

const STEPS = ['Plan', 'Register', 'Billing', 'Payment', 'Username', 'Password', 'Done'] as const;

const PG_TYPES: PGType[] = ['Boys', 'Girls', 'Co-living', 'Other'];
const STATES = [
  'Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Telangana', 'Gujarat',
  'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Kerala', 'Punjab', 'Other',
];

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const {
    data,
    startOwnerRegistration,
    submitRegistrationPayment,
    completeRegistrationPayment,
    confirmPgUsername,
    setOwnerPasswordAndActivate,
  } = useAppStore();

  const resumeId = params.get('resume');
  const resumed = useMemo(
    () => data.platform.pendingRegistrations.find((r) => r.id === resumeId),
    [data.platform.pendingRegistrations, resumeId]
  );

  const initialPlan = (params.get('plan') as PlanId) ?? 'growth';

  const [step, setStep] = useState(() => {
    if (resumed) {
      if (resumed.status === 'Active') return 6;
      if (resumed.status === 'Username Confirmed') return 5;
      if (resumed.status === 'Payment Verified') return 4;
      if (resumed.status === 'Payment Pending Verification') return 3;
      if (resumed.status === 'Payment Failed') return 3;
      if (resumed.status === 'Awaiting Payment') return 2;
      return 1;
    }
    return 0;
  });
  const [regId, setRegId] = useState<string | null>(resumed?.id ?? null);
  const reg = useMemo(
    () => data.platform.pendingRegistrations.find((r) => r.id === regId),
    [data.platform.pendingRegistrations, regId]
  );

  const [planId, setPlanId] = useState<PlanId>(PLANS.some((p) => p.id === initialPlan) ? initialPlan : 'growth');
  const [cycle, setCycle] = useState<BillingCycle>(resumed?.cycle ?? 'monthly');
  const [method, setMethod] = useState<SaaSPaymentMethod>('UPI');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [duplicateNotice, setDuplicateNotice] = useState('');

  // registration form
  const [form, setForm] = useState({
    ownerName: resumed?.owner.fullName ?? '',
    mobile: resumed?.owner.mobile ?? '',
    email: resumed?.owner.email ?? '',
    pgName: resumed?.pg.pgName ?? '',
    address: resumed?.pg.address ?? '',
    city: resumed?.pg.city ?? '',
    state: resumed?.pg.state ?? 'Maharashtra',
    pinCode: resumed?.pg.pinCode ?? '',
    rooms: resumed ? String(resumed.pg.rooms) : '',
    beds: resumed ? String(resumed.pg.beds) : '',
    description: resumed?.pg.description ?? '',
    pgType: resumed?.pg.pgType ?? ('Co-living' as PGType),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // username step
  const [usernameInput, setUsernameInput] = useState(resumed?.pgUsername ?? '');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>(resumed?.suggestedUsernames ?? []);

  // password step
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmedUsername, setConfirmedUsername] = useState(resumed?.pgUsername ?? '');

  const plan = getPlan(planId);
  const amount = cycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const strength = passwordStrength(password);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (form.ownerName.trim().length < 3) e.ownerName = 'Owner full name is required';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.pgName.trim()) e.pgName = 'PG / hostel name is required';
    if (!form.address.trim()) e.address = 'PG address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!/^\d{6}$/.test(form.pinCode)) e.pinCode = 'Enter a valid 6-digit PIN code';
    const rooms = parseInt(form.rooms, 10);
    const beds = parseInt(form.beds, 10);
    if (!rooms || rooms <= 0) e.rooms = 'Enter number of rooms';
    if (!beds || beds <= 0) e.beds = 'Enter number of beds';
    else if (plan.limits.beds !== null && beds > plan.limits.beds)
      e.beds = `${plan.name} supports up to ${plan.limits.beds} beds — choose a bigger plan`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    const result = await startOwnerRegistration({
      owner: { fullName: form.ownerName.trim(), mobile: form.mobile, email: form.email.trim() },
      pg: {
        pgName: form.pgName.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        pinCode: form.pinCode,
        rooms: parseInt(form.rooms, 10),
        beds: parseInt(form.beds, 10),
        description: form.description.trim(),
        pgType: form.pgType,
      },
      planId,
      cycle,
      amount,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setRegId(result.regId);
    setStep(2);
  };

  const handlePay = (outcome: 'success' | 'failure') => {
    if (!regId) return;
    setProcessing(true);
    setError('');
    setDuplicateNotice('');
    const paymentResult = submitRegistrationPayment(regId, method);
    if (!paymentResult.ok) {
      setProcessing(false);
      setError(paymentResult.error);
      return;
    }
    // Simulated gateway round-trip → callback → backend verification
    setTimeout(async () => {
      const result = await completeRegistrationPayment(regId, outcome);
      setProcessing(false);
      if (!result.ok) {
        if (result.duplicate) setDuplicateNotice(result.error);
        else setError(result.error);
        return;
      }
      // suggestedUsernames were generated at registration time
      setUsernameSuggestions(reg?.suggestedUsernames ?? []);
      setUsernameInput(reg?.suggestedUsernames?.[0] ?? '');
      setStep(4);
    }, 1800);
  };

  const handleConfirmUsername = async () => {
    if (!regId) return;
    setError('');
    const result = await confirmPgUsername(regId, usernameInput);
    if (!result.ok) {
      setError(result.error);
      if (result.suggestions) setUsernameSuggestions(result.suggestions);
      return;
    }
    setConfirmedUsername(result.username);
    setStep(5);
  };

  const handleSetPassword = async () => {
    if (!regId) return;
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const policy = validatePassword(password);
    if (!policy.ok) {
      setError(`Password must include ${policy.errors.join(', ')}`);
      return;
    }
    setProcessing(true);
    const result = await setOwnerPasswordAndActivate(regId, password);
    setProcessing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmedUsername(result.username);
    setStep(6);
  };

  const handleFinish = () => {
    // Activation already issued a session token, so go straight to the dashboard.
    navigate('/app/owner');
  };

  const stepIndexForProgress = step;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background-200 to-background-100">
      {/* Header */}
      <header className="border-b border-background-300 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              A
            </div>
            <span className="text-xl font-bold text-dark-900">Aapka PG</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <ShieldCheck size={14} className="text-success" />
            Demo checkout · payments are simulated &amp; verified
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-10 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < stepIndexForProgress
                      ? 'bg-success text-white'
                      : i === stepIndexForProgress
                      ? 'bg-primary text-white'
                      : 'bg-background-300 text-dark-400'
                  }`}
                >
                  {i < stepIndexForProgress ? <CircleCheck size={14} /> : i + 1}
                </div>
                <span className={`text-[11px] mt-1.5 ${i <= stepIndexForProgress ? 'text-dark-800 font-medium' : 'text-dark-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 mx-1 mb-5 ${i < stepIndexForProgress ? 'bg-success' : 'bg-background-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Plan */}
        {step === 0 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-dark-900 text-center mb-2">Choose Your Plan</h1>
            <p className="text-dark-500 text-center mb-8 text-sm">
              Every plan includes a {FREE_TRIAL_DAYS}-day free trial option. Sample pricing — final commercial pricing TBD.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`text-left rounded-2xl p-6 border-2 transition-all ${
                    planId === p.id ? 'border-primary bg-white shadow-glow' : 'border-background-300 bg-white/60 hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-dark-900">{p.name.toUpperCase()}</span>
                    {planId === p.id && <CircleCheck size={18} className="text-primary" />}
                  </div>
                  <p className="text-xs text-dark-500 mb-4">{p.tagline}</p>
                  <div className="text-2xl font-bold text-dark-900">
                    ₹{p.monthlyPrice.toLocaleString('en-IN')}
                    <span className="text-sm font-medium text-dark-400">/mo</span>
                  </div>
                  <p className="text-xs text-dark-400 mt-1">
                    {p.limits.rooms === null ? 'Unlimited' : p.limits.rooms} rooms ·{' '}
                    {p.limits.beds === null ? 'Unlimited' : p.limits.beds} beds
                  </p>
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-10">
              <Link to="/" className="btn-secondary">
                <ArrowLeft size={16} /> Back to Website
              </Link>
              <button onClick={() => setStep(1)} className="btn-primary">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Owner + PG registration */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-dark-900 text-center mb-2">Register Your PG</h1>
            <p className="text-dark-500 text-center mb-8 text-sm">
              This creates your owner account and PG profile. Your PG username is generated after payment.
            </p>
            <div className="card p-8 space-y-6">
              <div>
                <h3 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Owner Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Owner Full Name *</label>
                    <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className={`input-field ${errors.ownerName ? 'border-error' : ''}`} placeholder="Your full name" />
                    {errors.ownerName && <p className="text-xs text-error mt-1">{errors.ownerName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number *</label>
                    <input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`input-field ${errors.mobile ? 'border-error' : ''}`} placeholder="9876543210" />
                    {errors.mobile && <p className="text-xs text-error mt-1">{errors.mobile}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-dark-700 mb-1">Email Address *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`input-field ${errors.email ? 'border-error' : ''}`} placeholder="name@example.com" />
                    {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>

              <div className="h-px bg-background-300" />

              <div>
                <h3 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">PG Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">PG / Hostel Name *</label>
                    <input value={form.pgName} onChange={(e) => setForm({ ...form, pgName: e.target.value })} className={`input-field ${errors.pgName ? 'border-error' : ''}`} placeholder="e.g. Sunrise Residency" />
                    {errors.pgName && <p className="text-xs text-error mt-1">{errors.pgName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">PG Type *</label>
                    <select value={form.pgType} onChange={(e) => setForm({ ...form, pgType: e.target.value as PGType })} className="input-field">
                      {PG_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-dark-700 mb-1">PG Address *</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`input-field ${errors.address ? 'border-error' : ''}`} placeholder="Street, area" />
                    {errors.address && <p className="text-xs text-error mt-1">{errors.address}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">City *</label>
                    <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={`input-field ${errors.city ? 'border-error' : ''}`} placeholder="e.g. Pune" />
                    {errors.city && <p className="text-xs text-error mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">State *</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="input-field">
                      {STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">PIN Code *</label>
                    <input value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className={`input-field ${errors.pinCode ? 'border-error' : ''}`} placeholder="411045" />
                    {errors.pinCode && <p className="text-xs text-error mt-1">{errors.pinCode}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Rooms *</label>
                      <input type="number" min="1" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} className={`input-field ${errors.rooms ? 'border-error' : ''}`} />
                      {errors.rooms && <p className="text-xs text-error mt-1">{errors.rooms}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Total Beds *</label>
                      <input type="number" min="1" value={form.beds} onChange={(e) => setForm({ ...form, beds: e.target.value })} className={`input-field ${errors.beds ? 'border-error' : ''}`} />
                      {errors.beds && <p className="text-xs text-error mt-1">{errors.beds}</p>}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-dark-700 mb-1">PG Description</label>
                    <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Tell tenants what makes your PG great — food, WiFi, location…" />
                  </div>
                </div>
              </div>

              {error && <div className="p-3 rounded-xl bg-error-light text-sm text-error">{error}</div>}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(0)} className="btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleRegister} className="btn-primary">
                Continue to Billing <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Billing cycle */}
        {step === 2 && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-dark-900 text-center mb-2">Select Billing Cycle</h1>
            <p className="text-dark-500 text-center mb-8 text-sm">Switch to annual billing and save {ANNUAL_DISCOUNT_PERCENT}%.</p>
            <div className="space-y-4">
              {(['monthly', 'annual'] as BillingCycle[]).map((c) => {
                const price = c === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                return (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className={`w-full card p-5 flex items-center justify-between border-2 text-left transition-all ${
                      cycle === c ? 'border-primary' : 'border-transparent hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cycle === c ? 'bg-primary text-white' : 'bg-background-200 text-dark-500'}`}>
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900 capitalize">{c}</div>
                        <div className="text-xs text-dark-500">
                          {c === 'annual' ? `Save ${ANNUAL_DISCOUNT_PERCENT}% · ₹${price.toLocaleString('en-IN')}/year` : 'Pay every month'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-dark-900">₹{price.toLocaleString('en-IN')}</div>
                      {c === 'annual' && <div className="text-xs text-success">₹{Math.round(price / 12).toLocaleString('en-IN')}/mo</div>}
                    </div>
                  </button>
                );
              })}
              <div className="card p-5 bg-background-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-dark-600">{plan.name} plan · {cycle}</span>
                  <span className="font-semibold text-dark-900">₹{amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-background-300 pt-2">
                  <span className="font-bold text-dark-900">Total due now (simulated)</span>
                  <span className="font-bold text-primary">₹{amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary">
                Continue to Payment <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment (simulated gateway + verified callback) */}
        {step === 3 && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-dark-900 text-center mb-2">Complete Your Payment</h1>
            <p className="text-dark-500 text-center mb-8 text-sm">
              Simulated gateway — the PG activates only after the payment callback is verified (signature + duplicate check).
            </p>
            <div className="card p-8">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-background-300">
                <div>
                  <div className="font-bold text-dark-900">{plan.name} · {cycle === 'monthly' ? 'Monthly' : 'Annual'}</div>
                  <div className="text-xs text-dark-500">{form.pgName || reg?.pg.pgName} · order {reg?.orderId ?? '—'}</div>
                </div>
                <div className="text-2xl font-bold text-primary">₹{amount.toLocaleString('en-IN')}</div>
              </div>

              <label className="block text-sm font-medium text-dark-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {(['UPI', 'Card', 'Net Banking'] as SaaSPaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      method === m ? 'border-primary bg-primary-50 text-primary' : 'border-background-300 text-dark-600 hover:border-primary-200'
                    }`}
                  >
                    <CreditCard size={16} className="mx-auto mb-1" />
                    {m}
                  </button>
                ))}
              </div>

              {reg?.status === 'Payment Failed' && (
                <div className="mb-4 p-3 rounded-xl bg-warning-light flex items-start gap-2">
                  <TriangleAlert size={16} className="text-warning mt-0.5 shrink-0" />
                  <div className="text-xs text-dark-600">
                    The previous payment attempt failed verification. You can safely retry — duplicate callbacks are ignored.
                  </div>
                </div>
              )}
              {duplicateNotice && (
                <div className="mb-4 p-3 rounded-xl bg-primary-50 text-xs text-dark-700">{duplicateNotice}</div>
              )}
              {error && <div className="mb-4 p-3 rounded-xl bg-error-light text-sm text-error">{error}</div>}

              <button onClick={() => handlePay('success')} disabled={processing} className="btn-primary w-full py-3.5">
                {processing ? 'Processing payment & verifying callback…' : `Pay ₹${amount.toLocaleString('en-IN')} Securely`}
              </button>

              <div className="mt-4 p-3 rounded-xl bg-warning-light flex items-start gap-2">
                <TriangleAlert size={16} className="text-warning mt-0.5 shrink-0" />
                <div className="text-xs text-dark-600">
                  <button onClick={() => handlePay('failure')} disabled={processing} className="font-semibold text-warning hover:underline">
                    Simulate a payment failure
                  </button>{' '}
                  to preview failed-payment handling and safe retries.
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(2)} className="btn-secondary" disabled={processing}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>
          </div>
        )}

        {/* Step 5: PG username confirmation */}
        {step === 4 && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-success-light text-success flex items-center justify-center mx-auto mb-4">
                <CircleCheck size={30} />
              </div>
              <h1 className="text-2xl font-bold text-dark-900">Your PG is Ready to Join Aapka PG!</h1>
              <p className="text-dark-500 text-sm mt-2">
                Payment verified. Now choose your unique PG username — tenants will use it to find your PG.
              </p>
            </div>
            <div className="card p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-dark-400 mb-1">PG Name</div>
                  <div className="font-semibold text-dark-900">{reg?.pg.pgName}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-400 mb-1">Subscription</div>
                  <div className="font-semibold text-dark-900">{plan.name} · {cycle}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-400 mb-1">Activation Date</div>
                  <div className="font-semibold text-dark-900">{new Date().toLocaleDateString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-400 mb-1">Renewal Date</div>
                  <div className="font-semibold text-dark-900">
                    {(() => {
                      const d = new Date();
                      if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
                      else d.setFullYear(d.getFullYear() + 1);
                      return d.toLocaleDateString('en-IN');
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Unique PG Username *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-300 text-sm">@</span>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className={`input-field pl-9 ${error ? 'border-error' : ''}`}
                    placeholder="e.g. sunrise_residency_4821"
                  />
                </div>
                {error && <p className="text-xs text-error mt-1">{error}</p>}
                <p className="text-xs text-dark-400 mt-1">
                  Lowercase letters, numbers and underscores · 4–30 characters · globally unique
                </p>
              </div>

              {usernameSuggestions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-dark-600 mb-2 flex items-center gap-1">
                    <Sparkles size={13} className="text-primary" /> Suggested usernames
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setUsernameInput(s);
                          setError('');
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          usernameInput === s ? 'bg-primary text-white border-primary' : 'border-background-300 text-dark-600 hover:border-primary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(3)} className="btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleConfirmUsername} className="btn-primary">
                Confirm Username <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Set password */}
        {step === 5 && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-dark-900 text-center mb-2">Create Your Password</h1>
            <p className="text-dark-500 text-center mb-8 text-sm">
              You'll log in to your owner dashboard with your PG username and this password.
            </p>
            <div className="card p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">PG Username (read-only)</label>
                <input value={confirmedUsername || reg?.pgUsername || ''} disabled className="input-field bg-background-200 text-dark-600 font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Create Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Min 8 chars with upper, lower and number"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < strength.score ? strength.color : 'bg-background-300'}`} />
                      ))}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">Strength: {strength.label}</div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field ${confirmPassword && confirmPassword !== password ? 'border-error' : ''}`}
                  placeholder="Re-enter your password"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-error mt-1">Passwords do not match</p>
                )}
              </div>
              {error && <div className="p-3 rounded-xl bg-error-light text-sm text-error">{error}</div>}
              <div className="text-xs text-dark-400 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-success" />
                Stored as a bcrypt hash on the server — never in plain text.
              </div>
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(4)} className="btn-secondary" disabled={processing}>
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={handleSetPassword} disabled={processing} className="btn-primary">
                {processing ? 'Activating your PG…' : 'Set Password & Activate PG'}
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Done */}
        {step === 6 && (
          <div className="max-w-xl mx-auto text-center animate-fade-in">
            <div className="w-20 h-20 bg-success-light text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <CircleCheck size={40} />
            </div>
            <h1 className="text-2xl font-bold text-dark-900 mb-3">Congratulations! Your PG is now registered on Aapka PG.</h1>
            <p className="text-dark-600 mb-8">
              Share your unique PG username with your tenants so they can request to join your PG.
            </p>

            <div className="card p-6 mb-6">
              <div className="text-xs text-dark-400 mb-1">Your PG Username</div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-bold text-primary font-mono">{confirmedUsername || reg?.pgUsername}</span>
                <button
                  onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText(confirmedUsername || reg?.pgUsername || '').catch(() => undefined);
                  }}
                  className="p-2 rounded-lg bg-primary-50 text-primary hover:bg-primary-100 transition-colors"
                  title="Copy username"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="card p-5 text-left space-y-2 text-sm mb-8">
              <div className="flex justify-between">
                <span className="text-dark-500">PG Name</span>
                <span className="font-semibold text-dark-900">{reg?.pg.pgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Plan</span>
                <span className="font-semibold text-dark-900">{plan.name} · {cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-500">Status</span>
                <span className="font-semibold text-success">Active · Discoverable</span>
              </div>
            </div>

            <button onClick={handleFinish} className="btn-primary w-full py-3.5">
              <Building2 size={18} /> Go to Owner Dashboard
            </button>
            <button onClick={() => navigate('/')} className="text-sm text-dark-500 hover:text-primary mt-4">
              Back to website
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
