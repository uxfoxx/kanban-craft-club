 import React from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { CalendarCheck, Play, CheckCircle, AlertCircle } from 'lucide-react';
 import { useMyTasksToday, TaskWithProject } from '@/hooks/usePersonalTasks';
 import { useStartTimeEntry, useActiveTimeEntry } from '@/hooks/useTimeTracking';
 import { Skeleton } from '@/components/ui/skeleton';
 
 const priorityColors: Record<string, string> = {
   high: 'bg-destructive/10 text-destructive border-destructive/20',
   medium: 'bg-warning/10 text-warning border-warning/20',
   low: 'bg-muted text-muted-foreground border-muted',
 };
 
 interface TaskRowProps {
   task: TaskWithProject;
   isActive: boolean;
   onStartTimer: (taskId: string) => void;
 }
 
 const TaskRow: React.FC<TaskRowProps> = ({ task, isActive, onStartTimer }) => {
   const isCompleted = task.status === 'done';
   
   return (
     <div className={`flex items-center gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-muted/50' : 'bg-card'}`}>
       <div className={`flex-shrink-0 ${isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
         {isCompleted ? (
           <CheckCircle className="h-5 w-5" />
         ) : (
           <div className="h-5 w-5 rounded-full border-2 border-current" />
         )}
       </div>
       
       <div className="flex-1 min-w-0">
         <p className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
           {task.title}
         </p>
         <p className="text-xs text-muted-foreground truncate">
           {task.projects?.name || 'No project'}
         </p>
       </div>
       
       <Badge variant="outline" className={priorityColors[task.priority] || priorityColors.medium}>
         {task.priority}
       </Badge>
       
       {!isCompleted && (
         <Button
           variant={isActive ? 'default' : 'outline'}
           size="sm"
           onClick={() => onStartTimer(task.id)}
           disabled={isActive}
           className="flex-shrink-0"
         >
           <Play className="h-3 w-3 mr-1" />
           {isActive ? 'Active' : 'Start'}
         </Button>
       )}
     </div>
   );
 };
 
 export const TaskDueToday: React.FC = () => {
   const { data: tasks = [], isLoading } = useMyTasksToday();
   const { data: activeEntry } = useActiveTimeEntry();
   const startTimer = useStartTimeEntry();
   
   const handleStartTimer = (taskId: string) => {
     startTimer.mutate({ taskId });
   };
   
   if (isLoading) {
     return (
       <Card>
         <CardHeader className="pb-2">
           <CardTitle className="text-base font-medium flex items-center gap-2">
             <CalendarCheck className="h-4 w-4" />
             Tasks Due Today
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-2">
           <Skeleton className="h-16 w-full" />
           <Skeleton className="h-16 w-full" />
         </CardContent>
       </Card>
     );
   }
   
   return (
     <Card>
       <CardHeader className="pb-2">
         <CardTitle className="text-base font-medium flex items-center gap-2">
           <CalendarCheck className="h-4 w-4" />
           Tasks Due Today ({tasks.length})
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-2">
         {tasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-8 text-center">
             <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
             <p className="text-sm text-muted-foreground">No tasks due today</p>
             <p className="text-xs text-muted-foreground">Take a well-deserved break!</p>
           </div>
         ) : (
           tasks.map(task => (
             <TaskRow
               key={task.id}
               task={task}
               isActive={activeEntry?.task_id === task.id}
               onStartTimer={handleStartTimer}
             />
           ))
         )}
       </CardContent>
     </Card>
   );
 };