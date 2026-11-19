import { Lock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { Feature, Permission } from '../types';
import AppLayout from './AppLayout';
import EmptyState from './EmptyState';
import type { UserRole } from '../types';

/**
 * Wraps a page so a switched-off module (or an ungranted permission) shows a clear message
 * instead of a broken screen. The API enforces the same rules, so this is a courtesy.
 */
export default function FeatureGate({ role, feature, permission, title, children }: {
  role: UserRole; feature?: Feature; permission?: Permission; title: string; children: React.ReactNode;
}) {
  const { data } = useAppStore();
  const featureOff = feature && data.features[feature] === false;
  const noPermission = permission && role === 'manager' && !data.permissions[permission];
  if (!featureOff && !noPermission) return <>{children}</>;
  return (
    <AppLayout role={role} title={title}>
      <div className="card">
        <EmptyState
          icon={Lock}
          title={featureOff ? 'This feature is turned off' : 'You don’t have access to this'}
          description={featureOff ? 'It has been disabled for this PG. The owner or platform admin can turn it on.' : 'Ask the PG owner to grant you this permission.'}
        />
      </div>
    </AppLayout>
  );
}
