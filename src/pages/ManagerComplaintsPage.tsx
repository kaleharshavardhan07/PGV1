import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { MessageSquare, Search, Inbox, Clock, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { ComplaintStatusBadge } from '../components/Badge';
import { formatDateTime, formatRelative } from '../utils/format';
import type { Complaint, ComplaintStatus } from '../types';

const statusFlow: ComplaintStatus[] = ['Submitted', 'Seen', 'In Progress', 'Resolved'];

export default function ManagerComplaintsPage() {
  const { data, updateComplaintStatus } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ComplaintStatus>('All');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | ''>('');
  const [remark, setRemark] = useState('');

  const tenantOf = (id: string) => data.tenants.find((t) => t.id === id);

  const counters = {
    new: data.complaints.filter((c) => c.status === 'Submitted').length,
    seen: data.complaints.filter((c) => c.status === 'Seen').length,
    inProgress: data.complaints.filter((c) => c.status === 'In Progress').length,
    resolved: data.complaints.filter((c) => c.status === 'Resolved').length,
  };

  const complaints = data.complaints
    .filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (!search) return true;
      const tenant = tenantOf(c.tenantId);
      const q = search.toLowerCase();
      return (
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q) ||
        (tenant?.fullName.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setNextStatus(c.status === 'Resolved' ? '' : statusFlow[Math.min(statusFlow.indexOf(c.status) + 1, statusFlow.length - 1)]);
    setRemark(c.remarks ?? '');
  };

  const applyUpdate = () => {
    if (!selected || !nextStatus) return;
    updateComplaintStatus(selected.id, nextStatus, remark.trim() || undefined);
    setSelected(null);
  };

  return (
    <AppLayout role="manager" title="Complaint Management">
      <div className="space-y-6">
        {/* Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center"><Inbox size={18} /></div>
              <div>
                <div className="text-xs text-dark-400 uppercase tracking-wide">New</div>
                <div className="text-2xl font-bold text-dark-900">{counters.new}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-light text-warning flex items-center justify-center"><Clock size={18} /></div>
              <div>
                <div className="text-xs text-dark-400 uppercase tracking-wide">In Progress</div>
                <div className="text-2xl font-bold text-dark-900">{counters.seen + counters.inProgress}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-light text-success flex items-center justify-center"><CheckCircle2 size={18} /></div>
              <div>
                <div className="text-xs text-dark-400 uppercase tracking-wide">Resolved</div>
                <div className="text-2xl font-bold text-dark-900">{counters.resolved}</div>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center"><MessageSquare size={18} /></div>
              <div>
                <div className="text-xs text-dark-400 uppercase tracking-wide">Total</div>
                <div className="text-2xl font-bold text-dark-900">{data.complaints.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by category, tenant, room or text..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['All', 'Submitted', 'Seen', 'In Progress', 'Resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s ? 'bg-primary text-white' : 'bg-background-200 text-dark-600 hover:bg-background-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Complaint list */}
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <div className="card p-10 text-center text-dark-500">No complaints match your filters.</div>
          ) : (
            complaints.map((c) => {
              const tenant = tenantOf(c.tenantId);
              return (
                <div key={c.id} className="card p-5 hover:shadow-glow transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-dark-900">{c.category}</span>
                        <ComplaintStatusBadge status={c.status} />
                        <span className="text-xs text-dark-400">{formatRelative(c.submittedAt)}</span>
                      </div>
                      <p className="text-sm text-dark-600 line-clamp-2">{c.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-500">
                        <span>Tenant: <span className="text-dark-700 font-medium">{tenant?.fullName ?? 'Unknown'}</span></span>
                        <span>Room: <span className="text-dark-700 font-medium">{c.roomNumber}</span></span>
                        <span>Submitted: <span className="text-dark-700 font-medium">{formatDateTime(c.submittedAt)}</span></span>
                        {c.imageUrl && (
                          <span className="inline-flex items-center gap-1 text-primary"><ImageIcon size={12} /> Photo attached</span>
                        )}
                        {c.remarks && <span className="text-dark-500">Remarks: <span className="text-dark-700">{c.remarks}</span></span>}
                      </div>
                    </div>
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <button onClick={() => openDetail(c)} className="btn-secondary py-2 text-sm">
                        Open Details
                      </button>
                      {c.status !== 'Resolved' && (
                        <button
                          onClick={() => updateComplaintStatus(c.id, 'Resolved', c.remarks)}
                          className="btn-primary py-2 text-sm"
                        >
                          <CheckCircle2 size={14} /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail modal */}
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected ? `${selected.category} Complaint — Room ${selected.roomNumber}` : ''}
          footer={
            selected && selected.status !== 'Resolved' ? (
              <>
                <button className="btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn-primary" onClick={applyUpdate} disabled={!nextStatus}>
                  Update Status
                </button>
              </>
            ) : (
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
            )
          }
        >
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ComplaintStatusBadge status={selected.status} />
                <span className="text-xs text-dark-400">Submitted {formatDateTime(selected.submittedAt)}</span>
              </div>
              <div className="text-sm text-dark-600">
                <span className="font-medium text-dark-800">Tenant:</span> {tenantOf(selected.tenantId)?.fullName ?? 'Unknown'} • {tenantOf(selected.tenantId)?.mobile}
              </div>
              <div className="p-4 rounded-xl bg-background-200 text-sm text-dark-700">{selected.description}</div>
              {selected.imageUrl && (
                <div>
                  <div className="text-xs font-medium text-dark-500 mb-2">Attached photo</div>
                  <img src={selected.imageUrl} alt="Complaint" className="rounded-xl max-h-56 object-cover border border-background-300" />
                </div>
              )}
              {selected.remarks && (
                <div className="p-3 rounded-xl bg-success-light text-success text-sm">
                  <strong>Latest remark:</strong> {selected.remarks}
                </div>
              )}
              {selected.status !== 'Resolved' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Change Status</label>
                    <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)} className="input-field">
                      {statusFlow.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Remarks (visible to tenant)</label>
                    <textarea
                      rows={3}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="e.g. Plumber scheduled for tomorrow 10 AM"
                      className="input-field resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="text-xs text-dark-400">
                  Resolved on {selected.resolvedAt ? formatDateTime(selected.resolvedAt) : '—'}. The tenant has been notified.
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
