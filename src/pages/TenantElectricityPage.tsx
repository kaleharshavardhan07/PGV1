import { useState } from 'react';
import { Zap, Camera, Info } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import { PaymentStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { formatINR, formatDate, monthLabel, currentMonth } from '../utils/format';

export default function TenantElectricityPage() {
  const { data, payElectricityShare } = useAppStore();
  const toast = useToast();
  const [photoOpen, setPhotoOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);
  if (!tenant) {
    return (
      <AppLayout role="tenant" title="Electricity Bill">
        <div className="card p-10 text-center text-dark-500">Tenant profile not found. Please log in again.</div>
      </AppLayout>
    );
  }

  const month = currentMonth();
  const room = data.rooms.find((r) => r.id === tenant.roomId);
  const roomTenants = data.tenants.filter((t) => t.roomId === tenant.roomId && t.status !== 'Left');

  const currentReading = data.meterReadings.find((m) => m.roomId === tenant.roomId && m.month === month);
  const previousReadings = data.meterReadings
    .filter((m) => m.roomId === tenant.roomId && m.month !== month)
    .sort((a, b) => b.month.localeCompare(a.month));

  const elecPayment = data.payments.find(
    (p) => p.tenantId === tenant.id && p.type === 'Electricity' && p.month === month
  );

  return (
    <AppLayout role="tenant" title="Electricity Bill" subtitle={monthLabel(month)}>
      <div className="space-y-6">
        {/* Current Month Bill */}
        {currentReading && currentReading.published ? (
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-dark-900 flex items-center gap-2">
                <Zap size={22} className="text-warning" /> Current Bill — {monthLabel(month)}
              </h2>
              {elecPayment ? (
                <PaymentStatusBadge status={elecPayment.status} />
              ) : (
                <span className="badge bg-warning-light text-warning">Payment Pending</span>
              )}
            </div>

            <div className="bg-background-200 rounded-xl p-6 mb-6">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-dark-500 text-sm block">Previous Reading</span>
                  <span className="text-lg font-bold text-dark-900">{currentReading.previousReading} units</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-dark-500 text-sm block">Current Reading</span>
                  <span className="text-lg font-bold text-dark-900">{currentReading.currentReading} units</span>
                </div>
              </div>
              <div className="border-t border-background-300 pt-4 flex justify-between items-center">
                <span className="text-dark-600">Units Consumed = Current − Previous</span>
                <span className="text-xl font-bold text-primary">{currentReading.units} units</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-primary-50">
                <span className="text-sm text-dark-500 block mb-1">Rate per Unit</span>
                <span className="text-2xl font-bold text-dark-900">₹{currentReading.ratePerUnit}</span>
              </div>
              <div className="p-4 rounded-xl bg-primary-50">
                <span className="text-sm text-dark-500 block mb-1">Total Room Bill ({currentReading.units} × ₹{currentReading.ratePerUnit})</span>
                <span className="text-2xl font-bold text-dark-900">{formatINR(currentReading.totalAmount)}</span>
              </div>
              <div className="p-4 rounded-xl bg-primary-50">
                <span className="text-sm text-dark-500 block mb-1">Occupants Sharing</span>
                <span className="text-2xl font-bold text-dark-900">{currentReading.occupants}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-success-light border border-success/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm text-dark-600">Your Share = Room Bill ÷ {currentReading.occupants} occupants</div>
                <div className="text-2xl font-bold text-success">{formatINR(currentReading.perTenantAmount)}</div>
              </div>
              {(!elecPayment || elecPayment.status !== 'Paid') && (
                <button onClick={() => setPayOpen(true)} className="btn-primary">
                  Pay {formatINR(currentReading.perTenantAmount)}
                </button>
              )}
              {elecPayment?.status === 'Paid' && elecPayment.reference && (
                <div className="text-sm text-dark-600">
                  <span className="block text-xs text-dark-400">Paid on {formatDate(elecPayment.paidAt)} • Ref</span>
                  <span className="font-mono">{elecPayment.reference}</span>
                </div>
              )}
            </div>

            {currentReading.photoUrl && (
              <div className="mt-6">
                <div className="text-sm font-medium text-dark-700 mb-2 flex items-center gap-2">
                  <Camera size={16} /> Meter Reading Photo
                </div>
                <button onClick={() => setPhotoOpen(true)} className="block">
                  <img
                    src={currentReading.photoUrl}
                    alt="Meter reading"
                    className="rounded-xl max-h-48 object-cover border border-background-300 hover:shadow-glow transition-shadow"
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-50 mx-auto mb-4 flex items-center justify-center">
              <Zap size={36} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold text-dark-900 mb-2">No Bill Published Yet</h3>
            <p className="text-dark-500 mb-6 max-w-md mx-auto">
              The electricity bill for {monthLabel(month)} is not published yet.
              Your PG manager records the meter readings and publishes bills for everyone at once.
            </p>
            <div className="flex items-start gap-2 text-xs text-dark-400 max-w-md mx-auto text-left p-3 rounded-xl bg-background-200">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                Your share is always calculated transparently: Units = Current Reading − Previous Reading, Room Bill = Units × Rate, Your Share = Room Bill ÷ Occupants.
              </span>
            </div>
          </div>
        )}

        {/* Room Information */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Room Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background-200">
              <span className="text-xs text-dark-500 block mb-1">Room Number</span>
              <span className="font-medium">{room?.roomNumber ?? '—'}</span>
            </div>
            <div className="p-3 rounded-lg bg-background-200">
              <span className="text-xs text-dark-500 block mb-1">Bed Number</span>
              <span className="font-medium">{tenant.bedNumber}</span>
            </div>
            <div className="p-3 rounded-lg bg-background-200">
              <span className="text-xs text-dark-500 block mb-1">Roommates</span>
              <span className="font-medium">{Math.max(0, roomTenants.length - 1)} others</span>
            </div>
            <div className="p-3 rounded-lg bg-background-200">
              <span className="text-xs text-dark-500 block mb-1">Total Occupants</span>
              <span className="font-medium">{roomTenants.length}</span>
            </div>
          </div>
        </div>

        {/* Previous Bills */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Previous Electricity Bills</h3>
          <div className="space-y-3">
            {previousReadings.map((reading) => {
              const payment = data.payments.find(
                (p) => p.tenantId === tenant.id && p.type === 'Electricity' && p.month === reading.month
              );
              return (
                <div key={reading.id} className="flex items-center justify-between p-3 rounded-xl bg-background-200">
                  <div>
                    <div className="font-medium text-dark-900">{monthLabel(reading.month)}</div>
                    <div className="text-xs text-dark-500 mt-0.5">
                      {reading.previousReading} → {reading.currentReading} units • {reading.units} units × ₹{reading.ratePerUnit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-dark-900">{formatINR(reading.perTenantAmount)}</div>
                    <div className="text-xs mt-0.5">
                      {payment?.status === 'Paid' ? (
                        <span className="text-success">Paid</span>
                      ) : reading.published ? (
                        <span className="text-warning">Pending</span>
                      ) : (
                        <span className="text-dark-400">Draft</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {previousReadings.length === 0 && (
              <div className="text-center py-4 text-dark-500 text-sm">No previous bills available</div>
            )}
          </div>
        </div>

        {/* Photo modal */}
        <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="Meter Reading Photo" size="lg">
          {currentReading?.photoUrl && (
            <img src={currentReading.photoUrl} alt="Meter reading full" className="w-full rounded-xl border border-background-300" />
          )}
        </Modal>

        {/* Pay modal */}
        <Modal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          title="Pay Electricity Share"
          size="sm"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setPayOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (currentReading) {
                    payElectricityShare(currentReading.id, 'UPI');
                  }
                  setPayOpen(false);
                  toast.show('Electricity bill paid successfully!', 'success');
                }}
              >
                Pay {formatINR(currentReading?.perTenantAmount ?? 0)}
              </button>
            </>
          }
        >
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-dark-500">Month</span><span className="font-medium">{monthLabel(month)}</span></div>
            <div className="flex justify-between"><span className="text-dark-500">Your Share</span><span className="font-bold">{formatINR(currentReading?.perTenantAmount ?? 0)}</span></div>
            <div className="mt-2 p-3 rounded-xl bg-warning-light text-warning text-xs">
              Demo payment simulation — no real money is transferred.
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
