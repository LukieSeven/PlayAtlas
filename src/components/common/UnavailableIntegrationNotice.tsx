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
    <Card glass className={`p-8 text-center space-y-4 max-w-xl mx-auto border-dashed border-slate-800 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
        {icon || <Tag className="w-6 h-6 text-purple-400" />}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>

      {futureRequirement && (
        <div className="pt-3 border-t border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            Requirement: {futureRequirement}
          </span>
        </div>
      )}
    </Card>
  );
};
