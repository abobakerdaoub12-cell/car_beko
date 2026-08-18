import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type BtnSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<BtnVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary: 'bg-white text-secondary-700 ring-1 ring-secondary-200 hover:bg-secondary-50 shadow-sm',
  ghost: 'text-secondary-600 hover:bg-secondary-100',
  danger: 'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 shadow-sm',
  success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm',
  warning: 'bg-warning-600 text-white hover:bg-warning-700 active:bg-warning-800 shadow-sm',
};

const sizes: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', icon, fullWidth, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({ label, error, hint, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5 text-right">
      {label && <label className="block text-xs font-semibold text-secondary-700">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute inset-y-0 right-3 flex items-center text-secondary-400 pointer-events-none">{icon}</span>}
        <input
          className={`w-full rounded-xl bg-white border border-secondary-200 px-3.5 py-2.5 text-sm text-secondary-900 placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${icon ? 'pr-10' : ''} ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-secondary-400">{hint}</p>}
      {error && <p className="text-xs text-error-600 font-medium">{error}</p>}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5 text-right">
      {label && <label className="block text-xs font-semibold text-secondary-700">{label}</label>}
      <select
        className={`w-full rounded-xl bg-white border border-secondary-200 px-3.5 py-2.5 text-sm text-secondary-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error-600 font-medium">{error}</p>}
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-secondary-200 p-8 text-center bg-white/50 animate-fade-in">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary-100 flex items-center justify-center text-secondary-500 mb-3">
        {icon}
      </div>
      <h4 className="text-base font-bold text-secondary-800 mb-1">{title}</h4>
      {description && <p className="text-sm text-secondary-500 max-w-sm mx-auto mb-4">{description}</p>}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
