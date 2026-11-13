import { useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Zap, Check, Send, Camera, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { formatINR, monthLabel, previousMonthKey, currentMonth } from '../utils/format';

const MAX_PHOTO_BYTES = 1024 * 1024;

export default function ManagerMeterPage() {
  const { data, saveMeterReading, publishBills } = useAppStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [rateInput, setRateInput] = useState(String(data.settings.electricityRate));
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ current?: string }>({});

  const monthReadings = data.meterReadings.filter((m) => m.month === selectedMonth);
  const prevMonthKey = previousMonthKey(1);

  const lastReadingFor = (roomId: string) => {
    const sorted = data.meterReadings
      .filter((m) => m.roomId === roomId && m.month < selectedMonth)
      .sort((a, b) => b.month.localeCompare(a.month));
    return sorted[0];
  };

  const startEdit = (roomId: string) => {
    const existing = monthReadings.find((m) => m.roomId === roomId);
    setEditingRoom(roomId);
    setCurrentInput(existing ? String(existing.currentReading) : '');
    setRateInput(String(existing?.ratePerUnit ?? data.settings.electricityRate));
    setPhoto(existing?.photoUrl);
    setErrors({});
  };

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.show('Please choose an image file.', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.show('Photo too large — choose one under 1 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = (roomId: string) => {
    const room = data.rooms.find((r) => r.id === roomId);
    const previous = lastReadingFor(roomId)?.currentReading ?? 0;
    const current = parseInt(currentInput, 10);

    if (Number.isNaN(current)) {
      setErrors({ current: 'Enter the current meter reading' });
      return;
    }
    if (current < previous) {
      setErrors({ current: `Current reading cannot be less than previous (${previous})` });
      return;
    }

    const activeTenants = data.tenants.filter((t) => t.roomId === roomId && t.status !== 'Left').length;

    saveMeterReading({
      roomId,
      month: selectedMonth,
      previousReading: previous,
      currentReading: current,
      ratePerUnit: parseFloat(rateInput) || data.settings.electricityRate,
      occupants: Math.max(1, activeTenants),
      photoUrl: photo,
      recordedAt: new Date().toISOString(),
      published: false,
    });

    setEditingRoom(null);
    setPhoto(undefined);
    toast.show(
      `Reading saved for Room ${room?.roomNumber}. Units and bill calculated automatically.`,
      'success'
    );
  };

  const totalUnits = monthReadings.reduce((sum, m) => sum + m.units, 0);
  const totalBills = monthReadings.reduce((sum, m) => sum + m.totalAmount, 0);
  const publishedCount = monthReadings.filter((r) => r.published).length;
  const allRecorded = monthReadings.length >= data.rooms.length;

  const handleSendBills = () => {
    if (monthReadings.length === 0) {
      toast.show('Record at least one reading before sending bills.', 'error');
      return;
    }
    if (confirm(`Send electricity bills for ${monthLabel(selectedMonth)} to all tenants of recorded rooms?`)) {
      publishBills(selectedMonth);
      toast.show('Bills sent to all tenants! They can now see and pay their share.', 'success');
    }
  };

  return (
    <AppLayout role="manager" title="Meter Readings" subtitle={monthLabel(selectedMonth)}>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-dark-900">Electricity Meter Readings</h2>
              <p className="text-dark-500 text-sm">Enter current readings — units and bills are calculated automatically</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value || currentMonth())}
                className="bg-background-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSendBills}
                className="btn-primary py-2 whitespace-nowrap"
                title="Publish recorded bills to all tenants"
              >
                <Send size={16} /> Send Bills to All Tenants
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-warning to-amber-600 text-white">
              <span className="text-sm opacity-80">Total Units ({monthLabel(selectedMonth).split(' ')[0]})</span>
              <div className="text-2xl font-bold mt-1">{totalUnits} units</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary to-secondary text-white">
              <span className="text-sm opacity-80">Total Bill Amount</span>
              <div className="text-2xl font-bold mt-1">{formatINR(totalBills)}</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-success to-emerald-600 text-white">
              <span className="text-sm opacity-80">Published</span>
              <div className="text-2xl font-bold mt-1">
                {publishedCount} / {data.rooms.length}
              </div>
            </div>
          </div>
        </div>

        {/* Meter Readings Table */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Room-wise Readings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-dark-500 border-b border-background-300">
                  <th className="py-3 font-medium">Room</th>
                  <th className="py-3 font-medium">Previous Reading</th>
                  <th className="py-3 font-medium">Current Reading</th>
                  <th className="py-3 font-medium">Units</th>
                  <th className="py-3 font-medium">Rate</th>
                  <th className="py-3 font-medium">Bill Amount</th>
                  <th className="py-3 font-medium">Occupants</th>
                  <th className="py-3 font-medium">Share/Head</th>
                  <th className="py-3 font-medium">Photo</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room) => {
                  const reading = monthReadings.find((m) => m.roomId === room.id);
                  const previous = lastReadingFor(room.id)?.currentReading ?? 0;
                  const activeTenants = data.tenants.filter((t) => t.roomId === room.id && t.status !== 'Left').length;
                  const isEditing = editingRoom === room.id;

                  if (isEditing) {
                    return (
                      <tr key={room.id} className="border-b border-background-200 bg-primary-50/40">
                        <td className="py-3 font-medium">{room.roomNumber}</td>
                        <td className="py-3 text-dark-600">{previous}</td>
                        <td className="py-3">
                          <input
                            type="number"
                            autoFocus
                            value={currentInput}
                            onChange={(e) => {
                              setCurrentInput(e.target.value);
                              setErrors({});
                            }}
                            className="input-field py-1.5 px-2 w-24"
                            placeholder={String(previous)}
                          />
                          {errors.current && <p className="text-xs text-error mt-1">{errors.current}</p>}
                        </td>
                        <td className="py-3 text-dark-400">
                          {Math.max(0, (parseInt(currentInput, 10) || 0) - previous)} units
                        </td>
                        <td className="py-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={rateInput}
                            onChange={(e) => setRateInput(e.target.value)}
                            className="input-field py-1.5 px-2 w-20"
                          />
                        </td>
                        <td className="py-3 font-medium text-dark-900">
                          {formatINR(Math.round(Math.max(0, (parseInt(currentInput, 10) || 0) - previous) * (parseFloat(rateInput) || 0)))}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} className="text-dark-400" /> {Math.max(1, activeTenants)}
                          </span>
                        </td>
                        <td className="py-3">
                          {formatINR(
                            Math.round(
                              (Math.max(0, (parseInt(currentInput, 10) || 0) - previous) * (parseFloat(rateInput) || 0)) /
                                Math.max(1, activeTenants)
                            )
                          )}
                        </td>
                        <td className="py-3">
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhoto(e.target.files?.[0])}
                          />
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {photo ? <img src={photo} alt="meter" className="w-8 h-8 rounded object-cover border border-primary-200" /> : <Camera size={14} />}
                            <span className="text-xs">{photo ? 'Change' : 'Upload'}</span>
                          </button>
                        </td>
                        <td className="py-3">
                          <span className="bg-warning-light text-warning px-2 py-1 rounded-full text-xs">Draft</span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button onClick={() => handleSave(room.id)} className="text-success hover:text-emerald-700 px-2" title="Save reading">
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoom(null);
                              setPhoto(undefined);
                            }}
                            className="text-dark-400 hover:text-error px-2 text-sm"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={room.id} className="border-b border-background-200 hover:bg-background-200">
                      <td className="py-3">
                        <div className="font-medium text-dark-900">{room.roomNumber}</div>
                        <div className="text-xs text-dark-400">Floor {room.floor}</div>
                      </td>
                      <td className="py-3 text-dark-600">{reading ? reading.previousReading : previous || '—'}</td>
                      <td className="py-3">
                        {reading ? (
                          reading.currentReading
                        ) : (
                          <span className="text-dark-300 text-sm">Not recorded</span>
                        )}
                      </td>
                      <td className="py-3 font-medium text-dark-900">{reading ? reading.units : '—'}</td>
                      <td className="py-3 text-dark-600">{reading ? `₹${reading.ratePerUnit}` : `₹${data.settings.electricityRate}`}</td>
                      <td className="py-3 font-medium text-dark-900">{reading ? formatINR(reading.totalAmount) : '—'}</td>
                      <td className="py-3 text-dark-600">{reading ? reading.occupants : Math.max(1, activeTenants)}</td>
                      <td className="py-3 font-medium text-dark-900">{reading ? formatINR(reading.perTenantAmount) : '—'}</td>
                      <td className="py-3">
                        {reading?.photoUrl ? (
                          <img src={reading.photoUrl} alt="meter" className="w-8 h-8 rounded object-cover border border-background-300" />
                        ) : (
                          <span className="text-dark-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {reading?.published ? (
                          <span className="bg-success-light text-success px-2 py-1 rounded-full text-xs">Published</span>
                        ) : reading ? (
                          <span className="bg-warning-light text-warning px-2 py-1 rounded-full text-xs">Draft</span>
                        ) : (
                          <span className="bg-background-200 text-dark-400 px-2 py-1 rounded-full text-xs">Pending</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button onClick={() => startEdit(room.id)} className="text-primary hover:underline text-sm">
                          {reading ? 'Edit' : 'Add Reading'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info note */}
        <div className="card p-5 bg-background-200 border-0">
          <div className="flex items-start gap-3 text-sm text-dark-600">
            <Zap size={18} className="text-warning shrink-0 mt-0.5" />
            <div>
              <strong>How billing works:</strong> Units = Current Reading − Previous Reading (taken from {monthLabel(prevMonthKey)}). Room Bill = Units × Rate per Unit. Each tenant in the room pays an equal share.
              Readings are saved as drafts — use <strong>Send Bills to All Tenants</strong> to publish them to tenant apps.
            </div>
          </div>
        </div>

        {!allRecorded && (
          <div className="text-center text-sm text-dark-400">
            {data.rooms.length - monthReadings.length} room(s) still need a reading for {monthLabel(selectedMonth)}.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
