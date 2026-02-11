import React, { useMemo, useState } from 'react';
import { useMyAssignedTasks } from '@/hooks/usePersonalTasks';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PersonalCalendar: React.FC = () => {
  const { data: tasks = [], isLoading } = useMyAssignedTasks();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Map of date string -> tasks due that day
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    tasks.forEach(task => {
      if (task.due_date) {
        const key = task.due_date;
        const list = map.get(key) || [];
        list.push(task);
        map.set(key, list);
      }
    });
    return map;
  }, [tasks]);

  // Dates that have tasks (for calendar dots)
  const datesWithTasks = useMemo(() => {
    return Array.from(tasksByDate.keys()).map(d => parseISO(d));
  }, [tasksByDate]);

  // Tasks for selected date
  const selectedDateTasks = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(key) || [];
  }, [selectedDate, tasksByDate]);

  const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <p className="text-sm text-muted-foreground">Your tasks and deadlines across all projects</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{ hasTasks: datesWithTasks }}
              modifiersStyles={{
                hasTasks: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--primary))',
                  textUnderlineOffset: '4px',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Tasks for selected date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              {selectedDateTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{selectedDateTasks.length} tasks</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : selectedDateTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks due on this date</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.projects?.name}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant={priorityVariant[task.priority] || 'secondary'} className="text-[10px]">
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{task.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
