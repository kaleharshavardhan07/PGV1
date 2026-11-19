import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, BedDouble, Bath, Search, DoorOpen } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { BedStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import type { Bed, Room } from '../types';
import { formatINR } from '../utils/format';

type RoomForm = { roomNumber: string; floor: string; sharingType: string; attachedBathroom: boolean; bedCount: string; bedRent: string };
type BedForm = { bedNumber: string; label: string; rent: string };

const emptyRoom: RoomForm = { roomNumber: '', floor: '0', sharingType: '2', attachedBathroom: false, bedCount: '2', bedRent: '' };

/** Owners manage rooms and beds; managers get the same view read-only. */
export default function RoomsBedsPage({ role }: { role: 'owner' | 'manager' }) {
  const { data, addRoom, updateRoom, deleteRoom, addBed, updateBed, deleteBed } = useAppStore();
  const toast = useToast();
  const canEdit = role === 'owner';

  const [search, setSearch] = useState('');
  const [onlyVacant, setOnlyVacant] = useState(false);
  const [floor, setFloor] = useState('all');

  const [roomModal, setRoomModal] = useState<{ room: Room | null } | null>(null);
  const [roomForm, setRoomForm] = useState<RoomForm>(emptyRoom);
  const [bedModal, setBedModal] = useState<{ room: Room; bed: Bed | null } | null>(null);
  const [bedForm, setBedForm] = useState<BedForm>({ bedNumber: '', label: '', rent: '' });
  const [confirm, setConfirm] = useState<{ kind: 'room'; room: Room } | { kind: 'bed'; bed: Bed; room: Room } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const floors = useMemo(() => [...new Set(data.rooms.map((r) => r.floor))].sort((a, b) => a - b), [data.rooms]);

  const rooms = data.rooms.filter((r) => {
    if (floor !== 'all' && r.floor !== Number(floor)) return false;
    if (onlyVacant && r.totalBeds === r.occupiedBeds) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.roomNumber.toLowerCase().includes(q) || r.beds.some((b) => b.tenantName?.toLowerCase().includes(q));
  });

  const totals = { rooms: data.rooms.length, beds: data.beds.length, vacant: data.beds.filter((b) => b.status === 'vacant').length };

  // ---------- Room ----------
  const openRoom = (room: Room | null) => {
    setError('');
    setRoomForm(
      room
        ? { roomNumber: room.roomNumber, floor: String(room.floor), sharingType: String(room.sharingType), attachedBathroom: room.attachedBathroom, bedCount: '', bedRent: '' }
        : emptyRoom
    );
    setRoomModal({ room });
  };

  const saveRoom = async () => {
    if (!roomModal) return;
    if (!roomForm.roomNumber.trim()) return setError('Room number is required');
    const base = {
      roomNumber: roomForm.roomNumber.trim(),
      floor: Number(roomForm.floor) || 0,
      sharingType: Number(roomForm.sharingType) || 1,
      attachedBathroom: roomForm.attachedBathroom,
    };
    setBusy(true);
    const res = roomModal.room
      ? await updateRoom(roomModal.room.id, base)
      : await addRoom({
          ...base,
          bedCount: Math.max(0, Number(roomForm.bedCount) || 0),
          ...(roomForm.bedRent ? { bedRent: Number(roomForm.bedRent) } : {}),
        });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show(roomModal.room ? 'Room updated' : `Room ${base.roomNumber} added`, 'success');
    setRoomModal(null);
  };

  // ---------- Bed ----------
  const openBed = (room: Room, bed: Bed | null) => {
    setError('');
    setBedForm({ bedNumber: bed ? String(bed.bedNumber) : '', label: bed?.label ?? '', rent: bed?.rent != null ? String(bed.rent) : '' });
    setBedModal({ room, bed });
  };

  const saveBed = async () => {
    if (!bedModal) return;
    const payload: Record<string, unknown> = {
      label: bedForm.label.trim(),
      rent: bedForm.rent === '' ? null : Number(bedForm.rent),
    };
    if (bedForm.bedNumber) payload.bedNumber = Number(bedForm.bedNumber);
    setBusy(true);
    const res = bedModal.bed ? await updateBed(bedModal.bed.id, payload) : await addBed(bedModal.room.id, payload);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show(bedModal.bed ? 'Bed updated' : 'Bed added', 'success');
    setBedModal(null);
  };

  const runDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    const res = confirm.kind === 'room' ? await deleteRoom(confirm.room.id) : await deleteBed(confirm.bed.id);
    setBusy(false);
    if (res.ok) toast.show(confirm.kind === 'room' ? 'Room deleted' : 'Bed deleted', 'success');
    else toast.show(res.error, 'error'); // e.g. "still has tenants" — shown, dialog stays closed
    setConfirm(null);
  };

  return (
    <AppLayout
      role={role}
      title="Rooms & Beds"
      subtitle={`${totals.rooms} rooms · ${totals.beds} beds · ${totals.vacant} vacant`}
      actions={canEdit && <button className="btn-primary" onClick={() => openRoom(null)}><Plus size={16} /> Add room</button>}
    >
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input-field !pl-9" placeholder="Search room or tenant…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search rooms" />
        </div>
        <select className="input-field !w-auto" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Filter by floor">
          <option value="all">All floors</option>
          {floors.map((f) => <option key={f} value={f}>{f === 0 ? 'Ground floor' : `Floor ${f}`}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-dark-600 cursor-pointer select-none">
          <input type="checkbox" checked={onlyVacant} onChange={(e) => setOnlyVacant(e.target.checked)} className="rounded border-dark-300 text-primary focus:ring-primary-200" />
          Only rooms with vacancy
        </label>
      </div>

      {rooms.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={DoorOpen}
            title={data.rooms.length === 0 ? 'No rooms yet' : 'No rooms match your filters'}
            description={data.rooms.length === 0 ? (canEdit ? 'Add your first room, then add beds inside it.' : 'The owner has not added any rooms yet.') : undefined}
            action={data.rooms.length === 0 && canEdit ? <button className="btn-primary" onClick={() => openRoom(null)}><Plus size={16} /> Add room</button> : undefined}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <section key={room.id} className="card p-5" aria-label={`Room ${room.roomNumber}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-dark-900 text-lg leading-tight">Room {room.roomNumber}</h3>
                  <div className="text-xs text-dark-500 mt-1 flex flex-wrap items-center gap-x-2">
                    <span>{room.floor === 0 ? 'Ground floor' : `Floor ${room.floor}`}</span>
                    <span>· {room.sharingType}-sharing</span>
                    {room.attachedBathroom && <span className="inline-flex items-center gap-1">· <Bath size={12} /> Attached bath</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="badge bg-primary-50 text-primary-700 mr-1">{room.occupiedBeds}/{room.totalBeds} occupied</span>
                  {canEdit && (
                    <>
                      <button className="btn-ghost !px-2" aria-label={`Edit room ${room.roomNumber}`} onClick={() => openRoom(room)}><Pencil size={15} /></button>
                      <button className="btn-ghost !px-2 text-error hover:!bg-error-light" aria-label={`Delete room ${room.roomNumber}`} onClick={() => setConfirm({ kind: 'room', room })}><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>

              {room.beds.length === 0 ? (
                <p className="text-sm text-dark-400 py-3">No beds in this room yet.</p>
              ) : (
                <ul className="space-y-2">
                  {room.beds.map((bed) => (
                    <li key={bed.id} className="flex items-center gap-3 rounded-lg border border-dark-200 px-3 py-2.5">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${bed.status === 'vacant' ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}>
                        <BedDouble size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-dark-800 truncate">
                          Bed {bed.bedNumber}{bed.label && <span className="text-dark-400 font-normal"> · {bed.label}</span>}
                        </div>
                        <div className="text-xs text-dark-500 truncate">
                          {bed.tenantName ?? 'Available'}{bed.rent != null && <> · {formatINR(bed.rent)}/mo</>}
                        </div>
                      </div>
                      <BedStatusBadge status={bed.status} />
                      {canEdit && (
                        <div className="flex items-center shrink-0">
                          <button className="btn-ghost !px-1.5" aria-label={`Edit bed ${bed.bedNumber} in room ${room.roomNumber}`} onClick={() => openBed(room, bed)}><Pencil size={14} /></button>
                          <button
                            className="btn-ghost !px-1.5 text-error hover:!bg-error-light disabled:opacity-30 disabled:hover:!bg-transparent"
                            aria-label={`Delete bed ${bed.bedNumber} in room ${room.roomNumber}`}
                            title={bed.status === 'vacant' ? 'Delete bed' : 'Occupied beds cannot be deleted'}
                            disabled={bed.status !== 'vacant'}
                            onClick={() => setConfirm({ kind: 'bed', bed, room })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <button className="btn-secondary w-full mt-3 !py-2" onClick={() => openBed(room, null)}><Plus size={15} /> Add bed</button>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Room modal */}
      <Modal
        open={!!roomModal}
        onClose={() => setRoomModal(null)}
        title={roomModal?.room ? `Edit room ${roomModal.room.roomNumber}` : 'Add room'}
        footer={<><button className="btn-secondary" onClick={() => setRoomModal(null)}>Cancel</button><button className="btn-primary" onClick={saveRoom} disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button></>}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="room-number">Room number</label>
            <input id="room-number" className="input-field" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="e.g. 101" autoFocus />
          </div>
          <div>
            <label className="field-label" htmlFor="room-floor">Floor</label>
            <input id="room-floor" type="number" className="input-field" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="room-sharing">Sharing type</label>
            <select id="room-sharing" className="input-field" value={roomForm.sharingType} onChange={(e) => setRoomForm({ ...roomForm, sharingType: e.target.value })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}-sharing</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-dark-700 sm:mt-7 cursor-pointer select-none">
            <input type="checkbox" checked={roomForm.attachedBathroom} onChange={(e) => setRoomForm({ ...roomForm, attachedBathroom: e.target.checked })} className="rounded border-dark-300 text-primary focus:ring-primary-200" />
            Attached bathroom
          </label>
          {!roomModal?.room && (
            <>
              <div>
                <label className="field-label" htmlFor="room-beds">Number of beds</label>
                <input id="room-beds" type="number" min={0} max={20} className="input-field" value={roomForm.bedCount} onChange={(e) => setRoomForm({ ...roomForm, bedCount: e.target.value })} />
                <p className="text-xs text-dark-400 mt-1">You can add or remove beds later.</p>
              </div>
              <div>
                <label className="field-label" htmlFor="room-rent">Rent per bed <span className="text-dark-400 font-normal">(optional)</span></label>
                <input id="room-rent" type="number" min={0} className="input-field" value={roomForm.bedRent} onChange={(e) => setRoomForm({ ...roomForm, bedRent: e.target.value })} placeholder="₹ per month" />
              </div>
            </>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-error mt-4">{error}</p>}
      </Modal>

      {/* Bed modal */}
      <Modal
        open={!!bedModal}
        onClose={() => setBedModal(null)}
        title={bedModal?.bed ? `Edit bed ${bedModal.bed.bedNumber} · Room ${bedModal.room.roomNumber}` : `Add bed · Room ${bedModal?.room.roomNumber ?? ''}`}
        size="sm"
        footer={<><button className="btn-secondary" onClick={() => setBedModal(null)}>Cancel</button><button className="btn-primary" onClick={saveBed} disabled={busy}>{busy ? 'Saving…' : 'Save bed'}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="bed-number">Bed number</label>
            <input id="bed-number" type="number" min={1} className="input-field" value={bedForm.bedNumber} onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} placeholder={bedModal?.bed ? undefined : 'Next available'} />
          </div>
          <div>
            <label className="field-label" htmlFor="bed-label">Label <span className="text-dark-400 font-normal">(optional)</span></label>
            <input id="bed-label" className="input-field" maxLength={40} value={bedForm.label} onChange={(e) => setBedForm({ ...bedForm, label: e.target.value })} placeholder="e.g. Window side" />
          </div>
          <div>
            <label className="field-label" htmlFor="bed-rent">Monthly rent <span className="text-dark-400 font-normal">(optional)</span></label>
            <input id="bed-rent" type="number" min={0} className="input-field" value={bedForm.rent} onChange={(e) => setBedForm({ ...bedForm, rent: e.target.value })} placeholder="₹ per month" />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-error mt-4">{error}</p>}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        danger
        busy={busy}
        title={confirm?.kind === 'room' ? `Delete room ${confirm.room.roomNumber}?` : `Delete bed ${confirm?.kind === 'bed' ? confirm.bed.bedNumber : ''}?`}
        message={
          confirm?.kind === 'room'
            ? <>This removes the room and all {confirm.room.totalBeds} of its beds, plus its electricity readings. Rooms with tenants cannot be deleted.</>
            : <>Bed {confirm?.kind === 'bed' ? confirm.bed.bedNumber : ''} in room {confirm?.room.roomNumber} will be removed.</>
        }
        confirmLabel="Delete"
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
    </AppLayout>
  );
}
