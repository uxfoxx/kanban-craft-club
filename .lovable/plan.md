

# Full Plan: Subtask-Level Commission + Delivery-Based Payout + Withdrawal System

## Summary of All Requirements

1. **Subtask-level commissions** -- subtask assignees get paid, not main task assignees
2. **Commission mode per task** -- `role`, `type`, or `hybrid` driven by project tier (MAJOR defaults role, MINOR/NANO default hybrid)
3. **Each subtask declares its own mode** -- role-based (assignee gets a role) or type-based (subtask has work_type + complexity)
4. **Delivery-based payout** -- commissions stay "potential" until "Deliver to Client" is clicked (`completed_at` set). Moving to Done column alone does NOT confirm commissions.
5. **Withdrawal system** -- users request withdrawals from confirmed balance; org owner reviews time/work reports and manually approves/rejects
6. **Customizable tiers** -- seeded defaults (MAJOR/MINOR/NANO) but fully editable via `organization_tiers` table and UI
7. **Rate card uses dynamic tier columns** -- `rate_card_rates` join table replaces hardcoded `rate_major`/`rate_minor`/`rate_nano` columns
8. **All rate data is editable** in the existing RateCardSettings UI

---

## Part 1: Database Migration

### 1A. Dynamic Tiers

**New table `organization_tiers`:**
```
id, organization_id, name, slug, min_budget, position, created_at
UNIQUE(organization_id, slug)
```
RLS: org members SELECT; org admins INSERT/UPDATE/DELETE.

Seed default tiers (major/350000, minor/100000, nano/0) for every existing organization.

**New table `rate_card_rates`:**
```
id, rate_card_id (FK commission_rate_card), tier_id (FK organization_tiers), rate numeric DEFAULT 0
UNIQUE(rate_card_id, tier_id)
```
RLS: same as commission_rate_card.

Migrate existing `rate_major`/`rate_minor`/`rate_nano` values into `rate_card_rates` rows, then drop those 3 columns from `commission_rate_card`.

Update `projects.project_tier` from text to `tier_id uuid NULL` (FK to `organization_tiers`). Migrate existing text values.

### 1B. Subtask Commission Columns

- `tasks`: add `commission_mode text DEFAULT 'role'` (values: 'role', 'type', 'hybrid')
- `subtasks`: add `work_type text NULL`, `complexity text NULL`, `commission_mode text DEFAULT 'role'` (values: 'role', 'type')
- `subtask_assignees`: add `role text NULL` + UPDATE RLS policy (currently missing)

### 1C. Withdrawal Requests Table

**New table `withdrawal_requests`:**
```
id, user_id, organization_id, amount, status DEFAULT 'pending' ('pending'/'approved'/'rejected'),
note text, admin_note text, time_report jsonb, work_report jsonb,
created_at, updated_at
```
RLS: users SELECT/INSERT own rows; org owners/admins SELECT all in org + UPDATE status.

### 1D. Rewrite `recalculate_project_financials`

Core logic changes:
- **Confirmed** = tasks with `completed_at IS NOT NULL` (delivered), not just in Done column
- **Potential** = all other tasks (including Done column without delivery)
- Pay **subtask assignees** instead of task assignees:
  - Subtask `commission_mode = 'role'`: lookup each assignee's `role` in rate card via `rate_card_rates` + project's `tier_id`
  - Subtask `commission_mode = 'type'`: lookup subtask's `work_type` + `complexity` in rate card deliverables via `rate_card_rates` + project's `tier_id`, pay to each assignee
- Keep existing percentage/fixed subtask commission as manual override fallback
- On withdrawal approval: deduct from `user_wallets.balance`

---

## Part 2: Types & Hooks

### 2A. New types in `database.ts`
- `OrganizationTier { id, organization_id, name, slug, min_budget, position, created_at }`
- `RateCardRate { id, rate_card_id, tier_id, rate }`
- `WithdrawalRequest { id, user_id, organization_id, amount, status, note, admin_note, time_report, work_report, created_at, updated_at }`
- Update `Task`: add `commission_mode`
- Update `Subtask`: add `work_type`, `complexity`, `commission_mode`
- Update `SubtaskAssignee`: add `role`
- Update `Project`: change `project_tier` to `tier_id`

### 2B. New hooks
- **`useOrganizationTiers.ts`** -- CRUD for `organization_tiers`
- **`useWithdrawalRequests.ts`** -- user's own requests + create mutation (auto-generates time/work report snapshots)
- **`useOrgWithdrawals.ts`** -- admin: fetch all org requests + approve/reject mutations

### 2C. Updated hooks
- **`useRateCard.ts`** -- fetch rates via `rate_card_rates` joined with `organization_tiers`. `getRateForTier` takes `tier_id` instead of string. Remove `computeProjectTier`.
- **`useProjects.ts`** -- save `tier_id` instead of `project_tier` text
- **`useAssignees.ts`** -- add `useUpdateSubtaskAssigneeRole` mutation
- **`useTasks.ts`** -- pass `commission_mode` in create/update; add subtask `work_type`/`complexity`/`commission_mode` update mutations

---

## Part 3: Frontend -- Tier Management

### 3A. New `TierSettings.tsx` (workspace settings)
- List all tiers for org: name, slug, min_budget threshold, position
- Inline edit name and min_budget
- Add new tier / delete tier (with warning about existing projects)
- Accessible from PluginSettingsPage or OrganizationSettings

### 3B. Update `RateCardSettings.tsx`
- Table headers = dynamic tier names (from `organization_tiers`) instead of hardcoded Major/Minor/Nano
- Editing a rate updates the `rate_card_rates` row
- When adding a new entry, create `rate_card_rates` rows for each tier (default 0)

