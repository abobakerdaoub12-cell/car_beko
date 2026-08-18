import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'accent' | 'secondary';
  sub?: string;
  trend?: 'up' | 'down';
}

const tones: Record<string, { bg: string; ring: string; iconBg: string; iconText: string }> = {
  primary: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-primary-50', iconText: 'text-primary-600' },
  success: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-success-50', iconText: 'text-success-600' },
  warning: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-warning-50', iconText: 'text-warning-600' },
  error: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-error-50', iconText: 'text-error-600' },
  accent: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-accent-50', iconText: 'text-accent-600' },
  secondary: { bg: 'bg-white', ring: 'ring-secondary-100', iconBg: 'bg-secondary-100', iconText: 'text-secondary-600' },
};

export function StatCard({ label, value, icon, tone = 'primary', sub, trend }: StatCardProps) {
  const t = tones[tone];
  return (
    <div className={`rounded-2xl ${t.bg} p-4 ring-1 ${t.ring} shadow-sm transition-all hover:shadow-md animate-slide-up`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-secondary-500 font-medium truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-secondary-900 tabular-nums truncate">{value}</p>
          {sub && (
            <p className="mt-0.5 text-xs text-secondary-400 flex items-center gap-1">
              {trend === 'up' && <TrendingUp className="w-3 h-3 text-success-500" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 text-error-500" />}
              {sub}
            </p>
          )}
        </div>
        <div className={`shrink-0 w-10 h-10 rounded-xl ${t.iconBg} flex items-center justify-center ${t.iconText}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
