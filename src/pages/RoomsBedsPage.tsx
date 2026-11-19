import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Bath, Search, DoorOpen, LayoutGrid, List, Layers, Ban, CheckCircle2, UserPlus, MoveRight, LogOut } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FeatureGate from '../components/FeatureGate';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { BedStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import type { Bed, Room } from '../types';
import { formatDate, formatINR, initialsOf } from '../utils/format';

type RoomForm = { roomNumber: string; floor: string; sharingType: string; attachedBathroom: boolean; bedCount: string; bedRent: string };
type BedForm = { bedNumber: string; label: string; rent: string };
type BulkRow = { key: number; roomNumber: string; floor: string; sharingType: string; bedCount: string; attachedBathroom: boolean; bedRent: string };

const emptyRoom: RoomForm = { roomNumber: '', floor: '0', sharingType: '2', attachedBathroom: false, bedCount: '2', bedRent: '' };
const SHARING_LABEL: Record<number, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad' };
const sharingName = (n: number) => SHARING_LABEL[n] ?? `${n}-sharing`;
const floorName = (f: number) => (f === 0 ? 'Ground floor' : f < 0 ? `Basement ${-f}` : `Floor ${f}`);

// Bed tile colours: one clear visual state per status.
const bedTile: Record<Bed['status'], string> = {
  vacant: 'bg-success-light border-success/40 text-success hover:border-success',
  occupied: 'bg-primary-50 border-primary-200 text-primary-800 hover:border-primary-400',
  notice: 'bg-warning-light border-warning/40 text-warning hover:border-warning',
  unavailable: 'bg-dark-100 border-dark-300 text-dark-400 hover:border-dark-400 [background-image:repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(148,163,184,.25)_5px,rgba(148,163,184,.25)_6px)]',
};

export default function RoomsBedsPage({ role }: { role: 'owner' | 'manager' }) {
  const { data, addRoom, addRoomsBulk, updateRoom, deleteRoom, addBed, updateBed, deleteBed, reallocateBed, moveOutTenant } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();
  const base = `/app/${role}`;

  // The same rules the API enforces: owners always; managers only with the "rooms" permission.
  const canEdit = role === 'owner' || data.permissions.rooms;
  const canTenants = role === 'owner' || data.permissions.tenants;

  const [view, setView] = useState<'plan' | 'manage'>('plan');
  const [search, setSearch] = useState('');
  const [onlyVacant, setOnlyVacant] = useState(false);
  const [floor, setFloor] = useState('all');

  const [roomModal, setRoomModal] = useState<{ room: Room | null } | null>(null);
  const [roomForm, setRoomForm] = useState<RoomForm>(emptyRoom);
  const [bedModal, setBedModal] = useState<{ room: Room; bed: Bed | null } | null>(null);
  const [bedForm, setBedForm] = useState<BedForm>({ bedNumber: '', label: '', rent: '' });
  const [confirm, setConfirm] = useState<{ kind: 'room'; room: Room } | { kind: 'bed'; bed: Bed; room: Room } | { kind: 'moveout'; bed: Bed } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Floor-plan bed drawer
  const [picked, setPicked] = useState<{ room: Room; bed: Bed } | null>(null);
  const [moveTo, setMoveTo] = useState('');

  // Bulk creation
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'configure' | 'review'>('configure');
  const [gen, setGen] = useState({ floorFrom: '1', floorTo: '1', perFloor: '5', byFloor: true, prefix: '', start: '1', sharingType: '2', bedCount: '', attachedBathroom: false, bedRent: '' });
  const [rows, setRows] = useState<BulkRow[]>([]);

  const floors = useMemo(() => [...new Set(data.rooms.map((r) => r.floor))].sort((a, b) => a - b), [data.rooms]);
  const filtered = data.rooms.filter((r) => {
    if (floor !== 'all' && r.floor !== Number(floor)) return false;
    if (onlyVacant && r.vacantBeds === 0) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.roomNumber.toLowerCase().includes(q) || r.beds.some((b) => b.tenantName?.toLowerCase().includes(q));
  });
  const byFloor = useMemo(() => {
    const m = new Map<number, Room[]>();
    for (const r of filtered) m.set(r.floor, [...(m.get(r.floor) ?? []), r]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const totals = {
    rooms: data.rooms.length, beds: data.beds.length,
    vacant: data.beds.filter((b) => b.status === 'vacant').length,
    unavailable: data.beds.filter((b) => b.status === 'unavailable').length,
  };
  const tenantOf = (b: Bed) => data.tenants.find((t) => t.id === b.tenantId);
  const roomNo = (id: string) => data.rooms.find((r) => r.id === id)?.roomNumber ?? '';

  // ---------- Room ----------
  const openRoom = (room: Room | null) => {
    setError('');
    setRoomForm(room ? { roomNumber: room.roomNumber, floor: String(room.floor), sharingType: String(room.sharingType), attachedBathroom: room.attachedBathroom, bedCount: '', bedRent: '' } : emptyRoom);
    setRoomModal({ room });
  };

  const saveRoom = async () => {
    if (!roomModal) return;
    if (!roomForm.roomNumber.trim()) return setError('Room number is required');
    const body = { roomNumber: roomForm.roomNumber.trim(), floor: Number(roomForm.floor) || 0, sharingType: Number(roomForm.sharingType) || 1, attachedBathroom: roomForm.attachedBathroom };
    setBusy(true);
    const res = roomModal.room
      ? await updateRoom(roomModal.room.id, body)
      : await addRoom({ ...body, bedCount: Math.max(0, Number(roomForm.bedCount) || 0), ...(roomForm.bedRent ? { bedRent: Number(roomForm.bedRent) } : {}) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show(roomModal.room ? 'Room updated' : `Room ${body.roomNumber} added`, 'success');
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
    const payload: Record<string, unknown> = { label: bedForm.label.trim(), rent: bedForm.rent === '' ? null : Number(bedForm.rent) };
    if (bedForm.bedNumber) payload.bedNumber = Number(bedForm.bedNumber);
    setBusy(true);
    const res = bedModal.bed ? await updateBed(bedModal.bed.id, payload) : await addBed(bedModal.room.id, payload);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show(bedModal.bed ? 'Bed updated' : 'Bed added', 'success');
    setBedModal(null);
  };

  const toggleUnavailable = async (bed: Bed) => {
    setBusy(true);
    const res = await updateBed(bed.id, { unavailable: !bed.unavailable });
    setBusy(false);
    toast.show(res.ok ? (bed.unavailable ? 'Bed is available again' : 'Bed marked unavailable') : res.error, res.ok ? 'success' : 'error');
    if (res.ok) setPicked(null);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    let res;
    if (confirm.kind === 'room') res = await deleteRoom(confirm.room.id);
    else if (confirm.kind === 'bed') res = await deleteBed(confirm.bed.id);
    else res = confirm.bed.tenantId ? await moveOutTenant(confirm.bed.tenantId) : { ok: false as const, error: 'No tenant in this bed' };
    setBusy(false);
    toast.show(res.ok ? 'Done' : res.error, res.ok ? 'success' : 'error');
    if (res.ok) setPicked(null);
    setConfirm(null);
  };

  // ---------- Allocation from the floor plan ----------
  const doMove = async () => {
    if (!picked?.bed.tenantId || !moveTo) return;
    setBusy(true);
    const res = await reallocateBed(picked.bed.tenantId, moveTo);
    setBusy(false);
    toast.show(res.ok ? 'Tenant moved' : res.error, res.ok ? 'success' : 'error');
    if (res.ok) { setPicked(null); setMoveTo(''); }
  };

  // ---------- Bulk creation ----------
  const generate = () => {
    const n = Math.max(1, Math.min(100, Number(gen.perFloor) || 0));
    const sharing = Number(gen.sharingType) || 1;
    const beds = gen.bedCount === '' ? sharing : Number(gen.bedCount);
    const out: BulkRow[] = [];
    const f0 = Number(gen.floorFrom) || 0;
    const f1 = Math.max(f0, Number(gen.floorTo) || f0);
    let seq = Number(gen.start) || 1;
    let key = 0;
    for (let f = f0; f <= f1 && out.length < 200; f++) {
      for (let i = 0; i < n && out.length < 200; i++) {
        const number = gen.byFloor ? `${gen.prefix}${f * 100 + (Number(gen.start) || 1) + i}` : `${gen.prefix}${seq++}`;
        out.push({ key: key++, roomNumber: number, floor: String(f), sharingType: String(sharing), bedCount: String(beds), attachedBathroom: gen.attachedBathroom, bedRent: gen.bedRent });
      }
    }
    setRows(out);
    setBulkStep('review');
    setError('');
  };

  const existing = useMemo(() => new Set(data.rooms.map((r) => r.roomNumber.toLowerCase())), [data.rooms]);
  const rowIssue = (r: BulkRow, all: BulkRow[]) => {
    const n = r.roomNumber.trim().toLowerCase();
    if (!n) return 'Room number is required';
    if (existing.has(n)) return 'Already exists';
    if (all.filter((x) => x.roomNumber.trim().toLowerCase() === n).length > 1) return 'Duplicate in this batch';
    if (r.bedCount === '' || Number(r.bedCount) < 0 || Number(r.bedCount) > 20) return 'Beds must be 0–20';
    return '';
  };
  const issues = rows.filter((r) => rowIssue(r, rows)).length;
  const totalBeds = rows.reduce((s, r) => s + (Number(r.bedCount) || 0), 0);
  const patchRow = (key: number, patch: Partial<BulkRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const saveBulk = async () => {
    setBusy(true);
    const res = await addRoomsBulk(rows.map((r) => ({
      roomNumber: r.roomNumber.trim(), floor: Number(r.floor) || 0, sharingType: Number(r.sharingType) || 1, attachedBathroom: r.attachedBathroom,
      bedCount: Number(r.bedCount) || 0, ...(r.bedRent ? { bedRent: Number(r.bedRent) } : {}),
    })));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show(`${res.created} rooms and ${totalBeds} beds created`, 'success');
    setBulkOpen(false);
  };

  const num = (label: string, id: string, value: string, set: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="field-label" htmlFor={id}>{label}</label><input id={id} type="number" className="input-field" value={value} onChange={(e) => set(e.target.value)} {...props} /></div>
  );

  const vacantBeds = data.beds.filter((b) => b.status === 'vacant');

  return (
    <FeatureGate role={role} feature="rooms" title="Rooms & Beds">
      <AppLayout
        role={role}
        title="Rooms & Beds"
        subtitle={`${totals.rooms} rooms · ${totals.beds} beds · ${totals.vacant} vacant${totals.unavailable ? ` · ${totals.unavailable} unavailable` : ''}`}
        actions={canEdit && (
          <>
            <button className="btn-secondary" onClick={() => { setError(''); setBulkStep('configure'); setBulkOpen(true); }}><Layers size={16} /> Bulk add</button>
            <button className="btn-primary" onClick={() => openRoom(null)}><Plus size={16} /> Add room</button>
          </>
        )}
      >
        <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-dark-100 p-0.5" role="tablist" aria-label="View">
            {([['plan', 'Floor plan', LayoutGrid], ['manage', 'Manage', List]] as const).map(([k, label, Icon]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`px-3 py-1.5 text-sm font-medium rounded-md inline-flex items-center gap-1.5 transition ${view === k ? 'bg-white text-dark-900 shadow-soft' : 'text-dark-500 hover:text-dark-800'}`}><Icon size={15} /> {label}</button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input className="input-field !pl-9" placeholder="Search room or tenant…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search rooms" />
          </div>
          <select className="input-field !w-auto" value={floor} onChange={(e) => setFloor(e.target.value)} aria-label="Filter by floor"><option value="all">All floors</option>{floors.map((f) => <option key={f} value={f}>{floorName(f)}</option>)}</select>
          <label className="flex items-center gap-2 text-sm text-dark-600 cursor-pointer select-none"><input type="checkbox" checked={onlyVacant} onChange={(e) => setOnlyVacant(e.target.checked)} className="rounded border-dark-300 text-primary" /> Only with vacancy</label>
        </div>

        {filtered.length === 0 ? (
          <div className="card"><EmptyState icon={DoorOpen} title={data.rooms.length === 0 ? 'No rooms yet' : 'No rooms match your filters'} description={data.rooms.length === 0 ? (canEdit ? 'Add rooms one by one, or create many at once with Bulk add.' : 'No rooms have been added yet.') : undefined}
            action={data.rooms.length === 0 && canEdit ? <div className="flex gap-2 justify-center"><button className="btn-secondary" onClick={() => { setBulkStep('configure'); setBulkOpen(true); }}><Layers size={16} /> Bulk add</button><button className="btn-primary" onClick={() => openRoom(null)}><Plus size={16} /> Add room</button></div> : undefined} /></div>
        ) : view === 'plan' ? (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-dark-600 mb-4" aria-label="Legend">
              {([['vacant', 'Vacant'], ['occupied', 'Occupied'], ['notice', 'On notice'], ['unavailable', 'Unavailable']] as const).map(([s, l]) => (
                <span key={s} className="inline-flex items-center gap-1.5"><span className={`w-4 h-4 rounded border ${bedTile[s]}`} /> {l}</span>
              ))}
            </div>
            <div className="space-y-6">
              {byFloor.map(([f, rs]) => (
                <section key={f} aria-label={floorName(f)}>
                  <h2 className="text-sm font-semibold text-dark-500 uppercase tracking-wide mb-3">{floorName(f)}</h2>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rs.map((room) => (
                      <div key={room.id} className="card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div><div className="font-semibold text-dark-900">Room {room.roomNumber}</div><div className="text-xs text-dark-500 flex items-center gap-1.5">{sharingName(room.sharingType)}{room.attachedBathroom && <Bath size={12} aria-label="Attached bathroom" />}</div></div>
                          <span className={`badge ${room.vacantBeds ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}>{room.vacantBeds ? `${room.vacantBeds} free` : 'Full'}</span>
                        </div>
                        {room.beds.length === 0 ? <p className="text-sm text-dark-400">No beds</p> : (
                          <div className="grid grid-cols-2 gap-2">
                            {room.beds.map((bed) => {
                              const t = tenantOf(bed);
                              return (
                                <button key={bed.id} onClick={() => { setPicked({ room, bed }); setMoveTo(''); }} aria-label={`Room ${room.roomNumber} bed ${bed.bedNumber}, ${bed.status}${bed.tenantName ? `, ${bed.tenantName}` : ''}`}
                                  className={`rounded-lg border-2 p-2.5 text-left transition ${bedTile[bed.status]}`}>
                                  <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Bed {bed.bedNumber}</div>
                                  <div className="text-sm font-medium truncate mt-0.5">{bed.tenantName ? <span className="inline-flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-white/70 text-[10px] font-bold flex items-center justify-center shrink-0">{initialsOf(bed.tenantName)}</span>{bed.tenantName.split(' ')[0]}</span> : bed.status === 'unavailable' ? 'Unavailable' : 'Vacant'}</div>
                                  {t && <div className="text-[11px] opacity-70 truncate">{formatINR(t.monthlyRent)}</div>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((room) => (
              <section key={room.id} className="card p-5" aria-label={`Room ${room.roomNumber}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-dark-900 text-lg leading-tight">Room {room.roomNumber}</h3>
                    <div className="text-xs text-dark-500 mt-1 flex flex-wrap items-center gap-x-2"><span>{floorName(room.floor)}</span><span>· {sharingName(room.sharingType)} sharing</span>{room.attachedBathroom && <span className="inline-flex items-center gap-1">· <Bath size={12} /> Attached bath</span>}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="badge bg-primary-50 text-primary-700 mr-1">{room.occupiedBeds}/{room.totalBeds} occupied</span>
                    {canEdit && <><button className="btn-ghost !px-2" aria-label={`Edit room ${room.roomNumber}`} onClick={() => openRoom(room)}><Pencil size={15} /></button><button className="btn-ghost !px-2 text-error hover:!bg-error-light" aria-label={`Delete room ${room.roomNumber}`} onClick={() => setConfirm({ kind: 'room', room })}><Trash2 size={15} /></button></>}
                  </div>
                </div>
                {room.beds.length === 0 ? <p className="text-sm text-dark-400 py-3">No beds in this room yet.</p> : (
                  <ul className="space-y-2">
                    {room.beds.map((bed) => (
                      <li key={bed.id} className="flex items-center gap-3 rounded-lg border border-dark-200 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-dark-800 truncate">Bed {bed.bedNumber}{bed.label && <span className="text-dark-400 font-normal"> · {bed.label}</span>}</div>
                          <div className="text-xs text-dark-500 truncate">{bed.tenantName ?? (bed.status === 'unavailable' ? 'Not available' : 'Available')}{bed.rent != null && <> · {formatINR(bed.rent)}/mo</>}</div>
                        </div>
                        <BedStatusBadge status={bed.status} />
                        {canEdit && (
                          <div className="flex items-center shrink-0">
                            <button className="btn-ghost !px-1.5" aria-label={`Edit bed ${bed.bedNumber} in room ${room.roomNumber}`} onClick={() => openBed(room, bed)}><Pencil size={14} /></button>
                            <button className="btn-ghost !px-1.5 text-error hover:!bg-error-light disabled:opacity-30 disabled:hover:!bg-transparent" aria-label={`Delete bed ${bed.bedNumber} in room ${room.roomNumber}`} title={bed.status === 'occupied' || bed.status === 'notice' ? 'Occupied beds cannot be deleted' : 'Delete bed'} disabled={bed.status === 'occupied' || bed.status === 'notice'} onClick={() => setConfirm({ kind: 'bed', bed, room })}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canEdit && <button className="btn-secondary w-full mt-3 !py-2" onClick={() => openBed(room, null)}><Plus size={15} /> Add bed</button>}
              </section>
            ))}
          </div>
        )}

        {/* Bed drawer (floor plan) */}
        <Modal open={!!picked} onClose={() => setPicked(null)} title={picked ? `Room ${picked.room.roomNumber} · Bed ${picked.bed.bedNumber}` : ''} size="md">
          {picked && (() => {
            const { bed } = picked;
            const t = tenantOf(bed);
            const occupied = bed.status === 'occupied' || bed.status === 'notice';
            return (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2"><BedStatusBadge status={bed.status} />{bed.label && <span className="text-sm text-dark-500">{bed.label}</span>}{bed.rent != null && <span className="text-sm text-dark-500">· {formatINR(bed.rent)}/month</span>}</div>

                {occupied && t ? (
                  <div className="rounded-lg border border-dark-200 p-4">
                    <div className="font-semibold text-dark-900">{t.fullName}</div>
                    <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-dark-600">
                      <dt>Mobile</dt><dd className="text-dark-900">{t.mobile}</dd>
                      <dt>Rent</dt><dd className="text-dark-900">{formatINR(t.monthlyRent)}</dd>
                      <dt>Joined</dt><dd className="text-dark-900">{formatDate(t.joiningDate)}</dd>
                      <dt>Status</dt><dd className="text-dark-900">{t.status}</dd>
                    </dl>
                  </div>
                ) : occupied ? (
                  <p className="text-sm text-dark-600">Occupied by {bed.tenantName}.</p>
                ) : bed.status === 'unavailable' ? (
                  <p className="text-sm text-dark-600">This bed is out of use (for example under repair) and can’t be assigned.</p>
                ) : (
                  <p className="text-sm text-dark-600">This bed is free.</p>
                )}

                <div className="flex flex-col gap-2">
                  {bed.status === 'vacant' && canTenants && <button className="btn-primary" onClick={() => navigate(`${base}/tenants?bed=${bed.id}`)}><UserPlus size={16} /> Add a tenant to this bed</button>}
                  {occupied && canTenants && (
                    <>
                      <div className="flex gap-2">
                        <select aria-label="Move to bed" className="input-field" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                          <option value="">Move to another bed…</option>
                          {vacantBeds.map((b) => <option key={b.id} value={b.id}>Room {roomNo(b.roomId)} · Bed {b.bedNumber}</option>)}
                        </select>
                        <button className="btn-secondary shrink-0" disabled={!moveTo || busy} onClick={doMove}><MoveRight size={15} /> Move</button>
                      </div>
                      <button className="btn-secondary text-error" onClick={() => setConfirm({ kind: 'moveout', bed })}><LogOut size={15} /> Move tenant out</button>
                    </>
                  )}
                  {canEdit && !occupied && (
                    <button className="btn-secondary" disabled={busy} onClick={() => toggleUnavailable(bed)}>{bed.unavailable ? <><CheckCircle2 size={15} /> Mark available</> : <><Ban size={15} /> Mark unavailable</>}</button>
                  )}
                  {canEdit && <button className="btn-ghost" onClick={() => { const p = picked; setPicked(null); openBed(p.room, p.bed); }}><Pencil size={15} /> Edit bed details</button>}
                  {occupied && !canTenants && <p className="text-xs text-dark-400">You don’t have permission to change tenant allocation.</p>}
                </div>
              </div>
            );
          })()}
        </Modal>

        {/* Room modal */}
        <Modal open={!!roomModal} onClose={() => setRoomModal(null)} title={roomModal?.room ? `Edit room ${roomModal.room.roomNumber}` : 'Add room'}
          footer={<><button className="btn-secondary" onClick={() => setRoomModal(null)}>Cancel</button><button className="btn-primary" onClick={saveRoom} disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button></>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="field-label" htmlFor="room-number">Room number / name</label><input id="room-number" className="input-field" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="e.g. 101" autoFocus /></div>
            {num('Floor', 'room-floor', roomForm.floor, (v) => setRoomForm({ ...roomForm, floor: v }))}
            <div><label className="field-label" htmlFor="room-sharing">Sharing type</label><select id="room-sharing" className="input-field" value={roomForm.sharingType} onChange={(e) => setRoomForm({ ...roomForm, sharingType: e.target.value })}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{sharingName(n)} ({n})</option>)}</select></div>
            <label className="flex items-center gap-2 text-sm text-dark-700 sm:mt-7 cursor-pointer select-none"><input type="checkbox" checked={roomForm.attachedBathroom} onChange={(e) => setRoomForm({ ...roomForm, attachedBathroom: e.target.checked })} className="rounded border-dark-300 text-primary" /> Attached bathroom</label>
            {!roomModal?.room && (<>
              {num('Number of beds', 'room-beds', roomForm.bedCount, (v) => setRoomForm({ ...roomForm, bedCount: v }), { min: 0, max: 20 })}
              {num('Rent per bed (optional)', 'room-rent', roomForm.bedRent, (v) => setRoomForm({ ...roomForm, bedRent: v }), { min: 0, placeholder: '₹ per month' })}
            </>)}
          </div>
          {error && <p role="alert" className="text-sm text-error mt-4">{error}</p>}
        </Modal>

        {/* Bed modal */}
        <Modal open={!!bedModal} onClose={() => setBedModal(null)} size="sm"
          title={bedModal?.bed ? `Edit bed ${bedModal.bed.bedNumber} · Room ${bedModal.room.roomNumber}` : `Add bed · Room ${bedModal?.room.roomNumber ?? ''}`}
          footer={<><button className="btn-secondary" onClick={() => setBedModal(null)}>Cancel</button><button className="btn-primary" onClick={saveBed} disabled={busy}>{busy ? 'Saving…' : 'Save bed'}</button></>}>
          <div className="space-y-4">
            {num('Bed number', 'bed-number', bedForm.bedNumber, (v) => setBedForm({ ...bedForm, bedNumber: v }), { min: 1, placeholder: bedModal?.bed ? undefined : 'Next available' })}
            <div><label className="field-label" htmlFor="bed-label">Label <span className="text-dark-400 font-normal">(optional)</span></label><input id="bed-label" className="input-field" maxLength={40} value={bedForm.label} onChange={(e) => setBedForm({ ...bedForm, label: e.target.value })} placeholder="e.g. Window side" /></div>
            {num('Monthly rent (optional)', 'bed-rent', bedForm.rent, (v) => setBedForm({ ...bedForm, rent: v }), { min: 0, placeholder: '₹ per month' })}
          </div>
          {error && <p role="alert" className="text-sm text-error mt-4">{error}</p>}
        </Modal>

        {/* Bulk wizard */}
        <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} size="xl" title={bulkStep === 'configure' ? 'Bulk add rooms · 1. Configure' : `Bulk add rooms · 2. Review (${rows.length} rooms, ${totalBeds} beds)`}
          footer={bulkStep === 'configure'
            ? <><button className="btn-secondary" onClick={() => setBulkOpen(false)}>Cancel</button><button className="btn-primary" onClick={generate}>Preview rooms</button></>
            : <><button className="btn-secondary" onClick={() => setBulkStep('configure')}>Back</button><button className="btn-primary" disabled={busy || rows.length === 0 || issues > 0} onClick={saveBulk}>{busy ? 'Creating…' : `Create ${rows.length} rooms`}</button></>}>
          {bulkStep === 'configure' ? (
            <div className="space-y-5">
              <p className="text-sm text-dark-500">Describe the pattern; you’ll review and edit every room before anything is saved.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {num('From floor', 'b-ff', gen.floorFrom, (v) => setGen({ ...gen, floorFrom: v }))}
                {num('To floor', 'b-ft', gen.floorTo, (v) => setGen({ ...gen, floorTo: v }))}
                {num('Rooms per floor', 'b-pf', gen.perFloor, (v) => setGen({ ...gen, perFloor: v }), { min: 1, max: 100 })}
                <div><label className="field-label" htmlFor="b-prefix">Name prefix <span className="text-dark-400 font-normal">(optional)</span></label><input id="b-prefix" className="input-field" maxLength={8} placeholder="e.g. A-" value={gen.prefix} onChange={(e) => setGen({ ...gen, prefix: e.target.value })} /></div>
                {num('Start number', 'b-start', gen.start, (v) => setGen({ ...gen, start: v }), { min: 0 })}
                <label className="flex items-start gap-2 text-sm text-dark-700 cursor-pointer sm:mt-6"><input type="checkbox" className="mt-0.5 rounded border-dark-300 text-primary" checked={gen.byFloor} onChange={(e) => setGen({ ...gen, byFloor: e.target.checked })} /><span>Number by floor<span className="block text-xs text-dark-400">Floor 2 → 201, 202, 203…</span></span></label>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 border-t border-dark-200 pt-5">
                <div><label className="field-label" htmlFor="b-share">Sharing type</label><select id="b-share" className="input-field" value={gen.sharingType} onChange={(e) => setGen({ ...gen, sharingType: e.target.value })}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{sharingName(n)} ({n})</option>)}</select></div>
                {num('Beds per room', 'b-beds', gen.bedCount, (v) => setGen({ ...gen, bedCount: v }), { min: 0, max: 20, placeholder: `Same as sharing (${gen.sharingType})` })}
                {num('Rent per bed (optional)', 'b-rent', gen.bedRent, (v) => setGen({ ...gen, bedRent: v }), { min: 0, placeholder: '₹ per month' })}
                <label className="flex items-center gap-2 text-sm text-dark-700 cursor-pointer"><input type="checkbox" className="rounded border-dark-300 text-primary" checked={gen.attachedBathroom} onChange={(e) => setGen({ ...gen, attachedBathroom: e.target.checked })} /> Attached bathroom</label>
              </div>
            </div>
          ) : (
            <div>
              {issues > 0 && <p role="alert" className="text-sm text-error bg-error-light rounded-lg px-3 py-2 mb-3">Fix {issues} highlighted row{issues === 1 ? '' : 's'} (or remove them) to continue.</p>}
              {error && <p role="alert" className="text-sm text-error bg-error-light rounded-lg px-3 py-2 mb-3">{error}</p>}
              <div className="overflow-x-auto border border-dark-200 rounded-lg max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-50 sticky top-0"><tr>{['Room', 'Floor', 'Sharing', 'Beds', 'Bath', 'Rent / bed', ''].map((h) => <th key={h} className="table-head px-3 py-2">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-dark-100">
                    {rows.map((r) => {
                      const issue = rowIssue(r, rows);
                      const cell = 'input-field !py-1 !px-2 !text-sm';
                      return (
                        <tr key={r.key} className={issue ? 'bg-error-light/50' : ''}>
                          <td className="px-3 py-1.5"><input aria-label="Room number" className={`${cell} !w-24 ${issue ? '!border-error' : ''}`} value={r.roomNumber} onChange={(e) => patchRow(r.key, { roomNumber: e.target.value })} />{issue && <div className="text-[11px] text-error mt-0.5">{issue}</div>}</td>
                          <td className="px-3 py-1.5"><input aria-label="Floor" type="number" className={`${cell} !w-16`} value={r.floor} onChange={(e) => patchRow(r.key, { floor: e.target.value })} /></td>
                          <td className="px-3 py-1.5"><select aria-label="Sharing" className={`${cell} !w-28`} value={r.sharingType} onChange={(e) => patchRow(r.key, { sharingType: e.target.value })}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{sharingName(n)}</option>)}</select></td>
                          <td className="px-3 py-1.5"><input aria-label="Beds" type="number" min={0} max={20} className={`${cell} !w-16`} value={r.bedCount} onChange={(e) => patchRow(r.key, { bedCount: e.target.value })} /></td>
                          <td className="px-3 py-1.5"><input aria-label="Attached bathroom" type="checkbox" className="rounded border-dark-300 text-primary" checked={r.attachedBathroom} onChange={(e) => patchRow(r.key, { attachedBathroom: e.target.checked })} /></td>
                          <td className="px-3 py-1.5"><input aria-label="Rent per bed" type="number" min={0} className={`${cell} !w-24`} value={r.bedRent} onChange={(e) => patchRow(r.key, { bedRent: e.target.value })} /></td>
                          <td className="px-3 py-1.5 text-right"><button className="btn-ghost !px-1.5 text-error" aria-label={`Remove room ${r.roomNumber}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 size={14} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-dark-400 mt-3">Beds are numbered 1…N automatically. All rooms are created together, or none if something fails.</p>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          open={!!confirm} danger busy={busy}
          title={confirm?.kind === 'room' ? `Delete room ${confirm.room.roomNumber}?` : confirm?.kind === 'bed' ? `Delete bed ${confirm.bed.bedNumber}?` : 'Move tenant out?'}
          message={confirm?.kind === 'room' ? <>This removes the room and its {confirm.room.totalBeds} beds. Rooms with tenants can’t be deleted: move them out or reallocate them first.</>
            : confirm?.kind === 'bed' ? <>Bed {confirm.bed.bedNumber} in room {confirm.room.roomNumber} will be removed.</>
            : <><strong>{confirm?.kind === 'moveout' ? confirm.bed.tenantName : ''}</strong> will be marked as left, the bed becomes vacant and their login stops working.</>}
          confirmLabel={confirm?.kind === 'moveout' ? 'Move out' : 'Delete'} onConfirm={runConfirm} onCancel={() => setConfirm(null)}
        />
      </AppLayout>
    </FeatureGate>
  );
}
