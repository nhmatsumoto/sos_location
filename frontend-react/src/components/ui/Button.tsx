import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  leftIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'border-cyan-500/60 bg-cyan-600 text-white hover:bg-cyan-500',
  secondary: 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700',
  ghost: 'border-slate-700/60 bg-slate-950/30 text-slate-100 hover:bg-slate-900/70',
  danger: 'border-rose-600/60 bg-rose-600 text-white hover:bg-rose-500',
};

export function Button({ variant = 'primary', className = '', leftIcon, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {leftIcon}
      {children}
    </button>
  );
}
