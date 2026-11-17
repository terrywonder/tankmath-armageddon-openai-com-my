import React from 'react';

interface OaiBrandLogoProps {
  compact?: boolean;
  subtitle?: string;
}

export const OaiBrandLogo: React.FC<OaiBrandLogoProps> = ({ compact = false, subtitle }) => {
  const tileClass = compact
    ? 'w-6 h-6 rounded-md text-[10px]'
    : 'w-7 h-7 rounded-lg text-xs';

  return (
    <div
      className="inline-flex items-center gap-2.5 select-none shrink-0"
      role="img"
      aria-label="O.A.I. Malaysia — Open Academic Interactive"
    >
      <span className="inline-flex items-center select-none" aria-hidden="true">
        {/* O. Tile (Amber -> Orange) */}
        <span
          className={`${tileClass} flex items-center justify-center font-extrabold text-white -rotate-6`}
          style={{
            background: 'linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(234, 88, 12) 100%)',
            boxShadow: 'rgb(154, 52, 18) 0px 3px 0px, rgba(234, 88, 12, 0.35) 0px 6px 12px',
            border: '1.5px solid rgba(255, 255, 255, 0.75)',
          }}
        >
          O.
        </span>

        {/* A. Tile (Rose -> Red + Golden Mortarboard Cap) */}
        <span
          className={`relative ${tileClass} flex items-center justify-center font-extrabold text-white -ml-1 z-10`}
          style={{
            background: 'linear-gradient(135deg, rgb(244, 63, 94) 0%, rgb(220, 38, 38) 100%)',
            boxShadow: 'rgb(153, 27, 27) 0px 3px 0px, rgba(225, 29, 72, 0.35) 0px 6px 12px',
            border: '1.5px solid rgba(255, 255, 255, 0.75)',
          }}
        >
          A.
          <svg
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5 absolute -top-2 -right-1.5 rotate-12 drop-shadow-xs pointer-events-none"
            fill="none"
          >
            <polygon
              points="12,2 22,7 12,12 2,7"
              fill="#FBBF24"
              stroke="#FEF08A"
              strokeWidth="1.2"
            />
            <path d="M6 9.5V14.5C6 16.5 18 16.5 18 14.5V9.5" fill="#1E1B4B" />
          </svg>
        </span>

        {/* I. Tile (Emerald -> Sky) */}
        <span
          className={`${tileClass} flex items-center justify-center font-extrabold text-white rotate-6 -ml-1`}
          style={{
            background: 'linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(2, 132, 199) 100%)',
            boxShadow: 'rgb(6, 95, 70) 0px 3px 0px, rgba(16, 185, 129, 0.35) 0px 6px 12px',
            border: '1.5px solid rgba(255, 255, 255, 0.75)',
          }}
        >
          I.
        </span>
      </span>

      <div className="flex flex-col leading-tight">
        <span
          className={`${
            compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
          } font-extrabold tracking-tight text-white whitespace-nowrap`}
        >
          O.A.I. Malaysia
        </span>
        {subtitle && (
          <span className="text-[10px] font-semibold text-amber-300/90 whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
