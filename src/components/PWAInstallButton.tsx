import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-900 bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_3px_0_#0f172a] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        Install Offline App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-900 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-100 shadow-[0_3px_0_#0f172a] transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-4 w-4 text-sky-400" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">Install on iPhone or iPad</h3>
                <button
                  type="button"
                  aria-label="Close iOS install instructions"
                  onClick={() => setShowIOSGuide(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-300">
                <li>1. Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
                <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>3. Launch TankMath anytime—even offline.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl border-2 border-slate-950 bg-sky-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
