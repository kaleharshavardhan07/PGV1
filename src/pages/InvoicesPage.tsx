import { useMemo, useState } from 'react';
import { Plus, Search, Receipt, Send, Check, Ban, RotateCcw, Trash2, AlertTriangle, IndianRupee } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FeatureGate from '../components/FeatureGate';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import AttachmentPanel from '../components/AttachmentPanel';
import { InvoiceStatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import type { Invoice } from '../types';
import { formatDate, formatINR, monthLabel, todayISO } from '../utils/format';

type Action = 'issue' | 'mark-paid' | 'reopen' | 'cancel';

/**
 * Billing & invoices. These are records only: staff mark invoices paid after receiving money
 * offline. There is no online payment anywhere.
 */
export default function InvoicesPage({ role }: { role: 'owner' | 'manager' | 'tenant' }) {
  const { data, addInvoices, updateInvoice, invoiceAction, deleteInvoice } = useAppStore();
  const toast = useToast();
  const isStaff = role !== 'tenant';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState({ mode: 'all' as 'all' | 'some', tenantIds: [] as string[], billingPeriod: todayISO().slice(0, 7), amount: '', dueDate: '', description: '', issue: true });
  const [fErr, setFErr] = useState('');
  const [paid, setPaid] = useState({ paidOn: todayISO(), paymentNote: '' });
  const [edit, setEdit] = useState({ amount: '', dueDate: '', description: '' });

  const selected = data.invoices.find((i) => i.id === selectedId) ?? null;
  const rows = useMemo(
    () => data.invoices.filter((i) => {
      if (status === 'Overdue' ? !(i.overdue && i.status === 'Issued') : status && i.status !== status) return false;
      return !search || `${i.number} ${i.tenantName} ${i.description}`.toLowerCase().includes(search.toLowerCase());
    }),
    [data.invoices, status, search]
  );

  const issued = data.invoices.filter((i) => i.status === 'Issued');
  const overdue = issued.filter((i) => i.overdue);
  const sum = (list: Invoice[]) => list.reduce((s, i) => s + i.amount, 0);
  const paidThisMonth = data.invoices.filter((i) => i.status === 'Paid' && i.paidOn?.startsWith(todayISO().slice(0, 7)));
  const liveTenants = data.tenants.filter((t) => t.status !== 'Left');

  const doCreate = async () => {
    if (f.amount === '' || Number(f.amount) < 0) return setFErr('Enter the amount');
    if (!f.dueDate) return setFErr('Choose a due date');
    if (f.mode === 'some' && f.tenantIds.length === 0) return setFErr('Select at least one tenant');
    setBusy(true);
    const res = await addInvoices({
      ...(f.mode === 'all' ? { allActive: true } : { tenantIds: f.tenantIds }),
      billingPeriod: f.billingPeriod, amount: Number(f.amount), dueDate: f.dueDate, description: f.description.trim(), issue: f.issue,
    });
    setBusy(false);
    if (!res.ok) return setFErr(res.error);
    toast.show(`${res.invoices.length} invoice${res.invoices.length === 1 ? '' : 's'} ${f.issue ? 'issued' : 'saved as draft'}`, 'success');
    setCreateOpen(false);
  };

  const act = async (i: Invoice, action: Action, body: Record<string, unknown> = {}, okMsg = 'Updated') => {
    setBusy(true);
    const res = await invoiceAction(i.id, action, body);
    setBusy(false);
    toast.show(res.ok ? okMsg : res.error, res.ok ? 'success' : 'error');
    return res.ok;
  };

  const saveEdit = async () => {
    if (!selected) return;
    const res = await updateInvoice(selected.id, { amount: Number(edit.amount), dueDate: edit.dueDate, description: edit.description });
    toast.show(res.ok ? 'Invoice updated' : res.error, res.ok ? 'success' : 'error');
  };

  const confirmRun = async () => {
    if (!selected || !confirm) return;
    setBusy(true);
    const res = confirm === 'delete' ? await deleteInvoice(selected.id) : await invoiceAction(selected.id, 'cancel');
    setBusy(false);
    setConfirm(null);
    toast.show(res.ok ? (confirm === 'delete' ? 'Draft deleted' : 'Invoice cancelled') : res.error, res.ok ? 'success' : 'error');
    if (res.ok && confirm === 'delete') setSelectedId(null);
  };

  const open = (i: Invoice) => { setSelectedId(i.id); setEdit({ amount: String(i.amount), dueDate: i.dueDate, description: i.description }); };

  const outstandingMine = issued;

  return (
    <FeatureGate role={role} feature="billing" permission="billing" title="Invoices">
      <AppLayout
        role={role}
        title="Invoices"
        subtitle={isStaff ? 'Create and track invoices. Mark them paid once you receive money offline.' : 'Your invoices from the PG.'}
        actions={isStaff && <button className="btn-primary" onClick={() => { setFErr(''); setCreateOpen(true); }}><Plus size={16} /> Create invoices</button>}
      >
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Outstanding" value={formatINR(sum(outstandingMine))} icon={IndianRupee} color="primary" hint={`${outstandingMine.length} invoice${outstandingMine.length === 1 ? '' : 's'}`} />
          <StatCard label="Overdue" value={formatINR(sum(overdue))} icon={AlertTriangle} color={overdue.length ? 'error' : 'success'} hint={`${overdue.length} invoice${overdue.length === 1 ? '' : 's'}`} />
          <StatCard label={isStaff ? 'Paid this month' : 'Paid (this month)'} value={formatINR(sum(paidThisMonth))} icon={Check} color="success" />
        </div>

        <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" /><input className="input-field !pl-9" placeholder={isStaff ? 'Search by number or tenant…' : 'Search invoices…'} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search invoices" /></div>
          <select className="input-field !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>{(isStaff ? ['Draft', 'Issued', 'Overdue', 'Paid', 'Cancelled'] : ['Issued', 'Overdue', 'Paid', 'Cancelled']).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="card overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={Receipt} title={data.invoices.length ? 'No invoices match' : 'No invoices yet'} description={data.invoices.length ? undefined : isStaff ? 'Create invoices for your tenants to keep billing records.' : 'Invoices from your PG will appear here.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-50 border-b border-dark-200"><tr>{['Invoice', ...(isStaff ? ['Tenant'] : []), 'Period', 'Amount', 'Due', 'Status', ''].map((h) => <th key={h} className="table-head px-5 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-dark-100">
                  {rows.map((i) => (
                    <tr key={i.id} className="hover:bg-dark-50 cursor-pointer" onClick={() => open(i)}>
                      <td className="px-5 py-3.5 whitespace-nowrap"><button className="font-medium text-dark-900 font-mono text-xs" onClick={(e) => { e.stopPropagation(); open(i); }}>{i.number}</button></td>
                      {isStaff && <td className="px-5 py-3.5">{i.tenantName}<div className="text-xs text-dark-500">{i.roomNumber ? `Room ${i.roomNumber}` : ''}</div></td>}
                      <td className="px-5 py-3.5 whitespace-nowrap">{monthLabel(i.billingPeriod)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium">{formatINR(i.amount)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{formatDate(i.dueDate)}</td>
                      <td className="px-5 py-3.5"><InvoiceStatusBadge status={i.status} overdue={i.overdue} /></td>
                      <td className="px-5 py-3.5 text-right text-dark-400">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail */}
        <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `Invoice ${selected.number}` : ''} size="lg">
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2"><InvoiceStatusBadge status={selected.status} overdue={selected.overdue} />{isStaff && <span className="text-sm text-dark-600">{selected.tenantName}{selected.roomNumber ? ` · Room ${selected.roomNumber}` : ''}</span>}</div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><dt className="text-dark-500">Amount</dt><dd className="text-xl font-bold text-dark-900 mt-0.5">{formatINR(selected.amount)}</dd></div>
                <div><dt className="text-dark-500">Billing period</dt><dd className="font-medium mt-1">{monthLabel(selected.billingPeriod)}</dd></div>
                <div><dt className="text-dark-500">Due date</dt><dd className={`font-medium mt-1 ${selected.overdue ? 'text-error' : ''}`}>{formatDate(selected.dueDate)}</dd></div>
                {selected.status === 'Paid' && <div><dt className="text-dark-500">Paid on</dt><dd className="font-medium mt-1">{formatDate(selected.paidOn ?? undefined)}</dd></div>}
              </dl>
              {selected.description && <p className="text-sm text-dark-700">{selected.description}</p>}
              {selected.paymentNote && <p className="text-sm text-dark-500">Payment note: {selected.paymentNote}</p>}

              {isStaff && (selected.status === 'Draft' || selected.status === 'Issued') && (
                <section className="border-t border-dark-200 pt-4">
                  <h4 className="font-semibold text-dark-900 mb-3">Edit</h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div><label className="field-label" htmlFor="ie-amount">Amount (₹)</label><input id="ie-amount" type="number" min={0} className="input-field" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></div>
                    <div><label className="field-label" htmlFor="ie-due">Due date</label><input id="ie-due" type="date" className="input-field" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></div>
                    <div><label className="field-label" htmlFor="ie-desc">Description</label><input id="ie-desc" className="input-field" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
                  </div>
                  <div className="flex justify-end mt-3"><button className="btn-secondary" onClick={saveEdit}>Save changes</button></div>
                </section>
              )}

              <section className="border-t border-dark-200 pt-4">
                <h4 className="font-semibold text-dark-900 mb-2">Receipts & documents</h4>
                <AttachmentPanel invoiceId={selected.id} canUpload={selected.status !== 'Cancelled'} uploadLabel={isStaff ? 'Attach receipt' : 'Upload my receipt'} />
              </section>

              {isStaff && (
                <div className="flex flex-wrap gap-2 justify-end border-t border-dark-200 pt-4">
                  {selected.status === 'Draft' && <><button className="btn-secondary text-error" onClick={() => setConfirm('delete')}><Trash2 size={15} /> Delete draft</button><button className="btn-primary" disabled={busy} onClick={() => act(selected, 'issue', {}, 'Invoice issued to the tenant')}><Send size={15} /> Issue to tenant</button></>}
                  {selected.status === 'Issued' && <><button className="btn-secondary text-error" onClick={() => setConfirm('cancel')}><Ban size={15} /> Cancel invoice</button><button className="btn-primary" onClick={() => { setPaid({ paidOn: todayISO(), paymentNote: '' }); setPaidOpen(true); }}><Check size={15} /> Mark as paid</button></>}
                  {selected.status === 'Paid' && <button className="btn-secondary" disabled={busy} onClick={() => act(selected, 'reopen', {}, 'Invoice reopened')}><RotateCcw size={15} /> Reopen</button>}
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Mark paid (a record, not a payment) */}
        <Modal open={paidOpen} onClose={() => setPaidOpen(false)} title="Record payment received" size="sm"
          footer={<><button className="btn-secondary" onClick={() => setPaidOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={async () => { if (selected && (await act(selected, 'mark-paid', { paidOn: paid.paidOn, paymentNote: paid.paymentNote.trim() }, 'Marked as paid'))) setPaidOpen(false); }}>Mark paid</button></>}>
          <p className="text-sm text-dark-500 mb-4">This only records that you received the money (cash, UPI, bank transfer…). Nothing is charged online.</p>
          <div className="space-y-4">
            <div><label className="field-label" htmlFor="paid-on">Received on</label><input id="paid-on" type="date" className="input-field" value={paid.paidOn} onChange={(e) => setPaid({ ...paid, paidOn: e.target.value })} /></div>
            <div><label className="field-label" htmlFor="paid-note">Note <span className="text-dark-400 font-normal">(optional)</span></label><input id="paid-note" className="input-field" maxLength={300} placeholder="e.g. Cash, UPI ref 1234" value={paid.paymentNote} onChange={(e) => setPaid({ ...paid, paymentNote: e.target.value })} /></div>
          </div>
        </Modal>

        {/* Create */}
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create invoices" size="lg"
          footer={<><button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={doCreate}>{busy ? 'Creating…' : f.issue ? 'Create & issue' : 'Save as draft'}</button></>}>
          <div className="space-y-5">
            <fieldset>
              <legend className="field-label">For</legend>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={f.mode === 'all'} onChange={() => setF({ ...f, mode: 'all' })} className="text-primary" /> All current tenants ({liveTenants.length})</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={f.mode === 'some'} onChange={() => setF({ ...f, mode: 'some' })} className="text-primary" /> Choose tenants</label>
              </div>
              {f.mode === 'some' && (
                <div className="mt-3 max-h-44 overflow-y-auto border border-dark-200 rounded-lg divide-y divide-dark-100">
                  {liveTenants.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-dark-50">
                      <input type="checkbox" className="rounded border-dark-300 text-primary" checked={f.tenantIds.includes(t.id)} onChange={(e) => setF({ ...f, tenantIds: e.target.checked ? [...f.tenantIds, t.id] : f.tenantIds.filter((x) => x !== t.id) })} />
                      {t.fullName}<span className="text-dark-400 text-xs">{t.roomNumber ? `Room ${t.roomNumber}` : ''}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="field-label" htmlFor="ic-period">Billing month</label><input id="ic-period" type="month" className="input-field" value={f.billingPeriod} onChange={(e) => setF({ ...f, billingPeriod: e.target.value })} /></div>
              <div><label className="field-label" htmlFor="ic-amount">Amount each (₹)</label><input id="ic-amount" type="number" min={0} className="input-field" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
              <div><label className="field-label" htmlFor="ic-due">Due date</label><input id="ic-due" type="date" className="input-field" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
            </div>
            <div><label className="field-label" htmlFor="ic-desc">Description</label><input id="ic-desc" className="input-field" maxLength={500} placeholder="e.g. Monthly rent" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <label className="flex items-start gap-2 text-sm cursor-pointer"><input type="checkbox" className="mt-0.5 rounded border-dark-300 text-primary" checked={f.issue} onChange={(e) => setF({ ...f, issue: e.target.checked })} /><span>Issue immediately<span className="block text-xs text-dark-400">Tenants see issued invoices and are notified. Untick to save drafts only you can see.</span></span></label>
            {fErr && <p role="alert" className="text-sm text-error">{fErr}</p>}
          </div>
        </Modal>

        <ConfirmDialog open={!!confirm} danger busy={busy} title={confirm === 'delete' ? 'Delete draft?' : 'Cancel invoice?'} confirmLabel={confirm === 'delete' ? 'Delete' : 'Cancel invoice'}
          message={confirm === 'delete' ? <>Draft {selected?.number} will be removed.</> : <>Invoice {selected?.number} will be marked cancelled. The record is kept.</>} onConfirm={confirmRun} onCancel={() => setConfirm(null)} />
      </AppLayout>
    </FeatureGate>
  );
}
