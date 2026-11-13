// Tenant PG Discovery & Admission workflow.
// States handled: NOT JOINED (search) → REQUEST PENDING / REJECTED (status) →
// request form → confirmation. Only APPROVED + ACTIVE membership grants access
// to PG facilities (enforced by the AppLayout guard, not just this screen).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  MapPin,
  BedDouble,
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  Camera,
  ArrowLeft,
  Send,
  Copy,
  TriangleAlert,
  Info,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAppStore } from '../store/appStore';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/format';
import { normalizeUsername, usernameError } from '../services/pgPlatform';
import type { PGAccount } from '../types';

const ROOM_TYPES = ['Any', 'Single', '2-sharing', '3-sharing', '4-sharing'];

export default function TenantAdmissionPage() {
  const { data, submitAdmissionRequest } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();

  const user = data.platform.tenantUsers.find((u) => u.id === data.activeTenantUserId);
  const myRequests = useMemo(
    () =>
      data.platform.admissionRequests
        .filter((r) => r.tenantUserId === data.activeTenantUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.platform.admissionRequests, data.activeTenantUserId]
  );
  const myMembership = data.platform.memberships.find(
    (m) => m.tenantUserId === data.activeTenantUserId && m.status === 'Active'
  );

  // Active members belong in the dashboard
  useEffect(() => {
    if (myMembership) navigate('/app/tenant', { replace: true });
  }, [myMembership, navigate]);

  const [view, setView] = useState<'status' | 'search' | 'form' | 'done'>(() =>
    myRequests.some((r) => r.status === 'Pending') ? 'status' : 'search'
  );
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundPg, setFoundPg] = useState<PGAccount | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    mobile: user?.mobile ?? '',
    email: user?.email ?? '',
    gender: user?.gender ?? '',
    emergencyContact: '',
    preferredJoiningDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    preferredRoomType: 'Any',
    occupants: '1',
    additionalMessage: '',
    idProofName: '',
    photographName: '',
    additionalDocName: '',
  });

  const performSearch = () => {
    setSearchError('');
    setFoundPg(null);
    const u = normalizeUsername(searchInput);
    if (!u) {
      setSearchError('Please enter a PG username');
      return;
    }
    const uErr = usernameError(u);
    if (uErr) {
      setSearchError(`Invalid username format — ${uErr.toLowerCase()}`);
      return;
    }
    const pg = data.platform.pgs.find(
      (p) => p.pgUsername.toLowerCase() === u && p.isActive && p.isDiscoverable
    );
    if (!pg) {
      setSearchError(`No PG found with username "${u}". Please check the username with your PG owner.`);
      return;
    }
    setFoundPg(pg);
  };

  const vacantBedsOf = (pgId: string) => {
    const ws = data.workspaces[pgId];
    if (!ws) return 0;
    return ws.beds.filter((b) => b.status === 'vacant').length;
  };

  const openForm = (pg: PGAccount) => {
    setFoundPg(pg);
    setView('form');
    setErrors({});
    setConsent(false);
  };

  const handleSubmit = () => {
    if (!foundPg || !user) return;
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 3) e.fullName = 'Enter your full name';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.emergencyContact.trim()) e.emergencyContact = 'Emergency contact is required';
    if (!form.preferredJoiningDate) e.preferredJoiningDate = 'Select a joining date';
    if (!consent) e.consent = 'Please confirm the declaration to continue';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const result = submitAdmissionRequest({
      pgId: foundPg.id,
      tenantUserId: user.id,
      fullName: form.fullName,
      mobile: form.mobile,
      email: form.email,
      gender: form.gender || undefined,
      emergencyContact: form.emergencyContact,
      preferredJoiningDate: form.preferredJoiningDate,
      preferredRoomType: form.preferredRoomType,
      occupants: parseInt(form.occupants, 10) || 1,
      additionalMessage: form.additionalMessage,
      documents: {
        idProof: form.idProofName || undefined,
        photograph: form.photographName || undefined,
        additional: form.additionalDocName || undefined,
      },
    });
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    setSubmittedRequestId(result.requestId);
    setView('done');
  };

  const pgNameOf = (pgId: string) => data.platform.pgs.find((p) => p.id === pgId)?.pgName ?? 'PG';
  const pgUsernameOf = (pgId: string) => data.platform.pgs.find((p) => p.id === pgId)?.pgUsername ?? '';

  return (
    <AppLayout role="tenant" title="My PG Access">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* STATUS VIEW */}
        {view === 'status' && (
          <div className="space-y-4 animate-fade-in">
            {myMembership && null}
            <div className="card p-6">
              <h2 className="font-bold text-lg text-dark-900 mb-1">Your Admission Requests</h2>
              <p className="text-sm text-dark-500">
                Track the status of requests you've sent to PGs. You can access PG facilities only after the owner approves your request.
              </p>
            </div>
            {myRequests.map((r) => (
              <div key={r.id} className={`card p-5 ${r.status === 'Pending' ? 'border-warning' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-dark-900">{pgNameOf(r.pgId)}</div>
                    <div className="text-xs text-dark-500 font-mono">@{pgUsernameOf(r.pgId)}</div>
                  </div>
                  {r.status === 'Pending' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-warning-light text-warning">
                      <Clock size={12} /> Pending
                    </span>
                  )}
                  {r.status === 'Approved' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-success-light text-success">
                      <CircleCheck size={12} /> Approved
                    </span>
                  )}
                  {r.status === 'Rejected' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-error-light text-error">
                      <CircleX size={12} /> Rejected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <div className="text-xs text-dark-400">Request ID</div>
                    <div className="font-mono font-semibold text-dark-800">{r.requestId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-dark-400">Submitted</div>
                    <div className="text-dark-700">{formatDate(r.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-dark-400">Preferred Joining</div>
                    <div className="text-dark-700">{formatDate(r.preferredJoiningDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-dark-400">Room Type</div>
                    <div className="text-dark-700">{r.preferredRoomType}</div>
                  </div>
                </div>
                {r.status === 'Rejected' && r.rejectionReason && (
                  <div className="mt-3 p-3 rounded-xl bg-error-light text-sm text-dark-700">
                    <strong>Rejection reason:</strong> {r.rejectionReason}
                  </div>
                )}
                {r.status === 'Approved' && (
                  <div className="mt-3 p-3 rounded-xl bg-success-light text-sm text-dark-700 flex items-center justify-between">
                    <span>Approved! Log in to access your tenant dashboard.</span>
                    <button onClick={() => navigate('/app/tenant')} className="text-primary font-semibold hover:underline text-sm">
                      Open dashboard
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setView('search')} className="btn-primary w-full py-3">
              <Search size={16} /> Search Another PG
            </button>
          </div>
        )}

        {/* SEARCH VIEW */}
        {view === 'search' && (
          <div className="space-y-5 animate-fade-in">
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary flex items-center justify-center mx-auto mb-4">
                <Search size={26} />
              </div>
              <h2 className="text-2xl font-bold text-dark-900 mb-2">Find Your PG</h2>
              <p className="text-dark-500 text-sm mb-6">
                Enter your PG's unique username to find your accommodation and request access.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                  className="input-field flex-1 font-mono"
                  placeholder="Enter PG username (e.g. sunrise_residency_4821)"
                />
                <button onClick={performSearch} className="btn-primary shrink-0">
                  <Search size={16} /> Search
                </button>
              </div>
              {searchError && (
                <div className="mt-4 p-3 rounded-xl bg-error-light text-sm text-dark-700 text-left flex items-start gap-2">
                  <TriangleAlert size={16} className="text-error mt-0.5 shrink-0" />
                  {searchError}
                </div>
              )}
              <div className="mt-5 text-xs text-dark-400">
                Try the demo usernames: <button onClick={() => { setSearchInput('shreeganesh_pg_4821'); }} className="text-primary font-mono hover:underline">shreeganesh_pg_4821</button> or{' '}
                <button onClick={() => { setSearchInput('royalstay_7291'); }} className="text-primary font-mono hover:underline">royalstay_7291</button>
              </div>
            </div>

            {/* Search result card */}
            {foundPg && (
              <div className="card p-6 animate-fade-in border-primary">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white font-bold text-xl flex items-center justify-center shrink-0">
                      {foundPg.pgName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-dark-900">{foundPg.pgName}</h3>
                      <div className="text-xs font-mono text-primary">@{foundPg.pgUsername}</div>
                      <div className="text-sm text-dark-500 mt-1 flex items-center gap-1">
                        <MapPin size={13} /> {foundPg.address}, {foundPg.city} — {foundPg.pinCode}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-background-200 text-dark-600 px-3 py-1 rounded-full shrink-0">
                    {foundPg.pgType}
                  </span>
                </div>
                {foundPg.description && <p className="text-sm text-dark-600 mt-4">{foundPg.description}</p>}
                {foundPg.showAvailableBeds && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-primary-50 text-primary text-sm font-semibold px-3 py-1.5 rounded-full">
                    <BedDouble size={15} /> {vacantBedsOf(foundPg.id)} beds available now
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs text-dark-400 flex items-center gap-1">
                    <Info size={12} /> Only public PG details are shown — tenant and owner private data stays private.
                  </p>
                  <button onClick={() => openForm(foundPg)} className="btn-primary">
                    Request to Join <Send size={15} />
                  </button>
                </div>
              </div>
            )}

            {myRequests.length > 0 && (
              <button onClick={() => setView('status')} className="text-sm text-primary hover:underline">
                ← View my admission requests
              </button>
            )}
          </div>
        )}

        {/* FORM VIEW */}
        {view === 'form' && foundPg && (
          <div className="space-y-5 animate-fade-in">
            <button onClick={() => setView('search')} className="text-sm text-dark-500 hover:text-dark-800 inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back to search
            </button>
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-1">
                <Building2 size={20} className="text-primary" />
                <h2 className="font-bold text-lg text-dark-900">Admission Request — {foundPg.pgName}</h2>
              </div>
              <p className="text-xs text-dark-500 font-mono mb-5">@{foundPg.pgUsername}</p>

              <div className="space-y-5">
                <div>
                  <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Personal Details</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Full Name *</label>
                      <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={`input-field ${errors.fullName ? 'border-error' : ''}`} />
                      {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number *</label>
                      <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`input-field ${errors.mobile ? 'border-error' : ''}`} />
                      {errors.mobile && <p className="text-xs text-error mt-1">{errors.mobile}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`input-field ${errors.email ? 'border-error' : ''}`} />
                      {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Gender</label>
                      <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field">
                        <option value="">Not specified</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Emergency Contact *</label>
                      <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`input-field ${errors.emergencyContact ? 'border-error' : ''}`} placeholder="10-digit number" />
                      {errors.emergencyContact && <p className="text-xs text-error mt-1">{errors.emergencyContact}</p>}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-background-300" />

                <div>
                  <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Accommodation Details</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Preferred Joining Date *</label>
                      <input type="date" value={form.preferredJoiningDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setForm({ ...form, preferredJoiningDate: e.target.value })} className={`input-field ${errors.preferredJoiningDate ? 'border-error' : ''}`} />
                      {errors.preferredJoiningDate && <p className="text-xs text-error mt-1">{errors.preferredJoiningDate}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Preferred Room Type</label>
                      <select value={form.preferredRoomType} onChange={(e) => setForm({ ...form, preferredRoomType: e.target.value })} className="input-field">
                        {ROOM_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Number of Occupants</label>
                      <input type="number" min="1" max="4" value={form.occupants} onChange={(e) => setForm({ ...form, occupants: e.target.value })} className="input-field" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-dark-700 mb-1">Additional Message to Owner</label>
                      <textarea rows={2} value={form.additionalMessage} onChange={(e) => setForm({ ...form, additionalMessage: e.target.value })} className="input-field" placeholder="Anything the owner should know…" />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-background-300" />

                <div>
                  <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Documents</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">ID Proof</label>
                      <label className="input-field flex items-center gap-2 cursor-pointer text-sm text-dark-500">
                        <FileText size={15} />
                        <span className="truncate">{form.idProofName || 'Upload file'}</span>
                        <input type="file" className="hidden" onChange={(e) => setForm({ ...form, idProofName: e.target.files?.[0]?.name ?? '' })} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Profile Photograph</label>
                      <label className="input-field flex items-center gap-2 cursor-pointer text-sm text-dark-500">
                        <Camera size={15} />
                        <span className="truncate">{form.photographName || 'Upload file'}</span>
                        <input type="file" className="hidden" onChange={(e) => setForm({ ...form, photographName: e.target.files?.[0]?.name ?? '' })} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 mb-1">Additional Document</label>
                      <label className="input-field flex items-center gap-2 cursor-pointer text-sm text-dark-500">
                        <FileText size={15} />
                        <span className="truncate">{form.additionalDocName || 'Upload file'}</span>
                        <input type="file" className="hidden" onChange={(e) => setForm({ ...form, additionalDocName: e.target.files?.[0]?.name ?? '' })} />
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-dark-400 mt-2">Demo file handling — only file names are recorded; real uploads go to secure cloud storage with access-controlled retrieval.</p>
                </div>

                <div className="h-px bg-background-300" />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 accent-[#6938EF]"
                  />
                  <span className="text-sm text-dark-600">
                    I confirm that the information provided is accurate and I agree to share these details with the
                    selected PG owner for admission processing.
                  </span>
                </label>
                {errors.consent && <p className="text-xs text-error -mt-2">{errors.consent}</p>}

                <button onClick={handleSubmit} className="btn-primary w-full py-3.5">
                  <Send size={17} /> Submit Admission Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION VIEW */}
        {view === 'done' && foundPg && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-success-light text-success rounded-full flex items-center justify-center mx-auto mb-6">
              <CircleCheck size={40} />
            </div>
            <h2 className="text-2xl font-bold text-dark-900 mb-2">Your admission request has been submitted successfully!</h2>
            <p className="text-dark-600 mb-8">
              Your request has been sent to {foundPg.pgName}. You will receive a notification once the owner reviews your application.
            </p>
            <div className="card p-6 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">PG Name</span>
                <span className="font-semibold text-dark-900">{foundPg.pgName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">PG Username</span>
                <span className="font-semibold text-dark-900 font-mono flex items-center gap-2">
                  @{foundPg.pgUsername}
                  <button
                    onClick={() => navigator.clipboard?.writeText(foundPg.pgUsername).catch(() => undefined)}
                    className="text-dark-300 hover:text-primary"
                    title="Copy username"
                  >
                    <Copy size={13} />
                  </button>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Request ID</span>
                <span className="font-semibold text-dark-900 font-mono">{submittedRequestId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Request Status</span>
                <span className="font-semibold text-warning">Pending</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-500">Submitted On</span>
                <span className="font-semibold text-dark-900">{new Date().toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setView('status')} className="btn-secondary">
                View Request Status
              </button>
              <button onClick={() => navigate('/app/notifications')} className="btn-secondary">
                Open Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
