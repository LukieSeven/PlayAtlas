import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-xl active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#0B2B3C] hover:bg-[#0F4C5C] text-white border border-[#C5A059] shadow-xs cursor-pointer font-bold',
    secondary: 'bg-[#FDFBF7] hover:bg-[#EFE8D8] text-[#0C1D2D] border border-[#D9C8A9] hover:border-[#C5A059] shadow-xs cursor-pointer font-bold',
    outline: 'bg-transparent text-[#0C1D2D] border border-[#D9C8A9] hover:bg-[#EFE8D8] hover:border-[#C5A059] cursor-pointer font-bold',
    ghost: 'bg-transparent text-[#213547] hover:text-[#0C1D2D] hover:bg-[#EFE8D8] cursor-pointer font-bold',
    danger: 'bg-[#991B1B] hover:bg-rose-800 text-white shadow-xs cursor-pointer font-bold',
    glow: 'bg-[#0B2B3C] hover:bg-[#0F4C5C] text-white border border-[#C5A059] shadow-md cursor-pointer font-bold',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
