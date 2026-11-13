// Tenant Membership Management (owner).
// Active tenants, pending admissions and former tenants — with soft move-out
// that preserves payment/deposit/admission history (records are never deleted).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { User, Phone, Mail, Building2, LogOut, Clock, KeyRound, UserX } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { formatDate, formatINR } from '../utils/format';

export default function OwnerTenantsPage() {
  const { data, moveOutTenant, markTenantNotice } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Former'>('Active');

  const membershipsByTenant = new Map(
    data.platform.memberships.filter((m) => m.pgId === data.activePgId).map((m) => [m.tenantId, m])
  );

  const filteredTenants = data.tenants
    .filter((t) => (statusFilter === 'Active' ? t.status !== 'Left' : t.status === 'Left'))
    .filter(
      (t) =>
        t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.mobile.includes(searchTerm)
    );

  const activeCount = data.tenants.filter((t) => t.status !== 'Left').length;
  const formerCount = data.tenants.filter((t) => t.status === 'Left').length;
  const pendingRequests = data.platform.admissionRequests.filter(
    (r) => r.pgId === data.activePgId && r.status === 'Pending'
  ).length;

  const handleMoveOut = (id: string, name: string, mode: 'Ended' | 'Deactivated') => {
    const message =
      mode === 'Ended'
        ? `Move out ${name}? Their bed becomes vacant and all payment, deposit and admission records are preserved.`
        : `Deactivate ${name}'s membership? Their bed becomes vacant and all records are preserved.`;
    if (confirm(message)) {
      const result = moveOutTenant(id, mode);
      if (result.ok) {
        toast.show(`${name}'s membership has ended. The bed is now vacant. Records preserved.`, 'info');
      } else {
        toast.show(result.error, 'error');
      }
    }
  };

  return (
    <AppLayout role="owner" title="Tenants & Memberships">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Active Tenants</div>
            <div className="text-2xl font-bold text-success mt-1">{activeCount}</div>
          </div>
          <button
            onClick={() => navigate('/app/owner/admissions')}
            className="card p-5 text-left hover:shadow-glow transition-shadow"
          >
            <div className="text-xs text-dark-400 uppercase tracking-wide">Pending Admissions</div>
            <div className="text-2xl font-bold text-warning mt-1">{pendingRequests}</div>
          </button>
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Former Tenants</div>
            <div className="text-2xl font-bold text-dark-600 mt-1">{formerCount}</div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tenants by name or mobile..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex bg-background-200 rounded-xl p-1 text-sm font-medium w-fit">
            {(['Active', 'Former'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-1.5 rounded-lg transition-colors ${
                  statusFilter === f ? 'bg-white text-primary shadow-soft' : 'text-dark-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tenant List */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">
            {statusFilter === 'Active' ? 'Active Tenants' : 'Former Tenants'} ({filteredTenants.length})
          </h3>
          <div className="space-y-3">
            {filteredTenants.map((tenant) => {
              const membership = membershipsByTenant.get(tenant.id);
              return (
                <div key={tenant.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-lg">
                        {tenant.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-dark-900">{tenant.fullName}</h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              tenant.status === 'Active'
                                ? 'bg-success-light text-success'
                                : tenant.status === 'Notice Period'
                                ? 'bg-warning-light text-warning'
                                : 'bg-gray-100 text-dark-500'
                            }`}
                          >
                            {tenant.status}
                          </span>
                          {membership && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-primary-50 text-primary px-2 py-0.5 rounded-full">
                              {membership.status} membership
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-dark-600">
                          <div className="flex items-center gap-1">
                            <Phone size={12} />
                            {tenant.mobile}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail size={12} />
                            {tenant.email}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-dark-500 flex flex-wrap gap-x-2">
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            Room {data.rooms.find((r) => r.id === tenant.roomId)?.roomNumber}, Bed {tenant.bedNumber}
                          </span>
                          <span className="mx-1">|</span>
                          <span className="flex items-center gap-1">
                            <KeyRound size={12} />
                            {membership?.joiningDate ? `Member since ${formatDate(membership.joiningDate)}` : `Joined ${formatDate(tenant.joiningDate)}`}
                          </span>
                          {membership?.leavingDate && (
                            <>
                              <span className="mx-1">|</span>
                              <span className="flex items-center gap-1 text-dark-400">
                                <UserX size={12} /> Left {formatDate(membership.leavingDate)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-sm text-dark-400">Monthly Rent</div>
                        <div className="font-bold text-dark-900">{formatINR(tenant.monthlyRent)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-dark-400">Deposit</div>
                        <div className="font-bold text-success">{formatINR(tenant.securityDeposit)}</div>
                      </div>
                    </div>
                  </div>
                  {statusFilter === 'Active' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        onClick={() => handleMoveOut(tenant.id, tenant.fullName, 'Ended')}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-dark-700 hover:bg-gray-200 text-sm inline-flex items-center justify-center gap-1.5"
                      >
                        <LogOut size={14} /> Mark Moved Out
                      </button>
                      <button
                        onClick={() => handleMoveOut(tenant.id, tenant.fullName, 'Deactivated')}
                        className="flex-1 py-2 rounded-lg bg-gray-100 text-dark-700 hover:bg-gray-200 text-sm inline-flex items-center justify-center gap-1.5"
                      >
                        <UserX size={14} /> Deactivate
                      </button>
                      {tenant.status === 'Active' && (
                        <button
                          onClick={() => {
                            if (confirm('Mark as notice period?')) {
                              markTenantNotice(tenant.id);
                              toast.show(`${tenant.fullName} marked as notice period.`, 'info');
                            }
                          }}
                          className="flex-1 py-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-sm inline-flex items-center justify-center gap-1.5"
                        >
                          <Clock size={14} /> Mark Notice
                        </button>
                      )}
                    </div>
                  )}
                  {statusFilter === 'Former' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-dark-400">
                      Payment history, deposit records and admission records are preserved. This member no longer has
                      access to active PG facilities.
                    </div>
                  )}
                </div>
              );
            })}
            {filteredTenants.length === 0 && (
              <div className="py-10 text-center text-dark-400 text-sm">
                {statusFilter === 'Active' ? 'No active tenants match your search.' : 'No former tenants yet.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
