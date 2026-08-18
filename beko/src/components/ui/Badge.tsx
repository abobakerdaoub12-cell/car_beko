import type { ReactNode } from 'react';

type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'accent' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}

const toneStyles: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  secondary: 'bg-secondary-100 text-secondary-700 ring-secondary-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  error: 'bg-error-50 text-error-700 ring-error-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  neutral: 'bg-secondary-50 text-secondary-600 ring-secondary-200',
};

export function Badge({ children, tone = 'neutral', icon }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneStyles[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
