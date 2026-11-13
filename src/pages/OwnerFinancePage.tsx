import { useState, useMemo } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  BedDouble,
  Home,
  Bell,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import AppLayout from '../components/AppLayout';
import StatCard from '../components/StatCard';
import { PaymentStatusBadge } from '../components/Badge';
import { useAppStore } from '../store/appStore';
import { useToast } from '../components/Toast';
import { formatINR, formatDate, monthLabel, lastMonths, currentMonth } from '../utils/format';
import { getPlan } from '../data/plans';
import { subscriptionAllows } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';

export default function OwnerFinancePage() {
  const { data, sendRentReminder } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();
  const months = useMemo(() => lastMonths(6), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const reportsAllowed = subscriptionAllows(data.subscription, 'financialReports');

  const monthRentPayments = data.payments.filter((p) => p.type === 'Rent' && p.month === selectedMonth);
  const monthElecPayments = data.payments.filter((p) => p.type === 'Electricity' && p.month === selectedMonth);

  const totalMonthlyRent = data.tenants
    .filter((t) => t.status !== 'Left')
    .reduce((s, t) => s + t.monthlyRent, 0);
  const rentReceived = monthRentPayments.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const rentOutstanding = monthRentPayments.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0);
  const elecOutstanding = monthElecPayments.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = rentOutstanding + elecOutstanding;
  const totalDeposits = data.tenants.filter((t) => t.status !== 'Left').reduce((s, t) => s + t.securityDeposit, 0);

  const totalBeds = data.rooms.reduce((s, r) => s + r.totalBeds, 0);
  const occupiedBeds = data.beds.filter((b) => b.status === 'occupied').length;
  const vacantBeds = data.beds.filter((b) => b.status === 'vacant').length;

  const outstandingList = [...monthRentPayments, ...monthElecPayments]
    .filter((p) => p.status !== 'Paid')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueList = outstandingList.filter((p) => p.status === 'Overdue' || p.dueDate < new Date().toISOString().split('T')[0]);

  const depositRecords = data.tenants.map((t) => {
    const dep = data.payments.find((p) => p.tenantId === t.id && p.type === 'Deposit');
    return { tenant: t, payment: dep };
  });

  const chartData = months.map((m) => {
    const rent = data.payments.filter((p) => p.type === 'Rent' && p.month === m);
    return {
      month: monthLabel(m).split(' ')[0],
      Received: rent.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0),
      Outstanding: rent.filter((p) => p.status !== 'Paid').reduce((s, p) => s + p.amount, 0),
    };
  });

  const tenantRecords = data.tenants
    .filter((t) => t.status !== 'Left')
    .map((t) => ({
      tenant: t,
      payment: monthRentPayments.find((p) => p.tenantId === t.id),
    }));

  const downloadReport = () => {
    const lines: string[] = [];
    lines.push(`Aapka PG - Monthly Report - ${monthLabel(selectedMonth)}`);
    lines.push(`PG,${data.settings.name}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Total Monthly Rent,${totalMonthlyRent}`);
    lines.push(`Rent Received,${rentReceived}`);
    lines.push(`Outstanding Rent,${rentOutstanding}`);
    lines.push(`Outstanding Electricity,${elecOutstanding}`);
    lines.push(`Total Deposits,${totalDeposits}`);
    lines.push(`Occupied Beds,${occupiedBeds}`);
    lines.push(`Vacant Beds,${vacantBeds}`);
    lines.push('');
    lines.push('Tenant-wise Payments');
    lines.push('Tenant,Room,Bed,Amount,Status,Due Date,Paid Date,Method,Reference');
    tenantRecords.forEach(({ tenant, payment }) => {
      lines.push(
        [
          tenant.fullName,
          data.rooms.find((r) => r.id === tenant.roomId)?.roomNumber ?? '-',
          tenant.bedNumber,
          payment?.amount ?? tenant.monthlyRent,
          payment?.status ?? 'Not Generated',
          payment?.dueDate ?? '-',
          payment?.paidAt?.split('T')[0] ?? '-',
          payment?.method ?? '-',
          payment?.reference ?? '-',
        ].join(',')
      );
    });
    lines.push('');
    lines.push('Deposit Records');
    lines.push('Tenant,Deposit,Status,Date');
    depositRecords.forEach(({ tenant, payment }) => {
      lines.push([tenant.fullName, tenant.securityDeposit, payment?.status ?? '-', payment?.paidAt?.split('T')[0] ?? '-'].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aapka-pg-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show('Monthly report downloaded', 'success');
  };

  return (
    <AppLayout role="owner" title="Rent & Deposit Dashboard" subtitle={monthLabel(selectedMonth)}>
      <div className="space-y-6">
        {/* Month filter + report */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-dark-600">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field w-auto py-2"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>
          {reportsAllowed ? (
            <button onClick={downloadReport} className="btn-secondary py-2">
              <Download size={16} /> Download Monthly Report
            </button>
          ) : (
            <button
              onClick={() => navigate('/app/owner/subscription')}
              className="btn-secondary py-2"
              title={`Monthly reports are a Growth plan feature — your plan: ${getPlan(data.subscription.planId).name}`}
            >
              <Download size={16} /> Reports — Upgrade to Growth
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Monthly Rent" value={formatINR(totalMonthlyRent)} icon={TrendingUp} color="primary" hint="From active tenants" />
          <StatCard label={`Rent Received (${monthLabel(selectedMonth).split(' ')[0]})`} value={formatINR(rentReceived)} icon={ArrowUpRight} color="success" />
          <StatCard label="Outstanding Rent" value={formatINR(totalOutstanding)} icon={Wallet} color={totalOutstanding > 0 ? 'warning' : 'success'} hint="Rent + electricity pending" />
          <StatCard label="Total Deposits" value={formatINR(totalDeposits)} icon={ShieldCheck} color="secondary" hint="Held for active tenants" />
          <StatCard label="Occupied Beds" value={occupiedBeds} icon={BedDouble} color="success" hint={`${Math.round((occupiedBeds / totalBeds) * 100)}% occupancy`} />
          <StatCard label="Vacant Beds" value={vacantBeds} icon={Home} color="warning" hint="Available for new tenants" />
        </div>

        {/* Chart */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Monthly Rent Collection</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEBFB" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#574D6E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#574D6E' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} />
                <Tooltip formatter={(value) => formatINR(Number(value))} cursor={{ fill: '#F2EDFE' }} />
                <Legend />
                <Bar dataKey="Received" fill="#6938EF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Outstanding" fill="#FEF3C7" stroke="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Outstanding payments */}
          <div className="card p-6">
            <h3 className="font-bold text-lg text-dark-900 mb-4">Outstanding Payments</h3>
            {outstandingList.length === 0 ? (
              <div className="text-sm text-dark-500 py-8 text-center">All caught up! No pending payments for {monthLabel(selectedMonth)}.</div>
            ) : (
              <div className="space-y-3">
                {outstandingList.map((p) => {
                  const tenant = data.tenants.find((t) => t.id === p.tenantId);
                  const room = data.rooms.find((r) => r.id === tenant?.roomId);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-background-200">
                      <div className="min-w-0">
                        <div className="font-medium text-dark-900 text-sm truncate">
                          {tenant?.fullName ?? 'Tenant'} <span className="text-dark-400 font-normal">• {p.type}</span>
                        </div>
                        <div className="text-xs text-dark-500">
                          Room {room?.roomNumber ?? '-'} • Due {formatDate(p.dueDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-dark-900">{formatINR(p.amount)}</span>
                        <PaymentStatusBadge status={p.status} />
                        <button
                          onClick={() => {
                            sendRentReminder(p.tenantId);
                            toast.show(`Reminder sent to ${tenant?.fullName ?? 'tenant'}`, 'success');
                          }}
                          className="p-2 rounded-lg bg-primary-50 text-primary hover:bg-primary-100"
                          title="Send reminder"
                        >
                          <Bell size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Late payment tracking */}
          <div className="card p-6">
            <h3 className="font-bold text-lg text-dark-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" /> Late Payment Tracking
            </h3>
            {overdueList.length === 0 ? (
              <div className="text-sm text-dark-500 py-8 text-center">No late payments. Tenants are paying on time.</div>
            ) : (
              <div className="space-y-3">
                {overdueList.map((p) => {
                  const tenant = data.tenants.find((t) => t.id === p.tenantId);
                  const due = new Date(p.dueDate);
                  const days = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000));
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-error-light/50 border border-error/10">
                      <div>
                        <div className="font-medium text-dark-900 text-sm">{tenant?.fullName ?? 'Tenant'}</div>
                        <div className="text-xs text-error">{days} day{days === 1 ? '' : 's'} overdue • Due {formatDate(p.dueDate)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-dark-900">{formatINR(p.amount)}</div>
                        <button
                          onClick={() => {
                            sendRentReminder(p.tenantId);
                            toast.show(`Reminder sent to ${tenant?.fullName ?? 'tenant'}`, 'success');
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Send reminder
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tenant-wise payment records */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Tenant-wise Payment Records — {monthLabel(selectedMonth)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-500 border-b border-background-300">
                  <th className="py-3 font-medium">Tenant</th>
                  <th className="py-3 font-medium">Room / Bed</th>
                  <th className="py-3 font-medium">Amount</th>
                  <th className="py-3 font-medium">Due Date</th>
                  <th className="py-3 font-medium">Method</th>
                  <th className="py-3 font-medium">Reference</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenantRecords.map(({ tenant, payment }) => (
                  <tr key={tenant.id} className="border-b border-background-200 hover:bg-background-200">
                    <td className="py-3 font-medium text-dark-900">{tenant.fullName}</td>
                    <td className="py-3 text-dark-600">
                      {data.rooms.find((r) => r.id === tenant.roomId)?.roomNumber ?? '-'} / {tenant.bedNumber}
                    </td>
                    <td className="py-3 font-medium">{formatINR(payment?.amount ?? tenant.monthlyRent)}</td>
                    <td className="py-3 text-dark-600">{formatDate(payment?.dueDate)}</td>
                    <td className="py-3 text-dark-600">{payment?.method ?? '—'}</td>
                    <td className="py-3 text-dark-400 font-mono text-xs">{payment?.reference ?? '—'}</td>
                    <td className="py-3">
                      {payment ? <PaymentStatusBadge status={payment.status} /> : <span className="badge bg-background-200 text-dark-500">Not Generated</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deposit records */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Deposit Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-500 border-b border-background-300">
                  <th className="py-3 font-medium">Tenant</th>
                  <th className="py-3 font-medium">Room / Bed</th>
                  <th className="py-3 font-medium">Deposit</th>
                  <th className="py-3 font-medium">Received On</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {depositRecords.map(({ tenant, payment }) => (
                  <tr key={tenant.id} className="border-b border-background-200 hover:bg-background-200">
                    <td className="py-3 font-medium text-dark-900">{tenant.fullName}</td>
                    <td className="py-3 text-dark-600">
                      {data.rooms.find((r) => r.id === tenant.roomId)?.roomNumber ?? '-'} / {tenant.bedNumber}
                    </td>
                    <td className="py-3 font-bold text-success">{formatINR(tenant.securityDeposit)}</td>
                    <td className="py-3 text-dark-600">{formatDate(payment?.paidAt)}</td>
                    <td className="py-3">{payment ? <PaymentStatusBadge status={payment.status} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
