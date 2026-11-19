import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, LocateFixed, MapPin, BedDouble, Bath, Bookmark, BookmarkCheck, SlidersHorizontal, X, Phone } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Modal from '../components/Modal';
import ContactOwner from '../components/ContactOwner';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/PageLoader';
import { publicApi, type PgCard, type PgSearchParams } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { formatINR } from '../utils/format';

const PAGE = 12;
const GENDERS = [{ v: '', l: 'Any' }, { v: 'Boys', l: 'Boys' }, { v: 'Girls', l: 'Girls' }, { v: 'Co-living', l: 'Co-ed' }];
const PRICES = [{ l: 'Any price', min: '', max: '' }, { l: 'Under ₹6,000', min: '', max: '6000' }, { l: '₹6,000 – ₹9,000', min: '6000', max: '9000' }, { l: '₹9,000 – ₹13,000', min: '9000', max: '13000' }, { l: 'Above ₹13,000', min: '13000', max: '' }];
const SHARING_NAME: Record<number, string> = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad' };
const sharingName = (n: number) => SHARING_NAME[n] ?? `${n}-sharing`;

// Saved PGs live in this browser only: no account needed to browse.
const SAVED_KEY = 'aapka-pg-saved';
const readSaved = (): string[] => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); } catch { return []; } };
const writeSaved = (v: string[]) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export default function FindPgPage() {
  const [sp, setSp] = useSearchParams();
  const get = (k: string) => sp.get(k) ?? '';
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setSp(next, { replace: true });
  };

  const [q, setQ] = useState(get('q'));
  const [pgs, setPgs] = useState<PgCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<{ city: string; area: string; pgs: number }[]>([]);
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [onlySaved, setOnlySaved] = useState(false);
  const [contact, setContact] = useState<PgCard | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [geoNote, setGeoNote] = useState('');

  const params: PgSearchParams = useMemo(() => ({
    q: get('q') || undefined, pgType: get('type') || undefined, sharing: get('sharing') ? Number(get('sharing')) : undefined,
    minPrice: get('min') ? Number(get('min')) : undefined, maxPrice: get('max') ? Number(get('max')) : undefined,
    available: get('available') === '1' ? true : undefined,
    lat: get('lat') ? Number(get('lat')) : undefined, lng: get('lng') ? Number(get('lng')) : undefined,
    radiusKm: get('lat') ? Number(get('radius') || 10) : undefined,
    sort: get('sort') || (get('lat') ? 'nearest' : 'newest'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sp]);

  useEffect(() => { publicApi.locations().then((r) => setLocations(r.locations)).catch(() => undefined); }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    publicApi.search({ ...params, limit: PAGE, offset: 0 })
      .then((r) => { if (live) { setPgs(r.pgs); setTotal(r.total); } })
      .catch((e) => { if (live) setError(errorMessage(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [params]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const r = await publicApi.search({ ...params, limit: PAGE, offset: pgs.length });
      setPgs((cur) => [...cur, ...r.pgs]);
    } catch (e) { setError(errorMessage(e)); } finally { setLoadingMore(false); }
  }, [params, pgs.length]);

  const toggleSave = (id: string) => setSaved((cur) => { const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; writeSaved(next); return next; });

  const locate = () => {
    if (!navigator.geolocation) return setGeoNote('Your browser can’t share its location.');
    setGeoNote('Finding you…');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoNote(''); set({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5), radius: get('radius') || '10', sort: 'nearest', q: '' }); setQ(''); },
      () => setGeoNote('Couldn’t get your location. Allow access, or search by area instead.'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const priceIdx = PRICES.findIndex((p) => p.min === get('min') && p.max === get('max'));
  const activeCount = ['type', 'sharing', 'min', 'max', 'available', 'lat'].filter((k) => get(k)).length;
  const clearAll = () => { setQ(''); setSp({}, { replace: true }); };
  const visible = onlySaved ? pgs.filter((p) => saved.includes(p.id)) : pgs;

  const cities = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of locations) m.set(l.city, (m.get(l.city) ?? 0) + l.pgs);
    return [...m.entries()].slice(0, 8);
  }, [locations]);
  const areas = locations.filter((l) => l.area).slice(0, 8);

  const filters = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div><span className="field-label">Gender</span><div className="flex rounded-lg bg-dark-100 p-0.5" role="group" aria-label="Gender">{GENDERS.map((g) => <button key={g.l} aria-pressed={get('type') === g.v} onClick={() => set({ type: g.v })} className={`flex-1 px-2 py-1.5 text-sm font-medium rounded-md transition ${get('type') === g.v ? 'bg-white text-dark-900 shadow-soft' : 'text-dark-500'}`}>{g.l}</button>)}</div></div>
      <div><label className="field-label" htmlFor="f-share">Sharing</label><select id="f-share" className="input-field" value={get('sharing')} onChange={(e) => set({ sharing: e.target.value })}><option value="">Any</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{sharingName(n)}</option>)}</select></div>
      <div><label className="field-label" htmlFor="f-price">Price / month</label><select id="f-price" className="input-field" value={priceIdx} onChange={(e) => { const p = PRICES[Number(e.target.value)]; set({ min: p.min, max: p.max }); }}>{priceIdx < 0 && <option value={-1}>Custom</option>}{PRICES.map((p, i) => <option key={p.l} value={i}>{p.l}</option>)}</select></div>
      <div><label className="field-label" htmlFor="f-sort">Sort by</label><select id="f-sort" className="input-field" value={params.sort} onChange={(e) => set({ sort: e.target.value })}><option value="newest">Newest</option>{get('lat') && <option value="nearest">Nearest</option>}<option value="price">Price: low to high</option><option value="availability">Most beds free</option></select></div>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-dark-700 cursor-pointer select-none"><input type="checkbox" className="rounded border-dark-300 text-primary" checked={get('available') === '1'} onChange={(e) => set({ available: e.target.checked ? '1' : '' })} /> Only with beds free</label>
        {get('lat') && <label className="flex items-center gap-2 text-sm text-dark-700">Within <select aria-label="Distance" className="input-field !w-auto !py-1" value={get('radius') || '10'} onChange={(e) => set({ radius: e.target.value })}>{[2, 5, 10, 25, 50].map((r) => <option key={r} value={r}>{r} km</option>)}</select></label>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <section className="bg-white border-b border-dark-200">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <h1 className="text-3xl font-bold text-dark-900 tracking-tight">Find a PG near you</h1>
          <p className="text-dark-500 mt-1.5">Search by area, filter by price and sharing, and contact owners directly.</p>

          <form className="mt-6 flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim(), lat: '', lng: '', radius: '' }); }} role="search">
            <div className="relative flex-1">
              <MapPin size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
              <input list="locations" className="input-field !pl-10 !py-3" placeholder="Search area, locality, city or PG name" aria-label="Search location" value={q} onChange={(e) => setQ(e.target.value)} />
              <datalist id="locations">{[...new Set(locations.flatMap((l) => [l.city, l.area]).filter(Boolean))].map((x) => <option key={x} value={x} />)}</datalist>
            </div>
            <button className="btn-primary !py-3 sm:px-6"><Search size={16} /> Search</button>
            <button type="button" className="btn-secondary !py-3" onClick={locate}><LocateFixed size={16} /> Near me</button>
          </form>
          {geoNote && <p className="text-xs text-warning mt-2" role="status">{geoNote}</p>}

          {(cities.length > 0 || areas.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-dark-500">Popular:</span>
              {[...cities.map(([c, n]) => ({ label: c, n, v: c })), ...areas.map((a) => ({ label: a.area, n: a.pgs, v: a.area }))].slice(0, 10).map((x) => (
                <button key={x.label} onClick={() => { setQ(x.v); set({ q: x.v, lat: '', lng: '', radius: '' }); }} className="px-3 py-1 rounded-full border border-dark-200 bg-white hover:border-primary hover:text-primary-700 transition">{x.label} <span className="text-dark-400 text-xs">{x.n}</span></button>
              ))}
            </div>
          )}

          <div className="mt-5 hidden lg:block">{filters}</div>
          <button className="lg:hidden mt-4 btn-secondary w-full" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} /> Filters{activeCount ? ` (${activeCount})` : ''}</button>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="text-sm text-dark-600" role="status" aria-live="polite">{loading ? 'Searching…' : `${total} PG${total === 1 ? '' : 's'} found`}{get('q') && <> for “{get('q')}”</>}{get('lat') && <> near you</>}</div>
          <div className="flex items-center gap-3">
            {saved.length > 0 && <label className="flex items-center gap-2 text-sm text-dark-600 cursor-pointer select-none"><input type="checkbox" className="rounded border-dark-300 text-primary" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} /> Saved ({saved.length})</label>}
            {(activeCount > 0 || get('q')) && <button className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline" onClick={clearAll}><X size={14} /> Clear filters</button>}
          </div>
        </div>

        {error ? (
          <div className="card"><EmptyState icon={Search} title="Couldn’t load results" description={error} action={<button className="btn-primary" onClick={() => setSp(new URLSearchParams(sp))}>Try again</button>} /></div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" role="status" aria-label="Loading results">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card p-5 space-y-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-8 w-full" /><Skeleton className="h-9 w-full" /></div>)}</div>
        ) : visible.length === 0 ? (
          <div className="card"><EmptyState icon={Search} title={onlySaved ? 'No saved PGs here' : 'No PGs match your search'} description="Try a nearby area, a wider price range, or clear some filters." action={<button className="btn-primary" onClick={() => { setOnlySaved(false); clearAll(); }}>Clear filters</button>} /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((p) => {
                const isSaved = saved.includes(p.id);
                return (
                  <article key={p.id} className="card p-5 flex flex-col hover:shadow-glow transition" aria-label={p.pgName}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`badge ${p.pgType === 'Girls' ? 'bg-pink-50 text-pink-700' : p.pgType === 'Boys' ? 'bg-secondary-50 text-secondary-700' : 'bg-primary-50 text-primary-700'}`}>{p.pgType === 'Co-living' ? 'Co-ed' : p.pgType}</span>
                        <h2 className="font-semibold text-dark-900 text-lg mt-2 leading-snug truncate"><Link to={`/find-pg/${p.pgUsername}`} className="hover:text-primary-700">{p.pgName}</Link></h2>
                        <div className="text-sm text-dark-500 flex items-center gap-1 mt-0.5"><MapPin size={13} className="shrink-0" /><span className="truncate">{[p.area, p.city].filter(Boolean).join(', ')}</span>{p.distanceKm != null && <span className="text-dark-400 shrink-0">· {p.distanceKm} km</span>}</div>
                      </div>
                      <button onClick={() => toggleSave(p.id)} aria-pressed={isSaved} aria-label={isSaved ? `Unsave ${p.pgName}` : `Save ${p.pgName}`} className="p-2 -mr-2 rounded-lg hover:bg-dark-100 text-dark-400 hover:text-primary shrink-0">{isSaved ? <BookmarkCheck size={19} className="text-primary" /> : <Bookmark size={19} />}</button>
                    </div>

                    {p.vacancy ? (
                      <>
                        <div className="flex flex-wrap gap-1.5 mt-4">{p.vacancy.sharingTypes.map((n) => <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-dark-100 text-dark-700 text-xs font-medium"><Bath size={0} className="hidden" />{sharingName(n)}</span>)}</div>
                        <div className="flex items-end justify-between mt-4">
                          <div>{p.vacancy.minRent != null ? <><div className="text-xs text-dark-500">Starting from</div><div className="text-xl font-bold text-dark-900">{formatINR(p.vacancy.minRent)}<span className="text-sm font-normal text-dark-500">/month</span></div></> : <div className="text-sm text-dark-500">Price on request</div>}</div>
                          <span className={`badge ${p.vacancy.vacantBeds ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}><BedDouble size={12} /> {p.vacancy.vacantBeds ? `${p.vacancy.vacantBeds} bed${p.vacancy.vacantBeds === 1 ? '' : 's'} free` : 'Full'}</span>
                        </div>
                      </>
                    ) : <div className="mt-4 text-sm text-dark-500">Contact the owner for availability and pricing.</div>}

                    <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-dark-100">
                      <Link to={`/find-pg/${p.pgUsername}`} className="btn-secondary !py-2">View details</Link>
                      <button className="btn-primary !py-2" onClick={() => setContact(p)}><Phone size={14} /> Contact owner</button>
                    </div>
                  </article>
                );
              })}
            </div>
            {!onlySaved && pgs.length < total && <div className="text-center mt-8"><button className="btn-secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : `Show more (${total - pgs.length} left)`}</button></div>}
          </>
        )}
      </main>

      <Modal open={!!contact} onClose={() => setContact(null)} title={contact ? `Contact ${contact.pgName}` : ''} size="md">{contact && <ContactOwner pg={contact} />}</Modal>
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" size="md" footer={<button className="btn-primary" onClick={() => setFiltersOpen(false)}>Show results</button>}>{filters}</Modal>
    </div>
  );
}
