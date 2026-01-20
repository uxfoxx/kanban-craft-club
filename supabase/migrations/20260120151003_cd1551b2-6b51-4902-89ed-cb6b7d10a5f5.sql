-- Add foreign key constraints from user tables to profiles for proper joins
-- First, add FK from project_members.user_id to profiles.user_id
ALTER TABLE public.project_members
ADD CONSTRAINT project_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from task_assignees.user_id to profiles.user_id
ALTER TABLE public.task_assignees
ADD CONSTRAINT task_assignees_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add FK from subtask_assignees.user_id to profiles.user_id
ALTER TABLE public.subtask_assignees
ADD CONSTRAINT subtask_assignees_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Create default kanban columns for any existing projects that don't have any columns
INSERT INTO public.kanban_columns (project_id, name, color, position, is_default)
SELECT p.id, 'To Do', '#6366f1', 0, true
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_columns k WHERE k.project_id = p.id);

INSERT INTO public.kanban_columns (project_id, name, color, position, is_default)
SELECT p.id, 'In Progress', '#f59e0b', 1, true
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_columns k WHERE k.project_id = p.id AND k.name = 'In Progress');

INSERT INTO public.kanban_columns (project_id, name, color, position, is_default)
SELECT p.id, 'Done', '#10b981', 2, true
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM public.kanban_columns k WHERE k.project_id = p.id AND k.name = 'Done');