import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRateCardRoles, useRateCardDeliverables, getRateForTier } from '@/hooks/useRateCard';
import { useOrganizationTiers, getTierForBudget } from '@/hooks/useOrganizationTiers';

/**
 * Computes per-task potential earnings for the current user across a project.
 * Returns Record<taskId, earningAmount>.
 */
export const useProjectSubtaskEarnings = (projectId?: string, userId?: string, orgId?: string, projectBudget?: number) => {
  const rateCardRoles = useRateCardRoles(orgId);
  const rateCardDeliverables = useRateCardDeliverables(orgId);
  const { data: tiers = [] } = useOrganizationTiers(orgId);

  return useQuery({
    queryKey: ['project-subtask-earnings', projectId, userId, orgId, tiers.length, rateCardRoles.length, rateCardDeliverables.length],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!projectId || !userId) return {};

      // Fetch all tasks for the project
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, budget, commission_mode')
        .eq('project_id', projectId);
      if (!tasks || tasks.length === 0) return {};

      const taskIds = tasks.map(t => t.id);

      // Fetch subtasks for these tasks
      const { data: subtasks } = await supabase
        .from('subtasks')
        .select('id, task_id, commission_mode, commission_type, commission_value, work_type, complexity')
        .in('task_id', taskIds);
      if (!subtasks || subtasks.length === 0) return {};

      const subtaskIds = subtasks.map(s => s.id);

      // Fetch subtask assignees for current user only
      const { data: myAssignments } = await supabase
        .from('subtask_assignees')
        .select('subtask_id, role')
        .eq('user_id', userId)
        .in('subtask_id', subtaskIds);
      if (!myAssignments || myAssignments.length === 0) return {};

      const mySubtaskMap = new Map(myAssignments.map(a => [a.subtask_id, a.role]));

      // Determine project tier
      const projectTier = getTierForBudget(tiers, projectBudget || 0);
      const tierId = projectTier?.id;

      const earningsPerTask: Record<string, number> = {};

      for (const subtask of subtasks) {
        const myRole = mySubtaskMap.get(subtask.id);
        if (myRole === undefined && !mySubtaskMap.has(subtask.id)) continue;

        const parentTask = tasks.find(t => t.id === subtask.task_id);
        if (!parentTask) continue;

        let earning = 0;
        const mode = subtask.commission_mode || parentTask.commission_mode || 'role';

        // Manual override on subtask takes priority
        if (subtask.commission_type && subtask.commission_value > 0) {
          const taskBudget = Number(parentTask.budget) || 0;
          // Get count of assignees for this subtask
          const { count } = await supabase
            .from('subtask_assignees')
            .select('id', { count: 'exact', head: true })
            .eq('subtask_id', subtask.id);
          const assigneeCount = count || 1;
          
          if (subtask.commission_type === 'percentage') {
            earning = ((subtask.commission_value / 100) * taskBudget) / assigneeCount;
          } else {
            earning = subtask.commission_value / assigneeCount;
          }
        } else if (tierId) {
          if (mode === 'role' && myRole) {
            const entry = rateCardRoles.find(r => r.name === myRole);
            if (entry) earning = getRateForTier(entry, tierId);
          } else if (mode === 'type' && subtask.work_type) {
            const entry = rateCardDeliverables.find(d => d.name === subtask.work_type && d.complexity === subtask.complexity);
            if (entry) earning = getRateForTier(entry, tierId);
          }
        }

        if (earning > 0) {
          earningsPerTask[parentTask.id] = (earningsPerTask[parentTask.id] || 0) + earning;
        }
      }

      return earningsPerTask;
    },
    enabled: !!projectId && !!userId && tiers.length > 0,
    staleTime: 30000,
  });
};
