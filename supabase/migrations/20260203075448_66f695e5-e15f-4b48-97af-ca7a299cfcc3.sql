-- Create subtask_time_entries table
CREATE TABLE public.subtask_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtask_id uuid NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subtask_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for subtask_time_entries
CREATE POLICY "Users can view own subtask time entries"
  ON public.subtask_time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subtask time entries"
  ON public.subtask_time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subtask time entries"
  ON public.subtask_time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own subtask time entries"
  ON public.subtask_time_entries FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for subtask_time_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtask_time_entries;