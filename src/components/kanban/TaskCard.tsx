import React from 'react';
import { Task } from '@/types/database';
import { useStartTimeEntry, useActiveTimeEntry } from '@/hooks/useTimeTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Calendar, Flag } from 'lucide-react';
import { format, differenceInHours, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const startTimer = useStartTimeEntry();
  const { data: activeEntry } = useActiveTimeEntry();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleStartTimer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await startTimer.mutateAsync({ taskId: task.id });
      toast.success('Timer started');
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const isTimerActive = activeEntry?.task_id === task.id;

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-chart-4';
      case 'low':
        return 'text-chart-5';
      default:
        return 'text-muted-foreground';
    }
  };

  // Calculate deadline status for glow effect
  const getDeadlineStatus = () => {
    if (!task.due_date || task.status === 'done') return null;
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    
    if (isPast(dueDate)) {
      return 'overdue';
    }
    
    const hoursUntilDue = differenceInHours(dueDate, now);
    
    if (hoursUntilDue <= 24) {
      return 'urgent'; // Within 24 hours
    }
    
    if (hoursUntilDue <= 48) {
      return 'warning'; // Within 48 hours
    }
    
    return null;
  };

  const deadlineStatus = getDeadlineStatus();

  return (
    <Card
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all hover:shadow-md bg-card',
        isTimerActive && 'ring-2 ring-primary',
        deadlineStatus === 'overdue' && 'animate-pulse ring-2 ring-destructive shadow-[0_0_15px_hsl(var(--destructive)/0.5)]',
        deadlineStatus === 'urgent' && 'animate-pulse ring-2 ring-destructive/70 shadow-[0_0_10px_hsl(var(--destructive)/0.3)]',
        deadlineStatus === 'warning' && 'ring-2 ring-chart-4 shadow-[0_0_10px_hsl(var(--chart-4)/0.3)]'
      )}
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
          <Flag className={cn('h-4 w-4 flex-shrink-0', getPriorityColor())} />
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                deadlineStatus === 'overdue' && 'text-destructive font-medium',
                deadlineStatus === 'urgent' && 'text-destructive/80 font-medium',
                deadlineStatus === 'warning' && 'text-chart-4 font-medium',
                !deadlineStatus && 'text-muted-foreground'
              )}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
          </div>
          
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant={isTimerActive ? 'default' : 'outline'}
              className="h-7 px-2"
              onClick={handleStartTimer}
              disabled={isTimerActive}
            >
              <Play className="h-3 w-3 mr-1" />
              {isTimerActive ? 'Active' : 'Start'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
