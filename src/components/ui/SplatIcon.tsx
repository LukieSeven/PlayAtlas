import React from 'react';

export const SplatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M11.9 3.2c1.2 0 1.5 2.2 2.6 2.6 1 .4 2.5-1.2 3.4-.3.8.8-.6 2.4-.2 3.4.4 1.1 2.8 1 2.8 2.2 0 1.1-2.3 1.4-2.7 2.4-.4 1 .9 2.7 0 3.5-.8.8-2.4-.6-3.4-.2-1.1.4-1.2 2.8-2.4 2.8-1.1 0-1.5-2.3-2.5-2.7-1-.4-2.6 1-3.5.1-.8-.8.6-2.4.2-3.4-.4-1.1-2.8-1.2-2.8-2.4 0-1.1 2.3-1.5 2.7-2.5.4-1-.9-2.7-.1-3.5.8-.8 2.5.6 3.5.2 1.1-.4 1.2-2.7 2.4-2.7Z"
      fill="currentColor"
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="11.7" r="2.6" fill="currentColor" />
  </svg>
);
