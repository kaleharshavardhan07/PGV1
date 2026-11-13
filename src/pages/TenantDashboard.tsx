import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Wallet, Zap, MessageSquare, UtensilsCrossed, User, ChevronRight, Clock, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard';
import { PaymentStatusBadge } from '../components/Badge';
import { formatDate, monthLabel, formatINR, currentMonth } from '../utils/format';
import AppLayout from '../components/AppLayout';

export default function TenantDashboard() {
  const { data } = useAppStore();
  const navigate = useNavigate();
  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);

  if (!tenant) {
    return (
      <AppLayout role="tenant" title="Dashboard">
        <div className="card p-10 text-center text-dark-500">Tenant profile not found. Please log in again.</div>
      </AppLayout>
    );
  }

  const month = currentMonth();
  const room = data.rooms.find((r) => r.id === tenant.roomId);

  const rentPayment = data.payments.find((p) => p.tenantId === tenant.id && p.type === 'Rent' && p.month === month);
  const totalDue = rentPayment?.amount ?? tenant.monthlyRent + data.settings.foodCharge;

  const totalOutstanding = data.payments
    .filter((p) => p.tenantId === tenant.id && p.status !== 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const recentComplaints = data.complaints
    .filter((c) => c.tenantId === tenant.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 3);

  const currentElectricity = data.meterReadings.find((m) => m.roomId === tenant.roomId && m.month === month);
  const elecPayment = data.payments.find(
    (p) => p.tenantId === tenant.id && p.type === 'Electricity' && p.month === month
  );

  return (
    <AppLayout role="tenant" title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="card p-6 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome back, {tenant.fullName.split(' ')[0]}!</h2>
              <p className="opacity-90">Room {room?.roomNumber}, Bed {tenant.bedNumber} • {data.settings.name}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <User size={24} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Monthly Rent" value={formatINR(tenant.monthlyRent)} icon={Wallet} color="primary" />
          <StatCard
            label="Total Due This Month"
            value={formatINR(totalDue)}
            icon={Clock}
            hint={rentPayment ? `Due ${formatDate(rentPayment.dueDate)}` : 'Includes food charges'}
            color={rentPayment?.status === 'Paid' ? 'success' : 'warning'}
          />
          <StatCard
            label="Outstanding"
            value={formatINR(totalOutstanding)}
            icon={Zap}
            color={totalOutstanding > 0 ? 'warning' : 'success'}
            hint={totalOutstanding > 0 ? 'Pay to avoid late fees' : 'All clear'}
          />
          <StatCard
            label="Security Deposit"
            value={formatINR(tenant.securityDeposit)}
            icon={UtensilsCrossed}
            color="secondary"
            hint="Refundable at checkout"
          />
        </div>

        {/* Payment & Electricity Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Payment Info */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-dark-900 flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                Current Month Rent
              </h3>
              <span className="text-sm text-dark-400">{monthLabel(month)}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-background-200">
                <span className="text-dark-500">Monthly Rent</span>
                <span className="font-medium">{formatINR(tenant.monthlyRent)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-background-200">
                <span className="text-dark-500">Food Charges</span>
                <span className="font-medium">{formatINR(data.settings.foodCharge)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-background-200">
                <span className="text-dark-500">Due Date</span>
                <span className="font-medium flex items-center gap-1">
                  <Calendar size={14} className="text-primary" /> {formatDate(rentPayment?.dueDate ?? `${month}-05`)}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-dark-500">Total Due</span>
                <span className="font-bold text-lg">{formatINR(totalDue)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <PaymentStatusBadge status={rentPayment?.status ?? 'Pending'} />
              {tenant.status === 'Notice Period' && (
                <span className="badge bg-warning-light text-warning">Notice Period</span>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate('/app/tenant/rent')}
                disabled={rentPayment?.status === 'Paid'}
                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rentPayment?.status === 'Paid' ? 'Rent Paid ✓' : 'Pay Rent Now'}
              </button>
              <button onClick={() => navigate('/app/tenant/rent')} className="w-full btn-secondary py-3">
                View Payment History
              </button>
            </div>
          </div>

          {/* Electricity Info */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-dark-900 flex items-center gap-2">
                <Zap size={20} className="text-warning" />
                Electricity Bill
              </h3>
              {currentElectricity?.published ? (
                <PaymentStatusBadge status={elecPayment?.status ?? 'Pending'} />
              ) : (
                <span className="badge bg-background-200 text-dark-500">Awaiting Reading</span>
              )}
            </div>

            {currentElectricity && currentElectricity.published ? (
              <div className="space-y-4">
                <div className="bg-warning-light rounded-xl p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-dark-500 text-sm">Units Consumed</span>
                    <span className="font-bold text-dark-900">{currentElectricity.units} units</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-dark-500 text-sm">Rate per unit</span>
                    <span className="font-medium text-dark-900">₹{currentElectricity.ratePerUnit}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-warning/30">
                    <span className="text-dark-900 font-medium">Your Share</span>
                    <span className="text-xl font-bold text-warning">{formatINR(currentElectricity.perTenantAmount)}</span>
                  </div>
                </div>
                <button onClick={() => navigate('/app/tenant/electricity')} className="w-full btn-secondary py-3">
                  View Bill Details
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block p-3 rounded-full bg-background-200 mb-3">
                  <Zap size={32} className="text-dark-300" />
                </div>
                <p className="text-dark-500 text-sm">
                  The electricity bill for {monthLabel(month)} will appear once your PG manager records and publishes the meter readings.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-dark-900 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary" />
              Recent Complaints
            </h3>
            <button
              onClick={() => navigate('/app/tenant/complaints')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>

          {recentComplaints.length > 0 ? (
            <div className="space-y-3">
              {recentComplaints.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-background-200 hover:bg-background-300 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    c.status === 'Resolved' ? 'bg-success-light text-success' :
                    c.status === 'In Progress' ? 'bg-warning-light text-warning' :
                    'bg-primary-50 text-primary'
                  }`}>
                    <MessageSquare size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-900">{c.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === 'Resolved' ? 'bg-success-light text-success' :
                        c.status === 'In Progress' ? 'bg-warning-light text-warning' :
                        'bg-primary-50 text-primary'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-dark-500 mt-0.5 line-clamp-1">{c.description}</div>
                  </div>
                  <span className="text-xs text-dark-400 shrink-0">{formatDate(c.submittedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-block p-3 rounded-full bg-background-200 mb-3">
                <MessageSquare size={32} className="text-dark-300" />
              </div>
              <p className="text-dark-500 text-sm">No complaints submitted yet.</p>
              <button
                onClick={() => navigate('/app/tenant/complaints')}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Submit a complaint
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/app/tenant/rent')} className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <span className="font-medium text-sm text-dark-900">Pay Rent</span>
          </button>
          <button onClick={() => navigate('/app/tenant/electricity')} className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-warning-light text-warning flex items-center justify-center">
              <Zap size={24} />
            </div>
            <span className="font-medium text-sm text-dark-900">Electricity</span>
          </button>
          <button onClick={() => navigate('/app/tenant/food')} className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center">
              <UtensilsCrossed size={24} />
            </div>
            <span className="font-medium text-sm text-dark-900">Food Menu</span>
          </button>
          <button onClick={() => navigate('/app/tenant/profile')} className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-success-light text-success flex items-center justify-center">
              <User size={24} />
            </div>
            <span className="font-medium text-sm text-dark-900">My Profile</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
