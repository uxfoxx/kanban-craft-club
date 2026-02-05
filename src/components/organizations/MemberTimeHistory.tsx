 import React, { useState } from 'react';
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { Card, CardContent } from '@/components/ui/card';
 import { Clock, Briefcase, Calendar } from 'lucide-react';
 import { TeamMemberTimeStats, useMemberTimeHistory, TeamDateRange, MemberTimeEntry } from '@/hooks/useTeamTimeTracking';
 import { formatDuration } from '@/hooks/useTimeTracking';
 import { format, isToday, isYesterday } from 'date-fns';
 import { Skeleton } from '@/components/ui/skeleton';
 
 interface MemberTimeHistoryProps {
   member: TeamMemberTimeStats | null;
   organizationId: string | undefined;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 const getInitials = (name: string) => {
   return name
     .split(' ')
     .map((n) => n[0])
     .join('')
     .toUpperCase()
     .slice(0, 2);
 };
 
 const formatDateHeader = (dateStr: string) => {
   const date = new Date(dateStr);
   if (isToday(date)) return 'Today';
   if (isYesterday(date)) return 'Yesterday';
   return format(date, 'EEEE, MMM d');
 };
 
 const groupEntriesByDate = (entries: MemberTimeEntry[]) => {
   const groups: Record<string, MemberTimeEntry[]> = {};
   
   entries.forEach(entry => {
     const date = format(new Date(entry.started_at), 'yyyy-MM-dd');
     if (!groups[date]) {
       groups[date] = [];
     }
     groups[date].push(entry);
   });
   
   return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
 };
 
 export const MemberTimeHistory: React.FC<MemberTimeHistoryProps> = ({
   member,
   organizationId,
   open,
   onOpenChange,
 }) => {
   const [dateRange, setDateRange] = useState<TeamDateRange>('week');
   const { data: entries = [], isLoading } = useMemberTimeHistory(
     organizationId,
     member?.user_id,
     dateRange
   );
   
   const totalSeconds = entries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);
   
   const projectHours = entries.reduce((acc, entry) => {
     const existing = acc.find(p => p.project_id === entry.project_id);
     const duration = entry.duration_seconds || 0;
     if (existing) {
       existing.seconds += duration;
     } else {
       acc.push({ project_id: entry.project_id, project_name: entry.project_name, seconds: duration });
     }
     return acc;
   }, [] as { project_id: string; project_name: string; seconds: number }[]);
   
   const topProject = projectHours.sort((a, b) => b.seconds - a.seconds)[0];
   
   const groupedEntries = groupEntriesByDate(entries);
   
   if (!member) return null;
   
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
         <SheetHeader className="space-y-4">
           <div className="flex items-center gap-3">
             <Avatar className="h-12 w-12">
               <AvatarFallback className="bg-primary/10 text-primary text-lg">
                 {getInitials(member.full_name)}
               </AvatarFallback>
             </Avatar>
             <div>
               <SheetTitle className="text-left">{member.full_name}</SheetTitle>
               <SheetDescription className="text-left">{member.email}</SheetDescription>
             </div>
           </div>
         </SheetHeader>
         
         <div className="mt-6 space-y-6">
           {/* Date Range Tabs */}
           <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as TeamDateRange)}>
             <TabsList className="w-full">
               <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
               <TabsTrigger value="week" className="flex-1">This Week</TabsTrigger>
               <TabsTrigger value="month" className="flex-1">This Month</TabsTrigger>
             </TabsList>
           </Tabs>
           
           {/* Summary Cards */}
           <div className="grid grid-cols-2 gap-3">
             <Card>
               <CardContent className="pt-4 pb-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                   <Clock className="h-4 w-4" />
                   <span>Total Time</span>
                 </div>
                 <p className="text-xl font-bold text-primary">{formatDuration(totalSeconds)}</p>
               </CardContent>
             </Card>
             
             <Card>
               <CardContent className="pt-4 pb-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                   <Briefcase className="h-4 w-4" />
                   <span>Top Project</span>
                 </div>
                 <p className="text-sm font-medium truncate">
                   {topProject?.project_name || 'N/A'}
                 </p>
               </CardContent>
             </Card>
           </div>
           
           {/* Time Entries */}
           <div className="space-y-4">
             <h3 className="text-sm font-semibold flex items-center gap-2">
               <Calendar className="h-4 w-4" />
               Recent Entries
             </h3>
             
             {isLoading ? (
               <div className="space-y-3">
                 <Skeleton className="h-16 w-full" />
                 <Skeleton className="h-16 w-full" />
               </div>
             ) : entries.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-8">
                 No time entries for this period.
               </p>
             ) : (
               <div className="space-y-4">
                 {groupedEntries.map(([date, dayEntries]) => (
                   <div key={date} className="space-y-2">
                     <p className="text-xs font-medium text-muted-foreground">
                       {formatDateHeader(date)}
                     </p>
                     {dayEntries.map(entry => (
                       <div key={entry.id} className="p-3 rounded-lg border bg-card">
                         <div className="flex justify-between items-start">
                           <div className="flex-1 min-w-0">
                             <p className="font-medium text-sm truncate">{entry.task_title}</p>
                             <p className="text-xs text-muted-foreground">{entry.project_name}</p>
                           </div>
                           <span className="font-mono text-sm text-primary">
                             {formatDuration(entry.duration_seconds || 0)}
                           </span>
                         </div>
                         {entry.description && (
                           <p className="text-xs text-muted-foreground mt-2 truncate">
                             {entry.description}
                           </p>
                         )}
                       </div>
                     ))}
                   </div>
                 ))}
               </div>
             )}
           </div>
         </div>
       </SheetContent>
     </Sheet>
   );
 };