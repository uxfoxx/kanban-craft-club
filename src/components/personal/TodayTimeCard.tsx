 import React from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Clock, Timer } from 'lucide-react';
 import { useMyTodayTimeTotal } from '@/hooks/usePersonalTasks';
 import { useActiveTimeEntry, formatDuration } from '@/hooks/useTimeTracking';
 import { Skeleton } from '@/components/ui/skeleton';
 
 export const TodayTimeCard: React.FC = () => {
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
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <Clock className="h-4 w-4" />
             Today's Time Worked
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
         <CardTitle className="text-base font-medium flex items-center gap-2">
           <Clock className="h-4 w-4" />
           Today's Time Worked
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
         <div className="text-3xl font-bold text-primary">
           {formatDuration(totalWithActive)}
         </div>
         
         {activeEntry && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
             <Timer className="h-4 w-4 animate-pulse text-primary" />
             <span className="truncate">{activeEntry.tasks?.title || 'Active task'}</span>
             <span className="font-mono text-primary">{formatDuration(elapsedTime)}</span>
           </div>
         )}
       </CardContent>
     </Card>
   );
 };