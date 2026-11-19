import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Read-only map with one marker. */
export default function StaticMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: [lat, lng], zoom: 15, scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    L.marker([lat, lng], {
      title: label,
      icon: L.divIcon({ className: '', html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#4F46E5;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.4);transform:rotate(-45deg)"></div>', iconSize: [22, 22], iconAnchor: [11, 22] }),
    }).addTo(m);
    return () => { m.remove(); };
  }, [lat, lng, label]);
  return <div ref={el} className="h-64 rounded-lg border border-dark-200 overflow-hidden z-0" role="img" aria-label={`Map showing ${label}`} />;
}
