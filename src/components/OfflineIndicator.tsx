import React from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  syncing: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ syncing }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !syncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 z-30 -translate-x-1/2 pointer-events-none"
    >
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-xl border-2 border-slate-950 bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md whitespace-nowrap">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Offline Mode · Playing from local cache</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border-2 border-slate-950 bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md whitespace-nowrap">
          <CloudUpload className="h-3.5 w-3.5 shrink-0" />
          <span>Syncing saved progress...</span>
        </div>
      )}
    </div>
  );
};
