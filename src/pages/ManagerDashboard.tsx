import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { Home, Zap, MessageSquare, Users, ChevronRight, DoorOpen, Calendar, TriangleAlert } from 'lucide-react';
import StatCard from '../components/StatCard';
import { ComplaintStatusBadge } from '../components/Badge';
import AppLayout from '../components/AppLayout';
import { monthLabel, formatINR, currentMonth } from '../utils/format';
import { getOverdueSummary } from '../services/billingService';

export default function ManagerDashboard() {
  const { data } = useAppStore();
  const navigate = useNavigate();

  const month = currentMonth();
  const activeTenants = data.tenants.filter((t) => t.status !== 'Left');

  const currentMonthReadings = data.meterReadings.filter((m) => m.month === month);
  const totalUnits = currentMonthReadings.reduce((sum, m) => sum + m.units, 0);
  const totalBills = currentMonthReadings.reduce((sum, m) => sum + m.totalAmount, 0);
  const newComplaints = data.complaints.filter((c) => c.status === 'Submitted').length;
  const inProgressComplaints = data.complaints.filter((c) => c.status === 'Seen' || c.status === 'In Progress').length;
  const overdue = getOverdueSummary(data.tenants, data.payments, data.rooms);

  return (
    <AppLayout role="manager" title="Dashboard" subtitle={monthLabel(month)}>
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="card p-6 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome, PG Manager!</h2>
              <p className="opacity-90">Manage {data.rooms.length} rooms with {activeTenants.length} tenants</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Occupied Beds"
            value={data.beds.filter((b) => b.status === 'occupied').length}
            icon={Home}
            hint={`${data.beds.filter((b) => b.status === 'vacant').length} vacant • ${data.beds.filter((b) => b.status === 'notice').length} notice`}
            color="success"
          />
          <StatCard
            label={`Units Read (${monthLabel(month).split(' ')[0]})`}
            value={`${totalUnits} units`}
            icon={Zap}
            hint={`${currentMonthReadings.length}/${data.rooms.length} rooms recorded`}
            color="warning"
          />
          <StatCard
            label="Electricity Billed"
            value={formatINR(totalBills)}
            icon={Zap}
            color="secondary"
            hint="Current month readings"
          />
          <StatCard
            label="Pending Complaints"
            value={newComplaints + inProgressComplaints}
            icon={MessageSquare}
            color={newComplaints > 0 ? 'error' : 'primary'}
            hint={`${newComplaints} new • ${inProgressComplaints} in progress`}
          />
        </div>

        {/* Overdue Payment Summary */}
        <div className={`card p-6 ${overdue.overdueTenants > 0 ? 'border-warning' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {overdue.overdueTenants > 0 ? (
                <TriangleAlert size={20} className="text-warning" />
              ) : (
                <Users size={20} className="text-success" />
              )}
              <h3 className="font-bold text-lg text-dark-900">Overdue Payment Summary</h3>
            </div>
            <button onClick={() => navigate('/app/notifications')} className="text-primary hover:underline text-sm">
              View notification log
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {[
              { label: 'Overdue Tenants', value: overdue.overdueTenants, warn: overdue.overdueTenants > 0 },
              { label: 'Rent Outstanding', value: formatINR(overdue.rentOutstanding), warn: overdue.rentOutstanding > 0 },
              { label: 'Electricity Outstanding', value: formatINR(overdue.electricityOutstanding), warn: overdue.electricityOutstanding > 0 },
              { label: 'Overdue > 3 Days', value: overdue.overdueMoreThan3Days, warn: overdue.overdueMoreThan3Days > 0 },
              { label: 'Overdue > 7 Days', value: overdue.overdueMoreThan7Days, warn: overdue.overdueMoreThan7Days > 0 },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-4 ${s.warn ? 'bg-warning-light' : 'bg-success-light'}`}>
                <div className="text-xs text-dark-500 mb-1">{s.label}</div>
                <div className={`font-bold text-lg ${s.warn ? 'text-warning' : 'text-success'}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {overdue.rows.length > 0 && (
            <div className="space-y-2">
              {overdue.rows.slice(0, 4).map((row) => (
                <button
                  key={row.tenant.id}
                  onClick={() => navigate('/app/manager/tenants')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-background-200 hover:bg-background-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-warning text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {row.tenant.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-dark-900 text-sm truncate">
                        {row.tenant.fullName} · Room {row.roomNumber ?? '-'}
                      </div>
                      <div className="text-xs text-dark-500">
                        {row.worstDaysOverdue > 0
                          ? `Overdue by ${row.worstDaysOverdue} day${row.worstDaysOverdue === 1 ? '' : 's'}`
                          : 'Due soon'}
                        {row.rentDue > 0 && ` · Rent ${formatINR(row.rentDue)}`}
                        {row.electricityDue > 0 && ` · Electricity ${formatINR(row.electricityDue)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-dark-900 text-sm">{formatINR(row.totalDue)}</div>
                    <div className="text-[11px] text-primary">Open record</div>
                  </div>
                </button>
              ))}
              {overdue.rows.length > 4 && (
                <div className="text-xs text-dark-400 text-center pt-1">
                  +{overdue.rows.length - 4} more tenants with outstanding payments
                </div>
              )}
            </div>
          )}
          {overdue.rows.length === 0 && (
            <div className="text-center py-4 text-sm text-success">
              All tenants are up to date — no outstanding payments.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/app/manager/meter')}
            className="card p-5 hover:shadow-glow transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-warning-light text-warning flex items-center justify-center mb-3">
              <Zap size={18} />
            </div>
            <div className="font-bold text-dark-900 text-sm">Meter Readings</div>
            <div className="text-xs text-dark-500 mt-1">Record & publish electricity bills</div>
          </button>
          <button
            onClick={() => navigate('/app/manager/complaints')}
            className="card p-5 hover:shadow-glow transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center mb-3">
              <MessageSquare size={18} />
            </div>
            <div className="font-bold text-dark-900 text-sm">Complaints</div>
            <div className="text-xs text-dark-500 mt-1">{newComplaints} new, {inProgressComplaints} in progress</div>
          </button>
          <button
            onClick={() => navigate('/app/manager/tenants')}
            className="card p-5 hover:shadow-glow transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-success-light text-success flex items-center justify-center mb-3">
              <Users size={18} />
            </div>
            <div className="font-bold text-dark-900 text-sm">Tenants</div>
            <div className="text-xs text-dark-500 mt-1">Register & manage tenants</div>
          </button>
          <button
            onClick={() => navigate('/app/manager/rooms')}
            className="card p-5 hover:shadow-glow transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center mb-3">
              <DoorOpen size={18} />
            </div>
            <div className="font-bold text-dark-900 text-sm">Rooms & Beds</div>
            <div className="text-xs text-dark-500 mt-1">View room occupancy</div>
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Complaints */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-dark-900">Recent Complaints</h3>
              <button
                onClick={() => navigate('/app/manager/complaints')}
                className="text-primary hover:underline text-sm flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {data.complaints
                .slice()
                .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                .slice(0, 4)
                .map((c) => {
                  const tenant = data.tenants.find((t) => t.id === c.tenantId);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-background-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          c.category === 'AC' ? 'bg-secondary' :
                          c.category === 'WiFi' ? 'bg-primary' :
                          c.category === 'Water' ? 'bg-blue-500' :
                          c.category === 'Electrical' ? 'bg-warning' :
                          'bg-dark-400'
                        }`}>
                          {c.category.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-dark-900 text-sm truncate">{c.category} — {tenant?.fullName ?? 'Unknown'}</div>
                          <div className="text-xs text-dark-500">Room {c.roomNumber}</div>
                        </div>
                      </div>
                      <ComplaintStatusBadge status={c.status} />
                    </div>
                  );
                })}
              {data.complaints.length === 0 && (
                <div className="text-center py-6 text-dark-500 text-sm">No complaints yet.</div>
              )}
            </div>
          </div>

          {/* Meter Readings Progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-dark-900">Meter Readings Progress</h3>
              <span className="text-xs text-dark-400 flex items-center gap-1">
                <Calendar size={12} /> {monthLabel(month)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-dark-600">Readings Recorded</span>
                  <span className="font-medium">{currentMonthReadings.length} / {data.rooms.length}</span>
                </div>
                <div className="w-full bg-background-300 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(currentMonthReadings.length / data.rooms.length) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-dark-400 mt-2">
                  {Math.round((currentMonthReadings.length / data.rooms.length) * 100)}% completed
                  {currentMonthReadings.every((r) => r.published) && currentMonthReadings.length > 0 ? ' • Bills published' : ' • Bills not published yet'}
                </div>
              </div>
              <button
                onClick={() => navigate('/app/manager/meter')}
                className="btn-primary py-2 text-sm shrink-0"
              >
                Record Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
