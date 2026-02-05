-- Drop existing restrictive policies on time_entries
DROP POLICY IF EXISTS "Users can view own time entries" ON time_entries;

-- Create new policy that allows users to view their own entries AND org admins/owners to view member entries
CREATE POLICY "Users and org admins can view time entries"
ON time_entries FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE t.id = time_entries.task_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = time_entries.task_id
    AND p.organization_id IS NOT NULL
    AND is_organization_owner(p.organization_id, auth.uid())
  )
);

-- Do the same for subtask_time_entries
DROP POLICY IF EXISTS "Users can view own subtask time entries" ON subtask_time_entries;

CREATE POLICY "Users and org admins can view subtask time entries"
ON subtask_time_entries FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    JOIN projects p ON p.id = t.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE s.id = subtask_time_entries.subtask_id
    AND om.user_id = auth.uid()
    AND om.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE s.id = subtask_time_entries.subtask_id
    AND p.organization_id IS NOT NULL
    AND is_organization_owner(p.organization_id, auth.uid())
  )
);