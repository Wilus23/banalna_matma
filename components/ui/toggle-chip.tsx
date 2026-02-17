import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ToggleChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

export const ToggleChip = ({ active, className, children, ...props }: ToggleChipProps) => {
  return (
    <button
      type="button"
      className={cn(
        'rounded-xl border px-4 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
        active
          ? 'border-cyan-200/70 bg-cyan-300/20 text-cyan-50 shadow-[0_0_0_1px_rgba(155,240,255,0.35)]'
          : 'border-slate-500/40 bg-slate-900/60 text-slate-200 hover:bg-slate-800/70',
        className
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
};
