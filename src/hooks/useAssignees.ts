import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskAssignee, SubtaskAssignee, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export const useTaskAssignees = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId);
      
      if (error) throw error;
      return data as TaskAssignee[];
    },
    enabled: !!taskId,
  });
};

export const useTaskAssigneesWithProfiles = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-assignees-profiles', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data: assignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId);
      
      if (assigneesError) throw assigneesError;
      if (!assignees.length) return [];
      
      const userIds = assignees.map(a => a.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      return assignees.map(assignee => ({
        ...assignee,
        profile: profiles.find(p => p.user_id === assignee.user_id),
      }));
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
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-assignees-profiles', variables.taskId] });
    },
  });
};

export const useRemoveTaskAssignee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-assignees', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-assignees-profiles', variables.taskId] });
    },
  });
};

export const useSubtaskAssignees = (subtaskId: string | undefined) => {
  return useQuery({
    queryKey: ['subtask-assignees', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return [];
      const { data, error } = await supabase
        .from('subtask_assignees')
        .select('*')
        .eq('subtask_id', subtaskId);
      
      if (error) throw error;
      return data as SubtaskAssignee[];
    },
    enabled: !!subtaskId,
  });
};

export const useSubtaskAssigneesWithProfiles = (subtaskId: string | undefined) => {
  return useQuery({
    queryKey: ['subtask-assignees-profiles', subtaskId],
    queryFn: async () => {
      if (!subtaskId) return [];
      
      const { data: assignees, error: assigneesError } = await supabase
        .from('subtask_assignees')
        .select('*')
        .eq('subtask_id', subtaskId);
      
      if (assigneesError) throw assigneesError;
      if (!assignees.length) return [];
      
      const userIds = assignees.map(a => a.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      return assignees.map(assignee => ({
        ...assignee,
        profile: profiles.find(p => p.user_id === assignee.user_id),
      }));
    },
    enabled: !!subtaskId,
  });
};

export const useAddSubtaskAssignee = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('subtask_assignees')
        .insert({
          subtask_id: subtaskId,
          user_id: userId,
          assigned_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees', variables.subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees-profiles', variables.subtaskId] });
    },
  });
};

export const useRemoveSubtaskAssignee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ subtaskId, userId }: { subtaskId: string; userId: string }) => {
      const { error } = await supabase
        .from('subtask_assignees')
        .delete()
        .eq('subtask_id', subtaskId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees', variables.subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['subtask-assignees-profiles', variables.subtaskId] });
    },
  });
};
