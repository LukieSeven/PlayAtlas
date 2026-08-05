import React from 'react';

export interface AtlasBadgeProps {
  variant?: 'default' | 'gold' | 'teal' | 'discount' | 'success' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const AtlasBadge: React.FC<AtlasBadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  const variantClasses = {
    default:
      'bg-[var(--atlas-panel-inset-bg)] text-[var(--atlas-ink-primary)] border border-[var(--atlas-border-subtle)]',
    gold:
      'bg-[var(--atlas-gold-subtle)] text-[var(--atlas-gold-dark)] border border-[var(--atlas-gold-antique)] font-semibold',
    teal:
      'bg-[var(--atlas-teal-subtle)] text-[var(--atlas-teal-dark)] border border-[var(--atlas-teal-dark)]/30 font-semibold',
    discount:
      'bg-[var(--atlas-teal-dark)] text-white font-bold border border-[var(--atlas-teal-deep)]',
    success:
      'bg-[var(--atlas-status-success)]/10 text-[var(--atlas-status-success)] border border-[var(--atlas-status-success)]/30',
    danger:
      'bg-[var(--atlas-status-danger)]/10 text-[var(--atlas-status-danger)] border border-[var(--atlas-status-danger)]/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans select-none ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};
