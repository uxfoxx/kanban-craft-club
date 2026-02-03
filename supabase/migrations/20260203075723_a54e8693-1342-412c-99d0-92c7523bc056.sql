-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.organization_members;

-- Create SECURITY DEFINER function to check organization membership
CREATE OR REPLACE FUNCTION public.is_organization_member(org_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id AND user_id = check_user_id
  )
$$;

-- Create SECURITY DEFINER function to check organization ownership
CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = org_id AND owner_id = check_user_id
  )
$$;

-- Create SECURITY DEFINER function to check if user is org admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = org_id 
    AND user_id = check_user_id 
    AND role = 'admin'
  )
$$;

-- Recreate organization SELECT policy using the helper function
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    public.is_organization_member(id, auth.uid())
  );

-- Recreate organization_members policies using helper functions
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    public.is_organization_owner(organization_id, auth.uid()) OR
    public.is_organization_member(organization_id, auth.uid())
  );

CREATE POLICY "Owners and admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.is_organization_owner(organization_id, auth.uid()) OR
    public.is_organization_admin(organization_id, auth.uid())
  );

CREATE POLICY "Owners and admins can remove members"
  ON public.organization_members FOR DELETE
  USING (
    public.is_organization_owner(organization_id, auth.uid()) OR
    public.is_organization_admin(organization_id, auth.uid())
  );