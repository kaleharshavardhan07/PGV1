import { useMemo, useState } from 'react';
import { Plus, Search, Wallet, Pencil, Trash2, Paperclip, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FeatureGate from '../components/FeatureGate';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';
import AttachmentPanel from '../components/AttachmentPanel';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../types';
import { formatDate, formatINR, todayISO } from '../utils/format';

interface Form {
  title: string; description: string; amount: string; expenseDate: string; category: ExpenseCategory;
  status: 'Pending' | 'Settled'; visibleToTenants: boolean; proofRequired: boolean;
}
const blank = (): Form => ({ title: '', description: '', amount: '', expenseDate: todayISO(), category: 'Maintenance', status: 'Pending', visibleToTenants: true, proofRequired: false });

const StatusBadge = ({ s }: { s: Expense['status'] }) => (
  <span className={`badge ${s === 'Settled' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>{s}</span>
);

/** Miscellaneous expenses. Staff post and manage them; tenants see shared ones and upload proof when asked. */
export default function ExpensesPage({ role }: { role: 'owner' | 'manager' | 'tenant' }) {
  const { data, addExpense, updateExpense, deleteExpense } = useAppStore();
  const toast = useToast();
  const isStaff = role !== 'tenant';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [formOpen, setFormOpen] = useState<{ expense: Expense | null } | null>(null);
  const [form, setForm] = useState<Form>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = data.expenses.find((e) => e.id === selectedId) ?? null;
  const rows = useMemo(
    () => data.expenses.filter((e) => (!status || e.status === status) && (!category || e.category === category) && (!search || `${e.title} ${e.description}`.toLowerCase().includes(search.toLowerCase()))),
    [data.expenses, status, category, search]
  );
  const pending = data.expenses.filter((e) => e.status === 'Pending');
  const monthKey = todayISO().slice(0, 7);
  const monthTotal = data.expenses.filter((e) => e.expenseDate.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);

  const openForm = (expense: Expense | null) => {
    setErrors({}); setFormError('');
    setForm(expense ? { title: expense.title, description: expense.description, amount: String(expense.amount), expenseDate: expense.expenseDate, category: expense.category, status: expense.status, visibleToTenants: expense.visibleToTenants, proofRequired: expense.proofRequired } : blank());
    setFormOpen({ expense });
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 2) e.title = 'Enter a title';
    if (form.amount === '' || Number(form.amount) < 0) e.amount = 'Enter the amount';
    if (!form.expenseDate) e.expenseDate = 'Choose a date';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...form, title: form.title.trim(), description: form.description.trim(), amount: Number(form.amount) };
    const res = formOpen?.expense ? await updateExpense(formOpen.expense.id, body) : await addExpense(body);
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    toast.show(formOpen?.expense ? 'Expense updated' : 'Expense posted', 'success');
    setFormOpen(null);
  };

  const toggleSettled = async (x: Expense) => {
    const res = await updateExpense(x.id, { status: x.status === 'Pending' ? 'Settled' : 'Pending' });
    if (!res.ok) toast.show(res.error, 'error');
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    const res = await deleteExpense(selected.id);
    setBusy(false);
    setConfirmDel(false);
    if (res.ok) { toast.show('Expense deleted', 'success'); setSelectedId(null); } else toast.show(res.error, 'error');
  };

  const input = (id: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`x-${id}`}>{label}</label>
      <input id={`x-${id}`} className={`input-field ${errors[id] ? '!border-error' : ''}`} value={String(form[id])} onChange={(e) => setForm({ ...form, [id]: e.target.value })} {...props} />
      {errors[id] && <p className="text-xs text-error mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <FeatureGate role={role} feature="expenses" permission="expenses" title="Expenses">
      <AppLayout
        role={role}
        title="Expenses"
        subtitle={isStaff ? 'Track what the PG spends. Share expenses with tenants and ask for receipts when needed.' : 'Expenses your PG has shared with you.'}
        actions={isStaff && <button className="btn-primary" onClick={() => openForm(null)}><Plus size={16} /> Post expense</button>}
      >
        {isStaff && (
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="This month" value={formatINR(monthTotal)} icon={Wallet} />
            <StatCard label="Pending" value={pending.length} icon={Clock} color="warning" hint={formatINR(pending.reduce((s, e) => s + e.amount, 0))} />
            <StatCard label="Settled" value={data.expenses.length - pending.length} icon={CheckCircle2} color="success" />
          </div>
        )}

        <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input className="input-field !pl-9" placeholder="Search expenses…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search expenses" />
          </div>
          <select className="input-field !w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option value="">All categories</option>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="input-field !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option>Pending</option><option>Settled</option></select>
        </div>

        <div className="card overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title={data.expenses.length ? 'No expenses match' : 'No expenses yet'} description={data.expenses.length ? undefined : isStaff ? 'Post the first expense to start keeping records.' : 'Nothing has been shared with you yet.'} action={isStaff && !data.expenses.length ? <button className="btn-primary" onClick={() => openForm(null)}><Plus size={16} /> Post expense</button> : undefined} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-dark-50 border-b border-dark-200"><tr>{['Date', 'Title', 'Category', 'Amount', 'Status', ''].map((h) => <th key={h} className="table-head px-5 py-3 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-dark-100">
                  {rows.map((x) => (
                    <tr key={x.id} className="hover:bg-dark-50 cursor-pointer" onClick={() => setSelectedId(x.id)}>
                      <td className="px-5 py-3.5 whitespace-nowrap text-dark-600">{formatDate(x.expenseDate)}</td>
                      <td className="px-5 py-3.5">
                        <button className="text-left font-medium text-dark-900" onClick={(e) => { e.stopPropagation(); setSelectedId(x.id); }}>{x.title}</button>
                        <div className="text-xs text-dark-500 flex items-center gap-2 mt-0.5">
                          {x.documentCount > 0 && <span className="inline-flex items-center gap-1"><Paperclip size={12} />{x.documentCount}</span>}
                          {x.proofRequired && <span className="badge bg-primary-50 text-primary-700">Proof requested</span>}
                          {isStaff && !x.visibleToTenants && <span className="inline-flex items-center gap-1"><EyeOff size={12} /> Staff only</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">{x.category}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium">{formatINR(x.amount)}</td>
                      <td className="px-5 py-3.5"><StatusBadge s={x.status} /></td>
                      <td className="px-5 py-3.5 text-right text-dark-400">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail */}
        <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.title ?? ''} size="lg"
          footer={selected && isStaff ? (
            <>
              <button className="btn-secondary text-error" onClick={() => setConfirmDel(true)}><Trash2 size={15} /> Delete</button>
              <button className="btn-secondary" onClick={() => { const x = selected; setSelectedId(null); openForm(x); }}><Pencil size={15} /> Edit</button>
              <button className="btn-primary" onClick={() => toggleSettled(selected)}>{selected.status === 'Pending' ? 'Mark settled' : 'Mark pending'}</button>
            </>
          ) : undefined}>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge s={selected.status} /><span className="badge bg-dark-100 text-dark-600">{selected.category}</span>{isStaff && <span className="badge bg-dark-100 text-dark-600 inline-flex items-center gap-1">{selected.visibleToTenants ? <><Eye size={12} /> Shared with tenants</> : <><EyeOff size={12} /> Staff only</>}</span>}</div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-dark-500">Amount</dt><dd className="text-xl font-bold text-dark-900 mt-0.5">{formatINR(selected.amount)}</dd></div>
                <div><dt className="text-dark-500">Date</dt><dd className="font-medium mt-1">{formatDate(selected.expenseDate)}</dd></div>
              </dl>
              {selected.description && <p className="text-sm text-dark-700 whitespace-pre-line">{selected.description}</p>}
              <section>
                <h4 className="font-semibold text-dark-900 mb-2">Receipts & proofs</h4>
                {selected.proofRequired && !isStaff && <p className="text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2 mb-3">The PG has asked for your receipt or proof for this expense.</p>}
                <AttachmentPanel expenseId={selected.id} canUpload={isStaff || selected.proofRequired} uploadLabel={isStaff ? 'Attach receipt' : 'Upload my proof'} />
              </section>
            </div>
          )}
        </Modal>

        {/* Create / edit */}
        <Modal open={!!formOpen} onClose={() => setFormOpen(null)} title={formOpen?.expense ? 'Edit expense' : 'Post expense'} size="lg"
          footer={<><button className="btn-secondary" onClick={() => setFormOpen(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save expense'}</button></>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">{input('title', 'Title', { autoFocus: true, maxLength: 150 })}</div>
            {input('amount', 'Amount (₹)', { type: 'number', min: 0 })}
            {input('expenseDate', 'Date', { type: 'date' })}
            <div>
              <label className="field-label" htmlFor="x-category">Category</label>
              <select id="x-category" className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="field-label" htmlFor="x-status">Status</label>
              <select id="x-status" className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'] })}><option>Pending</option><option>Settled</option></select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="x-description">Description <span className="text-dark-400 font-normal">(optional)</span></label>
              <textarea id="x-description" rows={3} className="input-field resize-none" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="flex items-start gap-2 text-sm text-dark-700 cursor-pointer"><input type="checkbox" className="mt-0.5 rounded border-dark-300 text-primary" checked={form.visibleToTenants} onChange={(e) => setForm({ ...form, visibleToTenants: e.target.checked })} /><span>Show to tenants<span className="block text-xs text-dark-400">Tenants can see the details and receipts.</span></span></label>
            <label className="flex items-start gap-2 text-sm text-dark-700 cursor-pointer"><input type="checkbox" className="mt-0.5 rounded border-dark-300 text-primary" checked={form.proofRequired} onChange={(e) => setForm({ ...form, proofRequired: e.target.checked })} /><span>Ask tenants for a receipt / proof<span className="block text-xs text-dark-400">Lets tenants upload a file against this expense.</span></span></label>
          </div>
          <p className="text-xs text-dark-400 mt-4">You can attach your own receipt after saving, from the expense’s detail view.</p>
          {formError && <p role="alert" className="text-sm text-error mt-3">{formError}</p>}
        </Modal>

        <ConfirmDialog open={confirmDel} danger busy={busy} title="Delete expense?" confirmLabel="Delete" message={<>“{selected?.title}” and all its receipts will be permanently removed.</>} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      </AppLayout>
    </FeatureGate>
  );
}
