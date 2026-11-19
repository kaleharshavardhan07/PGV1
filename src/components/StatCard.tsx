import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'secondary';
}

const colorMap = {
  primary: 'bg-primary-50 text-primary',
  secondary: 'bg-secondary-50 text-secondary-600',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
};

export default function StatCard({ label, value, icon: Icon, hint, color = 'primary' }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-dark-500">{label}</div>
          <div className="text-2xl font-bold text-dark-900 mt-1.5 tracking-tight">{value}</div>
          {hint && <div className="text-xs text-dark-400 mt-1">{hint}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}
