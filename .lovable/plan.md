

# Remove Legacy Project-Level Finance Fields

## Overview
Strip out all the old project-level financial concepts (company/team/finder percentage splits, direct expenses, overhead expenses, and the `ProjectFinancials` component showing those splits). The new task-budget-based commission system we just built stays untouched.

---

## What Gets Removed

### Database columns (via migration)
From the `projects` table, drop these columns:
- `direct_expenses`
- `overhead_expenses`
- `company_share_pct`
- `team_share_pct`
- `finder_commission_pct`

From the `project_financials` table, drop these columns:
- `total_expenses`
- `gross_profit`
- `company_earnings`
- `team_pool`
- `finder_commission`
- `is_frozen`

(The `project_financials` table itself can be dropped entirely since all meaningful data now lives in `task_commissions` and `user_wallets`.)

---

### Files to delete
1. **`src/components/projects/ProjectFinancials.tsx`** -- the card showing budget-vs-expenses progress bar, gross profit, and company/team/finder split boxes. No longer relevant.
2. **`src/hooks/useProjectFinancials.ts`** -- queries `project_financials` table for the old split data. No longer needed.

### Files to modify

1. **`src/types/database.ts`**
   - Remove `direct_expenses`, `overhead_expenses`, `company_share_pct`, `team_share_pct`, `finder_commission_pct` from `Project` interface
   - Remove `ProjectFinancials` interface entirely

2. **`src/components/projects/ProjectSettings.tsx`**
   - Remove the entire "Financials" editing section (budget, overhead, company/team/finder percentage inputs and display)
   - Remove related state variables (`editedOverhead`, `editedCompanyPct`, `editedTeamPct`, `editedFinderPct`, `isEditingFinancials`)
   - Remove `handleSaveFinancials` and `startEditingFinancials` functions
   - Keep the rest of ProjectSettings intact (project details, owner, team members, delete)

3. **`src/hooks/useProjects.ts`** (`useUpdateProject`)
   - Remove `overheadExpenses`, `companySharePct`, `teamSharePct`, `finderCommissionPct` from the mutation parameters and the update object

4. **`src/components/kanban/KanbanBoard.tsx`**
   - Remove the `<ProjectFinancials>` component usage and its import (lines ~273-282)

5. **`src/components/workspace/FinancialsTab.tsx`**
   - Remove the "Direct Expenses" and "Overhead" display in the project breakdown (lines ~270-277)
   - Remove the Company/Team/Finder split boxes (lines ~280-294)
   - Keep everything else: org overview cards, commission records table, wallet, inline editing

6. **`src/hooks/useOrgFinancials.ts`**
   - Remove the `useOrgProjectFinancials` hook (queries the `project_financials` table which is being dropped)
   - Keep `useOrgCommissions`

---

## What Stays (untouched)
- Task `budget` field and all task-budget UI
- Subtask `commission_type` / `commission_value` fields
- `task_commissions` table and all commission logic
- `user_wallets` with `balance` and `potential_balance`
- `useUpdateCommission` hook
- `useIsOrgAdmin` hook
- Commission inline editing in FinancialsTab
- `UserWallet` component
- `recalculate_project_financials` function (it uses task budgets, not the old splits)

---

## Technical Details

### Migration SQL
```text
DROP TABLE IF EXISTS project_financials;

ALTER TABLE projects
  DROP COLUMN IF EXISTS direct_expenses,
  DROP COLUMN IF EXISTS overhead_expenses,
  DROP COLUMN IF EXISTS company_share_pct,
  DROP COLUMN IF EXISTS team_share_pct,
  DROP COLUMN IF EXISTS finder_commission_pct;
```

### FinancialsTab adjustments
The admin overview cards currently show Total Budget, Total Expenses, Gross Profit, and Frozen Projects. After removal of project_financials:
- Keep "Total Budget" (sum of project budgets)
- Replace "Total Expenses" with "Total Commissions" (sum of confirmed commission amounts)
- Replace "Gross Profit" with "Pending Commissions" (sum of pending commission amounts)
- Remove "Frozen Projects" card

### Files summary
| Action | File |
|--------|------|
| Delete | `src/components/projects/ProjectFinancials.tsx` |
| Delete | `src/hooks/useProjectFinancials.ts` |
| Modify | `src/types/database.ts` |
| Modify | `src/components/projects/ProjectSettings.tsx` |
| Modify | `src/hooks/useProjects.ts` |
| Modify | `src/components/kanban/KanbanBoard.tsx` |
| Modify | `src/components/workspace/FinancialsTab.tsx` |
| Modify | `src/hooks/useOrgFinancials.ts` |
| Migration | Drop `project_financials` table, drop old columns from `projects` |

