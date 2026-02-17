import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseClass =
  'inline-flex items-center justify-center rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-40';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-cyan-300 text-slate-950 shadow-[0_10px_35px_rgba(84,220,255,0.35)] hover:bg-cyan-200 active:bg-cyan-100',
  secondary:
    'bg-slate-800/70 text-slate-100 border border-slate-500/40 hover:bg-slate-700/70 active:bg-slate-700/90',
  ghost: 'bg-transparent text-cyan-100 hover:bg-cyan-400/10 active:bg-cyan-400/20',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-6 text-lg'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(baseClass, variantClasses[variant], sizeClasses[size], className)}
      ref={ref}
      {...props}
    />
  );
});
