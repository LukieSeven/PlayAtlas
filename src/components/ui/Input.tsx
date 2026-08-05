import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ icon, className, ...props }) => {
  return (
    <div className="relative flex items-center w-full">
      {icon && (
        <span className="absolute left-3.5 text-[#8C6D37] pointer-events-none">
          {icon}
        </span>
      )}
      <input
        className={twMerge(
          clsx(
            'w-full bg-[#FFFFFF] text-[#0C1D2D] placeholder-[#718294] rounded-xl border border-[#D9C8A9] text-sm py-2.5 transition-all duration-200 focus:outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/40',
            icon ? 'pl-10 pr-4' : 'px-4',
            className
          )
        )}
        {...props}
      />
    </div>
  );
};
