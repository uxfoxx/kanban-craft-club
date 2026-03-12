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
import { Play, Calendar, Clock, ArrowRightLeft, AlertTriangle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatLKR } from '@/lib/currency';
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
  potentialEarning?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, columnName, onClick, assignees = [], timeSpent, columns, onMoveToColumn, potentialEarning }) => {
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

  const getPriorityDot = () => {
    switch (task.priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-chart-4';
      case 'low': return 'bg-chart-2';
      default: return 'bg-muted-foreground';
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
        'transition-all hover:shadow-md group/card rounded-xl border-border/30',
        !isMobile && 'cursor-grab active:cursor-grabbing',
        isTimerActive && 'ring-2 ring-primary',
        deadlineStatus === 'overdue' && 'deadline-overdue',
        deadlineStatus === 'urgent' && 'deadline-urgent',
        deadlineStatus === 'warning' && 'deadline-warning',
        !deadlineStatus && 'bg-card/80 backdrop-blur-sm'
      )}
      draggable={!isMobile}
      onDragStart={!isMobile ? handleDragStart : undefined}
      onClick={onClick}
    >
      <CardContent className="p-3.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', getPriorityDot())} />
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          </div>
          {otherColumns.length > 0 && onMoveToColumn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRightLeft className="h-3 w-3" />
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
          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2.5 pl-3.5">
            {task.description}
          </p>
        )}
        
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-[11px]',
                deadlineStatus === 'overdue' && 'text-destructive font-semibold',
                deadlineStatus === 'urgent' && 'text-destructive/80 font-medium',
                deadlineStatus === 'warning' && 'text-chart-4 font-medium',
                !deadlineStatus && 'text-muted-foreground'
              )}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </div>
            )}
            {typeof timeSpent === 'number' && timeSpent > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(timeSpent)}
              </div>
            )}
            {typeof timeSpent === 'number' && (task as any).estimated_hours && timeSpent > (task as any).estimated_hours * 3600 && (
              <div className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" />
                Over
              </div>
            )}
          </div>
          
          {!isDone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={isTimerActive ? 'default' : 'ghost'}
                  className={cn(
                    'h-6 w-6 flex-shrink-0 rounded-lg',
                    !isTimerActive && 'opacity-0 group-hover/card:opacity-100 transition-opacity'
                  )}
                  onClick={handleStartTimer}
                  disabled={isTimerActive}
                >
                  {isTimerActive ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                    </span>
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isTimerActive ? 'Timer active' : 'Start timer'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Footer: avatars + earning */}
        {(assignees.length > 0 || (typeof potentialEarning === 'number' && potentialEarning > 0)) && (
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/20">
            {assignees.length > 0 ? (
              <div className="flex -space-x-1.5">
                {assignees.slice(0, 4).map(a => (
                  <Tooltip key={a.user_id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 border-2 border-card">
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-medium">
                          {getInitials(a.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {a.profile.full_name}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {assignees.length > 4 && (
                  <span className="text-[10px] text-muted-foreground ml-1">+{assignees.length - 4}</span>
                )}
              </div>
            ) : <div />}
            {typeof potentialEarning === 'number' && potentialEarning > 0 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 border-chart-2/30 bg-chart-2/10 text-chart-2 font-semibold rounded-full">
                <TrendingUp className="h-2.5 w-2.5" />
                +{formatLKR(potentialEarning)}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
