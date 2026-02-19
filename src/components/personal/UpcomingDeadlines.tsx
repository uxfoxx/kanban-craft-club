import React from 'react';
import { useMyAssignedTasks } from '@/hooks/usePersonalTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarClock } from 'lucide-react';
import { format, isPast, isToday, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

export const UpcomingDeadlines: React.FC = () => {
  const { data: tasks = [], isLoading } = useMyAssignedTasks();

  const now = new Date();
  const weekFromNow = addDays(now, 7);

  const upcomingTasks = tasks
    .filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due <= weekFromNow || isPast(due);
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const getUrgencyStyle = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    if (isPast(due) && !isToday(due)) return 'border-l-destructive bg-destructive/5';
    if (isToday(due)) return 'border-l-chart-4 bg-chart-4/5';
    return 'border-l-chart-5 bg-chart-5/5';
  };

  const getUrgencyLabel = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    if (isPast(due) && !isToday(due)) return 'Overdue';
    if (isToday(due)) return 'Today';
    const days = differenceInDays(due, now);
    return `${days}d left`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Upcoming Deadlines
          {upcomingTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">{upcomingTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines this week 🎉</p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {upcomingTasks.map(task => (
                <div
                  key={task.id}
                  className={cn('p-3 rounded-lg border-l-4 border transition-colors', getUrgencyStyle(task.due_date!))}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.projects?.name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {getUrgencyLabel(task.due_date!)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(task.due_date!), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
