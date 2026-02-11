 import React, { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { ArrowLeft, Clock, Plus } from 'lucide-react';
 import { useAllMyTimeEntries, DateRange, TimeEntryWithDetails } from '@/hooks/useAllTimeEntries';
 import { formatDuration, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
 import { TimeEntryListItem } from './TimeEntryListItem';
 import { Skeleton } from '@/components/ui/skeleton';
 import { format, isToday, isYesterday, isSameDay } from 'date-fns';
 import { useToast } from '@/hooks/use-toast';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 
 interface TimeTrackingPageProps {
   onBack: () => void;
 }
 
 const groupEntriesByDate = (entries: TimeEntryWithDetails[]) => {
   const groups: Record<string, TimeEntryWithDetails[]> = {};
   
   entries.forEach(entry => {
     const date = format(new Date(entry.started_at), 'yyyy-MM-dd');
     if (!groups[date]) {
       groups[date] = [];
     }
     groups[date].push(entry);
   });
   
   return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
 };
 
 const formatDateHeader = (dateStr: string) => {
   const date = new Date(dateStr);
   if (isToday(date)) return 'Today';
   if (isYesterday(date)) return 'Yesterday';
   return format(date, 'EEEE, MMMM d');
 };
 
 export const TimeTrackingPage: React.FC<TimeTrackingPageProps> = ({ onBack }) => {
   const [dateRange, setDateRange] = useState<DateRange>('week');
   const { data: entries = [], isLoading } = useAllMyTimeEntries(dateRange);
   const deleteEntry = useDeleteTimeEntry();
   const { toast } = useToast();
   const [entryToDelete, setEntryToDelete] = useState<TimeEntryWithDetails | null>(null);
   
   const totalSeconds = entries.reduce((sum, entry) => {
     if (entry.duration_seconds) {
       return sum + entry.duration_seconds;
     }
     if (entry.ended_at) {
       const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
       return sum + Math.floor(duration);
     }
     return sum;
   }, 0);
   
   const groupedEntries = groupEntriesByDate(entries);
   
   const handleDelete = (entry: TimeEntryWithDetails) => {
     setEntryToDelete(entry);
   };
   
   const confirmDelete = () => {
     if (!entryToDelete) return;
     
     deleteEntry.mutate(
       { entryId: entryToDelete.id, taskId: entryToDelete.task_id },
       {
         onSuccess: () => {
           toast({
             title: 'Entry deleted',
             description: 'Time entry has been removed.',
           });
           setEntryToDelete(null);
         },
         onError: () => {
           toast({
             title: 'Error',
             description: 'Failed to delete entry.',
             variant: 'destructive',
           });
         },
       }
     );
   };
   
   return (
     <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Track and review your work hours</p>
      </div>
       
       {/* Filters & Summary */}
       <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
         <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
           <TabsList>
             <TabsTrigger value="today">Today</TabsTrigger>
             <TabsTrigger value="week">This Week</TabsTrigger>
             <TabsTrigger value="month">This Month</TabsTrigger>
             <TabsTrigger value="all">All Time</TabsTrigger>
           </TabsList>
         </Tabs>
         
         <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-lg font-semibold">
             <Clock className="h-5 w-5 text-primary" />
             <span>Total: {formatDuration(totalSeconds)}</span>
           </div>
         </div>
       </div>
       
       {/* Time Entries */}
       {isLoading ? (
         <div className="space-y-4">
           <Skeleton className="h-6 w-32" />
           <Skeleton className="h-20 w-full" />
           <Skeleton className="h-20 w-full" />
         </div>
       ) : entries.length === 0 ? (
         <Card>
           <CardContent className="flex flex-col items-center justify-center py-12">
             <Clock className="h-12 w-12 text-muted-foreground mb-4" />
             <p className="text-lg font-medium">No time entries found</p>
             <p className="text-sm text-muted-foreground">
               Start a timer on a task to begin tracking your time.
             </p>
           </CardContent>
         </Card>
       ) : (
         <div className="space-y-6">
           {groupedEntries.map(([date, dayEntries]) => (
             <div key={date} className="space-y-3">
               <h3 className="text-sm font-semibold text-muted-foreground">
                 {formatDateHeader(date)}
               </h3>
               <div className="space-y-2">
                 {dayEntries.map(entry => (
                   <TimeEntryListItem
                     key={entry.id}
                     entry={entry}
                     onDelete={handleDelete}
                   />
                 ))}
               </div>
             </div>
           ))}
         </div>
       )}
       
       {/* Delete Confirmation */}
       <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
             <AlertDialogDescription>
               This action cannot be undone. The time entry will be permanently deleted.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
               Delete
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 };