import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CompletedTask {
  id: string;
  title: string;
  completed_at: string;
  project_id: string;
  projects: { name: string };
}

export const CompletedTasksView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['completed-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, completed_at, project_id, projects:project_id(name)')
        .eq('project_id', projectId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CompletedTask[];
    },
  });

  const restartTask = useMutation({
    mutationFn: async (taskId: string) => {
      // Find the "To Do" column
      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('project_id', projectId)
        .ilike('name', 'to do')
        .limit(1);
      
      const todoColumnId = columns?.[0]?.id;

      const { error } = await supabase
        .from('tasks')
        .update({ completed_at: null, ...(todoColumnId ? { column_id: todoColumnId } : {}) } as any)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completed-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task restarted');
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No delivered tasks yet</p>
        <p className="text-sm text-muted-foreground">Tasks marked as delivered will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{task.title}</p>
              {task.completed_at && (
                <p className="text-xs text-muted-foreground">
                  Delivered {format(new Date(task.completed_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => restartTask.mutate(task.id)}
              disabled={restartTask.isPending}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restart
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
