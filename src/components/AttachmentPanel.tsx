import { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Upload, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import type { DocumentType, TenantDocument } from '../types';
import { formatBytes, formatDate } from '../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

/** Receipts / proofs attached to one expense or one invoice. */
export default function AttachmentPanel({ expenseId, invoiceId, canUpload, uploadLabel = 'Upload receipt', type = 'Receipt' }: {
  expenseId?: string; invoiceId?: string; canUpload: boolean; uploadLabel?: string; type?: DocumentType;
}) {
  const { data, session, uploadDocument, deleteDocument, openDocument } = useAppStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState<TenantDocument | null>(null);

  const docs = data.documents.filter((d) => (expenseId ? d.expenseId === expenseId : d.invoiceId === invoiceId));
  const isTenant = data.activeRole === 'tenant';

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) return setError(`That file is ${formatBytes(file.size)}. The limit is 5 MB.`);
    const form = new FormData();
    if (expenseId) form.append('expenseId', expenseId);
    if (invoiceId) form.append('invoiceId', invoiceId);
    form.append('type', type);
    form.append('title', file.name.replace(/\.[^.]+$/, '').slice(0, 100));
    form.append('file', file);
    setBusy(true);
    const res = await uploadDocument(form);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
    if (!res.ok) return setError(res.error);
    toast.show('Uploaded', 'success');
  };

  const canDelete = (d: TenantDocument) => !isTenant || d.uploadedById === session?.user.id;

  return (
    <div>
      {docs.length === 0 ? (
        <p className="text-sm text-dark-500">No receipts or documents attached yet.</p>
      ) : (
        <ul className="divide-y divide-dark-100 border border-dark-200 rounded-lg">
          {docs.map((d) => {
            const Icon = d.mimeType.startsWith('image/') ? ImageIcon : FileText;
            return (
              <li key={d.id} className="px-3 py-2.5 flex items-center gap-3">
                <Icon size={18} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-dark-800 truncate">{d.title || d.fileName}</div>
                  <div className="text-xs text-dark-500">{formatBytes(d.size)} · {formatDate(d.createdAt)} · {d.uploadedByRole === 'tenant' ? `by ${d.tenantName ?? 'tenant'}` : `by ${d.uploadedByName || d.uploadedByRole}`}</div>
                </div>
                <button className="btn-ghost !px-2" aria-label={`View ${d.fileName}`} onClick={() => openDocument(d.id)}><Eye size={15} /></button>
                <button className="btn-ghost !px-2" aria-label={`Download ${d.fileName}`} onClick={() => openDocument(d.id, true)}><Download size={15} /></button>
                {canDelete(d) && <button className="btn-ghost !px-2 text-error hover:!bg-error-light" aria-label={`Delete ${d.fileName}`} onClick={() => setToDelete(d)}><Trash2 size={15} /></button>}
              </li>
            );
          })}
        </ul>
      )}
      {canUpload && (
        <div className="mt-3">
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} aria-label={uploadLabel} />
          <button className="btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> {uploadLabel}</>}
          </button>
          <span className="text-xs text-dark-400 ml-2">PDF, JPG, PNG or WebP · up to 5 MB</span>
          {error && <p role="alert" className="text-sm text-error mt-2">{error}</p>}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete} danger busy={busy} title="Delete file?" confirmLabel="Delete"
        message={<>“{toDelete?.title || toDelete?.fileName}” will be permanently removed.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (!toDelete) return; setBusy(true); const r = await deleteDocument(toDelete.id); setBusy(false); setToDelete(null); toast.show(r.ok ? 'Deleted' : r.error, r.ok ? 'success' : 'error'); }}
      />
    </div>
  );
}
