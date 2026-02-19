import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

export const PWAInstallBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < TWELVE_HOURS) return;

    // For Chrome/Android
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setHasPrompt(true);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - show after a short delay
    if (isIOS()) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
    }

    // If no prompt fires within 5s on non-iOS, show anyway (for awareness)
    const fallback = setTimeout(() => setShow(true), 5000);
    return () => { clearTimeout(fallback); window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  const handleInstall = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const result = await deferredPromptRef.current.userChoice;
      if (result.outcome === 'accepted') {
        setShow(false);
      }
      deferredPromptRef.current = null;
      setHasPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={cn(
      'fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50',
      'bg-card border rounded-xl shadow-lg p-4',
      'animate-in slide-in-from-bottom-5 duration-300'
    )}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Bandit Theory</p>
          {isIOS() ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap the share button, then "Add to Home Screen" for the best experience.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Get faster access and push notifications by installing the app.
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {!isIOS() && (
              <Button size="sm" onClick={handleInstall} className="gap-1" disabled={!hasPrompt}>
                <Download className="h-3 w-3" /> Install
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Maybe later
            </Button>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 -mt-1 -mr-1 flex-shrink-0" onClick={handleDismiss}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
