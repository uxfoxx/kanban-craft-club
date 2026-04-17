import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskCommission } from '@/types/database';

export interface CommissionWithNames extends TaskCommission {
  task_title?: string;
  subtask_title?: string;
}

const attachNames = async (commissions: TaskCommission[]): Promise<CommissionWithNames[]> => {
  if (commissions.length === 0) return [];
  const taskIds = [...new Set(commissions.map(c => c.task_id))];
  const subtaskIds = [...new Set(commissions.map(c => c.subtask_id).filter(Boolean) as string[])];

  const [tasksRes, subtasksRes] = await Promise.all([
    taskIds.length ? supabase.from('tasks').select('id, title').in('id', taskIds) : Promise.resolve({ data: [] as any[] }),
    subtaskIds.length ? supabase.from('subtasks').select('id, title').in('id', subtaskIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const taskMap = new Map((tasksRes.data || []).map((t: any) => [t.id, t.title]));
  const subtaskMap = new Map((subtasksRes.data || []).map((s: any) => [s.id, s.title]));

  return commissions.map(c => ({
    ...c,
    task_title: taskMap.get(c.task_id),
    subtask_title: c.subtask_id ? subtaskMap.get(c.subtask_id) : undefined,
  }));
};

export const useOrgCommissions = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-commissions', orgId],
    queryFn: async (): Promise<CommissionWithNames[]> => {
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
      return attachNames((data || []) as TaskCommission[]);
    },
    enabled: !!orgId,
  });
};

export interface CommissionWithProfile extends CommissionWithNames {
  user_name: string;
}

export const useOrgCommissionsWithProfiles = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-commissions-with-profiles', orgId],
    queryFn: async (): Promise<CommissionWithProfile[]> => {
      if (!orgId) return [];

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

      const userIds = [...new Set(commissions.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      const withNames = await attachNames(commissions as TaskCommission[]);

      return withNames.map(c => ({
        ...c,
        user_name: profileMap.get(c.user_id) || 'Unknown',
      }));
    },
    enabled: !!orgId,
  });
};
