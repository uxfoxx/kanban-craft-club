import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubtaskTimeEntry } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useSubtaskTimeEntries = (subtaskId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subtask-time-entries', subtaskId, user?.id],
    queryFn: async () => {
      if (!subtaskId || !user) return [];
      const { data, error } = await supabase
        .from('subtask_time_entries')
        .select('*')
        .eq('subtask_id', subtaskId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data as SubtaskTimeEntry[];
    },
    enabled: !!subtaskId && !!user,
  });
};

export const useActiveSubtaskTimeEntry = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`subtask-time-entries-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtask_time_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-subtask-time-entry'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['active-subtask-time-entry', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('subtask_time_entries')
        .select('*, subtasks(*)')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as (SubtaskTimeEntry & { subtasks: { title: string; task_id: string } }) | null;
    },
    enabled: !!user,
  });
};

export const useStartSubtaskTimeEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ subtaskId }: { subtaskId: string }) => {
      await supabase
        .from('subtask_time_entries')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: 0,
        })
        .eq('user_id', user!.id)
        .is('ended_at', null);

      const { data, error } = await supabase
        .from('subtask_time_entries')
        .insert({
          subtask_id: subtaskId,
          user_id: user!.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-subtask-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['subtask-time-entries'] });
    },
  });
};

export const useStopSubtaskTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, description }: { entryId: string; description?: string }) => {
      const { data: entry } = await supabase
        .from('subtask_time_entries')
        .select('started_at')
        .eq('id', entryId)
        .single();

      const startedAt = new Date(entry!.started_at);
      const endedAt = new Date();
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      const { data, error } = await supabase
        .from('subtask_time_entries')
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
      queryClient.invalidateQueries({ queryKey: ['active-subtask-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['subtask-time-entries'] });
    },
  });
};

export const useUpdateSubtaskTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      subtaskId,
      startedAt,
      endedAt,
      description
    }: {
      entryId: string;
      subtaskId: string;
      startedAt?: Date;
      endedAt?: Date;
      description?: string;
    }) => {
      const updates: Record<string, unknown> = {};

      if (description !== undefined) updates.description = description;
      if (startedAt) updates.started_at = startedAt.toISOString();
      if (endedAt) updates.ended_at = endedAt.toISOString();

      if (startedAt || endedAt) {
        const { data: current } = await supabase
          .from('subtask_time_entries')
          .select('started_at, ended_at')
          .eq('id', entryId)
          .single();

        if (current) {
          const start = startedAt || new Date(current.started_at);
          const end = endedAt || (current.ended_at ? new Date(current.ended_at) : null);

          if (end) {
            updates.duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
          }
        }
      }

      const { data, error } = await supabase
        .from('subtask_time_entries')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-time-entries', variables.subtaskId] });
      queryClient.invalidateQueries({ queryKey: ['active-subtask-time-entry'] });
    },
  });
};

export const useDeleteSubtaskTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, subtaskId }: { entryId: string; subtaskId: string }) => {
      const { error } = await supabase
        .from('subtask_time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtask-time-entries', variables.subtaskId] });
    },
  });
};

export const useCreateManualSubtaskTimeEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      subtaskId,
      startedAt,
      endedAt,
      description
    }: {
      subtaskId: string;
      startedAt: Date;
      endedAt: Date;
      description?: string;
    }) => {
      const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

      const { data, error } = await supabase
        .from('subtask_time_entries')
        .insert({
          subtask_id: subtaskId,
          user_id: user!.id,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtask-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['active-subtask-time-entry'] });
    },
  });
};
