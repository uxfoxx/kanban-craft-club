import React, { useState } from 'react';
import { Task, Subtask } from '@/types/database';
import { useSubtasks, useCreateSubtask, useToggleSubtask } from '@/hooks/useTasks';
import { useTimeEntries, formatDuration } from '@/hooks/useTimeTracking';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Clock, ListTodo, Flag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  task: Task | null;
  projectId: string;
  onClose: () => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  projectId,
  onClose,
}) => {
  const { data: subtasks } = useSubtasks(task?.id);
  const { data: timeEntries } = useTimeEntries(task?.id);
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  
  const [newSubtask, setNewSubtask] = useState('');

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtask.trim()) return;
    
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: newSubtask.trim() });
      setNewSubtask('');
      toast.success('Subtask added');
    } catch (error) {
      toast.error('Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      await toggleSubtask.mutateAsync({
        subtaskId: subtask.id,
        completed: !subtask.completed,
        taskId: subtask.task_id,
      });
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const totalTimeSpent = timeEntries?.reduce((acc, entry) => {
    return acc + (entry.duration_seconds || 0);
  }, 0) || 0;

  const completedSubtasks = subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;

  const getPriorityBadge = () => {
    if (!task) return null;
    
    const colors = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-chart-4/10 text-chart-4',
      low: 'bg-chart-5/10 text-chart-5',
    };
    
    return (
      <Badge variant="outline" className={cn('capitalize', colors[task.priority])}>
        <Flag className="h-3 w-3 mr-1" />
        {task.priority}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    if (!task) return null;
    
    const colors = {
      todo: 'bg-muted text-muted-foreground',
      in_progress: 'bg-primary/10 text-primary',
      done: 'bg-chart-5/10 text-chart-5',
    };
    
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      done: 'Done',
    };
    
    return (
      <Badge variant="outline" className={colors[task.status]}>
        {labels[task.status]}
      </Badge>
    );
  };

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {task && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {getStatusBadge()}
                {getPriorityBadge()}
                {task.due_date && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </Badge>
                )}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {task.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              )}
              
              <Separator />
              
              {/* Time Tracking Summary */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Time Tracked</h4>
                </div>
                <p className="text-2xl font-bold">
                  {totalTimeSpent > 0 ? formatDuration(totalTimeSpent) : 'No time logged'}
                </p>
                {timeEntries && timeEntries.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {timeEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="text-xs text-muted-foreground flex justify-between">
                        <span>{format(new Date(entry.started_at), 'MMM d, h:mm a')}</span>
                        <span>{entry.duration_seconds ? formatDuration(entry.duration_seconds) : '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Subtasks</h4>
                  </div>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {completedSubtasks}/{totalSubtasks} completed
                    </span>
                  )}
                </div>
                
                <form onSubmit={handleAddSubtask} className="flex gap-2 mb-3">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newSubtask.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
                
                <div className="space-y-2">
                  {subtasks?.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => handleToggleSubtask(subtask)}
                      />
                      <span
                        className={cn(
                          'text-sm flex-1',
                          subtask.completed && 'line-through text-muted-foreground'
                        )}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                  
                  {(!subtasks || subtasks.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No subtasks yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
