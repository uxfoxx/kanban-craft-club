import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';
import { useEffect } from 'react';

export interface Comment {
  id: string;
  user_id: string;
  task_id: string | null;
  subtask_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
}

export type CommentWithProfile = Comment & { profile?: Profile };

export const useComments = (taskId?: string, subtaskId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['comments', taskId || subtaskId];

  useEffect(() => {
    if (!taskId && !subtaskId) return;

    const channel = supabase
      .channel(`comments-${taskId || subtaskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: taskId ? `task_id=eq.${taskId}` : `subtask_id=eq.${subtaskId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [taskId, subtaskId, queryClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('comments').select('*').order('created_at', { ascending: true });

      if (taskId) query = query.eq('task_id', taskId);
      else if (subtaskId) query = query.eq('subtask_id', subtaskId);
      else return [];

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(c => ({
        ...c,
        mentions: (c.mentions as string[]) || [],
        profile: profileMap.get(c.user_id),
      })) as CommentWithProfile[];
    },
    enabled: !!(taskId || subtaskId),
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
      content,
      mentions,
    }: {
      taskId?: string;
      subtaskId?: string;
      content: string;
      mentions: string[];
    }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user!.id,
          task_id: taskId || null,
          subtask_id: subtaskId || null,
          content,
          mentions,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.taskId || variables.subtaskId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, parentId }: { commentId: string; parentId: string }) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.parentId] });
    },
  });
};
