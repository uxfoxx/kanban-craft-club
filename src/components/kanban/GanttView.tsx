import React, { useMemo } from 'react';
import { Task, Profile } from '@/types/database';
import { KanbanColumn as KanbanColumnType } from '@/types/database';
import { differenceInDays, format, startOfDay, addDays, max, min, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttViewProps {
  tasks: Task[];
  columns: KanbanColumnType[];
  assigneesByTask: Map<string, { user_id: string; profile: Profile }[]>;
  onTaskClick: (task: Task) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({ tasks, columns, assigneesByTask, onTaskClick }) => {
  const columnMap = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns]);

  // Only show tasks that have a due date or created_at for positioning
  const tasksWithDates = useMemo(() => {
    return tasks.filter(t => t.due_date || t.created_at).map(t => {
      const start = startOfDay(parseISO(t.created_at));
      const end = t.due_date ? startOfDay(parseISO(t.due_date)) : addDays(start, 1);
      return { ...t, startDate: start, endDate: end };
    });
  }, [tasks]);

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = startOfDay(new Date());
      return { timelineStart: today, timelineEnd: addDays(today, 14), totalDays: 14 };
    }
    const allStarts = tasksWithDates.map(t => t.startDate);
    const allEnds = tasksWithDates.map(t => t.endDate);
    const earliest = min(allStarts);
    const latest = max(allEnds);
    const days = Math.max(differenceInDays(latest, earliest) + 2, 7);
    return { timelineStart: earliest, timelineEnd: addDays(earliest, days), totalDays: days };
  }, [tasksWithDates]);

  const dayHeaders = useMemo(() => {
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      days.push(addDays(timelineStart, i));
    }
    return days;
  }, [timelineStart, totalDays]);

  const todayOffset = differenceInDays(startOfDay(new Date()), timelineStart);

  if (tasksWithDates.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground text-sm">
        No tasks with dates to display on the timeline. Add due dates to your tasks to see them here.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-md overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 p-2 text-xs font-medium text-muted-foreground border-r bg-muted/30">
              Task
            </div>
            <div className="flex-1 flex">
              {dayHeaders.map((day, i) => (
                <div
                  key={i}
                  className={`flex-1 min-w-[40px] p-1 text-center text-[10px] text-muted-foreground border-r last:border-r-0 ${
                    i === todayOffset ? 'bg-primary/10 font-semibold' : ''
                  }`}
                >
                  {format(day, 'dd')}
                  <div className="text-[9px]">{format(day, 'EEE')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {tasksWithDates.map(task => {
            const startOffset = Math.max(differenceInDays(task.startDate, timelineStart), 0);
            const duration = Math.max(differenceInDays(task.endDate, task.startDate), 1);
            const leftPct = (startOffset / totalDays) * 100;
            const widthPct = (duration / totalDays) * 100;
            const col = task.column_id ? columnMap.get(task.column_id) : null;
            const isDone = col?.name.toLowerCase() === 'done';

            return (
              <div key={task.id} className="flex border-b last:border-b-0 hover:bg-muted/30">
                <div
                  className="w-48 flex-shrink-0 p-2 text-sm truncate border-r cursor-pointer hover:text-primary"
                  onClick={() => onTaskClick(task)}
                >
                  {task.title}
                </div>
                <div className="flex-1 relative h-10">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-1.5 h-6 rounded-sm cursor-pointer transition-colors ${
                          isDone
                            ? 'bg-primary/60'
                            : task.priority === 'high'
                            ? 'bg-destructive/60'
                            : 'bg-primary/40'
                        } hover:opacity-80`}
                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                        onClick={() => onTaskClick(task)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{task.title}</p>
                        <p>{format(task.startDate, 'MMM d')} → {format(task.endDate, 'MMM d')}</p>
                        <p>Status: {col?.name || task.status}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary/50"
                      style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
