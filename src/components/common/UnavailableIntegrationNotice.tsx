import React from 'react';
import { Card } from '../ui/Card';
import { Tag } from 'lucide-react';

interface UnavailableIntegrationNoticeProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  futureRequirement?: string;
  className?: string;
}

export const UnavailableIntegrationNotice: React.FC<UnavailableIntegrationNoticeProps> = ({
  title,
  description,
  icon,
  futureRequirement,
  className = '',
}) => {
  return (
    <Card glass className={`p-8 text-center space-y-4 max-w-xl mx-auto border-dashed border-[var(--panel-border)] themed-panel ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[var(--app-bg-secondary)] border border-[var(--panel-border)] flex items-center justify-center text-[var(--accent-color)] mx-auto">
        {icon || <Tag className="w-6 h-6 text-[var(--accent-color)]" />}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold themed-heading">{title}</h3>
        <p className="text-xs themed-text-muted leading-relaxed">{description}</p>
      </div>

      {futureRequirement && (
        <div className="pt-3 border-t border-[var(--panel-border)]">
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            Requirement: {futureRequirement}
          </span>
        </div>
      )}
    </Card>
  );
};
