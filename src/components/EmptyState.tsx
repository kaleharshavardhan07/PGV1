import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-12 h-12 rounded-xl bg-dark-100 text-dark-400 flex items-center justify-center mx-auto mb-3">
        <Icon size={22} />
      </div>
      <div className="font-semibold text-dark-800 mb-1">{title}</div>
      {description && <div className="text-sm text-dark-500 max-w-sm mx-auto">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
