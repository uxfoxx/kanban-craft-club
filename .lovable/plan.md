
## Findings

The roles are not missing because the rates are empty. The main problem is a data-matching mismatch in the UI:

1. `RateCardSettings.tsx` stores role `sub_category` values in lowercase:
   - `films`
   - `photography`
   - `design`
   - `tech`

2. `TaskDetailSheet.tsx` filters MAJOR roles using capitalized labels:
   - `Films`
   - `Photography`
   - `Design`

3. The code currently does exact matches like:
   - `r.sub_category === type`
   - `r.sub_category === subtask.work_type`

So even when the database has correct roles and rates, the dropdown returns an empty list because `"films"` does not equal `"Films"`.

There is also a second consistency issue:
- some finance logic still falls back to budget-based tier detection instead of using the manually selected task tier as the source of truth.

## Implementation Plan

### 1. Fix MAJOR role matching everywhere
Normalize category matching so rate-card roles work regardless of casing/label format.

Update `src/components/kanban/TaskDetailSheet.tsx`:
- replace the current hardcoded MAJOR type matching with normalized values
- make the type dropdown use values like `films`, `photography`, `design`
- show user-friendly labels in the UI
- update `rolesForType()` to compare normalized strings instead of exact case-sensitive text
- ensure both:
  - the “Add Subtask” MAJOR role dropdown
  - the subtask assignee role dropdown
  use the same normalized matching logic

### 2. Keep displayed labels friendly
Users should still see nice labels like “Films”, “Photography”, “Design”, while stored/compared values remain normalized.

This avoids future breakage between:
- rate card settings
- task detail sheet
- subtask detail sheet
- commission calculations

### 3. Make manual task tier the only commission tier
Update the task-level finance logic so commissions are driven by the manually selected `task.tier_id`, not by task budget fallback.

Update:
- `src/components/kanban/TaskDetailSheet.tsx`
- `src/hooks/useProjectSubtaskEarnings.ts`
- `src/components/kanban/SubtaskRow.tsx`

Plan:
- stop using budget auto-detection as the effective tier for commission logic
- use the selected task tier as the source of truth
- keep task budget visible for display/reporting only

### 4. Align earnings logic with MAJOR category matching
Fix rate lookups in:
- `src/hooks/useProjectSubtaskEarnings.ts`
- `src/components/kanban/SubtaskRow.tsx`

So MAJOR role earnings also use normalized subcategory/work type matching. Otherwise the dropdown may show roles but earnings could still appear as zero.

### 5. Fix backend recalculation logic to honor task tier
The current database recalculation function uses project-level tier/budget logic, which can conflict with manual task-tier behavior.

Update backend logic so commission recalculation uses each task’s own selected tier for subtask commission calculations.

This likely requires a migration because the current function `recalculate_project_financials(...)` is database-side logic.

### 6. Add organization-wide finances page
Build a separate organization finance view for admins to review payouts clearly.

Create:
- `src/components/workspace/OrgFinancesPage.tsx`

Update:
- `src/components/workspace/FinancialsTab.tsx`
- `src/hooks/useOrgFinancials.ts`

Features:
- show each team member’s finances only to org admins
- filters for:
  - month
  - pending work finances
  - completed work finances
  - all
- grouped totals per person
- quick summary cards for total pending / total payable

## Files to Update

- `src/components/kanban/TaskDetailSheet.tsx`
- `src/components/kanban/SubtaskRow.tsx`
- `src/hooks/useProjectSubtaskEarnings.ts`
- `src/components/workspace/FinancialsTab.tsx`
- `src/hooks/useOrgFinancials.ts`
- `src/components/workspace/OrgFinancesPage.tsx` (new)
- database migration to update commission recalculation function

## Expected Result

After this:
- MAJOR task role dropdowns will show the roles already stored in the rate card
- the selected manual tier will control commission behavior
- budget remains display-only
- MAJOR role earnings and badges will calculate correctly
- admins will get a clean team-finances page for payout review
