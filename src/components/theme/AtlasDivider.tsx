import React from 'react';

export interface AtlasDividerProps {
  className?: string;
  variant?: 'simple' | 'ornamental';
}

export const AtlasDivider: React.FC<AtlasDividerProps> = ({
  className = '',
  variant = 'ornamental',
}) => {
  if (variant === 'simple') {
    return <hr className={`border-t border-[var(--atlas-border-subtle)] my-4 ${className}`} />;
  }

  return (
    <div className={`flex items-center justify-center my-6 ${className}`} aria-hidden="true">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[var(--atlas-border-gold)] to-transparent opacity-60" />
      <span className="px-3 text-[var(--atlas-gold-antique)] text-xs select-none">
        ✦ ✦ ✦
      </span>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[var(--atlas-border-gold)] to-transparent opacity-60" />
    </div>
  );
};
