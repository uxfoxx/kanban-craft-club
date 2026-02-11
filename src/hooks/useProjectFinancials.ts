import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectFinancials, TaskCommission } from '@/types/database';
import { useEffect } from 'react';

export const useProjectFinancials = (projectId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`financials-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_financials', filter: `project_id=eq.${projectId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['project-financials', projectId] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ['project-financials', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('project_financials')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data as ProjectFinancials | null;
    },
    enabled: !!projectId,
  });
};

export const useTaskCommissions = (projectId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`commissions-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_commissions', filter: `project_id=eq.${projectId}` },
        () => { queryClient.invalidateQueries({ queryKey: ['task-commissions', projectId] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ['task-commissions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('task_commissions')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as TaskCommission[];
    },
    enabled: !!projectId,
  });
};
