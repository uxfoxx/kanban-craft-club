-- Fix orphan tasks by assigning them to their project's first "To Do" column
UPDATE public.tasks t
SET column_id = (
  SELECT kc.id 
  FROM public.kanban_columns kc 
  WHERE kc.project_id = t.project_id 
  ORDER BY kc.position ASC 
  LIMIT 1
)
WHERE t.column_id IS NULL;