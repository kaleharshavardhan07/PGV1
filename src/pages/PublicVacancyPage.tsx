import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, BedDouble, Bath, MapPin } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { publicApi, type PublicVacancy } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { formatINR } from '../utils/format';

type PgListItem = { id: string; pgName: string; pgUsername: string; city: string; pgType: string };

/** Public, no-login view of a PG's availability. Share /vacancy?pg=<username> with prospective tenants. */
export default function PublicVacancyPage() {
  const [pgs, setPgs] = useState<PgListItem[]>([]);
  const [username, setUsername] = useState(() => new URLSearchParams(window.location.search).get('pg') ?? '');
  const [detail, setDetail] = useState<PublicVacancy | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.pgs()
      .then((r) => {
        setPgs(r.pgs);
        setUsername((cur) => cur || r.pgs[0]?.pgUsername || '');
        if (!r.pgs.length) setLoading(false);
      })
      .catch((e) => { setError(errorMessage(e)); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    publicApi.vacancy(username)
      .then((r) => { setDetail(r); setError(''); })
      .catch((e) => { setDetail(null); setError(errorMessage(e)); })
      .finally(() => setLoading(false));
  }, [username]);

  const free = detail?.rooms.reduce((n, r) => n + r.vacantBeds, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-dark-200">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-dark-900"><span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center"><Building2 size={17} /></span> Aapka PG</Link>
          <Link to="/app/login" className="btn-secondary">Log in</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 tracking-tight">{detail?.pg.pgName ?? 'PG availability'}</h1>
            {detail && <p className="text-sm text-dark-500 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {[detail.pg.address, detail.pg.city].filter(Boolean).join(', ')} · {detail.pg.pgType}</p>}
          </div>
          {pgs.length > 1 && (
            <select aria-label="Choose a PG" className="input-field !w-auto" value={username} onChange={(e) => setUsername(e.target.value)}>
              {pgs.map((p) => <option key={p.id} value={p.pgUsername}>{p.pgName} — {p.city}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-dark-500 py-12 text-center">Loading availability…</div>
        ) : error ? (
          <div className="card"><EmptyState icon={Building2} title="Couldn’t load this PG" description={error} /></div>
        ) : !detail || detail.rooms.length === 0 ? (
          <div className="card"><EmptyState icon={Building2} title="No availability shared" description="This PG hasn’t published its room availability yet." /></div>
        ) : (
          <>
            <div className="card p-5 mb-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light text-success flex items-center justify-center"><BedDouble size={19} /></div>
              <div><div className="text-2xl font-bold text-dark-900 leading-none">{free}</div><div className="text-sm text-dark-500 mt-1">bed{free === 1 ? '' : 's'} available now</div></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {detail.rooms.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="font-semibold text-dark-900">Room {r.roomNumber}</h2>
                      <div className="text-xs text-dark-500 mt-0.5 flex items-center gap-2">{r.sharingType}-sharing{r.attachedBathroom && <span className="inline-flex items-center gap-1"><Bath size={12} /> Attached bath</span>}</div>
                    </div>
                    <span className={`badge ${r.vacantBeds ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-500'}`}>{r.vacantBeds ? `${r.vacantBeds} free` : 'Full'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.beds.map((b) => (
                      <span key={b.id} className={`px-2.5 py-1 rounded-md text-xs font-medium ${b.status === 'vacant' ? 'bg-success-light text-success' : 'bg-dark-100 text-dark-400'}`}>Bed {b.bedNumber}</span>
                    ))}
                  </div>
                  {r.rentFrom != null && <div className="text-sm text-dark-500 mt-3">From <span className="font-semibold text-dark-900">{formatINR(r.rentFrom)}</span>/month</div>}
                </div>
              ))}
            </div>
            <p className="text-xs text-dark-400 mt-6 text-center">Interested? Contact the PG owner — they will create your tenant account when you join.</p>
          </>
        )}
      </main>
    </div>
  );
}
