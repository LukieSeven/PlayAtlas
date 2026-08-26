import React, { useState, useEffect } from 'react';
import { ExternalLink, Tag, Star, ShoppingBag, Loader2 } from 'lucide-react';
import { GameDeal } from '../../types/deals';
import { getBestDealForGame } from '../../services/dealsService';

interface PriceWidgetProps {
  gameId: number | string;
  deals?: GameDeal[];
  className?: string;
}

export const PriceWidget: React.FC<PriceWidgetProps> = ({ gameId, deals, className = '' }) => {
  const [bestDeal, setBestDeal] = useState<GameDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (deals && deals.length > 0) {
      const best = deals.reduce((top, current) => (current.cut > top.cut ? current : top), deals[0]);
      setBestDeal(best);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getBestDealForGame(gameId)
      .then(res => {
        if (isMounted) {
          setBestDeal(res);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.warn('PriceWidget lookup error:', err);
        if (isMounted) {
          setBestDeal(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gameId, deals]);

  if (isLoading) {
    return (
      <div className={`p-3 rounded-2xl bg-[#FDFBF7] border border-[#D9C8A9] flex items-center justify-between text-xs text-[#718294] font-mono ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B2B3C]" />
          <span>Checking storefront deals...</span>
        </div>
      </div>
    );
  }

  if (!bestDeal) {
    return (
      <div className={`p-3 rounded-2xl bg-[#EFE8D8]/60 border border-[#D9C8A9] flex items-center justify-between text-xs text-[#718294] font-mono ${className}`}>
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-[#8C6D37]" />
          <span>No active deals listed for this title</span>
        </div>
      </div>
    );
  }

  const isFree = bestDeal.currentPrice.amount === 0 || bestDeal.cut === 100;

  return (
    <div className={`p-3.5 rounded-2xl bg-[#FDFBF7] border border-[#C5A059] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}>
      {/* Price & Shop Information */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base text-[#0C1D2D]">
            {isFree ? 'FREE' : bestDeal.currentPrice.amountFormatted}
          </span>

          {bestDeal.regularPrice.amount > bestDeal.currentPrice.amount && (
            <span className="line-through text-xs text-[#718294] font-mono">
              {bestDeal.regularPrice.amountFormatted}
            </span>
          )}

          {bestDeal.cut > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-700 text-white shadow-xs">
              -{bestDeal.cut}%
            </span>
          )}

          {bestDeal.isHistoricalLow && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#C5A059]/20 text-[#8C6D37] border border-[#C5A059] flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-current" />
              <span>Historical Low</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#8C6D37] font-semibold">
          <ShoppingBag className="w-3 h-3 text-[#0B2B3C]" />
          <span>Best deal on {bestDeal.storeName}</span>
          {bestDeal.voucher && <span className="text-[10px] font-mono bg-[#EFE8D8] px-1 rounded border border-[#D9C8A9]">Code: {bestDeal.voucher}</span>}
        </div>
      </div>

      {/* Direct Store Link Action */}
      {bestDeal.url && (
        <a
          href={bestDeal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B2B3C] text-white hover:bg-[#0C1D2D] font-bold text-xs transition-all shadow-xs"
        >
          <span>Get Deal</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
        </a>
      )}
    </div>
  );
};
