import React from 'react';

export interface AtlasHeadingProps {
  level?: 'page' | 'section' | 'widget';
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: boolean | React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const AtlasHeading: React.FC<AtlasHeadingProps> = ({
  level = 'section',
  children,
  subtitle,
  icon = true,
  action,
  className = '',
}) => {
  const isPage = level === 'page';
  const isWidget = level === 'widget';

  const headingTag = isPage ? 'h1' : isWidget ? 'h3' : 'h2';
  const headingSize = isPage
    ? 'text-3xl md:text-4xl font-bold'
    : isWidget
    ? 'text-lg md:text-xl font-semibold uppercase tracking-wider text-[var(--atlas-ink-secondary)]'
    : 'text-xl md:text-2xl font-bold tracking-wide text-[var(--atlas-ink-primary)]';

  const defaultIcon = (
    <span className="text-[var(--atlas-gold-antique)] font-serif text-sm inline-block select-none mr-2">
      ✦
    </span>
  );

  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <div>
        <div className="flex items-center">
          {icon === true ? defaultIcon : icon ? <span className="mr-2">{icon}</span> : null}
          {React.createElement(
            headingTag,
            { className: `font-serif ${headingSize}` },
            children
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-[var(--atlas-ink-muted)] mt-0.5 font-sans">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
