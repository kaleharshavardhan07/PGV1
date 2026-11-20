import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, BedDouble, Bath, ExternalLink, Building2, Phone } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import ContactOwner from '../components/ContactOwner';
import StaticMap from '../components/StaticMap';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/PageLoader';
import { publicApi, type PgDetail } from '../api/endpoints';
import { API_BASE_URL, errorMessage } from '../api/client';
import { formatINR } from '../utils/format';

const SHARING_NAME: Record<number, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad' };
const sharingName = (n: number) => SHARING_NAME[n] ?? `${n}-sharing`;
const bedChip = { vacant: 'bg-success-light text-success', occupied: 'bg-dark-100 text-dark-400', unavailable: 'bg-dark-100 text-dark-400 line-through' } as const;

export default function PgDetailPage() {
  const { username = '' } = useParams();
  const [detail, setDetail] = useState<PgDetail | null>(null);
  const [error, setError] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    let live = true;
    publicApi.detail(username).then((r) => { if (live) setDetail(r); }).catch((e) => { if (live) setError(errorMessage(e)); });
    return () => { live = false; };
  }, [username]);

  // "Packages": one card per sharing type, built from the PG's real rooms and beds.
  const packages = useMemo(() => {
    const m = new Map<number, { rooms: number; vacant: number; minRent: number | null; bath: boolean }>();
    for (const r of detail?.rooms ?? []) {
      const cur = m.get(r.sharingType) ?? { rooms: 0, vacant: 0, minRent: null, bath: false };
      const rents = r.beds.filter((b) => b.status === 'vacant' && b.rent != null).map((b) => b.rent as number);
      m.set(r.sharingType, { rooms: cur.rooms + 1, vacant: cur.vacant + r.vacantBeds, minRent: rents.length ? Math.min(cur.minRent ?? Infinity, ...rents) : cur.minRent, bath: cur.bath || r.attachedBathroom });
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [detail]);

  if (error) return <div className="min-h-screen bg-background"><PublicHeader /><main className="max-w-3xl mx-auto px-5 py-16"><div className="card"><EmptyState icon={Building2} title="PG not found" description={error} action={<Link className="btn-primary" to="/find-pg">Browse all PGs</Link>} /></div></main></div>;
  if (!detail) return <div className="min-h-screen bg-background"><PublicHeader /><main className="max-w-6xl mx-auto px-5 py-8 space-y-4" role="status" aria-label="Loading"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-64 w-full" /></main></div>;

  const { pg, rooms } = detail;
  const hasMap = pg.latitude != null && pg.longitude != null;
  const free = pg.vacancy?.vacantBeds;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-5 py-6">
        <Link to="/find-pg" className="inline-flex items-center gap-1.5 text-sm text-dark-500 hover:text-dark-800 mb-4"><ArrowLeft size={15} /> All PGs</Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <span className="badge bg-primary-50 text-primary-700">{pg.pgType === 'Co-living' ? 'Co-ed' : pg.pgType}</span>
            <h1 className="text-3xl font-bold text-dark-900 tracking-tight mt-2">{pg.pgName}</h1>
            <p className="text-dark-500 mt-1.5 flex items-start gap-1.5"><MapPin size={16} className="mt-0.5 shrink-0" /> {[pg.address, pg.area, pg.city, pg.state].filter(Boolean).join(', ')}</p>
          </div>
          {free != null && <span className={`badge !text-sm !px-3 !py-1.5 ${free ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}><BedDouble size={15} /> {free ? `${free} bed${free === 1 ? '' : 's'} available` : 'Currently full'}</span>}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {pg.photoIds.length > 0 && <section className="grid grid-cols-2 gap-3 overflow-hidden rounded-2xl">
              {pg.photoIds.map((id, index) => <img key={id} src={`${API_BASE_URL}/api/public/pg/${pg.pgUsername}/photos/${id}`} alt={`${pg.pgName} photo ${index + 1}`} className={`h-56 w-full object-cover ${index === 0 && pg.photoIds.length === 1 ? 'col-span-2' : ''}`} />)}
            </section>}
            {pg.description && <section className="card p-6"><h2 className="font-semibold text-dark-900 mb-2">About this PG</h2><p className="text-sm text-dark-600 leading-relaxed whitespace-pre-line">{pg.description}</p></section>}

            <section className="card p-6" aria-label="Rent packages">
              <h2 className="font-semibold text-dark-900 mb-4">Rent packages</h2>
              {packages.length === 0 ? <p className="text-sm text-dark-500">The owner hasn’t shared room details. Contact them for availability and prices.</p> : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {packages.map(([n, p]) => (
                    <div key={n} className="rounded-xl border border-dark-200 p-4">
                      <div className="flex items-center justify-between"><h3 className="font-semibold text-dark-900">{sharingName(n)} sharing</h3><span className={`badge ${p.vacant ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}>{p.vacant ? `${p.vacant} free` : 'Full'}</span></div>
                      <div className="mt-2">{p.minRent != null ? <span className="text-xl font-bold text-dark-900">{formatINR(p.minRent)}<span className="text-sm font-normal text-dark-500">/month</span></span> : <span className="text-sm text-dark-500">Price on request</span>}</div>
                      <div className="text-xs text-dark-500 mt-1 flex items-center gap-2">{p.rooms} room{p.rooms === 1 ? '' : 's'}{p.bath && <span className="inline-flex items-center gap-1"><Bath size={12} /> Attached bath</span>}</div>
                      <button className="btn-secondary w-full mt-3 !py-2" onClick={() => setContactOpen(true)}>I’m interested</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {rooms.length > 0 && (
              <section className="card p-6" aria-label="Rooms and beds">
                <h2 className="font-semibold text-dark-900 mb-4">Rooms & availability</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {rooms.map((r) => (
                    <div key={r.id} className="rounded-lg border border-dark-200 p-3">
                      <div className="flex items-center justify-between text-sm"><span className="font-medium text-dark-900">Room {r.roomNumber}</span><span className="text-xs text-dark-500">{sharingName(r.sharingType)}{r.rentFrom != null ? ` · ${formatINR(r.rentFrom)}` : ''}</span></div>
                      <div className="flex flex-wrap gap-1.5 mt-2">{r.beds.map((b) => <span key={b.id} className={`px-2 py-0.5 rounded text-xs font-medium ${bedChip[b.status]}`}>Bed {b.bedNumber}</span>)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasMap && (
              <section className="card p-6" aria-label="Location">
                <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-dark-900">Location</h2><a className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${pg.latitude},${pg.longitude}`}>Open in Google Maps <ExternalLink size={13} /></a></div>
                <StaticMap lat={pg.latitude as number} lng={pg.longitude as number} label={pg.pgName} />
              </section>
            )}
          </div>

          <aside className="hidden lg:block"><div className="card p-6 sticky top-24"><h2 className="font-semibold text-dark-900 mb-4">Contact owner</h2><ContactOwner pg={pg} /></div></aside>
        </div>
      </main>

      {/* Contact stays reachable on small screens */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-dark-200 p-3 z-30"><button className="btn-primary w-full !py-3" onClick={() => setContactOpen(true)}><Phone size={16} /> Contact owner</button></div>
      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title={`Contact ${pg.pgName}`} size="md"><ContactOwner pg={pg} /></Modal>
    </div>
  );
}
