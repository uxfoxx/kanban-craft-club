

# Full Plan: Task Manager Role, Scrollable Modals, Earning Badges, Auto-Tier, and Privacy

## Summary of All New Requirements

1. **First assignee on main task = "Task Manager"** -- when creating a task and assigning someone, label them as Task Manager (stored in `task_assignees.role`)
2. **Scrollable modals** -- all dialog/sheet content that overflows should scroll properly (currently some tall modals are cut off)
3. **Potential earnings badge on TaskCard** -- green `+LKR X` badge showing how much the current user can earn if the task is delivered, visible on the kanban board
4. **Potential earnings on SubtaskRow** -- show the current user's potential earning from that subtask
5. **User sees only their own finances** -- regular members see only their personal earnings, not other people's commissions
6. **Auto-detect tier from task budget** -- the task automatically shows/uses the correct tier based on budget thresholds; no manual tier selection needed on tasks

## Existing System (Already Implemented)

- `organization_tiers` table with budget thresholds
- `rate_card_rates` join table for tier-specific rates
- `withdrawal_requests` table with RLS
- `commission_mode` on tasks/subtasks
- `recalculate_project_financials` function (delivery-based: `completed_at IS NOT NULL`)
- `TierSettings`, `RateCardSettings`, `WithdrawalManagement`, `WithdrawalRequestDialog` UI
- `UserWallet` with withdrawal request flow

---

## Changes

### 1. Task Manager Role on First Assignee

**`CreateTaskDialog.tsx`**
- Remove work_type, complexity, commissionMode state and UI fields (leftover from previous iteration -- lines 62-64, 66-85, 199-243)
- When creating a task, the first selected assignee gets `role: 'Task Manager'` via `addAssignee.mutateAsync({ taskId, userId, role: 'Task Manager' })`; subsequent assignees get no role
- Show "(Task Manager)" label next to the first assignee in the checkbox list

**`TaskDetailSheet.tsx` -- Assignees section (lines 440-505)**
- Remove the role dropdown for task-level assignees (lines 458-472) -- roles at task level are only "Task Manager" for the first assignee, not editable via rate card role picker
- Show "Task Manager" badge next to the first assignee instead of a role selector
- Remove duplicate Assignees section (lines 531-573)

### 2. Scrollable Modals

**`src/components/ui/dialog.tsx`**
- Add `max-h-[85vh] overflow-y-auto` to `DialogContent` class so all dialogs scroll when content overflows

**`CreateTaskDialog.tsx`**
- The `DialogContent` already has `sm:max-w-lg`; adding scroll at the dialog.tsx level fixes all dialogs globally

### 3. Potential Earnings on TaskCard (Green Badge)

**`TaskCard.tsx`**
- Accept new prop: `potentialEarning?: number`
- If `potentialEarning > 0` and task is not delivered (`completed_at` is null), show a green `+LKR X` badge in the card footer
- If task IS delivered, show a checkmark earning badge instead

**`KanbanBoard.tsx`**
- Compute per-task potential earnings for the current user:
  - For each task, look at subtasks where the current user is an assignee
  - Based on subtask commission_mode: if role-based, lookup user's subtask_assignee role in rate card; if type-based, lookup subtask work_type + complexity
  - Sum up the amounts per task
  - Pass as `potentialEarning` prop to `TaskCard`
- This requires fetching subtask assignees and subtask data for the project -- add a new hook `useProjectSubtaskEarnings(projectId, userId)` that returns a `Map<taskId, earning>`

**New hook: `useProjectSubtaskEarnings.ts`**
- Fetches all subtasks for project tasks, their assignees, and rate card data
- Filters for current user's assignments only
- Calculates potential earning per task
- Returns `Record<string, number>` (taskId → earning)

### 4. Potential Earnings on SubtaskRow

**`SubtaskRow.tsx`**
- Accept new props: `currentUserId?: string`, `projectTierId?: string`, `orgId?: string`
- If the current user is an assignee of this subtask, compute their earning:
  - Role-based: lookup assignee's role in rate card
  - Type-based: lookup subtask's work_type + complexity in rate card
- Show a green earning badge: `+LKR X` next to the subtask summary

### 5. User-Only Financial Visibility

**`TaskDetailSheet.tsx` -- Finance Tab (lines 726-812)**
- Remove "Commissions (Rate Card)" section that shows all assignees' commissions (lines 783-799)
- For non-admin users: only show the current user's potential earning from this task
- For admins: show a summary of total commission allocation but not individual breakdowns by default

**`SubtaskDetailPage` (lines 851-1042)**
- Non-admin users: hide commission type/value editing controls
- Show only "Your potential earning: LKR X" for the current user
- Already partially implemented: the `isOrgAdmin` check at line 955 controls edit access

### 6. Auto-Detect Tier from Task Budget

**`CreateTaskDialog.tsx`**
- When budget is entered, auto-detect the tier using `getTierForBudget(tiers, budget)` and show a read-only tier badge (e.g., "Major", "Minor", "Nano")
- No tier dropdown on tasks -- tier is purely derived from the project's tier or the task budget threshold

**`TaskDetailSheet.tsx` -- Finance Tab**
- Show auto-detected tier as a read-only badge based on task budget
- Commission mode auto-derived: shown as info text, not editable

**`TaskCard.tsx`**
- Optionally show a small tier indicator badge if expenses are enabled

---

## Files Summary

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | Add `max-h-[85vh] overflow-y-auto` to DialogContent |
| `src/components/kanban/CreateTaskDialog.tsx` | Remove work_type/complexity/commissionMode; first assignee gets "Task Manager" role; show auto-tier badge when budget entered |
| `src/components/kanban/TaskCard.tsx` | Add green `+LKR X` potential earning badge |
| `src/components/kanban/KanbanBoard.tsx` | Compute and pass per-task potential earnings for current user |
| `src/components/kanban/SubtaskRow.tsx` | Show current user's earning badge from rate card |
| `src/components/kanban/TaskDetailSheet.tsx` | Remove duplicate assignees section; remove role dropdown from task assignees; show "Task Manager" badge; remove all-assignee commission display from Finance tab; show only current user's earning; show auto-tier badge |
| `src/hooks/useProjectSubtaskEarnings.ts` | **New** -- compute per-task earnings for current user across project |
| `.lovable/plan.md` | Update status |

## Implementation Order

1. Fix `dialog.tsx` for scrollable modals (quick global fix)
2. Clean up `CreateTaskDialog` -- remove leftover fields, add Task Manager role logic, auto-tier badge
3. Clean up `TaskDetailSheet` -- remove duplicates, role dropdowns, per-assignee commissions; add user-only earning view and auto-tier badge
4. Create `useProjectSubtaskEarnings` hook
5. Update `TaskCard` with earning badge
6. Update `SubtaskRow` with earning badge
7. Update `KanbanBoard` to pass earnings data

