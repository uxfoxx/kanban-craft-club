

# Add Subtask Quantity & Duplicate Feature

## What We're Building

1. **Quantity field on subtasks** — each subtask gets a `quantity` column (default 1). The commission rate is multiplied by quantity, so `rate × quantity = total commission` for that subtask.
2. **Duplicate subtask** — a button in the subtask dropdown menu that creates a copy of the subtask with the same title, work_type, complexity, commission_mode, and quantity (but not completed state).

## Database Migration

Add `quantity` column to `subtasks` table:
```sql
ALTER TABLE public.subtasks ADD COLUMN quantity integer NOT NULL DEFAULT 1;
```

Update `recalculate_project_financials` function to multiply rates by `s.quantity` in all commission calculation paths (both confirmed and potential).

## File Changes

### 1. Migration SQL
- Add `quantity` column
- Update `recalculate_project_financials` to multiply `v_rate * s.quantity` and `v_subtask_share * s.quantity` everywhere rates are applied

### 2. `src/types/database.ts`
- Add `quantity: number` to `Subtask` interface

### 3. `src/hooks/useTasks.ts`
- `useCreateSubtask`: accept optional `quantity` param, pass to insert
- `useUpdateSubtask`: accept optional `quantity` in updates
- Add `useDuplicateSubtask` mutation: reads the subtask data, inserts a copy with same fields (title + " (copy)", work_type, complexity, commission_mode, quantity), then copies assignees from the original

### 4. `src/components/kanban/SubtaskRow.tsx`
- Show quantity badge when > 1
- Multiply `subtaskRate` by `subtask.quantity` for display
- Add "Duplicate" option to the dropdown menu
- Add inline quantity editor (small number input or stepper)

### 5. `src/components/kanban/TaskDetailSheet.tsx`
- In the "Add Subtask" form, add a small quantity input (default 1)
- Pass quantity to `createSubtask`
- In subtask detail page, show editable quantity field
- Multiply displayed rate by quantity

### 6. `src/hooks/useProjectSubtaskEarnings.ts`
- Multiply rate by `subtask.quantity` when calculating per-task earnings

### 7. `src/components/workspace/OrgFinancesPage.tsx`
- No changes needed (reads from task_commissions which are already calculated with quantity)

## Finance Impact

- **Rate card lookup** stays the same (finds rate for role/deliverable + tier)
- **Final commission** = `rate × quantity ÷ assignee_count` per person
- Both frontend display and backend recalculation use quantity as a multiplier

## Files Summary

| File | Change |
|------|--------|
| Migration SQL | Add `quantity` column, update financial function |
| `src/types/database.ts` | Add `quantity` to Subtask |
| `src/hooks/useTasks.ts` | Add quantity param + `useDuplicateSubtask` |
| `src/components/kanban/SubtaskRow.tsx` | Quantity badge, duplicate action, rate × qty |
| `src/components/kanban/TaskDetailSheet.tsx` | Quantity input in add form + detail view |
| `src/hooks/useProjectSubtaskEarnings.ts` | Multiply rate by quantity |

