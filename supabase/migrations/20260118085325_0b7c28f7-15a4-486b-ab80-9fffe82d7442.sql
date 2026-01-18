-- Phase 1: Database Schema Changes

-- 1.1 Remove global role from profiles (make it optional/nullable)
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 1.2 Update project_members role to support admin/member (already supports text)

-- 1.3 Create kanban_columns table
CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.4 Add column_id to tasks (we'll migrate data after)
ALTER TABLE public.tasks ADD COLUMN column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL;

-- 1.5 Create task_assignees table (multi-assign)
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- 1.6 Create subtask_assignees table
CREATE TABLE public.subtask_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subtask_id, user_id)
);

-- 1.7 Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.8 Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  deadline_alerts BOOLEAN DEFAULT true,
  assignment_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtask_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_columns
CREATE POLICY "Project members can view columns" ON public.kanban_columns
  FOR SELECT USING (public.is_project_member(project_id, auth.uid()) OR public.is_project_owner(project_id, auth.uid()));

CREATE POLICY "Project owners and admins can insert columns" ON public.kanban_columns
  FOR INSERT WITH CHECK (public.is_project_owner(project_id, auth.uid()) OR public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners and admins can update columns" ON public.kanban_columns
  FOR UPDATE USING (public.is_project_owner(project_id, auth.uid()) OR public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners and admins can delete columns" ON public.kanban_columns
  FOR DELETE USING (public.is_project_owner(project_id, auth.uid()) OR public.is_project_member(project_id, auth.uid()));

-- RLS Policies for task_assignees
CREATE POLICY "Project members can view task assignees" ON public.task_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

CREATE POLICY "Project members can manage task assignees" ON public.task_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

CREATE POLICY "Project members can delete task assignees" ON public.task_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

-- RLS Policies for subtask_assignees
CREATE POLICY "Project members can view subtask assignees" ON public.subtask_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON t.id = s.task_id
      WHERE s.id = subtask_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

CREATE POLICY "Project members can manage subtask assignees" ON public.subtask_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON t.id = s.task_id
      WHERE s.id = subtask_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

CREATE POLICY "Project members can delete subtask assignees" ON public.subtask_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subtasks s
      JOIN public.tasks t ON t.id = s.task_id
      WHERE s.id = subtask_id AND (public.is_project_member(t.project_id, auth.uid()) OR public.is_project_owner(t.project_id, auth.uid()))
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences" ON public.notification_preferences
  FOR DELETE USING (user_id = auth.uid());

-- Function to create default kanban columns for a project
CREATE OR REPLACE FUNCTION public.create_default_kanban_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.kanban_columns (project_id, name, color, position, is_default) VALUES
    (NEW.id, 'To Do', '#6366f1', 0, true),
    (NEW.id, 'In Progress', '#f59e0b', 1, true),
    (NEW.id, 'Done', '#10b981', 2, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create default columns when project is created
CREATE TRIGGER create_project_kanban_columns
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_kanban_columns();

-- Function to create notification when user is added to project
CREATE OR REPLACE FUNCTION public.notify_project_member_added()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  SELECT name INTO project_name FROM public.projects WHERE id = NEW.project_id;
  INSERT INTO public.notifications (user_id, project_id, type, title, message)
  VALUES (NEW.user_id, NEW.project_id, 'project_invite', 'Added to Project', 'You have been added to project: ' || project_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_project_member_added
  AFTER INSERT ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_member_added();

-- Function to create notification when user is assigned to task
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  task_title TEXT;
  project_id UUID;
BEGIN
  SELECT t.title, t.project_id INTO task_title, project_id FROM public.tasks t WHERE t.id = NEW.task_id;
  INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
  VALUES (NEW.user_id, project_id, 'assignment', 'Task Assigned', 'You have been assigned to task: ' || task_title, jsonb_build_object('task_id', NEW.task_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notify_on_task_assigned
  AFTER INSERT ON public.task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Update the profile creation trigger to not require role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;