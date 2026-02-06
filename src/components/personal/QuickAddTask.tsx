import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProjectCombobox } from './ProjectCombobox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const QuickAddTask: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedProjectId || !user) return;
    
    setIsLoading(true);
    
    try {
      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('project_id', selectedProjectId)
        .eq('is_default', true)
        .limit(1);
      
      let columnId = columns?.[0]?.id;
      
      if (!columnId) {
        const { data: anyColumn } = await supabase
          .from('kanban_columns')
          .select('id')
          .eq('project_id', selectedProjectId)
          .order('position', { ascending: true })
          .limit(1);
        
        columnId = anyColumn?.[0]?.id;
        if (!columnId) throw new Error('No columns found in project');
      }
      
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          project_id: selectedProjectId,
          created_by: user.id,
          status: 'todo',
          priority: 'medium',
          column_id: columnId,
          due_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (taskError) throw taskError;
      
      const { error: assignError } = await supabase
        .from('task_assignees')
        .insert({
          task_id: task.id,
          user_id: user.id,
          assigned_by: user.id,
        });
      
      if (assignError) throw assignError;
      
      toast({
        title: 'Task created',
        description: 'Your task has been added and assigned to you.',
      });
      
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['my-tasks-today'] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Quick Add Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="What do you need to do?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1"
          />
          <ProjectCombobox value={selectedProjectId} onChange={setSelectedProjectId} />
          <Button 
            type="submit" 
            disabled={!title.trim() || !selectedProjectId || isLoading}
            className="flex-shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">Add</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
