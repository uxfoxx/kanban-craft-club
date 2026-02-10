import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';

export interface TeamMemberActivity {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  activeTask: { id: string; title: string; started_at: string } | null;
  todayTasks: { id: string; title: string; status: string; priority: string }[];
  todaySeconds: number;
}

export const useTeamActivity = (organizationId: string | undefined) => {
  const { user } = useAuth();
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  return useQuery({
    queryKey: ['team-activity', organizationId, todayStart],
    queryFn: async () => {
      if (!organizationId || !user) return [];

      // Get org members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:user_id (full_name, email, avatar_url)
        `)
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Get org projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', organizationId);

      const projectIds = projects?.map(p => p.id) || [];
      if (projectIds.length === 0) {
        return (members || []).map(m => {
          const profile = m.profiles as unknown as { full_name: string; email: string; avatar_url: string | null };
          return {
            user_id: m.user_id,
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url,
            activeTask: null,
            todayTasks: [],
            todaySeconds: 0,
          } as TeamMemberActivity;
        });
      }

      // Get all tasks in org projects
      const { data: orgTasks } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .in('project_id', projectIds);

      const taskIds = orgTasks?.map(t => t.id) || [];
      const taskMap = new Map(orgTasks?.map(t => [t.id, t]) || []);
      const todayStr = now.toISOString().split('T')[0];

      const result: TeamMemberActivity[] = [];

      for (const member of members || []) {
        const profile = member.profiles as unknown as { full_name: string; email: string; avatar_url: string | null };

        // Active time entry (no ended_at)
        let activeTask: TeamMemberActivity['activeTask'] = null;
        if (taskIds.length > 0) {
          const { data: activeEntries } = await supabase
            .from('time_entries')
            .select('task_id, started_at')
            .eq('user_id', member.user_id)
            .is('ended_at', null)
            .in('task_id', taskIds)
            .limit(1);

          if (activeEntries && activeEntries.length > 0) {
            const task = taskMap.get(activeEntries[0].task_id);
            if (task) {
              activeTask = {
                id: task.id,
                title: task.title,
                started_at: activeEntries[0].started_at,
              };
            }
          }
        }

        // Tasks assigned to member due today
        const { data: assignedTaskIds } = await supabase
          .from('task_assignees')
          .select('task_id')
          .eq('user_id', member.user_id);

        const memberTaskIds = assignedTaskIds?.map(a => a.task_id) || [];
        const todayTasks = (orgTasks || []).filter(
          t => memberTaskIds.includes(t.id) && t.due_date === todayStr
        ).map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority }));

        // Today's time
        let todaySeconds = 0;
        if (taskIds.length > 0) {
          const { data: entries } = await supabase
            .from('time_entries')
            .select('duration_seconds')
            .eq('user_id', member.user_id)
            .in('task_id', taskIds)
            .gte('started_at', todayStart)
            .lte('started_at', todayEnd);

          entries?.forEach(e => { todaySeconds += e.duration_seconds || 0; });
        }

        result.push({
          user_id: member.user_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url,
          activeTask,
          todayTasks,
          todaySeconds,
        });
      }

      return result;
    },
    enabled: !!organizationId && !!user,
    refetchInterval: 30000,
  });
};
