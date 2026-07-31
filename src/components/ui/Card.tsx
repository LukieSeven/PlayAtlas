import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glass?: boolean;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  glass = true,
  glow = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl p-5 overflow-hidden border transition-all duration-300',
          glass ? 'glass-card' : 'bg-slate-900 border-slate-800',
          interactive && 'glass-card-hover cursor-pointer',
          glow && 'neon-glow-indigo',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
