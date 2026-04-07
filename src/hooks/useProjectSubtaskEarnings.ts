import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRateCardRoles, useRateCardDeliverables, getRateForTier } from '@/hooks/useRateCard';
import { useOrganizationTiers } from '@/hooks/useOrganizationTiers';

/**
 * Computes per-task potential earnings for the current user across a project.
 * Uses rate card lookups based on subtask commission_mode, work_type, complexity, and assignee roles.
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
        .select('id, task_id, commission_mode, work_type, complexity, quantity')
        .in('task_id', taskIds);
      if (!subtasks || subtasks.length === 0) return {};

      const subtaskIds = subtasks.map(s => s.id);

      // Fetch all subtask assignees (need counts + current user's role)
      const { data: allAssignments } = await supabase
        .from('subtask_assignees')
        .select('subtask_id, user_id, role')
        .in('subtask_id', subtaskIds);
      if (!allAssignments) return {};

      // Group by subtask
      const assignmentsBySubtask = new Map<string, typeof allAssignments>();
      for (const a of allAssignments) {
        const list = assignmentsBySubtask.get(a.subtask_id) || [];
        list.push(a);
        assignmentsBySubtask.set(a.subtask_id, list);
      }

      const earningsPerTask: Record<string, number> = {};

      for (const subtask of subtasks) {
        const assignments = assignmentsBySubtask.get(subtask.id) || [];
        const myAssignment = assignments.find(a => a.user_id === userId);
        if (!myAssignment) continue;

        const parentTask = tasks.find(t => t.id === subtask.task_id);
        if (!parentTask) continue;

        // Use manually selected tier only (budget is display-only)
        const manualTierId = (parentTask as any).tier_id;
        if (!manualTierId) continue;
        const taskTier = tiers.find(t => t.id === manualTierId);
        if (!taskTier) continue;

        let rate = 0;
        const mode = subtask.commission_mode || 'role';
        const isMajor = taskTier.slug?.toLowerCase() === 'major';

        if (mode === 'role' && myAssignment.role) {
          const entry = rateCardRoles.find(r => r.name === myAssignment.role && (!isMajor || r.sub_category?.toLowerCase() === subtask.work_type?.toLowerCase()));
          if (entry) rate = getRateForTier(entry, taskTier.id);
        } else if (mode === 'type' && subtask.work_type) {
          const entry = rateCardDeliverables.find(d => d.name === subtask.work_type && d.complexity === subtask.complexity);
          if (entry) rate = getRateForTier(entry, taskTier.id);
        }

        if (rate > 0) {
          const qty = (subtask as any).quantity || 1;
          const perPerson = (rate * qty) / (assignments.length || 1);
          earningsPerTask[parentTask.id] = (earningsPerTask[parentTask.id] || 0) + perPerson;
        }
      }

      return earningsPerTask;
    },
    enabled: !!projectId && !!userId && tiers.length > 0,
    staleTime: 30000,
  });
};
