import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { ChevronLeft, BedDouble, Users, Building2, Share2, Lock, ArrowUpCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { BedStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { getPlan } from '../data/plans';
import { subscriptionAllows } from '../services/subscriptionService';

export default function OwnerBedsPage() {
  const { data } = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<'All' | 'Occupied' | 'Vacant' | 'Notice'>('All');
  const shareAllowed = subscriptionAllows(data.subscription, 'vacantSharing');

  const beds = data.beds.map((bed) => {
    const room = data.rooms.find((r) => r.id === bed.roomId);
    const tenant = data.tenants.find((t) => t.id === bed.tenantId);
    return { ...bed, room, tenant };
  });

  const filteredBeds = beds.filter((b) => {
    if (filter === 'All') return true;
    if (filter === 'Occupied') return b.status === 'occupied';
    if (filter === 'Vacant') return b.status === 'vacant';
    return b.status === 'notice';
  });

  const totalBeds = data.rooms.reduce((s, r) => s + r.totalBeds, 0);
  const occupiedBeds = data.tenants.filter((t) => t.status !== 'Left').length;
  const vacantBeds = totalBeds - occupiedBeds;
  const noticeBeds = data.tenants.filter((t) => t.status === 'Notice Period').length;

  return (
    <AppLayout role="owner" title="Bed Availability">
      <div className="space-y-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-dark-600 hover:text-dark-900"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-6 bg-gradient-to-br from-success to-emerald-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <BedDouble size={24} className="text-white" />
              <span className="font-medium">Occupied</span>
            </div>
            <div className="text-4xl font-bold">{occupiedBeds}</div>
            <div className="text-sm opacity-80 mt-1">{totalBeds} total beds</div>
          </div>
          <div className="card p-6 bg-gradient-to-br from-primary to-purple-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Building2 size={24} className="text-white" />
              <span className="font-medium">Vacant</span>
            </div>
            <div className="text-4xl font-bold">{vacantBeds}</div>
            <div className="text-sm opacity-80 mt-1">{((vacantBeds / totalBeds) * 100).toFixed(0)}% of total</div>
          </div>
          <div className="card p-6 bg-gradient-to-br from-orange-500 to-amber-600 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Users size={24} className="text-white" />
              <span className="font-medium">Notice Period</span>
            </div>
            <div className="text-4xl font-bold">{noticeBeds}</div>
            <div className="text-sm opacity-80 mt-1">Tenants exiting soon</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['All', 'Occupied', 'Vacant', 'Notice'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-dark-700 hover:bg-gray-200'
                }`}
              >
                {f} Beds
              </button>
            ))}
          </div>
        </div>

        {/* Bed Grid */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-4">Room-wise Bed Status</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.rooms.map((room) => {
              const roomBeds = beds.filter((b) => b.roomId === room.id);
              const roomOccupied = roomBeds.filter((b) => b.status === 'occupied').length;
              return (
                <div key={room.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-gray-400" />
                      <span className="font-bold text-dark-900">Room {room.roomNumber}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {room.sharingType}-sharing
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {roomOccupied} / {roomBeds.length} occupied
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {roomBeds.map((bed) => (
                      <div
                        key={bed.id}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold relative ${
                          bed.status === 'occupied'
                            ? 'bg-success text-white'
                            : bed.status === 'vacant'
                            ? 'bg-primary-100 text-primary'
                            : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {bed.bedNumber}
                        {bed.status === 'occupied' && bed.tenant && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] rounded text-gray-600 whitespace-nowrap">
                            {bed.tenant.fullName.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {roomBeds.some((b) => b.status === 'notice') && (
                    <div className="mt-3 text-xs text-warning">
                      ⚠️ {roomBeds.filter((b) => b.status === 'notice').length} bed(s) in notice period
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Share Vacant Button */}
        <div className="card p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Share Vacant Beds</h3>
              <p className="text-sm opacity-80">
                {shareAllowed
                  ? 'Publish a public vacancy listing — prospective tenants see beds and rent, never tenant personal data.'
                  : `Vacant-bed sharing links are a Growth plan feature. Your current plan: ${getPlan(data.subscription.planId).name}.`}
              </p>
            </div>
            {shareAllowed ? (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/vacancy`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).catch(() => undefined);
                  }
                  toast.show('Public vacancy link copied to clipboard. Opening the public listing…', 'success');
                  setTimeout(() => window.open('/vacancy', '_blank'), 600);
                }}
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <Share2 size={18} /> Share Vacant Beds
              </button>
            ) : (
              <button
                onClick={() => navigate('/app/owner/subscription')}
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <ArrowUpCircle size={18} /> Upgrade to Growth
              </button>
            )}
          </div>
          {!shareAllowed && (
            <div className="mt-4 flex items-center gap-2 text-xs opacity-80">
              <Lock size={13} /> Feature restricted by subscription policy — upgrade to unlock.
            </div>
          )}
        </div>

        {/* Vacant Beds Table */}
        {filteredBeds.filter((b) => b.status === 'vacant').length > 0 && (
          <div className="card p-6">
            <h3 className="font-bold text-lg text-dark-900 mb-4">Vacant Beds Details</h3>
            <div className="space-y-3">
              {filteredBeds.filter((b) => b.status === 'vacant').map((bed) => (
                <div key={bed.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <BedDouble size={18} className="text-primary" />
                    <div>
                      <div className="font-medium text-dark-900">
                        {bed.room?.roomNumber} - Bed {bed.bedNumber}
                      </div>
                      <div className="text-xs text-dark-500">
                        {bed.vacantSince ? `Vacant since ${new Date(bed.vacantSince).toLocaleDateString()}` : 'New vacancy'}
                      </div>
                    </div>
                  </div>
                  <BedStatusBadge status="vacant" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
