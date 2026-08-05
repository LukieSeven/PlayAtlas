import React from 'react';

export interface AtlasInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const AtlasInput: React.FC<AtlasInputProps> = ({
  icon,
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-[var(--atlas-ink-secondary)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-[var(--atlas-gold-antique)] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#FFFFFF] border border-[var(--atlas-border-panel)] text-[var(--atlas-ink-primary)] placeholder-[var(--atlas-ink-subdued)] text-sm rounded-lg py-2 ${
            icon ? 'pl-9 pr-3' : 'px-3'
          } focus:outline-none focus:border-[var(--atlas-gold-antique)] focus:ring-2 focus:ring-[var(--atlas-focus-ring)] transition-all ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-[var(--atlas-status-danger)]">{error}</span>}
    </div>
  );
};
