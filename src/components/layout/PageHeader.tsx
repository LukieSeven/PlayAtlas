import React from 'react';
import { Badge } from '../ui/Badge';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-[var(--panel-border)]">
      <div className="space-y-1">
        {badge && (
          <div className="mb-2">
            <Badge variant="amber">{badge}</Badge>
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-extrabold themed-heading tracking-tight">
          {title}
        </h1>
        <p className="themed-text-muted text-sm md:text-base max-w-2xl">
          {subtitle}
        </p>
      </div>

      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
