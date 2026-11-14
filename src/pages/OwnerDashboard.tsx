import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Home, TrendingUp, Users, BedDouble, ArrowUpRight, TriangleAlert, Crown, CalendarClock, UserPlus } from 'lucide-react';
import StatCard from '../components/StatCard';
import AppLayout from '../components/AppLayout';
import { formatINR, currentMonth, formatDate } from '../utils/format';
import { getPlan } from '../data/plans';
import { usageSummary, isOverLimit } from '../services/subscriptionService';
import { getOutstandingTenants } from '../services/billingService';

export default function OwnerDashboard() {
  const { data } = useAppStore();
  const navigate = useNavigate();

  const currentMonthStr = currentMonth();

  // Rent calculations
  const currentMonthRent = data.payments.filter(
    (p) => p.month === currentMonthStr && p.type === 'Rent'
  );
  const rentReceived = currentMonthRent.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const rentPending = currentMonthRent.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalMonthlyRent = data.tenants.reduce((s, t) => s + t.monthlyRent, 0);

  // Electricity
  const currentMonthElectricity = data.meterReadings.filter((m) => m.month === currentMonthStr);
  const electricityReceived = currentMonthElectricity.reduce((s, m) => s + m.totalAmount, 0);

  // Occupancy
  const occupiedBeds = data.tenants.filter((t) => t.status !== 'Left').length;
  const totalBeds = data.rooms.reduce((s, r) => s + r.totalBeds, 0);
  const vacantBeds = totalBeds - occupiedBeds;
  const noticePeriodBeds = data.tenants.filter((t) => t.status === 'Notice Period').length;

  // Subscription health
  const sub = data.subscription;
  const plan = getPlan(sub.planId);
  const needsAttention = ['Payment Pending', 'Past Due', 'Suspended', 'Expired'].includes(sub.status);
  const trialEnding =
    sub.status === 'Trial' &&
    sub.trialEndsAt &&
    (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000 <= 3;
  const usageRows = usageSummary(sub, { rooms: data.rooms.length, beds: data.beds.length, branches: 1 });
  const overLimit = usageRows.some((r) => isOverLimit(r.used, r.limit));
  const outstandingTenants = getOutstandingTenants(data.tenants, data.payments, data.rooms);
  const pendingAdmissions = data.platform.admissionRequests.filter(
    (r) => r.pgId === data.activePgId && r.status === 'Pending'
  ).length;

  return (
    <AppLayout role="owner" title="Dashboard">
      <div className="space-y-6">
        {/* Subscription warning / trial banner */}
        {needsAttention && (
          <div className="rounded-2xl border border-warning bg-warning-light p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <TriangleAlert size={24} className="text-warning shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-dark-900">Subscription payment warning</div>
              <p className="text-sm text-dark-600">
                Your {plan.name} plan is <strong>{sub.status}</strong>. Paid automation features are restricted —
                retry the payment to restore full access. Your PG records are safe and never deleted.
              </p>
            </div>
            <button onClick={() => navigate('/app/owner/subscription')} className="btn-primary shrink-0">
              Retry Payment
            </button>
          </div>
        )}
        {trialEnding && (
          <div className="rounded-2xl border border-primary bg-primary-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <CalendarClock size={24} className="text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-dark-900">Free trial ending on {formatDate(sub.trialEndsAt)}</div>
              <p className="text-sm text-dark-600">Choose a plan to keep automated reminders and reports active.</p>
            </div>
            <button onClick={() => navigate('/app/owner/subscription')} className="btn-primary shrink-0">
              Choose a Plan
            </button>
          </div>
        )}

        {/* Welcome Card */}
        <div className="card p-6 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome, Owner!</h2>
              <p className="opacity-90">{data.settings.name}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Home size={24} />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Monthly Rent"
            value={formatINR(totalMonthlyRent)}
            icon={TrendingUp}
            color="primary"
          />
          <StatCard
            label="Rent Received"
            value={formatINR(rentReceived)}
            icon={ArrowUpRight}
            trend={{ value: 8, positive: true }}
            color="success"
          />
          <StatCard
            label="Outstanding Rent"
            value={formatINR(rentPending)}
            icon={ArrowUpRight}
            trend={{ value: 12, positive: false }}
            color="warning"
          />
          <StatCard
            label="Total Deposits"
            value={formatINR(data.tenants.reduce((s, t) => s + t.securityDeposit, 0))}
            icon={Home}
            color="secondary"
          />
          <StatCard
            label="Occupied Beds"
            value={occupiedBeds}
            icon={BedDouble}
            hint={totalBeds > 0 ? `${Math.round((occupiedBeds / totalBeds) * 100)}% occupancy` : 'No beds configured'}
            color="success"
          />
          <StatCard
            label="Vacant Beds"
            value={vacantBeds}
            icon={Home}
            color="warning"
          />
        </div>

        {/* Pending admissions callout */}
        {pendingAdmissions > 0 && (
          <button
            onClick={() => navigate('/app/owner/admissions')}
            className="w-full card p-5 border-primary bg-primary-50/50 hover:shadow-glow transition-all flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <div className="font-bold text-dark-900">
                  {pendingAdmissions} pending admission request{pendingAdmissions === 1 ? '' : 's'}
                </div>
                <div className="text-sm text-dark-500">
                  Review tenant details and allocate rooms & beds
                </div>
              </div>
            </div>
            <span className="text-primary font-semibold text-sm">Review now →</span>
          </button>
        )}

        {/* Finance Summary */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Financial Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm text-gray-500">Monthly Rent</div>
                  <div className="text-xs text-gray-400">Base rent from tenants</div>
                </div>
                <div className="text-right font-medium text-gray-900">{formatINR(totalMonthlyRent)}</div>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <div>
                  <div className="text-sm text-gray-500">Electricity Bills</div>
                  <div className="text-xs text-gray-400">Calculated this month</div>
                </div>
                <div className="text-right font-medium text-gray-900">{formatINR(electricityReceived)}</div>
              </div>
              <div className="flex justify-between py-3">
                <div>
                  <div className="text-sm text-gray-500">Total Income</div>
                  <div className="text-xs text-gray-400">Combined rent & electricity</div>
                </div>
                <div className="text-right text-xl font-bold text-gray-900">
                  {formatINR(totalMonthlyRent + electricityReceived)}
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500 mb-1">Payment Status</div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-success">Paid</span>
                <span className="font-medium">{formatINR(rentReceived)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full"
                  style={{ width: `${(rentReceived / (rentReceived + rentPending)) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(rentReceived / (rentReceived + rentPending || 1)) * 100}% collected
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Bed Status</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-success">Occupied</span>
                  <span className="font-medium">{occupiedBeds} beds</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-success h-3 rounded-full"
                    style={{ width: `${(occupiedBeds / totalBeds) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-primary">Vacant</span>
                  <span className="font-medium">{vacantBeds} beds</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full"
                    style={{ width: `${(vacantBeds / totalBeds) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-orange-500">Notice Period</span>
                  <span className="font-medium">{noticePeriodBeds} beds</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full"
                    style={{ width: `${totalBeds > 0 ? (noticePeriodBeds / totalBeds) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-primary-50">
              <div className="text-sm text-primary font-medium mb-1">Vacancy Impact</div>
              <div className="text-2xl font-bold text-primary">
                {formatINR(totalBeds > 0 ? vacantBeds * (totalMonthlyRent / totalBeds) : 0)}/month
              </div>
              <div className="text-xs text-gray-500 mt-1">Potential monthly revenue from vacant beds</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {data.tenants.slice(0, 4).map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                    {tenant.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{tenant.fullName}</div>
                    <div className="text-xs text-gray-500">Room {tenant.roomId} • {tenant.status}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">Added {tenant.joiningDate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription status + Outstanding tenants */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Subscription Status</h3>
              <button onClick={() => navigate('/app/owner/subscription')} className="text-primary hover:underline text-sm">
                Manage
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center">
                <Crown size={22} />
              </div>
              <div>
                <div className="font-bold text-dark-900">
                  {plan.name} · <span className={needsAttention ? 'text-error' : 'text-success'}>{sub.status}</span>
                </div>
                <div className="text-xs text-dark-500">
                  {sub.status === 'Trial' ? 'Trial ends' : 'Renews'} {formatDate(sub.currentPeriodEnd)} ·{' '}
                  {sub.cycle === 'monthly' ? 'Monthly' : 'Annual'} billing
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {usageRows.map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-dark-500">{row.label} used</span>
                  <span className={`font-medium ${isOverLimit(row.used, row.limit) ? 'text-error' : 'text-dark-800'}`}>
                    {row.used} / {row.limit === null ? 'Unlimited' : row.limit}
                  </span>
                </div>
              ))}
            </div>
            {overLimit && (
              <div className="mt-4 p-3 rounded-xl bg-warning-light text-xs text-dark-700">
                You have reached a plan limit. Upgrade your plan to add more rooms, beds or branches.
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Outstanding Payments</h3>
              <button onClick={() => navigate('/app/owner/finance')} className="text-primary hover:underline text-sm">
                Finance details
              </button>
            </div>
            {outstandingTenants.length === 0 ? (
              <div className="text-center py-6 text-sm text-success">All payments collected.</div>
            ) : (
              <div className="space-y-2">
                {outstandingTenants.slice(0, 4).map((row) => (
                  <div key={row.tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{row.tenant.fullName}</div>
                      <div className="text-xs text-dark-500">
                        {row.worstDaysOverdue > 0 ? `${row.worstDaysOverdue} day${row.worstDaysOverdue === 1 ? '' : 's'} overdue` : 'Due soon'}
                      </div>
                    </div>
                    <div className="font-bold text-dark-900 text-sm">{formatINR(row.totalDue)}</div>
                  </div>
                ))}
                {outstandingTenants.length > 4 && (
                  <div className="text-xs text-dark-400 text-center pt-1">
                    +{outstandingTenants.length - 4} more — send reminders from the Tenants page
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/app/owner/beds')}
            className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <BedDouble size={24} />
            </div>
            <span className="font-medium text-sm text-gray-900">Bed Status</span>
          </button>
          <button
            onClick={() => navigate('/app/owner/finance')}
            className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-success-50 text-success flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <span className="font-medium text-sm text-gray-900">Finance</span>
          </button>
          <button
            onClick={() => navigate('/app/owner/tenants')}
            className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <span className="font-medium text-sm text-gray-900">Tenants</span>
          </button>
          <button
            onClick={() => navigate('/app/owner/settings')}
            className="card p-4 hover:shadow-glow transition-shadow flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Home size={24} />
            </div>
            <span className="font-medium text-sm text-gray-900">Settings</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
