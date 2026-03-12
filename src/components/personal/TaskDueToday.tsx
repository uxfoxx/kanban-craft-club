import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarCheck, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useMyTasksToday, TaskWithProject } from '@/hooks/usePersonalTasks';
import { useStartTimeEntry, useActiveTimeEntry } from '@/hooks/useTimeTracking';
import { Skeleton } from '@/components/ui/skeleton';

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
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
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${isCompleted ? 'bg-muted/30 opacity-60' : 'bg-card/50 backdrop-blur-sm hover:shadow-sm'}`}>
      <div className={`flex-shrink-0 ${isCompleted ? 'text-chart-2' : 'text-muted-foreground'}`}>
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
      
      <Badge variant="outline" className={`rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}>
        {task.priority}
      </Badge>
      
      {!isCompleted && (
        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStartTimer(task.id)}
          disabled={isActive}
          className="flex-shrink-0 rounded-lg"
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

  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return 0;
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            Tasks Due Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <CalendarCheck className="h-4 w-4 text-primary" />
            </div>
            Tasks Due Today
          </div>
          {totalCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {remainingCount} remaining
            </span>
          )}
        </CardTitle>
        {totalCount > 0 && (
          <div className="space-y-1 pt-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} completed
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tasks due today</p>
            <p className="text-xs text-muted-foreground">Take a well-deserved break!</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-2.5 pr-2">
              {sortedTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isActive={activeEntry?.task_id === task.id}
                  onStartTimer={handleStartTimer}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
