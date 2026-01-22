-- Update project_members role constraint to allow 'admin' instead of 'manager'
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role IN ('admin', 'member'));

-- Migrate existing manager roles to admin
UPDATE public.project_members SET role = 'admin' WHERE role = 'manager';