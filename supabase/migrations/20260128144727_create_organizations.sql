/*
  # Create Organizations System

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, optional)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `user_id` (uuid, references auth.users)
      - `role` (text: owner, admin, member)
      - `created_at` (timestamptz)
      - `unique(organization_id, user_id)`

  2. Security
    - Enable RLS on both tables
    - Users can view organizations they are members of
    - Organization owners and admins can manage members
    - Only organization owners can delete organizations
    - Authenticated users can create organizations

  3. Functions
    - `is_organization_member()` - Check if user is member of organization
    - `is_organization_admin()` - Check if user is admin or owner
    - `is_organization_owner()` - Check if user is owner
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organization policies
CREATE POLICY "Users can view organizations they belong to" 
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organizations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create organizations" 
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners and admins can update" 
  ON public.organizations FOR UPDATE
  USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only organization owners can delete" 
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());

-- Organization members policies
CREATE POLICY "Members can view organization members" 
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.organization_id = organization_members.organization_id 
        AND om.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Owners and admins can add members" 
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organization_members.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      ))
    )
  );

CREATE POLICY "Owners and admins can remove members" 
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organization_members.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      ))
    )
  );

CREATE POLICY "Owners and admins can update member roles" 
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = organization_members.organization_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      ))
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_organization_member(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id 
    AND (owner_id = p_user_id OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = p_organization_id AND user_id = p_user_id
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_organization_admin(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = p_organization_id 
    AND user_id = p_user_id 
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_organization_owner(p_organization_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = p_organization_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON public.organizations 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-add owner as member with owner role
CREATE OR REPLACE FUNCTION public.add_owner_as_organization_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW 
  EXECUTE FUNCTION public.add_owner_as_organization_member();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;