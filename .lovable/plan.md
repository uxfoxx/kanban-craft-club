
# Tier-Based Hybrid Costing System — Implementation Status

## ✅ Completed

### Database Migration
- Fixed `recalculate_project_financials` variable collision bug (inner loop `r` → `sub_r`)
- Added `project_category`, `agency_markup_pct`, `equipment_cost`, `miscellaneous_cost`, `discount` to `projects`
- Added `sub_category` to `commission_rate_card`
- Created `project_line_items` table with RLS
- Cleaned up duplicate rate card entries
- Re-seeded rate card with tier-specific roles and deliverables
- Created `organization_tiers` table (dynamic tiers replacing hardcoded Major/Minor/Nano)
- Created `rate_card_rates` join table (links rate cards to specific tiers)
- Created `withdrawal_requests` table with RLS
- Added `commission_mode` to `tasks` and `subtasks`
- Added `work_type`, `complexity`, `commission_mode` to `subtasks`
- Added `role` to `subtask_assignees`
- Added `tier_id` FK to `projects`
- Rewrote `recalculate_project_financials` for delivery-based payout (confirmed = completed_at IS NOT NULL)
- Subtask-level commission calculation (role-based and type-based)

### Frontend — Types & Hooks
- Added `OrganizationTier`, `RateCardRate`, `WithdrawalRequest` types
- Updated `Task`, `Subtask`, `SubtaskAssignee`, `Project` types
- Created `useOrganizationTiers` hook (CRUD)
- Created `useWithdrawalRequests` hook (user-side)
- Created `useOrgWithdrawals` hook (admin-side approve/reject)
- Updated `useRateCard` to use `rate_card_rates` join with dynamic tiers
- Updated `useProjects` to support `tier_id`
- Updated `useAssignees` with `useUpdateSubtaskAssigneeRole`
- Updated `useTasks` with `commission_mode`, subtask `work_type`/`complexity`/`commission_mode`

### Frontend — UI Components
- Updated `RateCardSettings` — dynamic tier columns from `organization_tiers`
- Updated `ProjectCostSheet` — uses tier_id for rate lookups
- Updated `CreateTaskDialog` — commission mode selector
- Updated `TaskDetailSheet` — uses dynamic tiers instead of hardcoded ProjectTier
- Created `TierSettings` — full CRUD UI for organization tiers
- Created `WithdrawalRequestDialog` — withdrawal form with time/work report preview
- Created `WithdrawalManagement` — admin approval/rejection interface
- Updated `UserWallet` — withdrawal button + recent request history
- Updated `OrganizationSettings` — added Withdrawals section for admins
- Updated `PluginSettingsPage` — added Tier Settings link

## 🔜 Future Enhancements
- Filter role dropdown in TaskDetailSheet by project tier + category
- Filter deliverable dropdown in CreateTaskDialog by project tier
- Show tier badge in FinancialsTab project breakdown
- Internal cost sheet PDF / client-facing quotation generation
- Subtask detail page with commission mode toggle per subtask
- SubtaskRow role/type earning badges
