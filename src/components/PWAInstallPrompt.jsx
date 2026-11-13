import React, { useEffect, useState } from 'react';
import { Download, X, WifiOff } from 'lucide-react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator['standalone'] === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install
  };
}

export function PWAInstallButton({ compact = true }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install Mandarin HSK Studio App"
        className={`game-btn-3d rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black border border-rose-400/50 flex items-center gap-1 shadow-md ${
          compact ? 'px-2 py-1 text-[10px]' : 'px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="w-3 h-3 shrink-0" />
        <span>Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`game-btn-3d rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-black flex items-center gap-1 ${
            compact ? 'px-2 py-1 text-[10px]' : 'px-3.5 py-2 text-xs'
          }`}
        >
          <Download className="w-3 h-3 shrink-0" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-sm font-black text-white">Install on iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in your Safari toolbar.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong> to launch Mandarin HSK Studio fullscreen offline.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="game-btn-3d w-full py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs"
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
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-amber-500/95 border border-amber-200 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Study data cached locally</span>
    </div>
  );
}
