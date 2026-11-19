import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, LocateFixed, MapPin, Loader2 } from 'lucide-react';

export interface LocationValue {
  address: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  errors?: Partial<Record<keyof LocationValue, string>>;
}

interface Place {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const INDIA_CENTER: [number, number] = [22.5, 79];

/** Turn a Nominatim place into our structured fields. */
const toFields = (p: Place): Partial<LocationValue> => {
  const a = p.address ?? {};
  return {
    area: a.suburb || a.neighbourhood || a.city_district || a.quarter || a.hamlet || a.village || '',
    city: a.city || a.town || a.municipality || a.county || a.state_district || '',
    state: a.state || '',
    pinCode: a.postcode || '',
  };
};

/**
 * Pick a PG's location by searching an address or by clicking/dragging a pin on the map.
 * Stores structured fields (address, area, city, state, PIN) plus coordinates. Search uses
 * OpenStreetMap's Nominatim, called on demand (not per keystroke) per its usage policy.
 */
export default function LocationPicker({ value, onChange, errors = {} }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const latest = useRef(value);
  latest.current = value;
  const emit = useRef(onChange);
  emit.current = onChange;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');

  const patch = (p: Partial<LocationValue>) => emit.current({ ...latest.current, ...p });

  const reverse = async (lat: number, lng: number) => {
    try {
      const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error();
      const place = (await r.json()) as Place;
      const f = toFields(place);
      // Fill gaps only: never overwrite what the owner already typed.
      const cur = latest.current;
      patch({
        latitude: lat, longitude: lng,
        address: cur.address || place.display_name?.split(',').slice(0, 3).join(',').trim() || '',
        area: cur.area || f.area || '', city: cur.city || f.city || '', state: cur.state || f.state || '', pinCode: cur.pinCode || f.pinCode || '',
      });
    } catch {
      patch({ latitude: lat, longitude: lng });
      setNote('Pin saved. We couldn’t look up the address automatically, please fill it in below.');
    }
  };

  const place = (lat: number, lng: number, zoom?: number) => {
    const m = map.current;
    if (!m) return;
    if (!marker.current) {
      marker.current = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({ className: '', html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#4F46E5;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.4);transform:rotate(-45deg)"></div>', iconSize: [22, 22], iconAnchor: [11, 22] }),
      }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        reverse(p.lat, p.lng);
      });
    } else marker.current.setLatLng([lat, lng]);
    m.setView([lat, lng], zoom ?? Math.max(m.getZoom(), 15));
  };

  // Create the map once.
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    const v = latest.current;
    const m = L.map(mapEl.current, { center: v.latitude != null && v.longitude != null ? [v.latitude, v.longitude] : INDIA_CENTER, zoom: v.latitude != null ? 15 : 5 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    map.current = m;
    if (v.latitude != null && v.longitude != null) place(v.latitude, v.longitude, 15);
    m.on('click', (e: L.LeafletMouseEvent) => { place(e.latlng.lat, e.latlng.lng); reverse(e.latlng.lat, e.latlng.lng); });
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const q = query.trim();
    if (q.length < 3) return setNote('Type at least 3 characters to search.');
    setSearching(true);
    setNote('');
    try {
      const r = await fetch(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error();
      const list = (await r.json()) as Place[];
      setResults(list);
      if (!list.length) setNote('No places found. Try a nearby landmark or drop the pin on the map.');
    } catch {
      setNote('Search is unavailable right now. You can still click the map and fill in the address.');
    } finally {
      setSearching(false);
    }
  };

  const pick = (p: Place) => {
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    place(lat, lng, 16);
    patch({ latitude: lat, longitude: lng, address: p.display_name.split(',').slice(0, 3).join(',').trim(), ...toFields(p) });
    setResults([]);
    setNote('');
  };

  const locate = () => {
    if (!navigator.geolocation) return setNote('Your browser can’t share its location.');
    setNote('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { place(pos.coords.latitude, pos.coords.longitude, 16); reverse(pos.coords.latitude, pos.coords.longitude); },
      () => setNote('Couldn’t get your location. Allow location access, or search instead.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const field = (k: keyof LocationValue, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`loc-${k}`}>{label}</label>
      <input id={`loc-${k}`} className={`input-field ${errors[k] ? '!border-error' : ''}`} value={String(value[k] ?? '')} onChange={(e) => patch({ [k]: e.target.value } as Partial<LocationValue>)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <p className="text-xs text-error mt-1">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="field-label" htmlFor="loc-search">Search for your location</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input id="loc-search" className="input-field !pl-9" placeholder="Area, locality or landmark, e.g. Kamla Nagar, Delhi" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} />
          </div>
          <button type="button" className="btn-secondary shrink-0" onClick={search} disabled={searching}>{searching ? <Loader2 size={15} className="animate-spin" /> : 'Search'}</button>
          <button type="button" className="btn-secondary shrink-0" onClick={locate} title="Use my current location" aria-label="Use my current location"><LocateFixed size={16} /></button>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 border border-dark-200 rounded-lg divide-y divide-dark-100 bg-white shadow-card max-h-56 overflow-y-auto" role="listbox" aria-label="Search results">
            {results.map((p, i) => (
              <li key={`${p.lat}-${p.lon}-${i}`}><button type="button" role="option" aria-selected="false" className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 flex gap-2" onClick={() => pick(p)}><MapPin size={15} className="text-primary mt-0.5 shrink-0" /><span>{p.display_name}</span></button></li>
            ))}
          </ul>
        )}
        {note && <p className="text-xs text-warning mt-2" role="status">{note}</p>}
      </div>

      <div>
        <div ref={mapEl} className="h-64 rounded-lg border border-dark-200 overflow-hidden z-0" role="application" aria-label="Map: click to drop a pin, drag to adjust" />
        <p className="text-xs text-dark-400 mt-1.5">
          {value.latitude != null && value.longitude != null ? `Pin at ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}. Drag it to fine-tune.` : 'Click the map to drop a pin on your PG. This is what tenants will see on Find PG.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">{field('address', 'Street address')}</div>
        {field('area', 'Area / locality', { placeholder: 'e.g. Baner' })}
        {field('city', 'City')}
        {field('state', 'State')}
        {field('pinCode', 'PIN code', { inputMode: 'numeric', maxLength: 6 })}
      </div>
    </div>
  );
}
