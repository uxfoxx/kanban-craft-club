import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { APP_VERSION, RELEASE_NOTES } from '@/lib/releaseNotes';

const STORAGE_KEY = 'lastSeenAppVersion';

export const WhatsNewDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notesToShow, setNotesToShow] = useState(RELEASE_NOTES);

  useEffect(() => {
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen === APP_VERSION) return;
      // Show all releases since lastSeen (or just the latest if first visit)
      let toShow = RELEASE_NOTES;
      if (lastSeen) {
        const idx = RELEASE_NOTES.findIndex(n => n.version === lastSeen);
        toShow = idx > 0 ? RELEASE_NOTES.slice(0, idx) : RELEASE_NOTES.slice(0, 1);
      } else {
        toShow = RELEASE_NOTES.slice(0, 1);
      }
      setNotesToShow(toShow);
      // Slight delay so it doesn't compete with auth/init UI
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    } catch {
      // ignore
    }
  }, []);

  const handleClose = () => {
    try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">What's New</DialogTitle>
          <DialogDescription className="text-center">
            Here's what changed in the latest update.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {notesToShow.map((note) => (
            <div key={note.version} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">{note.title}</h3>
                <span className="text-[10px] text-muted-foreground">{note.date}</span>
              </div>
              <ul className="space-y-1.5">
                {note.items.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
