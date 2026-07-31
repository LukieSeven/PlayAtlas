import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const GlassContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden',
          className
        )
      )}
    >
      {children}
    </div>
  );
};
