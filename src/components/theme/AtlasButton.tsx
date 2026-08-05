import React from 'react';

export interface AtlasButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const AtlasButton: React.FC<AtlasButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--atlas-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--atlas-teal-deep)] hover:bg-[var(--atlas-teal-dark)] text-white border border-[var(--atlas-gold-antique)] shadow-sm hover:shadow',
    secondary:
      'bg-[var(--atlas-panel-bg)] hover:bg-[var(--atlas-panel-inset-bg)] text-[var(--atlas-ink-primary)] border border-[var(--atlas-border-panel)] hover:border-[var(--atlas-border-gold)]',
    ghost:
      'bg-transparent hover:bg-[var(--atlas-gold-subtle)] text-[var(--atlas-ink-primary)] hover:text-[var(--atlas-teal-deep)]',
    gold:
      'bg-gradient-to-r from-[var(--atlas-gold-antique)] to-[var(--atlas-gold-dark)] hover:opacity-90 text-[var(--atlas-teal-deep)] font-bold border border-[var(--atlas-gold-light)] shadow-sm',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
