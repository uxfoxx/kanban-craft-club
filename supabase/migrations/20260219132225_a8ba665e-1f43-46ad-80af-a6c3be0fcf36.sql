
-- 1. Create super admins table first
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 2. Helper function (now table exists)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = check_user_id
  )
$$;

-- 3. RLS policy on super_admins
CREATE POLICY "Super admins can view super_admins"
ON public.super_admins FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 4. Seed
INSERT INTO public.super_admins (user_id)
VALUES ('a434c9c6-90ea-4f5d-972c-b7f050c054a5');

-- 5. Allow super admins to see all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
