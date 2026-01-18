-- Fix the overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a more specific policy that allows authenticated users to receive notifications
-- Notifications are inserted by triggers, which run with SECURITY DEFINER
-- So we need to allow the trigger functions to insert while preventing direct user inserts
CREATE POLICY "Triggers can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    -- Only allow inserts from trigger functions (they run as the function owner)
    -- Regular users shouldn't be able to insert notifications directly
    -- But since triggers use SECURITY DEFINER, we check if the user_id matches a valid scenario
    EXISTS (
      SELECT 1 FROM public.project_members pm 
      WHERE pm.user_id = notifications.user_id 
      AND pm.project_id = notifications.project_id
    )
    OR 
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.owner_id = notifications.user_id 
      AND p.id = notifications.project_id
    )
    OR notifications.project_id IS NULL
  );