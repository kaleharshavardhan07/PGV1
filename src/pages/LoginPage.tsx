// Login page with three experiences:
// - Tenant: mobile OTP authentication (demo) + account registration
// - PG Owner: unique PG username + password login, forgot password, register link
// - Manager: demo access to the active PG workspace

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import {
  CircleCheck,
  User,
  Building2,
  Shield,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  UserPlus,
  RotateCcw,
} from 'lucide-react';
import { DEMO_RESET_CODE, validatePassword } from '../services/authService';

type Mode =
  | 'choose'
  | 'tenant-mobile'
  | 'tenant-otp'
  | 'tenant-register'
  | 'owner-login'
  | 'owner-forgot'
  | 'owner-reset'
  | 'manager-login';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    tenantLogin,
    tenantSendOtp,
    tenantRegister,
    ownerLogin,
    managerLogin,
    resetOwnerPassword,
  } = useAppStore();

  const [mode, setMode] = useState<Mode>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // tenant state
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // owner state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetUser, setResetUser] = useState('');

  // manager state
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  const back = () => {
    setMode('choose');
    setError('');
    setNotice('');
    setOtp('');
  };

  // ---------- Tenant flow ----------
  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    const result = await tenantSendOtp(mobile);
    setLoading(false);
    if (!result.ok) {
      // No account for this number yet → go straight to the registration form.
      if (/no tenant account/i.test(result.error)) {
        setNotice(`No account exists for +91 ${mobile} yet. Create one below to continue.`);
        setMode('tenant-register');
        return;
      }
      setError(result.error);
      return;
    }
    setNotice(result.demoOtp ? `Demo OTP sent: ${result.demoOtp}` : 'OTP sent to your mobile');
    setMode('tenant-otp');
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await tenantLogin(mobile, { otp });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      if (/no tenant account/i.test(result.error)) setMode('tenant-register');
      return;
    }
    navigate('/app/tenant');
  };

  const registerTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regName.trim().length < 3) {
      setError('Enter your full name');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (regEmail && !/^\S+@\S+\.\S+$/.test(regEmail)) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    setLoading(true);
    const result = await tenantRegister({ fullName: regName.trim(), mobile, email: regEmail.trim() });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/app/tenant/admission');
  };

  // ---------- Owner flow ----------
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await ownerLogin(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/app/owner');
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await managerLogin(managerEmail, managerPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate('/app/manager');
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your PG username or owner email');
      return;
    }
    setError('');
    setResetUser(username.trim());
    setNotice(
      `If an account exists for "${username.trim()}", a reset code has been sent to its registered contact. (Demo code: ${DEMO_RESET_CODE})`
    );
    setMode('owner-reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await resetOwnerPassword(resetUser, resetCode, newPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice('Password updated successfully. You can now log in.');
    setPassword('');
    setMode('owner-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-200 to-background-300 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-2xl font-bold mb-4 shadow-glow">
            A
          </div>
          <h1 className="text-3xl font-bold text-dark-900">Welcome to Aapka PG</h1>
          <p className="text-dark-600 mt-2">Your PG. Your People. Everything in Control.</p>
        </div>

        {mode === 'choose' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-dark-900 mb-4">Log in as</h2>
            <div className="space-y-3">
              <button
                onClick={() => setMode('tenant-mobile')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-primary-200 hover:border-primary hover:bg-primary-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-dark-900 group-hover:text-blue-600 transition-colors">Tenant</div>
                  <div className="text-xs text-dark-500">Find your PG with mobile OTP</div>
                </div>
                <CircleCheck className="ml-auto text-gray-300 group-hover:text-success" size={20} />
              </button>

              <button
                onClick={() => setMode('owner-login')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-purple-200 hover:border-purple-600 hover:bg-purple-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="font-bold text-dark-900 group-hover:text-purple-600 transition-colors">PG Owner</div>
                  <div className="text-xs text-dark-500">Log in with your PG username &amp; password</div>
                </div>
                <CircleCheck className="ml-auto text-gray-300 group-hover:text-success" size={20} />
              </button>

              <button
                onClick={() => setMode('manager-login')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-orange-200 hover:border-orange-600 hover:bg-orange-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="font-bold text-dark-900 group-hover:text-orange-600 transition-colors">Manager</div>
                  <div className="text-xs text-dark-500">PG staff login</div>
                </div>
                <CircleCheck className="ml-auto text-gray-300 group-hover:text-success" size={20} />
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
              <div className="text-xs text-warning font-medium mb-1">Demo credentials</div>
              <ul className="text-xs text-dark-600 space-y-1">
                <li>Owner: <strong>shreeganesh_pg_4821</strong> / <strong>demo1234</strong></li>
                <li>Manager: <strong>manager@shreeganeshpg.in</strong> / <strong>demo1234</strong></li>
                <li>Tenant: <strong>9876500011</strong> (Amit Kumar) · OTP <strong>1234</strong></li>
                <li>New owner? <a href="/subscribe" className="text-primary font-semibold hover:underline">Register your PG →</a></li>
              </ul>
            </div>
          </div>
        )}

        {/* Manager: login */}
        {mode === 'manager-login' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={back} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-orange-600" />
              <h2 className="text-xl font-bold text-dark-900">Manager Login</h2>
            </div>
            <p className="text-dark-500 text-sm mb-5">Sign in with the staff email and password set by your PG owner.</p>
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  className="input-field"
                  placeholder="manager@yourpg.in"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  className="input-field"
                  placeholder="Your password"
                />
              </div>
              {error && <div className="text-error text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* Tenant: mobile */}
        {mode === 'tenant-mobile' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={back} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="text-xl font-bold text-dark-900 mb-1">Find Your PG</h2>
            <p className="text-dark-500 text-sm mb-5">Log in with your mobile number to search your PG and request access.</p>
            <form onSubmit={sendOtp}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-700 mb-2">Mobile Number *</label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-300" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-field pl-10"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    autoFocus
                  />
                </div>
                {error && <div className="text-error text-sm mt-2">{error}</div>}
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Checking…' : 'Send OTP'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNotice('');
                setMode('tenant-register');
              }}
              className="w-full text-center text-sm text-primary font-semibold hover:underline mt-4"
            >
              New to Aapka PG? Create an account
            </button>
            <p className="text-center text-xs text-dark-400 mt-3">Demo OTP: 1234 · No real SMS is sent</p>
          </div>
        )}

        {/* Tenant: OTP */}
        {mode === 'tenant-otp' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={() => setMode('tenant-mobile')} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Change number
            </button>
            <h2 className="text-xl font-bold text-dark-900 mb-1">Verify OTP</h2>
            <p className="text-dark-500 text-sm mb-5">Enter the 4-digit OTP sent to +91 {mobile}</p>
            <form onSubmit={verifyOtp}>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input-field text-center text-2xl tracking-widest mb-2"
                placeholder="0000"
                maxLength={4}
                autoFocus
              />
              {error && <div className="text-error text-sm mb-2">{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </button>
            </form>
            <p className="text-center text-xs text-dark-400 mt-5">Demo OTP: 1234</p>
          </div>
        )}

        {/* Tenant: register */}
        {mode === 'tenant-register' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={() => setMode('tenant-mobile')} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2 mb-1">
              <UserPlus size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-dark-900">Create your tenant account</h2>
            </div>
            <p className="text-dark-500 text-sm mb-5">
              Your account is free. After creating it you can search for your PG by its username and request admission.
            </p>
            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-primary-50 text-xs text-dark-700">{notice}</div>
            )}
            <form onSubmit={registerTenant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Full Name *</label>
                <input value={regName} onChange={(e) => setRegName(e.target.value)} className="input-field" placeholder="Your full name" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="input-field"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
                <p className="text-xs text-dark-400 mt-1">You will use this number with an OTP to log in.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
                <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-field" placeholder="name@example.com" />
              </div>
              {error && <div className="text-error text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Creating account…' : 'Create Account & Find My PG'}
              </button>
            </form>
          </div>
        )}

        {/* Owner: login */}
        {mode === 'owner-login' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={back} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-dark-900">PG Owner Login</h2>
            </div>
            <p className="text-dark-500 text-sm mb-5">Log in with your unique PG username and password.</p>
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">PG Username *</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="e.g. shreeganesh_pg_4821"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <div className="text-error text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Signing in…' : 'Log in to Owner Dashboard'}
              </button>
            </form>
            <div className="flex items-center justify-between mt-4 text-sm">
              <button onClick={() => setMode('owner-forgot')} className="text-primary hover:underline">
                Forgot password?
              </button>
              <a href="/subscribe" className="text-primary hover:underline font-medium">
                Register your PG
              </a>
            </div>
          </div>
        )}

        {/* Owner: forgot */}
        {mode === 'owner-forgot' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={() => setMode('owner-login')} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back to login
            </button>
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-dark-900">Forgot password</h2>
            </div>
            <p className="text-dark-500 text-sm mb-5">
              Enter your PG username. We'll send a reset code to your registered email / mobile (verified contacts only).
            </p>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">PG Username *</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="input-field" placeholder="e.g. shreeganesh_pg_4821" autoFocus />
              </div>
              {error && <div className="text-error text-sm">{error}</div>}
              <button type="submit" className="w-full btn-primary py-3">
                Send Reset Code
              </button>
            </form>
          </div>
        )}

        {/* Owner: reset */}
        {mode === 'owner-reset' && (
          <div className="bg-white rounded-2xl shadow-card p-6 animate-fade-in">
            <button onClick={() => setMode('owner-forgot')} className="text-dark-400 hover:text-dark-700 text-sm mb-4 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="text-xl font-bold text-dark-900 mb-1">Set a new password</h2>
            <p className="text-dark-500 text-sm mb-4">Account: <strong>{resetUser}</strong></p>
            {notice && (
              <div className="mb-4 p-3 rounded-xl bg-primary-50 text-xs text-dark-700">{notice}</div>
            )}
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Reset Code *</label>
                <input value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 4))} className="input-field tracking-widest text-center" placeholder="0000" maxLength={4} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Min 8 chars, upper + lower + number"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && !validatePassword(newPassword).ok && (
                  <p className="text-xs text-warning mt-1">Must include: {validatePassword(newPassword).errors.join(', ')}</p>
                )}
              </div>
              {error && <div className="text-error text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? 'Updating…' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-dark-500">
          Demo authentication · OTP and reset codes are simulated. Passwords are bcrypt-hashed on the server and never returned to the browser.
        </div>
      </div>
    </div>
  );
}
