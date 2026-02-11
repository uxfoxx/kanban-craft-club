import React from 'react';
import { Task, Profile, KanbanColumn } from '@/types/database';
import { useStartTimeEntry, useActiveTimeEntry, formatDuration } from '@/hooks/useTimeTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Calendar, Flag, Clock, ArrowRightLeft } from 'lucide-react';
import { format, differenceInHours, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface TaskCardProps {
  task: Task;
  columnName?: string;
  onClick: () => void;
  assignees?: { user_id: string; profile: Profile }[];
  timeSpent?: number;
  columns?: KanbanColumn[];
  onMoveToColumn?: (taskId: string, columnId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, columnName, onClick, assignees = [], timeSpent, columns, onMoveToColumn }) => {
  const startTimer = useStartTimeEntry();
  const { data: activeEntry } = useActiveTimeEntry();
  const isMobile = useIsMobile();

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

  const handleMoveToColumn = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    onMoveToColumn?.(task.id, columnId);
  };

  const isTimerActive = activeEntry?.task_id === task.id;

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return 'border-l-destructive';
      case 'medium': return 'border-l-chart-4';
      case 'low': return 'border-l-chart-5';
      default: return 'border-l-muted-foreground';
    }
  };

  const isDone = columnName?.toLowerCase() === 'done' || task.status === 'done';

  const getDeadlineStatus = () => {
    if (!task.due_date || isDone) return null;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    if (isPast(dueDate)) return 'overdue';
    const hoursUntilDue = differenceInHours(dueDate, now);
    if (hoursUntilDue <= 24) return 'urgent';
    if (hoursUntilDue <= 48) return 'warning';
    return null;
  };

  const deadlineStatus = getDeadlineStatus();

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const otherColumns = columns?.filter(c => c.id !== task.column_id) || [];

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md border-l-4',
        getPriorityColor(),
        !deadlineStatus && 'bg-card',
        !isMobile && 'cursor-grab active:cursor-grabbing',
        isTimerActive && 'ring-2 ring-primary',
        deadlineStatus === 'overdue' && 'deadline-overdue',
        deadlineStatus === 'urgent' && 'deadline-urgent',
        deadlineStatus === 'warning' && 'deadline-warning'
      )}
      draggable={!isMobile}
      onDragStart={!isMobile ? handleDragStart : undefined}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
          {/* Move-to-column dropdown */}
          {otherColumns.length > 0 && onMoveToColumn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {otherColumns.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={(e) => handleMoveToColumn(e as any, col.id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: col.color || '#6366f1' }}
                    />
                    Move to {col.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
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
            {typeof timeSpent === 'number' && timeSpent > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(timeSpent)}
              </div>
            )}
          </div>
          
          {!isDone && (
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

        {/* Assignee avatars */}
        {assignees.length > 0 && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
            <div className="flex -space-x-2">
              {assignees.slice(0, 4).map(a => (
                <Tooltip key={a.user_id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(a.profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {a.profile.full_name}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            {assignees.length > 4 && (
              <span className="text-xs text-muted-foreground ml-1">+{assignees.length - 4}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
