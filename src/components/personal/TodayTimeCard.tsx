import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Timer, ArrowRight } from 'lucide-react';
import { useMyTodayTimeTotal } from '@/hooks/usePersonalTasks';
import { useActiveTimeEntry, formatDuration } from '@/hooks/useTimeTracking';
import { Skeleton } from '@/components/ui/skeleton';

interface TodayTimeCardProps {
  onViewHistory?: () => void;
}

export const TodayTimeCard: React.FC<TodayTimeCardProps> = ({ onViewHistory }) => {
   const { data: totalSeconds = 0, isLoading } = useMyTodayTimeTotal();
   const { data: activeEntry } = useActiveTimeEntry();
   
   const [elapsedTime, setElapsedTime] = React.useState(0);
   
   React.useEffect(() => {
     if (!activeEntry) {
       setElapsedTime(0);
       return;
     }
     
     const startTime = new Date(activeEntry.started_at).getTime();
     const updateTimer = () => {
       const elapsed = Math.floor((Date.now() - startTime) / 1000);
       setElapsedTime(elapsed);
     };
     
     updateTimer();
     const interval = setInterval(updateTimer, 1000);
     
     return () => clearInterval(interval);
   }, [activeEntry]);
   
   if (isLoading) {
     return (
       <Card>
         <CardHeader className="pb-2">
           <CardTitle className="flex items-center gap-2">
             <Clock className="h-4 w-4 text-muted-foreground" />
             Today's Time
           </CardTitle>
         </CardHeader>
         <CardContent>
           <Skeleton className="h-8 w-24" />
         </CardContent>
       </Card>
     );
   }
   
   const totalWithActive = totalSeconds + elapsedTime;
   
   return (
     <Card>
       <CardHeader className="pb-2">
         <CardTitle className="flex items-center gap-2">
           <Clock className="h-4 w-4 text-muted-foreground" />
           Today's Time
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
         <div className="text-2xl font-bold text-primary">
           {formatDuration(totalWithActive)}
         </div>
         
          {activeEntry && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Timer className="h-3.5 w-3.5 animate-pulse text-primary" />
              <span className="truncate text-xs">{activeEntry.tasks?.title || 'Active task'}</span>
              <span className="font-mono text-primary ml-auto text-xs">{formatDuration(elapsedTime)}</span>
            </div>
          )}
          
          {onViewHistory && (
            <Button variant="ghost" size="sm" className="w-full mt-1 text-muted-foreground hover:text-foreground rounded-xl text-xs" onClick={onViewHistory}>
              View history
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };
