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
    indigo: 'bg-[#0B2B3C]/10 text-[#0B2B3C] border-[#0B2B3C]/30 font-bold',
    cyan: 'bg-teal-500/15 text-teal-900 border-teal-500/30 font-bold',
    emerald: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/30 font-bold',
    amber: 'bg-[#C5A059]/20 text-[#8C6D37] border-[#C5A059]/40 font-bold',
    rose: 'bg-rose-500/15 text-rose-900 border-rose-500/30 font-bold',
    purple: 'bg-purple-500/15 text-purple-900 border-purple-500/30 font-bold',
    slate: 'bg-[#EFE8D8] text-[#213547] border-[#D9C8A9] font-bold',
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
