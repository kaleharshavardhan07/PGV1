import { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Upload, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useToast } from './Toast';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';
import { DOCUMENT_TYPES, type DocumentType, type TenantDocument } from '../types';
import { formatBytes, formatDate } from '../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

interface DocumentPanelProps {
  /** Fixed tenant (tenant's own view, or a tenant's detail screen). Staff can choose one when omitted. */
  tenantId?: string;
  /** Hide the tenant column when the list is already scoped to one tenant. */
  compact?: boolean;
}

export default function DocumentPanel({ tenantId, compact }: DocumentPanelProps) {
  const { data, session, uploadDocument, deleteDocument, openDocument } = useAppStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const isTenant = data.activeRole === 'tenant';
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>('ID Proof');
  const [title, setTitle] = useState('');
  const [chosenTenant, setChosenTenant] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<TenantDocument | null>(null);

  const targetTenant = tenantId ?? chosenTenant;
  const visible = data.documents.filter((d) => (tenantId ? d.tenantId === tenantId : filterTenant ? d.tenantId === filterTenant : true));
  const selectableTenants = data.tenants.filter((t) => t.status !== 'Left');

  const pickFile = (f: File | null) => {
    setError('');
    if (f && f.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(f.size)}. The limit is 5 MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return setFile(null);
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) return setError('Choose a file to upload');
    if (!isTenant && !targetTenant) return setError('Select the tenant this document belongs to');
    setBusy(true);
    setError('');
    const form = new FormData();
    if (!isTenant) form.append('tenantId', targetTenant);
    form.append('type', type);
    form.append('title', title.trim());
    form.append('file', file);
    const res = await uploadDocument(form);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.show('Document uploaded', 'success');
    setFile(null);
    setTitle('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    const res = await deleteDocument(toDelete.id);
    setBusy(false);
    setToDelete(null);
    toast.show(res.ok ? 'Document deleted' : res.error, res.ok ? 'success' : 'error');
  };

  const view = async (d: TenantDocument, download = false) => {
    const res = await openDocument(d.id, download);
    if (!res.ok) toast.show(res.error, 'error');
  };

  const canDelete = (d: TenantDocument) => !isTenant || d.uploadedById === session?.user.id;

  return (
    <div className="space-y-5">
      {/* Upload */}
      <div className="card p-5">
        <h3 className="font-semibold text-dark-900 mb-4 flex items-center gap-2"><Upload size={17} className="text-primary" /> Upload a document</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {!isTenant && !tenantId && (
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="doc-tenant">Tenant</label>
              <select id="doc-tenant" className="input-field" value={chosenTenant} onChange={(e) => setChosenTenant(e.target.value)}>
                <option value="">Select a tenant…</option>
                {selectableTenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}{t.roomNumber ? ` — Room ${t.roomNumber}` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="doc-type">Document type</label>
            <select id="doc-type" className="input-field" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="doc-title">Title <span className="text-dark-400 font-normal">(optional)</span></label>
            <input id="doc-title" className="input-field" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Aadhaar card" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="doc-file">File</label>
            <input
              id="doc-file"
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-dark-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium hover:file:bg-primary-100 border border-dark-200 rounded-lg bg-white"
            />
            <p className="text-xs text-dark-400 mt-1.5">PDF, JPG, PNG or WebP · up to 5 MB</p>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-error mt-3">{error}</p>}
        <div className="mt-4 flex justify-end">
          <button className="btn-primary" onClick={submit} disabled={busy || !file}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload</>}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-dark-900">{visible.length} document{visible.length === 1 ? '' : 's'}</h3>
          {!isTenant && !tenantId && (
            <select aria-label="Filter by tenant" className="input-field !w-auto !py-1.5" value={filterTenant} onChange={(e) => setFilterTenant(e.target.value)}>
              <option value="">All tenants</option>
              {data.tenants.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
          )}
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={FileText} title="No documents yet" description="Uploaded ID proofs, agreements and photos will appear here." />
        ) : (
          <ul className="divide-y divide-dark-100">
            {visible.map((d) => {
              const Icon = d.mimeType.startsWith('image/') ? ImageIcon : FileText;
              return (
                <li key={d.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0"><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-dark-900 truncate">{d.title || d.fileName}</div>
                    <div className="text-xs text-dark-500 truncate">
                      <span className="badge bg-dark-100 text-dark-600 mr-1.5">{d.type}</span>
                      {!compact && !isTenant && !tenantId && <>{d.tenantName} · </>}
                      {formatBytes(d.size)} · {formatDate(d.createdAt)} · by {d.uploadedByRole === 'tenant' ? 'tenant' : d.uploadedByName || d.uploadedByRole}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button className="btn-ghost !px-2" aria-label={`View ${d.fileName}`} title="View" onClick={() => view(d)}><Eye size={16} /></button>
                    <button className="btn-ghost !px-2" aria-label={`Download ${d.fileName}`} title="Download" onClick={() => view(d, true)}><Download size={16} /></button>
                    {canDelete(d) && (
                      <button className="btn-ghost !px-2 text-error hover:!bg-error-light" aria-label={`Delete ${d.fileName}`} title="Delete" onClick={() => setToDelete(d)}><Trash2 size={16} /></button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        danger
        busy={busy}
        title="Delete document?"
        message={<>“{toDelete?.title || toDelete?.fileName}” will be permanently removed.</>}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
