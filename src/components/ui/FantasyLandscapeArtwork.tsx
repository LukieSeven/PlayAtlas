import React from 'react';

interface FantasyLandscapeArtworkProps {
  className?: string;
  variant?: 'featured' | 'events' | 'sidebar';
}

export const FantasyLandscapeArtwork: React.FC<FantasyLandscapeArtworkProps> = ({
  className = '',
  variant = 'featured',
}) => {
  if (variant === 'events') {
    return (
      <svg
        viewBox="0 0 400 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-cover ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="eventSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9F6F0" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#EADEC9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D2C3A7" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="castleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0B2B3C" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0B2B3C" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="goldMist" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C5A059" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#D9C8A9" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sky Base */}
        <rect width="400" height="240" fill="url(#eventSky)" />

        {/* Sun & Rays */}
        <circle cx="320" cy="80" r="45" fill="#C5A059" fillOpacity="0.15" />
        <circle cx="320" cy="80" r="25" fill="#FFF" fillOpacity="0.4" />

        {/* Soft Watercolor Distant Hills */}
        <path
          d="M0 190 Q90 140 200 170 T400 150 L400 240 L0 240 Z"
          fill="#3A7D8C"
          fillOpacity="0.18"
        />
        <path
          d="M0 210 Q140 160 280 190 T400 180 L400 240 L0 240 Z"
          fill="#0B2B3C"
          fillOpacity="0.22"
        />

        {/* Castle Skyline Silhouette */}
        <g fill="url(#castleGrad)">
          {/* Main Central Keep */}
          <rect x="270" y="100" width="30" height="90" rx="2" />
          <path d="M265 100 L285 65 L305 100 Z" />
          {/* Left Tower */}
          <rect x="245" y="120" width="18" height="70" rx="1" />
          <path d="M242 120 L254 95 L266 120 Z" />
          {/* Right Spire */}
          <rect x="308" y="110" width="16" height="80" rx="1" />
          <path d="M305 110 L316 80 L327 110 Z" />
          {/* Connecting Walls & Battlements */}
          <rect x="230" y="145" width="105" height="50" />
          <rect x="235" y="138" width="5" height="7" />
          <rect x="245" y="138" width="5" height="7" />
          <rect x="255" y="138" width="5" height="7" />
          <rect x="310" y="138" width="5" height="7" />
          <rect x="320" y="138" width="5" height="7" />
        </g>

        {/* Gold Mist Overlay */}
        <rect width="400" height="240" fill="url(#goldMist)" />
      </svg>
    );
  }

  // Featured Landscape (Default)
  return (
    <svg
      viewBox="0 0 800 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full object-cover ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EDE5D5" />
          <stop offset="40%" stopColor="#E2D4BD" />
          <stop offset="80%" stopColor="#C9B699" />
          <stop offset="100%" stopColor="#B39F80" />
        </linearGradient>
        <linearGradient id="mountainFar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A7585" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2D4D59" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="mountainMid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3E4F" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0B2B3C" stopOpacity="0.88" />
        </linearGradient>
        <linearGradient id="castleKeep" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0C1D2D" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#061019" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE8B2" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#C5A059" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky Canvas Base */}
      <rect width="800" height="480" fill="url(#skyGrad)" />

      {/* Radiant Sun in Upper Sky */}
      <circle cx="520" cy="140" r="90" fill="url(#sunGlow)" />
      <circle cx="520" cy="140" r="45" fill="#FFF8EB" fillOpacity="0.8" />

      {/* Distant Misty Mountain Peaks */}
      <path
        d="M-50 320 L80 180 L190 280 L310 150 L460 300 L580 190 L710 290 L850 170 L850 480 L-50 480 Z"
        fill="url(#mountainFar)"
      />

      {/* Midground Rocky Ridges */}
      <path
        d="M-20 370 L140 240 L260 330 L410 210 L540 320 L670 230 L820 350 L820 480 L-20 480 Z"
        fill="url(#mountainMid)"
      />

      {/* Epic Castle Fortress Spire on Right Ridge */}
      <g fill="url(#castleKeep)">
        <rect x="580" y="160" width="45" height="180" rx="2" />
        <path d="M570 160 L602.5 100 L635 160 Z" />
        <rect x="540" y="200" width="30" height="140" rx="2" />
        <path d="M535 200 L555 150 L575 200 Z" />
        <rect x="635" y="180" width="28" height="160" rx="2" />
        <path d="M630 180 L649 135 L668 180 Z" />
        {/* Fortress Base & Walls */}
        <rect x="510" y="240" width="170" height="120" />
        {/* Battlements */}
        <rect x="520" y="230" width="8" height="12" />
        <rect x="535" y="230" width="8" height="12" />
        <rect x="550" y="230" width="8" height="12" />
        <rect x="640" y="230" width="8" height="12" />
        <rect x="655" y="230" width="8" height="12" />
      </g>

      {/* Foreground Valley & Winding Path */}
      <path
        d="M-50 420 Q180 350 400 400 T850 380 L850 480 L-50 480 Z"
        fill="#0B2B3C"
        fillOpacity="0.9"
      />

      {/* Adventurer Silhouette on Left Outlook */}
      <g fill="#C5A059" opacity="0.9">
        <path d="M220 340 Q225 310 227 300 Q230 295 233 300 Q235 310 240 340 Z" />
        <circle cx="230" cy="290" r="5" />
        <rect x="228" y="295" width="4" height="25" />
        <line x1="223" y1="305" x2="238" y2="305" stroke="#C5A059" strokeWidth="2" />
      </g>

      {/* Cartographic Compass Rose Watermark */}
      <g transform="translate(680, 80) scale(0.6)" opacity="0.35">
        <circle cx="0" cy="0" r="50" stroke="#C5A059" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M0 -60 L10 -15 L0 0 L-10 -15 Z" fill="#C5A059" />
        <path d="M0 60 L10 15 L0 0 L-10 15 Z" fill="#0B2B3C" />
        <path d="M60 0 L15 10 L0 0 L15 -10 Z" fill="#C5A059" />
        <path d="M-60 0 L-15 10 L0 0 L-15 -10 Z" fill="#0B2B3C" />
      </g>
    </svg>
  );
};
