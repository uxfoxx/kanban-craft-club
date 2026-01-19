import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskAssignee, SubtaskAssignee, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export type TaskAssigneeWithProfile = TaskAssignee & { profiles?: Profile };

export const useTaskAssignees = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_assignees')
        .select(`*, profiles:user_id (*)`)
        .eq('task_id', taskId);
      
      if (error) throw error;
      return data as TaskAssigneeWithProfile[];
    },
    enabled: !!taskId,
  });
};

export const useAddTaskAssignee = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('task_assignees')
        .insert({ task_id: taskId, user_id: userId, assigned_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', variables.taskId] });
    },
  });
};

export const useRemoveTaskAssignee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', variables.taskId] });
    },
  });
};

export const useSubtaskAssignees = (subtaskId: string | undefined) => {
  return useQuery({
    queryKey: ['subtask-assignees', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return [];
      const { data, error } = await supabase.from('subtask_assignees').select(`*, profiles:user_id (*)`).eq('subtask_id', subtaskId);
      if (error) throw error;
      return data as (SubtaskAssignee & { profiles?: Profile })[];
    },
    enabled: !!subtaskId,
  });
};

export const useAddSubtaskAssignee = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const { data, error } = await supabase.from('subtask_assignees').insert({ subtask_id: subtaskId, user_id: userId, assigned_by: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees', variables.subtaskId] });
    },
  });
};

export const useRemoveSubtaskAssignee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const { error } = await supabase.from('subtask_assignees').delete().eq('subtask_id', subtaskId).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees', variables.subtaskId] });
    },
  });
};
