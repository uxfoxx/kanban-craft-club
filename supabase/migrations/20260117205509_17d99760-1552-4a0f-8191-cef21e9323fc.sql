-- Create profiles table for user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project members table
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create tasks table with kanban status
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view projects they are members of" ON public.projects FOR SELECT
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid()
  ));
CREATE POLICY "Owners can update their projects" ON public.projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete their projects" ON public.projects FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Project members policies
CREATE POLICY "Project members can view members" ON public.project_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_members.project_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project owners can manage members" ON public.project_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND owner_id = auth.uid()));
CREATE POLICY "Project owners can delete members" ON public.project_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_members.project_id AND owner_id = auth.uid()));

-- Tasks policies
CREATE POLICY "Project members can view tasks" ON public.tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can create tasks" ON public.tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can update tasks" ON public.tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can delete tasks" ON public.tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = tasks.project_id AND (owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ))
  ));

-- Subtasks policies
CREATE POLICY "Project members can view subtasks" ON public.subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = subtasks.task_id AND (p.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = p.id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can manage subtasks" ON public.subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = subtasks.task_id AND (p.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = p.id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can update subtasks" ON public.subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = subtasks.task_id AND (p.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = p.id AND user_id = auth.uid()
    ))
  ));
CREATE POLICY "Project members can delete subtasks" ON public.subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = subtasks.task_id AND (p.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.project_members WHERE project_id = p.id AND user_id = auth.uid()
    ))
  ));

-- Time entries policies
CREATE POLICY "Users can view own time entries" ON public.time_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own time entries" ON public.time_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own time entries" ON public.time_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own time entries" ON public.time_entries FOR DELETE USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries;