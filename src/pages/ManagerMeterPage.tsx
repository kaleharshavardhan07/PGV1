import { useState } from 'react';
import { Zap, Send, Save, Gauge, IndianRupee } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { formatINR, monthLabel, currentMonth } from '../utils/format';

/** Electricity: record each room's meter reading, then publish the month so tenants can see their share. */
export default function ManagerMeterPage({ role = 'manager' }: { role?: 'owner' | 'manager' }) {
  const { data, saveMeterReading, publishBills } = useAppStore();
  const toast = useToast();

  const [month, setMonth] = useState(currentMonth());
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [rate, setRate] = useState(String(data.settings.electricityRate || ''));
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const readingFor = (roomId: string) => data.meterReadings.find((m) => m.roomId === roomId && m.month === month);
  const previousFor = (roomId: string) =>
    data.meterReadings.filter((m) => m.roomId === roomId && m.month < month).sort((a, b) => b.month.localeCompare(a.month))[0]?.currentReading ?? 0;

  const monthReadings = data.meterReadings.filter((m) => m.month === month);
  const unpublished = monthReadings.filter((m) => !m.published);
  const totalUnits = monthReadings.reduce((s, m) => s + m.units, 0);
  const totalAmount = monthReadings.reduce((s, m) => s + m.totalAmount, 0);
  const effectiveRate = parseFloat(rate) || data.settings.electricityRate;

  const save = async (roomId: string, roomNumber: string) => {
    const existing = readingFor(roomId);
    const raw = inputs[roomId] ?? (existing ? String(existing.currentReading) : '');
    const current = parseFloat(raw);
    const previous = existing?.previousReading ?? previousFor(roomId);
    if (Number.isNaN(current)) return toast.show('Enter the current meter reading', 'error');
    if (current < previous) return toast.show(`Reading can’t be lower than the previous one (${previous})`, 'error');

    setBusyRoom(roomId);
    const res = await saveMeterReading({
      roomId, month, previousReading: previous, currentReading: current, ratePerUnit: effectiveRate,
      occupants: Math.max(1, data.tenants.filter((t) => t.roomId === roomId && t.status !== 'Left').length),
    });
    setBusyRoom(null);
    if (res.ok) {
      setInputs(({ [roomId]: _drop, ...rest }) => rest);
      toast.show(`Room ${roomNumber} saved`, 'success');
    } else toast.show(res.error, 'error');
  };

  const publish = async () => {
    setPublishing(true);
    const res = await publishBills(month);
    setPublishing(false);
    setConfirmPublish(false);
    toast.show(res.ok ? `Published ${res.publishedReadings} reading(s). Tenants have been notified.` : res.error, res.ok ? 'success' : 'error');
  };

  return (
    <AppLayout
      role={role}
      title="Electricity"
      subtitle={`${monthLabel(month)} · Each room’s bill is split equally between its tenants.`}
      actions={
        <button className="btn-primary" disabled={unpublished.length === 0} onClick={() => setConfirmPublish(true)}>
          <Send size={16} /> Publish to tenants{unpublished.length ? ` (${unpublished.length})` : ''}
        </button>
      }
    >
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Rooms recorded" value={`${monthReadings.length}/${data.rooms.length}`} icon={Gauge} />
        <StatCard label="Total units" value={totalUnits.toLocaleString('en-IN')} icon={Zap} color="warning" />
        <StatCard label="Total bill" value={formatINR(totalAmount)} icon={IndianRupee} color="secondary" />
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-dark-600">Month
          <input type="month" className="input-field !w-auto" value={month} onChange={(e) => setMonth(e.target.value || currentMonth())} />
        </label>
        <label className="flex items-center gap-2 text-sm text-dark-600">Rate (₹/unit)
          <input type="number" min={0} step="0.1" className="input-field !w-24" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
      </div>

      <div className="card overflow-hidden">
        {data.rooms.length === 0 ? (
          <EmptyState icon={Zap} title="No rooms yet" description="Add rooms first, then record their meter readings here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 border-b border-dark-200">
                <tr>{['Room', 'Previous', 'Current', 'Units', 'Room bill', 'Per tenant', 'Status', ''].map((h) => <th key={h} className="table-head px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {data.rooms.map((room) => {
                  const r = readingFor(room.id);
                  const previous = r?.previousReading ?? previousFor(room.id);
                  const draft = inputs[room.id];
                  const value = draft ?? (r ? String(r.currentReading) : '');
                  const liveUnits = value === '' || Number.isNaN(parseFloat(value)) ? null : Math.max(0, parseFloat(value) - previous);
                  const occupants = Math.max(1, data.tenants.filter((t) => t.roomId === room.id && t.status !== 'Left').length);
                  const bill = liveUnits != null ? Math.round(liveUnits * (r?.ratePerUnit ?? effectiveRate)) : null;
                  const dirty = draft !== undefined && draft !== (r ? String(r.currentReading) : '');
                  return (
                    <tr key={room.id}>
                      <td className="px-4 py-3 font-medium text-dark-900">Room {room.roomNumber}</td>
                      <td className="px-4 py-3 text-dark-600">{previous}</td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Current reading for room ${room.roomNumber}`}
                          type="number" min={previous} className="input-field !w-28 !py-1.5" value={value}
                          disabled={r?.published}
                          onChange={(e) => setInputs({ ...inputs, [room.id]: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">{liveUnits ?? '—'}</td>
                      <td className="px-4 py-3">{bill != null ? formatINR(bill) : '—'}</td>
                      <td className="px-4 py-3">{bill != null ? formatINR(Math.round(bill / (r?.occupants ?? occupants))) : '—'}<span className="text-xs text-dark-400"> ÷ {r?.occupants ?? occupants}</span></td>
                      <td className="px-4 py-3">
                        {r ? <span className={`badge ${r.published ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{r.published ? 'Published' : 'Draft'}</span> : <span className="text-dark-400">Not recorded</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!r?.published && (
                          <button className="btn-secondary !py-1.5" disabled={!dirty || busyRoom === room.id} onClick={() => save(room.id, room.roomNumber)}>
                            <Save size={14} /> {busyRoom === room.id ? 'Saving…' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmPublish}
        busy={publishing}
        title={`Publish ${monthLabel(month)} readings?`}
        message={<>{unpublished.length} room reading(s) become visible to the tenants of those rooms, who are notified. Published readings can no longer be edited.</>}
        confirmLabel="Publish"
        onConfirm={publish}
        onCancel={() => setConfirmPublish(false)}
      />
    </AppLayout>
  );
}
