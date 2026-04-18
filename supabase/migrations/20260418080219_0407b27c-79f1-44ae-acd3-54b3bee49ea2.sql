
-- 1. Subtask due dates
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS due_date date;

-- 2. Attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  subtask_id uuid REFERENCES public.subtasks(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_attachments_target_check CHECK (
    (task_id IS NOT NULL AND subtask_id IS NULL) OR
    (task_id IS NULL AND subtask_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_subtask ON public.task_attachments(subtask_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Helper: a user can access an attachment row if they can access the parent task
CREATE POLICY "Project members can view attachments"
ON public.task_attachments FOR SELECT
USING (
  (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id
      AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
  ))
  OR
  (subtask_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subtasks s JOIN public.tasks t ON t.id = s.task_id
     WHERE s.id = task_attachments.subtask_id
       AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
  ))
);

CREATE POLICY "Project members can insert attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND (
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id
        AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
    ))
    OR
    (subtask_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.subtasks s JOIN public.tasks t ON t.id = s.task_id
       WHERE s.id = task_attachments.subtask_id
         AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()) OR is_project_organization_member(t.project_id, auth.uid()))
    ))
  )
);

CREATE POLICY "Uploader or project owners can delete attachments"
ON public.task_attachments FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR (task_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND is_project_owner(t.project_id, auth.uid())
  ))
  OR (subtask_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subtasks s JOIN public.tasks t ON t.id = s.task_id
     WHERE s.id = task_attachments.subtask_id AND is_project_owner(t.project_id, auth.uid())
  ))
);

-- 3. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path is "<project_id>/<task_or_subtask_id>/<filename>"
-- We gate by project_id which is the first folder.
CREATE POLICY "Project members can read task attachment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Project members can upload task attachment files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Project members can delete task attachment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
  )
);
