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
          'atlas-surface-raised rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden bg-[#FDFBF7] text-[#0C1D2D] border border-[#D9C8A9]',
          className
        )
      )}
    >
      {children}
    </div>
  );
};
