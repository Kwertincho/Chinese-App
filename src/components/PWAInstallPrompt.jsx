import React, { useEffect, useState } from 'react';
import { Download, X, WifiOff } from 'lucide-react';

// Module-level PWA install prompt store so beforeinstallprompt survives Title Screen -> App transitions
const pwaInstallStore = {
  deferredPrompt: null,
  isInstalled: false,
  isIOS: false,
  initialized: false,
  listeners: new Set()
};

function notifyPwaInstallListeners() {
  pwaInstallStore.listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore subscriber errors
    }
  });
}

function initPwaInstallStore() {
  if (pwaInstallStore.initialized || typeof window === 'undefined') return;
  pwaInstallStore.initialized = true;

  pwaInstallStore.isInstalled =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator['standalone'] === true;

  const userAgent = window.navigator.userAgent.toLowerCase();
  pwaInstallStore.isIOS = /iphone|ipad|ipod/.test(userAgent);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwaInstallStore.deferredPrompt = e;
    notifyPwaInstallListeners();
  });

  window.addEventListener('appinstalled', () => {
    pwaInstallStore.isInstalled = true;
    pwaInstallStore.deferredPrompt = null;
    notifyPwaInstallListeners();
  });
}

if (typeof window !== 'undefined') {
  initPwaInstallStore();
}

export function usePWAInstall() {
  initPwaInstallStore();

  const [, setVersion] = useState(0);

  useEffect(() => {
    const sync = () => setVersion((v) => v + 1);
    pwaInstallStore.listeners.add(sync);
    sync();
    return () => {
      pwaInstallStore.listeners.delete(sync);
    };
  }, []);

  const install = async () => {
    const promptEvent = pwaInstallStore.deferredPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      pwaInstallStore.isInstalled = true;
      pwaInstallStore.deferredPrompt = null;
      notifyPwaInstallListeners();
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(pwaInstallStore.deferredPrompt),
    isInstalled: pwaInstallStore.isInstalled,
    isIOS: pwaInstallStore.isIOS,
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
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-amber-500/95 border border-amber-200 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Study data cached locally</span>
    </div>
  );
}
