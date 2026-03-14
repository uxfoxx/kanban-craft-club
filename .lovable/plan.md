

# Remove Team Share & Add Manual Tier Selection

## Summary

Remove the "Team Share (LKR)" field everywhere — finances now use Task Budget directly. Make the tier manually selectable via a dropdown instead of auto-detected from budget.

## Changes

### 1. `src/components/kanban/CreateTaskDialog.tsx`
- Remove `teamShare` state and the "Team Share (LKR)" input field
- Remove `teamShare` from `handleSubmit` payload
- Keep the Tier dropdown (already exists) — ensure it passes `selectedTierId` when creating tasks

### 2. `src/hooks/useTasks.ts`
- Remove `teamShare` param from `useCreateTask`
- Stop setting `team_share` on insert (set to 0 or omit)

### 3. `src/components/kanban/TaskDetailSheet.tsx`
- Remove `localTeamShare` state and its debounced save effect
- Remove "Team Share (LKR)" input from the Finance tab
- Replace the auto-detected tier display with a `<Select>` dropdown that saves `tier_id` to the task via `updateTask`
- Remove `taskTeamShare` variable
- Stop passing `teamShare` to `SubtaskRow` and `SubtaskDetailPage`

### 4. `src/components/kanban/SubtaskRow.tsx`
- Remove `teamShare` prop (unused in logic anyway — rate comes from rate card)

### 5. `src/types/database.ts`
- Remove `team_share` from the `Task` interface

### 6. `src/hooks/useProjectSubtaskEarnings.ts`
- Remove `team_share` from the tasks select query (not used in calculations anyway)

### 7. Tier detection logic
- Currently: `getTierForBudget(orgTiers, taskBudget)` auto-detects tier from budget
- New: If task has a `tier_id`, use that directly. Fall back to auto-detect only if no `tier_id` set
- In TaskDetailSheet Finance tab: show a `<Select>` with all org tiers, saving to `tier_id` on the task

Note: The `tasks` table already has a `tier_id` column (nullable uuid) — no migration needed.

## Files Modified

| File | Change |
|------|--------|
| `src/components/kanban/CreateTaskDialog.tsx` | Remove team share input, pass tier_id on create |
| `src/components/kanban/TaskDetailSheet.tsx` | Remove team share field, add tier dropdown |
| `src/components/kanban/SubtaskRow.tsx` | Remove teamShare prop |
| `src/hooks/useTasks.ts` | Remove teamShare from create mutation |
| `src/hooks/useProjectSubtaskEarnings.ts` | Remove team_share from query |
| `src/types/database.ts` | Remove team_share from Task type |

