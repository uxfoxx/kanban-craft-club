

# Redesign Financial System: Task Budgets, Subtask Commissions, and Role-Based Visibility

## Overview
The current financial system uses project-level budgets and distributes earnings via company/team/finder splits. The new model shifts to **task-level budgets** where:
- Each task has its own budget (not just a cost)
- The task's assignee (project manager for that task) automatically gets 10% of the task budget
- Subtasks can have a percentage or fixed amount allocated from the remaining task budget
- Wallets show both **earned** (confirmed) and **potential** (pending if task completes) amounts
- Only admins/owners see everyone's financial data; regular members only see their own

---

## 1. Database Changes

### A. Modify `tasks` table
- Rename the existing `cost` column to `budget` (or add a `budget` column and deprecate `cost`)
- The task budget represents the total money allocated to this task

### B. Add columns to `subtasks` table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| commission_type | text | null | 'percentage' or 'fixed' |
| commission_value | numeric(12,2) | 0 | The percentage (e.g. 15) or fixed dollar amount |

### C. Modify `task_commissions` table
- Add `commission_source` column (text): 'task_manager' (10% auto), 'subtask', or 'manual'
- Add `subtask_id` column (uuid, nullable): links commission to a specific subtask when applicable

### D. Update `user_wallets` table
- Add `potential_balance` column (numeric, default 0): tracks money the user would earn if pending tasks complete

### E. Replace `recalculate_project_financials` function
The new logic:
1. For each completed task (in "Done" column):
   - 10% of task budget goes to the task's first assignee (project manager) as a confirmed commission
   - For each subtask with a commission_type set:
     - If `percentage`: calculate `(commission_value / 100) * task_budget` and distribute to the subtask's assignees
     - If `fixed`: use `commission_value` directly and distribute to subtask assignees
   - Remaining budget (after manager 10% + subtask allocations) stays with the project
2. For tasks NOT yet completed but with assignees/subtask assignees: calculate amounts as "potential" and track in `potential_balance` on wallets
3. Project-level financials (gross profit, company/team splits) are calculated from total task budgets vs project budget

### F. RLS Policy Updates
- `task_commissions` SELECT: users can see their own rows; admins/owners can see all rows for their org's projects (already partially in place)
- `subtasks` UPDATE for commission fields: only admins/owners can set `commission_type` and `commission_value`
- No changes to `user_wallets` (users already can only see their own)

---

## 2. Frontend Changes

### A. Task Creation and Detail (Budget field)
**Files:** `CreateTaskDialog.tsx`, `TaskDetailSheet.tsx`
- Replace "Cost" label with "Budget" 
- When expenses plugin is enabled, show "Task Budget ($)" input field
- In TaskDetailSheet, show who gets 10% auto-commission (the first assignee / task manager) with a label like "Task Manager Commission: 10% = $X"

### B. Subtask Commission Settings
**File:** `SubtaskRow.tsx`
- When expenses plugin is enabled and user is admin/owner, show a commission section in the subtask's expanded view:
  - A toggle between "Percentage" and "Fixed Amount"
  - An input for the value
  - A calculated preview showing the dollar amount based on the parent task's budget
- Regular users see only "Your commission: $X" (their own share) without edit capability

### C. Enhanced User Wallet
**File:** `UserWallet.tsx`
- Add "Potential Earnings" section showing money the user would earn if all assigned pending tasks complete
- Display: Confirmed Balance | Potential Earnings | Monthly Target progress
- The potential amount updates as tasks are completed (moves from potential to confirmed)

### D. Financials Tab - Role-Based Visibility
**File:** `FinancialsTab.tsx`
- **Admin/Owner view** (unchanged+enhanced): sees all commission records, can edit, sees everyone's percentages, full project breakdown
- **Member view** (new): sees only their own wallet, their own commission records filtered to their user_id, no visibility into other members' percentages or amounts
- Add a check using `useOrganizationMembers` to determine if the current user is admin/owner

### E. New Hook for Role Check
**File:** `src/hooks/useIsOrgAdmin.ts`
- Simple hook that checks if the current user is admin or owner of the current organization
- Used throughout finance components to conditionally render admin-only UI

---

## 3. Files Summary

### New files (1):
1. `src/hooks/useIsOrgAdmin.ts` -- role check hook for admin/owner status

### Modified files (7):
1. `src/types/database.ts` -- update Task (budget field), Subtask (commission fields), TaskCommission (source, subtask_id), UserWallet (potential_balance)
2. `src/components/kanban/CreateTaskDialog.tsx` -- rename Cost to Budget
3. `src/components/kanban/TaskDetailSheet.tsx` -- show Budget instead of Cost, show manager commission info (admin only)
4. `src/components/kanban/SubtaskRow.tsx` -- add commission type/value inputs for admins, show own commission for members
5. `src/components/personal/UserWallet.tsx` -- add Potential Earnings display
6. `src/components/workspace/FinancialsTab.tsx` -- role-based filtering, show only own data for members
7. `src/hooks/useUserWallet.ts` -- add potential earnings query

### Database migration:
- Add `budget` column to tasks (keep `cost` for backward compat or migrate data)
- Add `commission_type`, `commission_value` to subtasks
- Add `commission_source`, `subtask_id` to task_commissions
- Add `potential_balance` to user_wallets
- Replace `recalculate_project_financials` function with new task-budget-based logic
- Add RLS: restrict subtask commission field updates to admins/owners only

---

## 4. Key Design Decisions

1. **Task budget replaces project-level cost tracking**: Each task is a self-contained budget unit. The project budget is the sum of task budgets (or can be set independently for profit tracking).

2. **10% auto-commission for task manager**: The first assignee on a task is considered the task manager and automatically earns 10% of the task budget when the task is completed. This is not editable by default but admins can override via manual commission editing.

3. **Subtask commission flexibility**: Admins can choose percentage-of-task-budget or fixed-amount for each subtask. This allows both proportional and absolute payment structures.

4. **Potential vs confirmed earnings**: Users can see what they stand to earn (potential) alongside what has been confirmed. This provides motivation and transparency without waiting for task completion.

5. **Role-based visibility enforced at both DB and UI level**: RLS ensures members cannot query other users' commissions. The UI additionally hides admin controls (percentages, edit buttons, other users' data) for non-admin users. This is defense in depth.

