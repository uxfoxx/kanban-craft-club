import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    __pwaUpdateSW?: () => void;
  }
}

export const PWAUpdatePrompt: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const handleUpdate = () => {
    window.__pwaUpdateSW?.();
  };

  if (!show) return null;

  return (
    <div className={cn(
      'fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[calc(100%-2rem)]',
      'bg-card border rounded-xl shadow-lg p-4',
      'animate-in slide-in-from-top-5 duration-300'
    )}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update Available</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A new version of the app is ready. Update now for the latest features.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" onClick={handleUpdate} className="gap-1">
              <RefreshCw className="h-3 w-3" /> Update Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
              Later
            </Button>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 -mt-1 -mr-1 flex-shrink-0" onClick={() => setShow(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
