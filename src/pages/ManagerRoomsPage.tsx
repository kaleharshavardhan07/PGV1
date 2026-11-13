import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { BedDouble, Building2, Search, User } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const bedStyles: Record<string, string> = {
  occupied: 'bg-success text-white',
  vacant: 'bg-primary-100 text-primary',
  notice: 'bg-warning-light text-warning border border-warning/30',
};

const bedLabels: Record<string, string> = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  notice: 'Notice',
};

export default function ManagerRoomsPage() {
  const { data } = useAppStore();
  const [search, setSearch] = useState('');

  const rooms = data.rooms.filter(
    (r) =>
      !search ||
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      String(r.floor) === search
  );

  const bedsWithRoom = data.beds.map((b) => ({
    ...b,
    room: data.rooms.find((r) => r.id === b.roomId),
    tenant: data.tenants.find((t) => t.id === b.tenantId),
  }));

  const totalBeds = data.beds.length;
  const occupied = data.beds.filter((b) => b.status === 'occupied').length;
  const notice = data.beds.filter((b) => b.status === 'notice').length;
  const vacant = totalBeds - occupied - notice;

  return (
    <AppLayout role="manager" title="Rooms & Beds">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Rooms</div>
            <div className="text-2xl font-bold text-dark-900 mt-1">{data.rooms.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Total Beds</div>
            <div className="text-2xl font-bold text-dark-900 mt-1">{totalBeds}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Occupied / Notice</div>
            <div className="text-2xl font-bold text-success mt-1">{occupied} <span className="text-sm text-dark-400">/</span> <span className="text-warning">{notice}</span></div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-dark-400 uppercase tracking-wide">Vacant</div>
            <div className="text-2xl font-bold text-primary mt-1">{vacant}</div>
          </div>
        </div>

        {/* Search + legend */}
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room number or floor..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-dark-600 shrink-0">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success" /> Occupied</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary-200" /> Vacant</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warning-light border border-warning/40" /> Notice</span>
          </div>
        </div>

        {/* Rooms grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const roomBeds = bedsWithRoom.filter((b) => b.roomId === room.id);
            const roomOccupied = roomBeds.filter((b) => b.status === 'occupied').length;
            return (
              <div key={room.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-dark-400" />
                    <span className="font-bold text-dark-900">Room {room.roomNumber}</span>
                  </div>
                  <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded-full font-medium">
                    {room.sharingType}-sharing • Floor {room.floor}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
                  {roomBeds.map((bed) => (
                    <div
                      key={bed.id}
                      title={`Bed ${bed.bedNumber} — ${bedLabels[bed.status]}${bed.tenant ? ` (${bed.tenant.fullName})` : ''}`}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold ${bedStyles[bed.status]}`}
                    >
                      <BedDouble size={14} />
                      <span className="mt-0.5">{bed.bedNumber}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-dark-500 flex items-center justify-between">
                  <span>{roomOccupied}/{roomBeds.length} occupied</span>
                  {room.attachedBathroom && <span>Attached bathroom</span>}
                </div>
                {roomBeds.some((b) => b.tenant) && (
                  <div className="mt-3 pt-3 border-t border-background-200 space-y-1">
                    {roomBeds
                      .filter((b) => b.tenant)
                      .map((b) => (
                        <div key={b.id} className="flex items-center gap-2 text-xs text-dark-600">
                          <User size={12} className="text-dark-300" />
                          <span className="font-medium text-dark-800">{b.tenant!.fullName}</span>
                          <span>• Bed {b.bedNumber}</span>
                          {b.status === 'notice' && <span className="badge bg-warning-light text-warning ml-auto">Notice</span>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {rooms.length === 0 && (
            <div className="col-span-full card p-10 text-center text-dark-500">No rooms match your search.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
