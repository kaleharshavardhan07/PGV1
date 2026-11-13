import { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Search, Plus, Pencil, Trash2, Upload, FileText, Camera, FileCheck2, Users, BedDouble } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { formatDate, formatINR, currentMonth } from '../utils/format';
import { getPlan } from '../data/plans';
import { isOverLimit } from '../services/subscriptionService';
import type { Tenant } from '../types';

const MAX_DOC_BYTES = 1024 * 1024;

interface FormState {
  fullName: string;
  mobile: string;
  email: string;
  emergencyContact: string;
  roomId: string;
  bedNumber: string;
  monthlyRent: string;
  securityDeposit: string;
  joiningDate: string;
  policeVerification: 'Pending' | 'Verified' | 'Not Required';
  idProofName: string;
  photographName: string;
  agreementName: string;
  status: 'Active' | 'Notice Period';
}

const emptyForm = (): FormState => ({
  fullName: '',
  mobile: '',
  email: '',
  emergencyContact: '',
  roomId: '',
  bedNumber: '',
  monthlyRent: '',
  securityDeposit: '',
  joiningDate: new Date().toISOString().split('T')[0],
  policeVerification: 'Pending',
  idProofName: '',
  photographName: '',
  agreementName: '',
  status: 'Active',
});

export default function ManagerTenantsPage() {
  const { data, addTenant, updateTenant, moveOutTenant, markTenantNotice } = useAppStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plan = getPlan(data.subscription.planId);
  const bedLimitReached = isOverLimit(data.beds.length, plan.limits.beds);
  const fileRefs = {
    idProof: useRef<HTMLInputElement>(null),
    photograph: useRef<HTMLInputElement>(null),
    agreement: useRef<HTMLInputElement>(null),
  };

  const roomOf = (id: string) => data.rooms.find((r) => r.id === id);

  const vacantBedsOf = (roomId: string, editingTenant?: Tenant) =>
    data.beds.filter(
      (b) => b.roomId === roomId && (b.status === 'vacant' || b.tenantId === editingTenant?.id)
    );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setForm({
      fullName: tenant.fullName,
      mobile: tenant.mobile,
      email: tenant.email,
      emergencyContact: tenant.emergencyContact,
      roomId: tenant.roomId,
      bedNumber: String(tenant.bedNumber),
      monthlyRent: String(tenant.monthlyRent),
      securityDeposit: String(tenant.securityDeposit),
      joiningDate: tenant.joiningDate,
      policeVerification: tenant.policeVerification,
      idProofName: tenant.idProofUrl ?? '',
      photographName: tenant.photographUrl ?? '',
      agreementName: tenant.agreementUrl ?? '',
      status: tenant.status === 'Left' ? 'Active' : tenant.status,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleDoc = (key: 'idProof' | 'photograph' | 'agreement', file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      toast.show('Document too large — choose a file under 1 MB.', 'error');
      return;
    }
    setForm((f) => ({ ...f, [`${key}Name`]: file.name }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.roomId) e.roomId = 'Select a room';
    if (!form.bedNumber) e.bedNumber = 'Select a bed';
    if (!form.monthlyRent || parseInt(form.monthlyRent, 10) <= 0) e.monthlyRent = 'Enter monthly rent';
    if (!form.securityDeposit || parseInt(form.securityDeposit, 10) < 0) e.securityDeposit = 'Enter security deposit';
    if (!form.joiningDate) e.joiningDate = 'Select joining date';

    // Enforce subscription plan bed limits for new registrations
    if (!editingId && bedLimitReached) {
      e.bedNumber = `Plan limit reached — the ${plan.name} plan supports up to ${plan.limits.beds} beds. Upgrade to register more tenants.`;
    }

    // Prevent allocating an already-occupied bed
    if (form.roomId && form.bedNumber) {
      const bed = data.beds.find(
        (b) => b.roomId === form.roomId && b.bedNumber === parseInt(form.bedNumber, 10)
      );
      if (!bed) {
        e.bedNumber = 'Bed does not exist in this room';
      } else if (bed.status === 'occupied' && bed.tenantId !== editingId) {
        e.bedNumber = `Bed ${bed.bedNumber} is already occupied by ${
          data.tenants.find((t) => t.id === bed.tenantId)?.fullName ?? 'another tenant'
        }`;
      } else if (bed.status === 'notice' && bed.tenantId !== editingId) {
        e.bedNumber = 'This bed is on notice period — available after the tenant leaves';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      fullName: form.fullName.trim(),
      mobile: form.mobile,
      email: form.email.trim(),
      emergencyContact: form.emergencyContact.trim(),
      roomId: form.roomId,
      bedNumber: parseInt(form.bedNumber, 10),
      monthlyRent: parseInt(form.monthlyRent, 10),
      securityDeposit: parseInt(form.securityDeposit, 10),
      joiningDate: form.joiningDate,
      policeVerification: form.policeVerification,
      status: form.status,
    };

    if (editingId) {
      const existing = data.tenants.find((t) => t.id === editingId)!;
      updateTenant(editingId, {
        ...payload,
        idProofUrl: form.idProofName || existing.idProofUrl,
        photographUrl: form.photographName || existing.photographUrl,
        agreementUrl: form.agreementName || existing.agreementUrl,
      });
      // If the tenant moved to a different bed, free the old one and occupy the new one
      if (existing.roomId !== payload.roomId || existing.bedNumber !== payload.bedNumber) {
        data.beds
          .filter((b) => b.tenantId === editingId)
          .forEach((b) => {
            if (!(b.roomId === payload.roomId && b.bedNumber === payload.bedNumber)) {
              updateBedVacant(b.id);
            }
          });
      }
      toast.show(`${payload.fullName} updated successfully.`, 'success');
    } else {
      addTenant({
        ...payload,
        idProofUrl: form.idProofName || undefined,
        photographUrl: form.photographName || undefined,
        agreementUrl: form.agreementName || undefined,
      });
      toast.show(
        `${payload.fullName} registered. Bed marked as Occupied and owner dashboard updated.`,
        'success'
      );
    }
    setShowForm(false);
  };

  // Helper to flip a bed to vacant through the store's updateBedStatus
  const { updateBedStatus } = useAppStore();
  const updateBedVacant = (bedId: string) => updateBedStatus(bedId, 'vacant');

  const filteredTenants = data.tenants.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      t.fullName.toLowerCase().includes(q) ||
      t.mobile.includes(q) ||
      (roomOf(t.roomId)?.roomNumber.toLowerCase().includes(q) ?? false)
    );
  });

  const formBeds = form.roomId ? vacantBedsOf(form.roomId, data.tenants.find((t) => t.id === editingId)) : [];

  return (
    <AppLayout role="manager" title="Tenant Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-dark-900">Tenants</h2>
            <p className="text-dark-500 text-sm">{filteredTenants.length} of {data.tenants.length} tenants</p>
          </div>
          <button onClick={openAdd} className="btn-primary py-2.5">
            <Plus size={18} /> New Tenant Registration
          </button>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, mobile or room number..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Tenant table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-dark-500 border-b border-background-300">
                  <th className="py-3 font-medium">Tenant</th>
                  <th className="py-3 font-medium">Room / Bed</th>
                  <th className="py-3 font-medium">Rent</th>
                  <th className="py-3 font-medium">Deposit</th>
                  <th className="py-3 font-medium">Police Verification</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => {
                  const hasPendingRent = data.payments.some(
                    (p) => p.tenantId === tenant.id && p.type === 'Rent' && p.month === currentMonth() && p.status !== 'Paid'
                  );
                  return (
                    <tr key={tenant.id} className="border-b border-background-200 hover:bg-background-200">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {tenant.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-dark-900">{tenant.fullName}</div>
                            <div className="text-xs text-dark-400">{tenant.mobile} • Joined {formatDate(tenant.joiningDate)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 text-dark-700">
                          <BedDouble size={14} className="text-dark-300" />
                          Room {roomOf(tenant.roomId)?.roomNumber ?? '—'}, Bed {tenant.bedNumber}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-dark-900">{formatINR(tenant.monthlyRent)}</div>
                        {hasPendingRent && <div className="text-xs text-warning">Rent pending</div>}
                      </td>
                      <td className="py-3 text-success font-medium">{formatINR(tenant.securityDeposit)}</td>
                      <td className="py-3">
                        <span className={`badge ${
                          tenant.policeVerification === 'Verified' ? 'bg-success-light text-success'
                          : tenant.policeVerification === 'Pending' ? 'bg-warning-light text-warning'
                          : 'bg-background-200 text-dark-500'
                        }`}>
                          {tenant.policeVerification}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${
                          tenant.status === 'Active' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(tenant)} className="text-primary hover:underline px-2" title="Edit tenant">
                          <Pencil size={16} />
                        </button>
                        {tenant.status === 'Active' && (
                          <button
                            onClick={() => {
                              if (confirm(`Mark ${tenant.fullName} as notice period? Their bed will show as "Notice" for the owner.`)) {
                                markTenantNotice(tenant.id);
                                toast.show(`${tenant.fullName} marked as notice period.`, 'info');
                              }
                            }}
                            className="text-warning hover:underline px-2 text-sm"
                          >
                            Notice
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Move out ${tenant.fullName}? Their bed becomes vacant and all payment history is preserved.`)) {
                              moveOutTenant(tenant.id, 'Ended');
                              toast.show('Tenant moved out. Bed is now vacant. Records preserved.', 'info');
                            }
                          }}
                          className="text-error hover:underline px-2"
                          title="Move out tenant (records preserved)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-dark-500">No tenants match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Occupancy Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-sm text-dark-400 mb-1">
              <BedDouble size={14} /> Total Beds
            </div>
            <div className="text-3xl font-bold text-dark-900">{data.beds.length}</div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 text-sm text-dark-400 mb-1">
              <Users size={14} /> Occupied
            </div>
            <div className="text-3xl font-bold text-success">
              {data.beds.filter((b) => b.status === 'occupied').length}
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 text-sm text-dark-400 mb-1">
              <BedDouble size={14} /> Vacant
            </div>
            <div className="text-3xl font-bold text-primary">
              {data.beds.filter((b) => b.status === 'vacant').length}
            </div>
          </div>
        </div>

        {/* Registration / Edit Modal */}
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={editingId ? 'Edit Tenant' : 'New Tenant Registration'}
          size="lg"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingId ? 'Save Changes' : 'Register Tenant'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Personal Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className={`input-field ${errors.fullName ? 'border-error' : ''}`}
                  />
                  {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={`input-field ${errors.mobile ? 'border-error' : ''}`}
                    placeholder="10 digit number"
                  />
                  {errors.mobile && <p className="text-xs text-error mt-1">{errors.mobile}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`input-field ${errors.email ? 'border-error' : ''}`}
                  />
                  {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input-field"
                    placeholder="10 digit number"
                  />
                </div>
              </div>
            </div>

            {/* Accommodation */}
            <div>
              <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Accommodation</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Room Number *</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value, bedNumber: '' })}
                    className={`input-field ${errors.roomId ? 'border-error' : ''}`}
                  >
                    <option value="">Select Room</option>
                    {data.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.sharingType}-sharing, Floor {r.floor})
                      </option>
                    ))}
                  </select>
                  {errors.roomId && <p className="text-xs text-error mt-1">{errors.roomId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Bed Number * <span className="text-xs text-dark-400 font-normal">(only vacant beds)</span></label>
                  <select
                    value={form.bedNumber}
                    onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
                    className={`input-field ${errors.bedNumber ? 'border-error' : ''}`}
                    disabled={!form.roomId}
                  >
                    <option value="">{form.roomId ? 'Select Bed' : 'Select a room first'}</option>
                    {formBeds.map((b) => (
                      <option key={b.id} value={b.bedNumber}>
                        Bed {b.bedNumber} {b.status === 'vacant' ? '(Vacant)' : `(Current bed of ${data.tenants.find((t) => t.id === b.tenantId)?.fullName ?? 'tenant'})`}
                      </option>
                    ))}
                  </select>
                  {errors.bedNumber && <p className="text-xs text-error mt-1">{errors.bedNumber}</p>}
                  {bedLimitReached && !editingId && (
                    <p className="text-xs text-warning mt-1">
                      Plan bed limit reached ({plan.limits.beds}). Upgrade the subscription to add more tenants.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Monthly Rent (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.monthlyRent}
                    onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                    className={`input-field ${errors.monthlyRent ? 'border-error' : ''}`}
                  />
                  {errors.monthlyRent && <p className="text-xs text-error mt-1">{errors.monthlyRent}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Security Deposit (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.securityDeposit}
                    onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                    className={`input-field ${errors.securityDeposit ? 'border-error' : ''}`}
                  />
                  {errors.securityDeposit && <p className="text-xs text-error mt-1">{errors.securityDeposit}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Joining Date *</label>
                  <input
                    type="date"
                    value={form.joiningDate}
                    onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    className={`input-field ${errors.joiningDate ? 'border-error' : ''}`}
                  />
                  {errors.joiningDate && <p className="text-xs text-error mt-1">{errors.joiningDate}</p>}
                </div>
                {editingId && (
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Tenant Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
                      className="input-field"
                    >
                      <option value="Active">Active</option>
                      <option value="Notice Period">Notice Period</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="font-bold text-dark-900 mb-3 text-sm uppercase tracking-wide">Documents & Verification</h4>
              <div className="space-y-3">
                {([
                  { key: 'idProof' as const, label: 'ID Proof', icon: FileText, value: form.idProofName },
                  { key: 'photograph' as const, label: 'Tenant Photograph', icon: Camera, value: form.photographName },
                  { key: 'agreement' as const, label: 'Rental Agreement', icon: FileCheck2, value: form.agreementName },
                ]).map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <div key={doc.key} className="flex items-center gap-3">
                      <input
                        ref={fileRefs[doc.key]}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleDoc(doc.key, e.target.files?.[0])}
                      />
                      <div className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-background-300">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-800">{doc.label}</div>
                          <div className="text-xs text-dark-400 truncate">{doc.value || 'No file selected'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileRefs[doc.key].current?.click()}
                          className="btn-secondary py-1.5 px-3 text-sm shrink-0"
                        >
                          <Upload size={14} /> Upload
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Police Verification Status</label>
                  <select
                    value={form.policeVerification}
                    onChange={(e) => setForm({ ...form, policeVerification: e.target.value as FormState['policeVerification'] })}
                    className="input-field"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Not Required">Not Required</option>
                  </select>
                </div>
              </div>
            </div>

            {Object.keys(errors).length > 0 && Object.values(errors).filter(Boolean).length > 0 && (
              <div className="p-3 rounded-xl bg-error-light text-error text-sm">
                Please fix the highlighted fields before saving.
              </div>
            )}

            <button type="submit" className="hidden" />
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
