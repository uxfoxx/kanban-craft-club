import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useTimeEntries = (taskId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['time-entries', taskId, user?.id],
    queryFn: async () => {
      if (!taskId || !user) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!taskId && !!user,
  });
};

export const useActiveTimeEntry = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel(`time-entries-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-time-entry'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
  
  return useQuery({
    queryKey: ['active-time-entry', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, tasks(*)')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as (TimeEntry & { tasks: { title: string; project_id: string } }) | null;
    },
    enabled: !!user,
  });
};

export const useStartTimeEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      // First, end any active time entries
      await supabase
        .from('time_entries')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: 0, // Will be calculated by a trigger or on fetch
        })
        .eq('user_id', user!.id)
        .is('ended_at', null);
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: taskId,
          user_id: user!.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
};

export const useStopTimeEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ entryId, description }: { entryId: string; description?: string }) => {
      const { data: entry } = await supabase
        .from('time_entries')
        .select('started_at')
        .eq('id', entryId)
        .single();
      
      const startedAt = new Date(entry!.started_at);
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          description,
        })
        .eq('id', entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
};

export const useUpdateTimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entryId, description, taskId }: { entryId: string; description: string; taskId: string }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update({ description })
        .eq('id', entryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.taskId] });
    },
  });
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entryId, taskId }: { entryId: string; taskId: string }) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', variables.taskId] });
    },
  });
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
