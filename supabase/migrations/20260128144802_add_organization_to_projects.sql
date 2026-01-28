/*
  # Link Projects to Organizations

  1. Schema Changes
    - Add `organization_id` column to projects table
    - Add foreign key constraint to organizations
    - Add index for performance

  2. Security Updates
    - Update RLS policies to check organization membership
    - Users can view projects if they're members of the organization
    - Organization admins can manage projects
    - Keep backward compatibility with owner_id

  3. Data Migration
    - Set organization_id to null initially (will be populated by application)
    - Make it required after migration period
*/

-- Add organization_id column to projects (nullable initially for migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);

-- Drop old policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

-- Create new organization-aware policies
CREATE POLICY "Organization members can view projects" 
  ON public.projects FOR SELECT
  USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = projects.organization_id
      AND (
        o.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id AND om.user_id = auth.uid()
        )
      )
    ) OR
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create projects" 
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = projects.organization_id
      AND (
        o.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id 
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'member')
        )
      )
    )
  );

CREATE POLICY "Organization admins and project owners can update projects" 
  ON public.projects FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = projects.organization_id
      AND (
        o.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id 
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "Organization admins and project owners can delete projects" 
  ON public.projects FOR DELETE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = projects.organization_id
      AND (
        o.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = o.id 
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
        )
      )
    )
  );