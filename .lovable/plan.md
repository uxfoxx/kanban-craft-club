
Root cause: the role input is not really failing because tier saving is broken. The main issue is that when a subtask is created from the task sheet, the selected role/type is not being written into any persisted field that the subtask detail and earnings logic actually use.

What’s wrong now:
- In `CreateTaskDialog.tsx`, tier selection already gets passed as `tierId` during task creation.
- In `useTasks.ts`, `tier_id` is already inserted into `tasks`.
- In `KanbanBoard.tsx`, stale selected-task syncing is already present.
- But in `TaskDetailSheet.tsx`, when adding a subtask:
  - for MAJOR, `newSubtaskRole` is collected in UI but never saved
  - for MINOR/NANO role mode, `newSubtaskRole` is also collected but never saved
- Later, subtask commission UI reads role from `subtask_assignees[0].role`, so a newly created subtask has no role until the user manually sets one after creation. That makes it look like “tier starts working later”.

Implementation plan:
1. Fix subtask creation so selected role is persisted immediately
- In `TaskDetailSheet.tsx`, after `createSubtask.mutateAsync(...)`, capture the returned subtask.
- If a role-based subtask was created and `newSubtaskRole` is selected, automatically create/update the first subtask assignee role record, or store it using the same structure the rest of the screen already depends on.
- For MAJOR: save both `work_type` and the selected role.
- For MINOR/NANO role mode: save the selected role right away.
- For MINOR/NANO deliverable mode: keep saving `work_type` + `complexity`.

2. Make the add-subtask form safer and clearer
- In `TaskDetailSheet.tsx`, prevent submitting a role-based subtask without a selected role.
- Prevent submitting a MAJOR subtask without both type and role.
- Prevent submitting a deliverable-based subtask without deliverable and complexity.
- Add small inline validation text so the flow is obvious.

3. Make role selection depend on the effective task tier consistently
- Keep using `task.tier_id` first, with budget fallback only when no manual tier exists.
- Ensure the tier badge and dropdown continue reflecting the current task state after updates.

4. Improve the UX so users understand why fields appear
- In the subtask form, show a short explanation:
  - Major: choose category + role
  - Minor/Nano: choose role-based or deliverable-based
- If no tier is selected, keep showing the “select a tier” hint, but make it more prominent and block incomplete submission.

5. Verify related subtask detail behavior
- In the subtask detail section of `TaskDetailSheet.tsx`, keep role dropdowns visible and populated from the rate card.
- Ensure the saved role appears immediately in:
  - subtask badges
  - earnings/rate display
  - assignee role selector

Files to update:
- `src/components/kanban/TaskDetailSheet.tsx` — main fix; persist selected role on subtask creation and add validation UX
- Possibly `src/hooks/useTasks.ts` only if the current create-subtask mutation must return/use extra fields, but likely no backend/schema change is needed

Technical note:
No database migration appears necessary for this fix. The issue is in the frontend flow: the form gathers role data, but the create flow never persists it into the role source that the rest of the commission system reads.
