// Owner Admission Requests dashboard: summary, filters, review, approve with
// bed allocation (with availability re-validation) and rejection with reason.

import { useMemo, useState } from 'react';
import {
  UserPlus,
  CircleCheck,
  CircleX,
  Search,
  Eye,
  FileText,
  Camera,
  FileCheck2,
  History,
  BedDouble,
  IndianRupee,
  CalendarDays,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAppStore } from '../store/appStore';
import { useToast } from '../components/Toast';
import { formatDate, formatDateTime, formatINR } from '../utils/format';
import type { AdmissionRequest } from '../types';

const REJECT_REASONS = ['No beds available', 'Documents incomplete', 'PG admission criteria not met', 'Other'];

const statusBadge = (status: AdmissionRequest['status']) => {
  if (status === 'Pending') return 'bg-warning-light text-warning';
  if (status === 'Approved') return 'bg-success-light text-success';
  return 'bg-error-light text-error';
};

export default function OwnerAdmissionsPage() {
  const { data, approveAdmissionRequest, rejectAdmissionRequest } = useAppStore();
  const toast = useToast();

  const pg = data.platform.pgs.find((p) => p.id === data.activePgId);
  const requests = useMemo(
    () =>
      data.platform.admissionRequests
        .filter((r) => r.pgId === data.activePgId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.platform.admissionRequests, data.activePgId]
  );

  const counts = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
  };

  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdmissionRequest | null>(null);
  const [approveFor, setApproveFor] = useState<AdmissionRequest | null>(null);
  const [rejectFor, setRejectFor] = useState<AdmissionRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  // allocation form
  const [allocRoom, setAllocRoom] = useState('');
  const [allocBed, setAllocBed] = useState('');
  const [allocRent, setAllocRent] = useState('6500');
  const [allocDeposit, setAllocDeposit] = useState('13000');
  const [allocDate, setAllocDate] = useState('');
  const [allocError, setAllocError] = useState('');
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [rejectNotes, setRejectNotes] = useState('');

  const filtered = requests.filter((r) => {
    if (filter !== 'All' && r.status !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.requestId.toLowerCase().includes(q) ||
      r.mobile.includes(q)
    );
  });

  const vacantBeds = data.beds.filter((b) => b.status === 'vacant');
  const roomsWithVacantBeds = data.rooms.filter((r) =>
    vacantBeds.some((b) => b.roomId === r.id)
  );
  const bedsOfRoom = vacantBeds.filter((b) => b.roomId === allocRoom);

  const openApprove = (req: AdmissionRequest) => {
    setApproveFor(req);
    setAllocRoom('');
    setAllocBed('');
    setAllocRent('6500');
    setAllocDeposit('13000');
    setAllocDate(req.preferredJoiningDate);
    setAllocError('');
  };

  const confirmApprove = async () => {
    if (!approveFor) return;
    if (!allocRoom || !allocBed) {
      setAllocError('Select a room and a vacant bed');
      return;
    }
    const rent = parseInt(allocRent, 10);
    const deposit = parseInt(allocDeposit, 10);
    if (!rent || rent <= 0) {
      setAllocError('Enter a valid monthly rent');
      return;
    }
    if (Number.isNaN(deposit) || deposit < 0) {
      setAllocError('Enter a valid security deposit');
      return;
    }
    if (!allocDate) {
      setAllocError('Confirm the joining date');
      return;
    }
    setProcessing(true);
    const result = await approveAdmissionRequest(approveFor.requestId, {
      roomId: allocRoom,
      bedId: allocBed,
      monthlyRent: rent,
      securityDeposit: deposit,
      joiningDate: allocDate,
    });
    setProcessing(false);
    if (!result.ok) {
      setAllocError(result.error);
      return;
    }
    setApproveFor(null);
    setSelected(null);
    toast.show(`Tenant Approved Successfully! ${approveFor.fullName} has been admitted to ${data.settings.name}.`, 'success');
  };

  const confirmReject = async () => {
    if (!rejectFor) return;
    const reason = rejectReason === 'Other' ? rejectNotes.trim() : rejectReason + (rejectNotes.trim() ? ` — ${rejectNotes.trim()}` : '');
    if (!reason) {
      toast.show('Please provide a rejection reason', 'error');
      return;
    }
    setProcessing(true);
    const result = await rejectAdmissionRequest(rejectFor.requestId, reason);
    setProcessing(false);
    if (!result.ok) {
      toast.show(result.error, 'error');
      return;
    }
    setRejectFor(null);
    setSelected(null);
    toast.show(`Request ${rejectFor.requestId} rejected. The tenant has been notified.`, 'info');
  };

  const requestAudit = (requestId: string) =>
    data.platform.auditLogs.filter((l) => l.entityId === requestId).slice(0, 5);

  return (
    <AppLayout role="owner" title="Admission Requests">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Total Requests</div>
            <div className="text-2xl font-bold text-dark-900 mt-1">{counts.total}</div>
          </div>
          <div className="card p-5 border-warning">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Pending</div>
            <div className="text-2xl font-bold text-warning mt-1">{counts.pending}</div>
          </div>
          <div className="card p-5 border-success">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Approved</div>
            <div className="text-2xl font-bold text-success mt-1">{counts.approved}</div>
          </div>
          <div className="card p-5 border-error">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Rejected</div>
            <div className="text-2xl font-bold text-error mt-1">{counts.rejected}</div>
          </div>
        </div>

        {/* Filters + search */}
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-background-200 text-dark-600 hover:bg-background-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tenant name, request ID or mobile…"
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Requests table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-400 border-b border-background-300">
                  <th className="py-2.5 pr-4 font-medium">Request ID</th>
                  <th className="py-2.5 pr-4 font-medium">Tenant Name</th>
                  <th className="py-2.5 pr-4 font-medium">Mobile</th>
                  <th className="py-2.5 pr-4 font-medium">PG Username</th>
                  <th className="py-2.5 pr-4 font-medium">Joining Date</th>
                  <th className="py-2.5 pr-4 font-medium">Submitted</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-background-200 hover:bg-background-100">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-dark-800">{r.requestId}</td>
                    <td className="py-3 pr-4 font-medium text-dark-900">{r.fullName}</td>
                    <td className="py-3 pr-4 text-dark-600">{r.mobile}</td>
                    <td className="py-3 pr-4 text-xs font-mono text-dark-500">@{pg?.pgUsername}</td>
                    <td className="py-3 pr-4 text-dark-600">{formatDate(r.preferredJoiningDate)}</td>
                    <td className="py-3 pr-4 text-dark-500 text-xs">{formatDateTime(r.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => setSelected(r)} className="text-primary hover:underline text-xs font-medium inline-flex items-center gap-1">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-dark-400">
                      {requests.length === 0
                        ? 'No admission requests yet. Share your PG username with prospective tenants!'
                        : 'No requests match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {counts.pending > 0 && (
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <UserPlus size={14} className="text-primary" />
            {counts.pending} pending request{counts.pending === 1 ? '' : 's'} awaiting your review.
          </div>
        )}
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-dark-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-mono text-xs text-dark-400">{selected.requestId}</div>
                <h3 className="font-bold text-xl text-dark-900">{selected.fullName}</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-dark-800 text-2xl leading-none">×</button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-dark-900 mb-2 text-sm uppercase tracking-wide">Tenant Information</h4>
                <div className="space-y-1.5 text-sm text-dark-600">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary-50 text-primary font-bold text-xs flex items-center justify-center">
                      {selected.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    {selected.documents.photograph && (
                      <span className="text-xs text-dark-400 flex items-center gap-1">
                        <Camera size={12} /> {selected.documents.photograph}
                      </span>
                    )}
                  </div>
                  <div>Mobile: <strong className="text-dark-800">{selected.mobile}</strong></div>
                  <div>Email: <strong className="text-dark-800">{selected.email || '—'}</strong></div>
                  <div>Emergency: <strong className="text-dark-800">{selected.emergencyContact || '—'}</strong></div>
                  {selected.gender && <div>Gender: <strong className="text-dark-800">{selected.gender}</strong></div>}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-dark-900 mb-2 text-sm uppercase tracking-wide">Admission Information</h4>
                <div className="space-y-1.5 text-sm text-dark-600">
                  <div className="flex items-center gap-2"><CalendarDays size={14} className="text-dark-300" /> Joining: {formatDate(selected.preferredJoiningDate)}</div>
                  <div className="flex items-center gap-2"><BedDouble size={14} className="text-dark-300" /> Room type: {selected.preferredRoomType}</div>
                  <div>Occupants: {selected.occupants}</div>
                  {selected.additionalMessage && (
                    <div className="mt-2 p-3 rounded-xl bg-background-200 text-sm text-dark-700">"{selected.additionalMessage}"</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h4 className="font-bold text-dark-900 mb-2 text-sm uppercase tracking-wide">Documents</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {selected.documents.idProof && (
                  <span className="inline-flex items-center gap-1.5 bg-background-200 px-3 py-1.5 rounded-lg text-dark-700">
                    <FileText size={13} /> {selected.documents.idProof}
                  </span>
                )}
                {selected.documents.photograph && (
                  <span className="inline-flex items-center gap-1.5 bg-background-200 px-3 py-1.5 rounded-lg text-dark-700">
                    <Camera size={13} /> {selected.documents.photograph}
                  </span>
                )}
                {selected.documents.additional && (
                  <span className="inline-flex items-center gap-1.5 bg-background-200 px-3 py-1.5 rounded-lg text-dark-700">
                    <FileCheck2 size={13} /> {selected.documents.additional}
                  </span>
                )}
                {!selected.documents.idProof && !selected.documents.photograph && !selected.documents.additional && (
                  <span className="text-dark-400 text-sm">No documents uploaded</span>
                )}
              </div>
            </div>

            <div className="mt-5">
              <h4 className="font-bold text-dark-900 mb-2 text-sm uppercase tracking-wide flex items-center gap-1.5">
                <History size={14} /> Audit Trail
              </h4>
              <div className="space-y-1 text-xs text-dark-500">
                {requestAudit(selected.requestId).map((a) => (
                  <div key={a.id}>
                    {formatDateTime(a.ts)} — <strong className="text-dark-700">{a.action}</strong> by {a.actor}: {a.details}
                  </div>
                ))}
                {requestAudit(selected.requestId).length === 0 && <div>No audit records.</div>}
              </div>
            </div>

            {selected.status === 'Pending' ? (
              <div className="flex gap-3 mt-6">
                <button onClick={() => openApprove(selected)} className="btn-primary flex-1 justify-center">
                  <CircleCheck size={16} /> Approve Request
                </button>
                <button onClick={() => { setRejectFor(selected); setRejectReason(REJECT_REASONS[0]); setRejectNotes(''); }} className="btn-secondary flex-1 justify-center text-error border-error/30 hover:bg-error-light">
                  <CircleX size={16} /> Reject Request
                </button>
              </div>
            ) : (
              <div className="mt-6 p-3 rounded-xl bg-background-200 text-sm text-dark-600">
                Reviewed by <strong>{selected.reviewedBy}</strong> on {formatDateTime(selected.reviewedAt)}
                {selected.rejectionReason && <> · Reason: {selected.rejectionReason}</>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveFor && (
        <div className="fixed inset-0 bg-dark-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl text-dark-900 mb-1">Approve & Allocate Bed</h3>
            <p className="text-sm text-dark-500 mb-5">
              {approveFor.fullName} → {data.settings.name}. Availability is re-validated on confirmation.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Select Room *</label>
                  <select
                    value={allocRoom}
                    onChange={(e) => { setAllocRoom(e.target.value); setAllocBed(''); }}
                    className="input-field"
                  >
                    <option value="">Select room</option>
                    {roomsWithVacantBeds.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.sharingType}-sharing) — {vacantBeds.filter((b) => b.roomId === r.id).length} vacant
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Select Bed *</label>
                  <select value={allocBed} onChange={(e) => setAllocBed(e.target.value)} className="input-field" disabled={!allocRoom}>
                    <option value="">{allocRoom ? 'Select vacant bed' : 'Select a room first'}</option>
                    {bedsOfRoom.map((b) => (
                      <option key={b.id} value={b.id}>Bed {b.bedNumber} (vacant)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Monthly Rent (₹) *</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                    <input type="number" min="0" value={allocRent} onChange={(e) => setAllocRent(e.target.value)} className="input-field pl-8" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Security Deposit (₹) *</label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
                    <input type="number" min="0" value={allocDeposit} onChange={(e) => setAllocDeposit(e.target.value)} className="input-field pl-8" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-dark-700 mb-1">Joining Date *</label>
                  <input
                    type="date"
                    value={allocDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setAllocDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary-50 text-xs text-dark-600">
                On approval: bed becomes <strong>Occupied</strong>, a membership is created, first month's rent
                record ({formatINR((parseInt(allocRent, 10) || 0) + data.settings.foodCharge)}) is raised, and the tenant is notified.
              </div>
              {allocError && <div className="p-3 rounded-xl bg-error-light text-sm text-error">{allocError}</div>}
              {vacantBeds.length === 0 && (
                <div className="p-3 rounded-xl bg-warning-light text-sm text-dark-700">
                  No vacant beds available. Reject the request or free a bed first.
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setApproveFor(null)} className="btn-secondary" disabled={processing}>Cancel</button>
                <button onClick={confirmApprove} disabled={processing || vacantBeds.length === 0} className="btn-primary">
                  {processing ? 'Approving…' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <div className="fixed inset-0 bg-dark-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="font-bold text-xl text-dark-900 mb-1">Reject Request</h3>
            <p className="text-sm text-dark-500 mb-5">
              {rejectFor.fullName} ({rejectFor.requestId}) will be notified with your reason. No bed will be allocated.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Reason *</label>
                <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input-field">
                  {REJECT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Additional Notes</label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="input-field"
                  placeholder={rejectReason === 'Other' ? 'Describe the reason…' : 'Optional details for the tenant…'}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setRejectFor(null)} className="btn-secondary" disabled={processing}>Cancel</button>
                <button onClick={confirmReject} disabled={processing} className="btn-primary text-error border-error/30 hover:bg-error-light">
                  {processing ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
