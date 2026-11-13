import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
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

export default function StatCard({ label, value, icon: Icon, trend, hint, color = 'primary' }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-glow transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold text-dark-800 mt-2">{value}</div>
          {hint && <div className="text-xs text-dark-400 mt-1">{hint}</div>}
          {trend && (
            <div className={`text-xs font-medium mt-2 ${trend.positive ? 'text-success' : 'text-error'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
