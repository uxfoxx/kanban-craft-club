-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Project members can view members" ON public.project_members;

-- Create a security definer function to check project membership without recursion
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a security definer function to check project ownership without recursion
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = p_project_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Recreate projects SELECT policy using the function
CREATE POLICY "Users can view projects they are members of" ON public.projects FOR SELECT
  USING (owner_id = auth.uid() OR public.is_project_member(id, auth.uid()));

-- Recreate project_members SELECT policy using the function
CREATE POLICY "Project members can view members" ON public.project_members FOR SELECT
  USING (public.is_project_owner(project_id, auth.uid()) OR public.is_project_member(project_id, auth.uid()));