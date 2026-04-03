import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskCommission } from '@/types/database';

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

export interface CommissionWithProfile extends TaskCommission {
  user_name: string;
}

export const useOrgCommissionsWithProfiles = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-commissions-with-profiles', orgId],
    queryFn: async (): Promise<CommissionWithProfile[]> => {
      if (!orgId) return [];

      // Get org projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId);
      if (!projects || projects.length === 0) return [];

      const projectIds = projects.map(p => p.id);
      const { data: commissions } = await supabase
        .from('task_commissions')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      if (!commissions || commissions.length === 0) return [];

      // Get unique user IDs and fetch profiles
      const userIds = [...new Set(commissions.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      return commissions.map(c => ({
        ...(c as TaskCommission),
        user_name: profileMap.get(c.user_id) || 'Unknown',
      }));
    },
    enabled: !!orgId,
  });
};