### 3C. Update `ProjectSettings.tsx`
- Tier selector uses dynamic org tiers (dropdown of `organization_tiers`)
- Auto-suggest tier based on budget using `min_budget` thresholds
- Category selector for relevant tiers

---

## Part 4: Frontend -- Task & Subtask Commission Flow

### 4A. Update `CreateTaskDialog.tsx`
- Add **commission mode** selector: Role-Based / Type-Based / Hybrid (default from project tier)
- Remove work_type/complexity from task level (these move to subtask level)
- Keep budget at task level

### 4B. Update `TaskDetailSheet.tsx`
- **Finance tab**: show commission mode badge/selector (role/type/hybrid)
- Remove role dropdown from main task assignees (roles move to subtask level)
- Keep budget + weight % at task level

### 4C. Update `SubtaskDetailPage` (inside TaskDetailSheet)
- Add **commission mode toggle** per subtask: "Role-Based" or "Type-Based"
  - Only available if parent task mode is `hybrid`; if parent is `role` or `type`, subtask inherits that mode and toggle is locked
- **When role-based**: show role dropdown per assignee (filtered by project tier), display rate from rate card
- **When type-based**: show work_type dropdown + complexity selector on the subtask, display deliverable rate; all assignees earn that amount
- Keep existing percentage/fixed commission as override option

### 4D. Update `SubtaskRow.tsx`
- Show role badge or type+complexity badge with the rate amount in the summary line

---

## Part 5: Frontend -- Delivery-Based Payout

### 5A. Delivery logic (already exists via "Deliver to Client" button)
- No UI change needed -- button already sets `completed_at`
- The DB function change (Part 1D) handles confirmed vs potential logic
- Wallet shows: **Confirmed** = delivered tasks only, **Potential** = all other assigned work

---

## Part 6: Frontend -- Withdrawal System

### 6A. Update `UserWallet.tsx`
- Add **"Request Withdrawal"** button (only when confirmed balance > 0)
- Show list of past withdrawal requests with status badges (pending/approved/rejected)

### 6B. New `WithdrawalRequestDialog.tsx`
- Amount input (max = confirmed balance)
- Optional note field
- Auto-generated preview of time report (hours per project/task) and work report (delivered tasks/subtasks) before submit
- On submit: snapshot reports as JSON, insert into `withdrawal_requests`

### 6C. New `WithdrawalManagement.tsx` (org admin)
- List of all pending/past withdrawal requests from org members
- Each request: user name, amount, date, expandable time report + work report
- Approve/Reject buttons with optional admin note
- On approve: deduct from user's confirmed balance via DB function

### 6D. Add to `OrganizationSettings.tsx`
- New "Withdrawals" section for org owners/admins
- Show pending count badge

---

## Implementation Order

1. **Migration** -- new tables (`organization_tiers`, `rate_card_rates`, `withdrawal_requests`), new columns on tasks/subtasks/subtask_assignees, data migration for tiers & rates, rewrite `recalculate_project_financials`
2. **Types + hooks** -- all new types, tier hooks, withdrawal hooks, updated rate card/assignee/task hooks
3. **Tier management UI** -- `TierSettings.tsx`, updated `RateCardSettings.tsx`
4. **Task/subtask commission UI** -- updated `CreateTaskDialog`, `TaskDetailSheet`, `SubtaskDetailPage`, `SubtaskRow`
5. **Wallet + withdrawal UI** -- updated `UserWallet.tsx`, new `WithdrawalRequestDialog.tsx`, new `WithdrawalManagement.tsx`

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | New tables, columns, data migration, rewrite recalculate function |
| `src/types/database.ts` | Add OrganizationTier, RateCardRate, WithdrawalRequest; update Task, Subtask, SubtaskAssignee, Project |
| `src/hooks/useOrganizationTiers.ts` | **New** -- CRUD for tiers |
| `src/hooks/useWithdrawalRequests.ts` | **New** -- user withdrawal CRUD |
| `src/hooks/useOrgWithdrawals.ts` | **New** -- admin withdrawal management |
| `src/hooks/useRateCard.ts` | Refactor to use `rate_card_rates` join with dynamic tiers |
| `src/hooks/useProjects.ts` | Use `tier_id` instead of `project_tier` text |
| `src/hooks/useAssignees.ts` | Add `useUpdateSubtaskAssigneeRole` |
| `src/hooks/useTasks.ts` | Pass `commission_mode`; subtask work_type/complexity/commission_mode updates |
| `src/components/workspace/TierSettings.tsx` | **New** -- tier management UI |
| `src/components/workspace/RateCardSettings.tsx` | Dynamic tier columns |
| `src/components/workspace/PluginSettingsPage.tsx` | Add Tier Settings link |
| `src/components/projects/ProjectSettings.tsx` | Dynamic tier selector |
| `src/components/projects/ProjectCostSheet.tsx` | Use tier_id for rate lookups |
| `src/components/kanban/CreateTaskDialog.tsx` | Commission mode selector, remove work_type from task level |
| `src/components/kanban/TaskDetailSheet.tsx` | Commission mode on task; move role/type controls to subtask detail; delivery-based payout display |
| `src/components/kanban/SubtaskRow.tsx` | Show role or type earning badge |
| `src/components/personal/UserWallet.tsx` | Add withdrawal button + request history |
| `src/components/personal/WithdrawalRequestDialog.tsx` | **New** -- withdrawal form with report preview |
| `src/components/organizations/WithdrawalManagement.tsx` | **New** -- admin approval UI |
| `src/components/organizations/OrganizationSettings.tsx` | Add Withdrawals section |
| `src/hooks/useUserWallet.ts` | Update monthly earnings to use delivery-based confirmed status |
| `.lovable/plan.md` | Update with full system status |

