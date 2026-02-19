
-- Add completed_at and estimated_hours to tasks
ALTER TABLE public.tasks ADD COLUMN completed_at timestamptz DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN estimated_hours numeric DEFAULT NULL;

-- Add estimated_hours to subtasks
ALTER TABLE public.subtasks ADD COLUMN estimated_hours numeric DEFAULT NULL;

-- Create personal_time_entries table
CREATE TABLE public.personal_time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal time entries"
  ON public.personal_time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own personal time entries"
  ON public.personal_time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own personal time entries"
  ON public.personal_time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own personal time entries"
  ON public.personal_time_entries FOR DELETE
  USING (user_id = auth.uid());

-- Trigger: notify project lead when a task is created
CREATE OR REPLACE FUNCTION public.notify_lead_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_project_name text;
BEGIN
  SELECT lead_id, name INTO v_lead_id, v_project_name
  FROM public.projects WHERE id = NEW.project_id;

  IF v_lead_id IS NOT NULL AND v_lead_id != NEW.created_by THEN
    INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
    VALUES (
      v_lead_id,
      NEW.project_id,
      'assignment',
      'New Task Created',
      'A new task "' || NEW.title || '" was created in ' || v_project_name,
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_lead_on_task_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_task_created();

-- Trigger: notify project lead when task status/column changes
CREATE OR REPLACE FUNCTION public.notify_lead_task_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_project_name text;
  v_new_col_name text;
BEGIN
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    SELECT lead_id, name INTO v_lead_id, v_project_name
    FROM public.projects WHERE id = NEW.project_id;

    IF v_lead_id IS NOT NULL THEN
      SELECT name INTO v_new_col_name FROM public.kanban_columns WHERE id = NEW.column_id;
      INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
      VALUES (
        v_lead_id,
        NEW.project_id,
        'assignment',
        'Task Status Changed',
        'Task "' || NEW.title || '" moved to ' || COALESCE(v_new_col_name, 'unknown') || ' in ' || v_project_name,
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_lead_on_task_status_changed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_task_status_changed();

-- Trigger: notify project lead when a new member joins
CREATE OR REPLACE FUNCTION public.notify_lead_member_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_project_name text;
  v_member_name text;
BEGIN
  SELECT lead_id, name INTO v_lead_id, v_project_name
  FROM public.projects WHERE id = NEW.project_id;

  IF v_lead_id IS NOT NULL AND v_lead_id != NEW.user_id THEN
    SELECT full_name INTO v_member_name FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
    VALUES (
      v_lead_id,
      NEW.project_id,
      'project_invite',
      'New Team Member',
      COALESCE(v_member_name, 'A new member') || ' joined ' || v_project_name,
      jsonb_build_object('member_user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_lead_on_member_joined
  AFTER INSERT ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_member_joined();
