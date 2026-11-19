import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Users, DoorOpen, BarChart3, Wallet, Receipt } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FeatureGate from '../components/FeatureGate';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import { downloadExport } from '../api/endpoints';

const DATASETS = [
  { id: 'tenants', title: 'Tenant details', text: 'Contact details, room, rent, deposit, verification and status.', icon: Users },
  { id: 'rooms', title: 'Rooms & beds', text: 'Every bed with its room, rent, status and current tenant.', icon: DoorOpen },
  { id: 'occupancy', title: 'Occupancy', text: 'Beds occupied, vacant and unavailable per room.', icon: BarChart3 },
  { id: 'expenses', title: 'Expenses', text: 'All expenses with category, amount and status.', icon: Wallet, needs: 'expenses' as const },
  { id: 'invoices', title: 'Invoices & billing', text: 'Invoices with period, amount, due date and paid status.', icon: Receipt, needs: 'billing' as const },
];

/** Download PG data as CSV or Excel. The API scopes every export to your own PG and permissions. */
export default function ExportsPage({ role }: { role: 'owner' | 'manager' }) {
  const { data } = useAppStore();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const allowed = (d: (typeof DATASETS)[number]) => !d.needs || (data.features[d.needs] && (role === 'owner' || data.permissions[d.needs]));

  const run = async (id: string, format: 'csv' | 'xlsx') => {
    setBusy(`${id}-${format}`);
    try {
      await downloadExport(id, format);
      toast.show(`${format.toUpperCase()} downloaded`, 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <FeatureGate role={role} feature="exports" permission="exports" title="Export data">
      <AppLayout role={role} title="Export data" subtitle="Download your PG’s records as CSV or Excel.">
        <div className="grid md:grid-cols-2 gap-4">
          {DATASETS.filter(allowed).map(({ id, title, text, icon: Icon }) => (
            <section key={id} className="card p-5 flex flex-col gap-4" aria-label={title}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0"><Icon size={19} /></div>
                <div><h3 className="font-semibold text-dark-900">{title}</h3><p className="text-sm text-dark-500 mt-0.5">{text}</p></div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" disabled={busy !== null} onClick={() => run(id, 'csv')}><FileText size={15} /> {busy === `${id}-csv` ? 'Preparing…' : 'CSV'}</button>
                <button className="btn-primary flex-1" disabled={busy !== null} onClick={() => run(id, 'xlsx')}><FileSpreadsheet size={15} /> {busy === `${id}-xlsx` ? 'Preparing…' : 'Excel'}</button>
              </div>
            </section>
          ))}
        </div>
        <p className="text-xs text-dark-400 mt-5 flex items-center gap-1.5"><Download size={12} /> Exports contain personal data. Share them carefully.</p>
      </AppLayout>
    </FeatureGate>
  );
}
