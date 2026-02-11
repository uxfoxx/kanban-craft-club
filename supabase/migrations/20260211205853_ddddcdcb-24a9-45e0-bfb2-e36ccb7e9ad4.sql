
-- Add start_date to projects
ALTER TABLE public.projects ADD COLUMN start_date date;

-- Create comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (
    (task_id IS NOT NULL AND subtask_id IS NULL) OR
    (task_id IS NULL AND subtask_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT - project members can view comments on their project's tasks
CREATE POLICY "Project members can view comments" ON public.comments
FOR SELECT USING (
  (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = comments.task_id
    AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
  ))
  OR
  (subtask_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM subtasks s JOIN tasks t ON t.id = s.task_id WHERE s.id = comments.subtask_id
    AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
  ))
);

-- RLS: INSERT
CREATE POLICY "Project members can create comments" ON public.comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t WHERE t.id = comments.task_id
      AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
    ))
    OR
    (subtask_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM subtasks s JOIN tasks t ON t.id = s.task_id WHERE s.id = comments.subtask_id
      AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
    ))
  )
);

-- RLS: UPDATE own comments
CREATE POLICY "Users can update own comments" ON public.comments
FOR UPDATE USING (auth.uid() = user_id);

-- RLS: DELETE own comments
CREATE POLICY "Users can delete own comments" ON public.comments
FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Notification trigger for @mentions
CREATE OR REPLACE FUNCTION public.notify_comment_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mentioned_user_id uuid;
  commenter_name text;
  task_title text;
  proj_id uuid;
  comment_snippet text;
BEGIN
  IF array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  comment_snippet := left(NEW.content, 100);

  IF NEW.task_id IS NOT NULL THEN
    SELECT t.title, t.project_id INTO task_title, proj_id FROM public.tasks t WHERE t.id = NEW.task_id;
  ELSIF NEW.subtask_id IS NOT NULL THEN
    SELECT s.title, t.project_id INTO task_title, proj_id
    FROM public.subtasks s JOIN public.tasks t ON t.id = s.task_id WHERE s.id = NEW.subtask_id;
  END IF;

  FOREACH mentioned_user_id IN ARRAY NEW.mentions LOOP
    IF mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
      VALUES (
        mentioned_user_id,
        proj_id,
        'mention',
        'Mentioned by ' || COALESCE(commenter_name, 'Someone'),
        COALESCE(commenter_name, 'Someone') || ' mentioned you in ' || COALESCE(task_title, 'a task') || ': ' || comment_snippet,
        jsonb_build_object('comment_id', NEW.id, 'task_id', NEW.task_id, 'subtask_id', NEW.subtask_id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_mention
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mention();
