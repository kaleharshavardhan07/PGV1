import { Inbox, Phone, MessageCircle, Mail } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { formatRelative } from '../utils/format';

const tone = { New: 'bg-primary-50 text-primary-700', Contacted: 'bg-warning-light text-warning', Closed: 'bg-dark-100 text-dark-500' } as const;

/** Enquiries from people who used “Contact owner” on Find PG. */
export default function EnquiriesPage() {
  const { data, updateEnquiry } = useAppStore();
  const toast = useToast();
  return (
    <AppLayout role="owner" title="Enquiries" subtitle="People interested in your PG from Find PG.">
      <div className="card overflow-hidden">
        {data.enquiries.length === 0 ? (
          <EmptyState icon={Inbox} title="No enquiries yet" description="When someone contacts you from your Find PG listing, it shows up here (and in your email, if configured)." />
        ) : (
          <ul className="divide-y divide-dark-100">
            {data.enquiries.map((e) => (
              <li key={e.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-dark-900 flex items-center gap-2">{e.name}<span className={`badge ${tone[e.status]}`}>{e.status}</span></div>
                    <div className="text-xs text-dark-500 mt-0.5">{formatRelative(e.createdAt)} · {e.mobile}{e.email ? ` · ${e.email}` : ''}</div>
                    {e.message && <p className="text-sm text-dark-700 mt-2 whitespace-pre-line">{e.message}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a className="btn-secondary !py-1.5" href={`tel:${e.mobile}`}><Phone size={14} /> Call</a>
                    <a className="btn-secondary !py-1.5" href={`https://wa.me/91${e.mobile}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
                    {e.email && <a className="btn-secondary !py-1.5" href={`mailto:${e.email}`}><Mail size={14} /> Email</a>}
                    <select aria-label={`Status for ${e.name}`} className="input-field !w-auto !py-1.5" value={e.status} onChange={async (ev) => { const r = await updateEnquiry(e.id, ev.target.value); if (!r.ok) toast.show(r.error, 'error'); }}>
                      <option>New</option><option>Contacted</option><option>Closed</option>
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
