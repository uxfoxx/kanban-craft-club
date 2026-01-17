import React, { useState, useEffect } from 'react';
import { useActiveTimeEntry, useStopTimeEntry, formatDuration } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Square, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const ActiveTimer: React.FC = () => {
  const { data: activeEntry } = useActiveTimeEntry();
  const stopTimer = useStopTimeEntry();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(activeEntry.started_at).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const handleStop = async () => {
    if (!activeEntry) return;
    
    try {
      await stopTimer.mutateAsync({ entryId: activeEntry.id });
      toast.success('Timer stopped');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  if (!activeEntry) return null;

  return (
    <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
      <Clock className="h-4 w-4 text-primary animate-pulse" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground truncate max-w-32">
          {activeEntry.tasks?.title}
        </span>
        <span className="text-sm font-mono font-semibold">
          {formatDuration(elapsed)}
        </span>
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleStop}
        className="h-7 w-7 p-0"
      >
        <Square className="h-3 w-3" />
      </Button>
    </div>
  );
};
