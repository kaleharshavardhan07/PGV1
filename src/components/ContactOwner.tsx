import { useState } from 'react';
import { Phone, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { publicApi, type PgCard } from '../api/endpoints';
import { errorMessage } from '../api/client';

/** Contact options for a PG owner: call, WhatsApp, and a stored enquiry the owner is notified about. */
export default function ContactOwner({ pg, compact }: { pg: Pick<PgCard, 'pgName' | 'pgUsername' | 'contact'>; compact?: boolean }) {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: `Hi, I'm interested in a bed at ${pg.pgName}. Is one available?` });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Enter your name');
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return setError('Enter a valid 10-digit mobile number');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email or leave it blank');
    setBusy(true);
    setError('');
    try {
      await publicApi.enquire(pg.pgUsername, { name: form.name.trim(), mobile: form.mobile, ...(form.email ? { email: form.email.trim() } : {}), message: form.message.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const { phone, whatsapp, ownerName } = pg.contact;

  return (
    <div className="space-y-4">
      <div className="text-sm text-dark-600">Contact <strong className="text-dark-900">{ownerName}</strong> directly.</div>
      {(phone || whatsapp) && (
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {phone && <a className="btn-secondary" href={`tel:${phone}`}><Phone size={15} /> Call {phone}</a>}
          {whatsapp && <a className="btn-secondary" href={`${whatsapp}?text=${encodeURIComponent(`Hi, I found ${pg.pgName} on Aapka PG and I'm interested in a bed.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
        </div>
      )}
      {sent ? (
        <div role="status" className="rounded-lg bg-success-light text-success p-4 text-sm flex gap-2.5"><CheckCircle2 size={18} className="shrink-0 mt-0.5" /><div><div className="font-semibold">Enquiry sent</div><div className="text-success/90 mt-0.5">The owner has been notified and will contact you on {form.mobile}.</div></div></div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate aria-label="Send an enquiry">
          <div className="text-sm font-medium text-dark-800">{phone ? 'Or send an enquiry' : 'Send an enquiry'}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="field-label" htmlFor={`eq-name-${pg.pgUsername}`}>Your name</label><input id={`eq-name-${pg.pgUsername}`} className="input-field" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label" htmlFor={`eq-mobile-${pg.pgUsername}`}>Mobile</label><input id={`eq-mobile-${pg.pgUsername}`} className="input-field" inputMode="numeric" maxLength={10} autoComplete="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          </div>
          <div><label className="field-label" htmlFor={`eq-email-${pg.pgUsername}`}>Email <span className="text-dark-400 font-normal">(optional)</span></label><input id={`eq-email-${pg.pgUsername}`} type="email" className="input-field" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="field-label" htmlFor={`eq-msg-${pg.pgUsername}`}>Message</label><textarea id={`eq-msg-${pg.pgUsername}`} rows={3} maxLength={1000} className="input-field resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}><Send size={15} /> {busy ? 'Sending…' : 'Send enquiry'}</button>
          <p className="text-xs text-dark-400">Your number is shared only with this PG’s owner.</p>
        </form>
      )}
    </div>
  );
}
