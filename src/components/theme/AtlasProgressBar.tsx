import React from 'react';

export interface AtlasProgressBarProps {
  value: number; // 0..100
  max?: number;
  label?: string;
  valueText?: string;
  className?: string;
}

export const AtlasProgressBar: React.FC<AtlasProgressBarProps> = ({
  value,
  max = 100,
  label,
  valueText,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={`flex flex-col gap-1 w-full font-sans ${className}`}>
      {(label || valueText) && (
        <div className="flex justify-between items-center text-xs text-[var(--atlas-ink-muted)]">
          {label && <span>{label}</span>}
          {valueText ? <span>{valueText}</span> : <span>{percentage}%</span>}
        </div>
      )}
      <div className="h-2 w-full bg-[var(--atlas-panel-inset-bg)] border border-[var(--atlas-border-subtle)] rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-[var(--atlas-teal-dark)] to-[var(--atlas-teal-light)] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
