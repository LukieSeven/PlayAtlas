import React, { useState, useEffect } from 'react';
import { Clock, Sparkles, ExternalLink, Flame } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ReleaseCountdown } from '../../types/game';

interface CountdownCardProps {
  releaseData?: ReleaseCountdown;
}

const defaultRelease: ReleaseCountdown = {
  gameTitle: 'Grand Theft Auto VI',
  subtitle: 'Most Anticipated Release Spotlight',
  targetDate: '2026-11-15T00:00:00Z',
  coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
  bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1600&auto=format&fit=crop',
  developer: 'Rockstar Games',
  platform: ['PS5', 'Xbox Series X/S', 'PC'],
};

export const CountdownCard: React.FC<CountdownCardProps> = ({ releaseData = defaultRelease }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(releaseData.targetDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [releaseData.targetDate]);

  return (
    <div className="relative rounded-3xl overflow-hidden glass-card border border-indigo-500/20 shadow-2xl group">
      {/* Background Banner with Dark Glow Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={releaseData.bannerUrl}
          alt={releaseData.gameTitle}
          className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      </div>

      {/* Card Content Container */}
      <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Side Info */}
        <div className="flex-1 space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{releaseData.subtitle}</span>
          </div>

          <div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              {releaseData.gameTitle}
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-1.5 flex items-center justify-center lg:justify-start gap-3">
              <span>{releaseData.developer}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-indigo-300">{releaseData.platform.join(' • ')}</span>
            </p>
          </div>

          {/* Countdown Clock Grid */}
          <div className="pt-2">
            <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3 flex items-center justify-center lg:justify-start gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Release Countdown Timer</span>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-md mx-auto lg:mx-0">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-panel p-3 rounded-2xl border border-indigo-500/20 text-center shadow-inner"
                >
                  <div className="text-2xl md:text-3xl font-extrabold font-mono text-indigo-400">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            <Button variant="glow" size="md" icon={<Sparkles className="w-4 h-4" />}>
              Add to Wishlist & Track
            </Button>
            <Button variant="outline" size="md" icon={<ExternalLink className="w-4 h-4" />}>
              Official Trailer
            </Button>
          </div>
        </div>

        {/* Right Side Game Cover Art */}
        <div className="shrink-0 relative w-48 md:w-56 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group-hover:border-indigo-500/50 transition-colors">
          <img
            src={releaseData.coverUrl}
            alt={releaseData.gameTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge variant="amber">UPCOMING</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
