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
        <span className="absolute left-3.5 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        className={twMerge(
          clsx(
            'w-full bg-slate-900/80 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 text-sm py-2.5 transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40',
            icon ? 'pl-10 pr-4' : 'px-4',
            className
          )
        )}
        {...props}
      />
    </div>
  );
};
