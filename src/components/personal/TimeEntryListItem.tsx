 import React from 'react';
 import { format } from 'date-fns';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Pencil, Trash2, Clock } from 'lucide-react';
 import { TimeEntryWithDetails } from '@/hooks/useAllTimeEntries';
 import { formatDuration } from '@/hooks/useTimeTracking';
 
 interface TimeEntryListItemProps {
   entry: TimeEntryWithDetails;
   onEdit?: (entry: TimeEntryWithDetails) => void;
   onDelete?: (entry: TimeEntryWithDetails) => void;
 }
 
 export const TimeEntryListItem: React.FC<TimeEntryListItemProps> = ({ 
   entry, 
   onEdit, 
   onDelete 
 }) => {
   const startTime = new Date(entry.started_at);
   const endTime = entry.ended_at ? new Date(entry.ended_at) : null;
   
   const duration = entry.duration_seconds || 
     (endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0);
   
   return (
     <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 md:p-4 rounded-lg border bg-card">
       {/* Time Range */}
       <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
         <Clock className="h-4 w-4 flex-shrink-0" />
         <span>
           {format(startTime, 'HH:mm')}
           {endTime && ` - ${format(endTime, 'HH:mm')}`}
         </span>
       </div>
       
       {/* Task & Project Info */}
       <div className="flex-1 min-w-0">
         <div className="flex flex-wrap items-center gap-2">
           <span className="font-medium truncate">
             {entry.subtask_title || entry.task_title}
           </span>
           <Badge variant="outline" className="text-xs">
             {entry.project_name}
           </Badge>
           {entry.type === 'subtask' && (
             <Badge variant="secondary" className="text-xs">
               Subtask
             </Badge>
           )}
         </div>
         {entry.description && (
           <p className="text-sm text-muted-foreground truncate mt-1">
             {entry.description}
           </p>
         )}
       </div>
       
       {/* Duration */}
       <div className="font-mono font-medium text-primary min-w-[80px] text-right">
         {formatDuration(duration)}
       </div>
       
       {/* Actions */}
       <div className="flex gap-1 flex-shrink-0">
         {onEdit && (
           <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} className="h-8 w-8">
             <Pencil className="h-3 w-3" />
           </Button>
         )}
         {onDelete && (
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={() => onDelete(entry)} 
             className="h-8 w-8 text-destructive hover:text-destructive"
           >
             <Trash2 className="h-3 w-3" />
           </Button>
         )}
       </div>
     </div>
   );
 };