'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function SlideOver({
  open, onClose, title, subtitle, children, footer, width = 'w-[440px]',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <div className={cn('fixed inset-0 z-40 transition-all', open ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-ink-900/30 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute right-0 top-0 h-full bg-white shadow-xl border-l border-ink-200 flex flex-col transition-transform',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="px-5 py-4 border-b border-ink-200 flex items-start justify-between">
          <div>
            <div className="text-base font-semibold text-ink-900">{title}</div>
            {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900" aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-ink-200 px-5 py-3 bg-white">{footer}</div>}
      </div>
    </div>
  );
}
