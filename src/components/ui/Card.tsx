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
          'p-5 overflow-hidden transition-all duration-300 themed-card',
          interactive && 'themed-card-hover cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
