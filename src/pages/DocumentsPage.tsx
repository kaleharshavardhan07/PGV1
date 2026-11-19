import AppLayout from '../components/AppLayout';
import DocumentPanel from '../components/DocumentPanel';
import type { UserRole } from '../types';

export default function DocumentsPage({ role }: { role: UserRole }) {
  const tenant = role === 'tenant';
  return (
    <AppLayout
      role={role}
      title={tenant ? 'My Documents' : 'Documents'}
      subtitle={tenant ? 'Upload and keep your ID proof, photo and agreement in one place.' : 'ID proofs, agreements and photos for every tenant.'}
    >
      <DocumentPanel />
    </AppLayout>
  );
}
