import React from 'react';
import { Star } from 'lucide-react';

interface MinimumRatingFilterProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export const MinimumRatingFilter: React.FC<MinimumRatingFilterProps> = ({
  value,
  onChange,
  label = 'Minimum rating',
}) => (
  <div className="flex h-[31px] items-center gap-1.5 rounded-xl border border-[#D9C8A9] bg-white px-2.5" aria-label={label}>
    <span className="mr-0.5 text-[10px] font-bold text-[#47586A]">Rating</span>
    <div className="flex items-center gap-0.5" role="group" aria-label={`${label}: ${value || 'any'}`}>
      {Array.from({ length: 10 }, (_, index) => index + 1).map(star => {
        const highlighted = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? 0 : star)}
            className={`rounded-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#C5A059] ${highlighted ? 'text-[#B88928]' : 'text-[#C7BCA8] hover:text-[#8C6D37]'}`}
            title={value === star ? 'Clear minimum rating' : `Show games rated ${star}/10 or higher`}
            aria-label={value === star ? 'Clear minimum rating' : `Set minimum rating to ${star} out of 10`}
            aria-pressed={highlighted}
          >
            <Star className={`h-3.5 w-3.5 ${highlighted ? 'fill-current' : ''}`} />
          </button>
        );
      })}
    </div>
    <span className="ml-0.5 min-w-4 text-right text-[10px] font-mono font-bold text-[#0C1D2D]">{value || 'Any'}</span>
  </div>
);
