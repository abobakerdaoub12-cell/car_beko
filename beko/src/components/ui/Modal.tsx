import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-secondary-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${sizeClass} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col animate-slide-up`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-secondary-100 shrink-0">
          <h3 className="text-lg font-bold text-secondary-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto scrollbar-thin flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-secondary-100 bg-secondary-50/50 rounded-b-2xl shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
