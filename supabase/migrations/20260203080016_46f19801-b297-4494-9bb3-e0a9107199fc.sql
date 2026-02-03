-- Create helper function to check if user is member of project's organization
CREATE OR REPLACE FUNCTION public.is_project_organization_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = p_project_id AND om.user_id = p_user_id
  )
$$;

-- Update projects SELECT policy to include organization members
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    is_project_member(id, auth.uid()) OR
    public.is_project_organization_member(id, auth.uid())
  );

-- Update projects UPDATE policy to include organization admins
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
CREATE POLICY "Owners and org admins can update projects"
  ON public.projects FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    (organization_id IS NOT NULL AND public.is_organization_admin(organization_id, auth.uid()))
  );

-- Update projects DELETE policy  
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
CREATE POLICY "Owners can delete their projects"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

-- Update tasks policies to include organization members
DROP POLICY IF EXISTS "Project members can view tasks" ON public.tasks;
CREATE POLICY "Project members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id 
      AND (
        p.owner_id = auth.uid() OR 
        is_project_member(p.id, auth.uid()) OR
        public.is_project_organization_member(p.id, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Project members can create tasks" ON public.tasks;
CREATE POLICY "Project members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id 
      AND (
        p.owner_id = auth.uid() OR 
        is_project_member(p.id, auth.uid()) OR
        public.is_project_organization_member(p.id, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Project members can update tasks" ON public.tasks;
CREATE POLICY "Project members can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id 
      AND (
        p.owner_id = auth.uid() OR 
        is_project_member(p.id, auth.uid()) OR
        public.is_project_organization_member(p.id, auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Project members can delete tasks" ON public.tasks;
CREATE POLICY "Project members can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id 
      AND (
        p.owner_id = auth.uid() OR 
        is_project_member(p.id, auth.uid()) OR
        public.is_project_organization_member(p.id, auth.uid())
      )
    )
  );

-- Update kanban_columns policies
DROP POLICY IF EXISTS "Project members can view columns" ON public.kanban_columns;
CREATE POLICY "Project members can view columns"
  ON public.kanban_columns FOR SELECT
  USING (
    is_project_member(project_id, auth.uid()) OR 
    is_project_owner(project_id, auth.uid()) OR
    public.is_project_organization_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "Project owners and admins can insert columns" ON public.kanban_columns;
CREATE POLICY "Project owners and admins can insert columns"
  ON public.kanban_columns FOR INSERT
  WITH CHECK (
    is_project_owner(project_id, auth.uid()) OR 
    is_project_member(project_id, auth.uid()) OR
    public.is_project_organization_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "Project owners and admins can update columns" ON public.kanban_columns;
CREATE POLICY "Project owners and admins can update columns"
  ON public.kanban_columns FOR UPDATE
  USING (
    is_project_owner(project_id, auth.uid()) OR 
    is_project_member(project_id, auth.uid()) OR
    public.is_project_organization_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "Project owners and admins can delete columns" ON public.kanban_columns;
CREATE POLICY "Project owners and admins can delete columns"
  ON public.kanban_columns FOR DELETE
  USING (
    is_project_owner(project_id, auth.uid()) OR 
    is_project_member(project_id, auth.uid()) OR
    public.is_project_organization_member(project_id, auth.uid())
  );