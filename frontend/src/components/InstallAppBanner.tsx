import { useState, useEffect } from "react";
import { Download, Smartphone, X } from "lucide-react";

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback instructions for browsers that don't support automatic prompt
      alert("To install on your phone:\n\n1. Tap the browser menu (⋮ in Chrome or Share in Safari)\n2. Select 'Install App' or 'Add to Home screen'");
    }
  };

  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0 border border-indigo-400/30">
            <Smartphone className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold leading-tight">Install Mobile App</h4>
            <p className="text-xs text-indigo-200">Run full-screen on your phone</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-indigo-300 hover:text-white p-1 rounded-lg transition"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
