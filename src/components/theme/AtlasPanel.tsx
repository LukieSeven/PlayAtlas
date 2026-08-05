import React from 'react';

export interface AtlasPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'raised' | 'inset' | 'featured';
  cornerOrnaments?: boolean;
  children?: React.ReactNode;
}

export const AtlasPanel: React.FC<AtlasPanelProps> = ({
  variant = 'standard',
  cornerOrnaments = false,
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    standard: 'atlas-surface-standard p-5',
    raised: 'atlas-surface-raised p-6',
    inset: 'atlas-surface-inset p-4',
    featured: 'atlas-surface-featured p-6 relative',
  }[variant];

  return (
    <div className={`${variantClasses} ${className}`} {...props}>
      {cornerOrnaments && (
        <>
          <span className="absolute top-2 left-2 w-4 h-4 text-[var(--atlas-gold-antique)] opacity-60 pointer-events-none aria-hidden">
            ✦
          </span>
          <span className="absolute top-2 right-2 w-4 h-4 text-[var(--atlas-gold-antique)] opacity-60 pointer-events-none aria-hidden">
            ✦
          </span>
        </>
      )}
      {children}
    </div>
  );
};
