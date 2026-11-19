import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  disableClose?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-lg',
  disableClose = false,
  children,
  footer,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, disableClose, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B111C]/75 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${maxWidthClass} rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-lg bg-[#009F91]/10 dark:bg-[#19C6B4]/10 text-[#009F91] dark:text-[#19C6B4] shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 id="modal-title" className="text-sm font-semibold text-foreground truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {!disableClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-border bg-secondary/30 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
