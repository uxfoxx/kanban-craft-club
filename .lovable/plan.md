

# Make Commission Calculations Editable with Manual Override

## Overview
Currently, all commission amounts and statuses are computed automatically by the `recalculate_project_financials` database function and cannot be changed by users. This plan adds the ability for project owners/org admins to manually override any commission amount or status, while keeping the automatic algorithm as the default. Manual overrides are preserved across recalculations.

---

## 1. Database Changes (Migration)

### Add `manual_override` column to `task_commissions`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| manual_override | boolean | false | When true, recalculation skips this row |

### Add RLS policy for UPDATE on `task_commissions`
- Project owners and org members (admins) can UPDATE task_commissions for their projects
- Regular users cannot edit commissions

### Update `recalculate_project_financials` function
The key change: when distributing commissions, the function now:
1. Only reverts wallet balances for **non-overridden** confirmed commissions
2. Only deletes **non-overridden** commissions before recalculating
3. Skips inserting new commissions for task+user combos that have `manual_override = true`
4. Manually overridden commissions remain untouched through recalculations
5. When freezing (gross profit negative), overridden commissions are still frozen (safety measure) but their `manual_override` flag is preserved so they restore correctly when profit recovers

---

## 2. Frontend: Editable Commission Records

### Modify: `src/components/workspace/FinancialsTab.tsx`
In the Commission Records table (Section D), add inline editing:
- Each commission row gets an "Edit" icon button (pencil icon)
- Clicking it turns the amount into an editable input and the status into a dropdown
- "Save" and "Cancel" buttons appear inline
- Only visible to project owners / org admins
- A small "Manual" badge appears on overridden commissions to distinguish them from auto-calculated ones
- A "Reset to Auto" button on overridden commissions to remove the override and let the algorithm recalculate

Also in the per-project breakdown (Section C), the task commission sub-table gets the same edit capability.

### Modify: `src/components/kanban/TaskDetailSheet.tsx`
In the commission display area (already plugin-gated), allow the project owner to click and edit the commission amount for that specific task's assignees.

---

## 3. New Hook for Commission Editing

### New file: `src/hooks/useUpdateCommission.ts`
- `useUpdateCommission()` -- mutation that updates a task_commission's amount, status, and sets `manual_override = true`
- `useResetCommissionOverride(commissionId)` -- sets `manual_override = false` then triggers a recalculation by touching the project (a no-op update to trigger the recalc trigger)

---

## Files Summary

### New files (1):
1. `src/hooks/useUpdateCommission.ts` -- mutation hooks for editing/resetting commissions

### Modified files (3):
1. `src/components/workspace/FinancialsTab.tsx` -- inline edit on commission rows with Manual badge and Reset button
2. `src/components/kanban/TaskDetailSheet.tsx` -- editable commission amount for task assignees
3. `src/types/database.ts` -- add `manual_override` to TaskCommission interface

### Database migration:
- Add `manual_override` boolean column to `task_commissions`
- Add UPDATE RLS policy on `task_commissions` for project owners/org admins
- Replace `recalculate_project_financials` function to skip manually overridden commissions during recalculation

---

## Key Design Decisions

1. **Override flag, not separate table**: A simple `manual_override` boolean on the existing `task_commissions` table is the cleanest approach. No need for a separate overrides table.

2. **Overrides survive recalculation**: The recalc function explicitly skips rows where `manual_override = true`, so manual edits are never lost when tasks are moved, costs change, or budgets are updated.

3. **Safety freeze still applies**: Even manually overridden commissions get frozen when gross profit goes negative. This prevents paying out money that does not exist, regardless of manual edits.

4. **Reset to auto**: Users can easily remove an override and let the algorithm take over again, keeping the workflow flexible.

5. **Visual distinction**: A "Manual" badge on overridden commissions makes it clear which values are auto-calculated vs manually set, preventing confusion.

