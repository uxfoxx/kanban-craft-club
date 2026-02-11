import React, { useMemo } from 'react';
import { Task, Profile } from '@/types/database';
import { KanbanColumn as KanbanColumnType } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface ListViewProps {
  tasks: Task[];
  columns: KanbanColumnType[];
  assigneesByTask: Map<string, { user_id: string; profile: Profile }[]>;
  onTaskClick: (task: Task) => void;
}

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export const ListView: React.FC<ListViewProps> = ({ tasks, columns, assigneesByTask, onTaskClick }) => {
  const columnMap = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead className="hidden md:table-cell">Assignees</TableHead>
            <TableHead className="hidden md:table-cell">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map(task => {
              const col = task.column_id ? columnMap.get(task.column_id) : null;
              const assignees = assigneesByTask.get(task.id) || [];
              return (
                <TableRow
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onTaskClick(task)}
                >
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {col?.name || task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={priorityVariant[task.priority] || 'secondary'} className="text-xs">
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex -space-x-1">
                      {assignees.slice(0, 3).map(a => (
                        <Avatar key={a.user_id} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                            {getInitials(a.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {assignees.length > 3 && (
                        <span className="text-xs text-muted-foreground ml-2">+{assignees.length - 3}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
