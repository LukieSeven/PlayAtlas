import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'indigo',
  children,
  className,
  ...props
}) => {
  const variantStyles = {
    indigo: 'themed-badge',
    cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    amber: 'gold-badge',
    rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    slate: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
