---
name: Subtask Due Dates
description: Subtasks have an optional due_date (date) shown as a badge with overdue indicator in SubtaskRow and an editor in subtask detail.
type: feature
---
- Column: `subtasks.due_date date` (nullable)
- Editing: calendar popover in `SubtaskDetailPage` (TaskDetailSheet)
- Display: badge in `SubtaskRow` summary line; turns destructive (red) when overdue and not completed
- Mutations: `useCreateSubtask` / `useUpdateSubtask` accept `due_date` as `YYYY-MM-DD` string or null
