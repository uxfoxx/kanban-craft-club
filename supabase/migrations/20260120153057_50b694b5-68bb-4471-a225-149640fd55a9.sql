-- Add UPDATE policy for project_members so owners can update member roles
CREATE POLICY "Project owners can update members"
ON public.project_members
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = project_members.project_id
  AND projects.owner_id = auth.uid()
));