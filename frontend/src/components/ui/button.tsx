import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive';
type Size = 'sm' | 'default' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  default: 'bg-amber-600 text-white hover:bg-amber-700',
  secondary: 'bg-amber-100 text-amber-900 hover:bg-amber-200',
  ghost: 'text-slate-600 hover:bg-slate-100',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-8 w-8',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
