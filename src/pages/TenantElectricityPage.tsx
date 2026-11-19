import { Zap } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import EmptyState from '../components/EmptyState';
import { useAppStore } from '../store/appStore';
import { formatINR, monthLabel } from '../utils/format';

/** Read-only view of the tenant's share of the room's electricity bill. */
export default function TenantElectricityPage() {
  const { data } = useAppStore();
  const readings = [...data.meterReadings].sort((a, b) => b.month.localeCompare(a.month));
  const latest = readings[0];

  return (
    <AppLayout role="tenant" title="Electricity" subtitle="Your room’s meter readings and your share of the bill.">
      {!latest ? (
        <div className="card"><EmptyState icon={Zap} title="No readings published yet" description="When your PG publishes this month’s meter reading, your share will appear here." /></div>
      ) : (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="font-semibold text-dark-900 flex items-center gap-2"><Zap size={18} className="text-warning" /> {monthLabel(latest.month)}</h2>
              <span className="badge bg-primary-50 text-primary-700">Room {latest.roomNumber}</span>
            </div>
            <div className="text-sm text-dark-500">Your share</div>
            <div className="text-4xl font-bold text-dark-900 tracking-tight mt-1">{formatINR(latest.perTenantAmount)}</div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-dark-200 text-sm">
              <div><dt className="text-dark-500">Previous reading</dt><dd className="font-medium mt-0.5">{latest.previousReading}</dd></div>
              <div><dt className="text-dark-500">Current reading</dt><dd className="font-medium mt-0.5">{latest.currentReading}</dd></div>
              <div><dt className="text-dark-500">Units used</dt><dd className="font-medium mt-0.5">{latest.units}</dd></div>
              <div><dt className="text-dark-500">Rate</dt><dd className="font-medium mt-0.5">{formatINR(latest.ratePerUnit)}/unit</dd></div>
            </dl>
            <p className="text-xs text-dark-400 mt-5">Room bill {formatINR(latest.totalAmount)} ÷ {latest.occupants} tenant{latest.occupants === 1 ? '' : 's'} = {formatINR(latest.perTenantAmount)} each.</p>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-200 font-semibold text-dark-900">History</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-50"><tr>{['Month', 'Units', 'Room bill', 'Your share'].map((h) => <th key={h} className="table-head px-5 py-3">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-dark-100">
                  {readings.map((r) => (
                    <tr key={r.id}><td className="px-5 py-3 font-medium text-dark-800">{monthLabel(r.month)}</td><td className="px-5 py-3">{r.units}</td><td className="px-5 py-3">{formatINR(r.totalAmount)}</td><td className="px-5 py-3 font-medium">{formatINR(r.perTenantAmount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
