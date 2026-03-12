import React from 'react';
import { useMyAssignedTasks } from '@/hooks/usePersonalTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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

  const getUrgencyBadge = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    if (isPast(due) && !isToday(due)) return { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/20' };
    if (isToday(due)) return { label: 'Today', className: 'bg-chart-4/10 text-chart-4 border-chart-4/20' };
    const days = differenceInDays(due, now);
    return { label: `${days}d left`, className: 'bg-chart-3/10 text-chart-3 border-chart-3/20' };
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          Upcoming Deadlines
          {upcomingTasks.length > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-auto rounded-full px-2">{upcomingTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No upcoming deadlines this week 🎉</p>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2 pr-2">
              {upcomingTasks.map(task => {
                const badge = getUrgencyBadge(task.due_date!);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border bg-muted/30 transition-all hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.projects?.name}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] flex-shrink-0 rounded-full', badge.className)}>
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {format(new Date(task.due_date!), 'MMM d, yyyy')}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
