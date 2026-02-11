import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectFinancials, TaskCommission } from '@/types/database';

export const useOrgProjectFinancials = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-financials', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      // Get all projects for this org
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId);
      if (projError) throw projError;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('project_financials')
        .select('*')
        .in('project_id', projectIds);
      if (error) throw error;
      return (data || []) as ProjectFinancials[];
    },
    enabled: !!orgId,
  });
};

export const useOrgCommissions = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-commissions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId);
      if (projError) throw projError;
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      const { data, error } = await supabase
        .from('task_commissions')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TaskCommission[];
    },
    enabled: !!orgId,
  });
};
