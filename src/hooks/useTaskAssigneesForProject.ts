import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

export interface TaskAssigneeInfo {
  task_id: string;
  user_id: string;
  profile: Profile;
}

export const useTaskAssigneesForProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['task-assignees-project', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Get all task IDs for this project
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      // Get all assignees for these tasks
      const { data: assignees, error: assigneesError } = await supabase
        .from('task_assignees')
        .select('*')
        .in('task_id', taskIds);

      if (assigneesError) throw assigneesError;
      if (!assignees || assignees.length === 0) return [];

      // Get profiles
      const userIds = [...new Set(assignees.map(a => a.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return assignees.map(a => ({
        task_id: a.task_id,
        user_id: a.user_id,
        profile: profileMap.get(a.user_id)!,
      })).filter(a => a.profile) as TaskAssigneeInfo[];
    },
    enabled: !!projectId,
  });
};

export const useTaskTimeForProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['task-time-project', projectId],
    queryFn: async () => {
      if (!projectId) return new Map<string, number>();

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return new Map<string, number>();

      const taskIds = tasks.map(t => t.id);

      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('task_id, duration_seconds')
        .in('task_id', taskIds)
        .not('duration_seconds', 'is', null);

      if (error) throw error;

      const timeMap = new Map<string, number>();
      entries?.forEach(e => {
        const current = timeMap.get(e.task_id) || 0;
        timeMap.set(e.task_id, current + (e.duration_seconds || 0));
      });

      return timeMap;
    },
    enabled: !!projectId,
  });
};
