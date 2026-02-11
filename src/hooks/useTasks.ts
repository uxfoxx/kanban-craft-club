import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, Subtask, TaskPriority } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useTasks = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!projectId) return;
    
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
  
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
};

export const useSubtasks = (taskId: string | undefined) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!taskId) return;
    
    const channel = supabase
      .channel(`subtasks-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
  
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      description,
      priority,
      columnId,
      dueDate,
      cost,
    }: {
      projectId: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      columnId?: string;
      dueDate?: string;
      cost?: number;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title,
          description,
          priority: priority || 'medium',
          column_id: columnId,
          created_by: user!.id,
          due_date: dueDate,
          cost: cost ?? 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      updates, 
      projectId 
    }: { 
      taskId: string; 
      updates: Partial<Task>; 
      projectId: string;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useUpdateTaskColumn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, columnId, projectId }: { taskId: string; columnId: string; projectId: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ column_id: columnId })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, status, projectId }: { taskId: string; status: string; projectId: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
};

export const useToggleSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subtaskId, completed, taskId }: { subtaskId: string; completed: boolean; taskId: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update({ completed })
        .eq('id', subtaskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] });
    },
  });
};

export const useDeleteSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subtaskId, taskId }: { subtaskId: string; taskId: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
};

export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subtaskId, title, taskId }: { subtaskId: string; title: string; taskId: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update({ title })
        .eq('id', subtaskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
};
