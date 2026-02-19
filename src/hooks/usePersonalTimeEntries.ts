import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PersonalTimeEntryRow {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export const usePersonalTimeEntries = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['personal-time-entries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('personal_time_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PersonalTimeEntryRow[];
    },
    enabled: !!user,
  });
};

export const useCreatePersonalTimeEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, started_at, ended_at, duration_seconds }: {
      name: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number | null;
    }) => {
      const { data, error } = await supabase
        .from('personal_time_entries' as any)
        .insert({ user_id: user!.id, name, started_at, ended_at, duration_seconds } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-time-entries'] });
    },
  });
};

export const useDeletePersonalTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('personal_time_entries' as any)
        .delete()
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['all-my-time-entries'] });
    },
  });
};
