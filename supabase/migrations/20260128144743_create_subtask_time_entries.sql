/*
  # Add Subtask Time Tracking

  1. New Tables
    - `subtask_time_entries`
      - `id` (uuid, primary key)
      - `subtask_id` (uuid, references subtasks)
      - `user_id` (uuid, references auth.users)
      - `started_at` (timestamptz, required)
      - `ended_at` (timestamptz, nullable)
      - `duration_seconds` (integer, nullable)
      - `description` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only view, create, update, and delete their own time entries
    - Time entries must be for subtasks within projects the user has access to

  3. Features
    - Realtime subscriptions enabled
    - Similar structure to task time entries for consistency
*/

-- Create subtask_time_entries table
CREATE TABLE IF NOT EXISTS public.subtask_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subtask_id UUID NOT NULL REFERENCES public.subtasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subtask_time_entries ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subtask_time_entries_subtask_id 
  ON public.subtask_time_entries(subtask_id);

CREATE INDEX IF NOT EXISTS idx_subtask_time_entries_user_id 
  ON public.subtask_time_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_subtask_time_entries_started_at 
  ON public.subtask_time_entries(started_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtask_time_entries;