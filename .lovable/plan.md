

# Project Lead, Plugin System, Financial Engine, and User Wallet

## Overview
This plan updates the previously approved financial/commission system with three key changes from user feedback:
1. The expense/financial features are gated behind an **organization-level plugin toggle** (extensible for future plugins)
2. Commissions are **confirmed when a task is marked done** (not via a separate payment toggle)
3. A **user wallet** is added showing current balance, monthly available amount, and target progress

---

## 1. Database Changes (Single Migration)

### New table: `organization_plugins`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| organization_id | uuid | NOT NULL | FK to organizations(id) ON DELETE CASCADE |
| plugin_name | text | NOT NULL | e.g. 'expenses', future: 'invoicing', 'reports' |
| enabled | boolean | false | Toggle on/off |
| created_at | timestamptz | now() | |

- UNIQUE constraint on (organization_id, plugin_name)
- RLS: org members can SELECT; org owners/admins can INSERT/UPDATE/DELETE

### New columns on `projects` table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| lead_id | uuid, nullable | NULL | The project lead (references profiles user_id) |
| budget | numeric(12,2) | 0 | Total project budget |
| project_type | text, nullable | NULL | e.g. "Branding", "Campaign" |
| direct_expenses | numeric(12,2) | 0 | Auto-calculated sum of task costs |
| overhead_expenses | numeric(12,2) | 0 | Manually set |
| company_share_pct | numeric(5,2) | 50 | % of gross profit |
| team_share_pct | numeric(5,2) | 40 | % of gross profit |
| finder_commission_pct | numeric(5,2) | 10 | % for lead/finder |

### New columns on `tasks` table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| cost | numeric(12,2) | 0 | Task-level expense |
| weight_pct | numeric(5,2), nullable | NULL | For weighted commission split |

### New table: `project_financials` (computed snapshot)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK, UNIQUE |
| total_expenses | numeric(12,2) | direct + overhead |
| gross_profit | numeric(12,2) | budget - total_expenses |
| company_earnings | numeric(12,2) | |
| team_pool | numeric(12,2) | |
| finder_commission | numeric(12,2) | |
| is_frozen | boolean | true if gross_profit <= 0 |
| updated_at | timestamptz | |

### New table: `task_commissions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK |
| task_id | uuid | FK |
| user_id | uuid | The assignee earning commission |
| amount | numeric(12,2) | |
| status | text | 'pending' or 'confirmed' or 'frozen' |
| created_at / updated_at | timestamptz | |

### New table: `user_wallets`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | PK | |
| user_id | uuid | NOT NULL, UNIQUE | |
| balance | numeric(12,2) | 0 | Total confirmed earnings |
| monthly_target | numeric(12,2) | 0 | User-set monthly goal |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

- RLS: users can only view/update their own wallet
- A trigger auto-creates a wallet row when a profile is created

### Database function: `recalculate_project_financials(p_project_id uuid)`
SECURITY DEFINER function that:
1. Sums all task costs into direct_expenses on the project
2. Computes gross_profit = budget - (direct_expenses + overhead_expenses)
3. If gross_profit <= 0: sets is_frozen = true, zeros out splits, sets all task_commissions to 'frozen'
4. Otherwise: computes company/team/finder splits
5. For each completed task (in the "Done" column) with assignees: distributes team_pool by weight_pct (or equal split if no weights set)
6. Sets commission status to 'confirmed' for completed tasks (commission is confirmed when done)
7. When a commission goes from pending/frozen to confirmed, adds the amount to the user's wallet balance via UPDATE on user_wallets
8. Upserts into project_financials

### Triggers
- **After INSERT/UPDATE on tasks** (when cost, column_id, or weight_pct changes): calls recalculate_project_financials
- **After UPDATE on projects** (when budget, overhead_expenses, or share pcts change): calls recalculate_project_financials
- **After UPDATE on projects** (when lead_id changes): inserts notification for the new lead with type 'lead_assigned'
- **After INSERT on profiles**: auto-create a user_wallets row

### RLS Policies
- `organization_plugins`: org members can SELECT; owners/admins can manage
- `project_financials`: same access as projects (project members can view)
- `task_commissions`: users can view their own; project owners/admins can view all for their project
- `user_wallets`: users can SELECT and UPDATE their own row only

### Notification types
- Add `'lead_assigned'` to the system

---

## 2. Organization Plugin System

### New file: `src/hooks/useOrganizationPlugins.ts`
- `useOrganizationPlugins(orgId)` -- fetches all plugins for the org
- `useIsPluginEnabled(orgId, pluginName)` -- boolean check
- `useTogglePlugin()` -- mutation to enable/disable a plugin

### Modify: `src/components/organizations/OrganizationSettings.tsx`
- Add a "Plugins" section (between Team Members and Danger Zone)
- Shows available plugins as cards with toggle switches
- First plugin: "Expenses & Commissions" with description "Track project budgets, expenses, and team commissions"
- Future-proof: the list is data-driven so new plugins just need a name/description entry

---

## 3. Project Lead Feature

### Modify: `src/types/database.ts`
- Add to Project interface: `lead_id`, `budget`, `project_type`, `direct_expenses`, `overhead_expenses`, `company_share_pct`, `team_share_pct`, `finder_commission_pct`
- Add to Task interface: `cost`, `weight_pct`
- Add new interfaces: `ProjectFinancials`, `TaskCommission`, `UserWallet`, `OrganizationPlugin`
- Add `'lead_assigned'` to NotificationType

### Modify: `src/components/projects/ProjectSettings.tsx`
- Add "Project Lead" dropdown selector (from org members) in the project details section
- Show lead name badge in read-only view

### Modify: `src/components/projects/ProjectCard.tsx`
- Show project lead name if set (small badge/text)

### Modify: `src/hooks/useProjects.ts`
- Add `leadId` to `useUpdateProject` mutation

---

## 4. Financial Settings (Plugin-Gated)

### Modify: `src/components/projects/ProjectSettings.tsx`
- Add a "Financials" section that only renders when the expenses plugin is enabled for the project's organization
- Fields: Budget, Project Type, Overhead Expenses, Company/Team/Finder share percentages (validated to sum to 100)

### New file: `src/components/projects/ProjectFinancials.tsx`
A summary card displayed in the Kanban board (only when plugin enabled):
- Budget vs Expenses progress bar
- Gross Profit display (green/red based on positive/negative)
- Company / Team / Finder split breakdown
- "Frozen" warning banner if profit is negative
- Compact and clean design fitting within the board header area

### New file: `src/hooks/useProjectFinancials.ts`
- `useProjectFinancials(projectId)` -- fetches from project_financials
- `useTaskCommissions(projectId)` -- fetches from task_commissions
- Realtime subscriptions for live updates

---

## 5. Task Cost and Commission (Plugin-Gated)

### Modify: `src/components/kanban/CreateTaskDialog.tsx`
- Add "Cost" input field (only shown when expenses plugin enabled)

### Modify: `src/components/kanban/TaskDetailSheet.tsx`
- Add "Cost" editable field (plugin-gated)
- Add "Weight %" field (plugin-gated)
- Show calculated commission for this task if available

### Modify: `src/hooks/useTasks.ts`
- Include `cost` and `weight_pct` in create/update mutations

---

## 6. User Wallet

### New file: `src/components/personal/UserWallet.tsx`
A card on the Personal Dashboard showing:
- **Current Balance**: total confirmed earnings
- **This Month**: earnings confirmed in the current calendar month (computed client-side from task_commissions)
- **Monthly Target**: user-settable goal with a progress bar showing percentage achieved
- Edit button to set/update the monthly target
- Clean, card-based design matching existing dashboard cards

### New file: `src/hooks/useUserWallet.ts`
- `useUserWallet()` -- fetches wallet for current user
- `useUpdateWalletTarget()` -- mutation to update monthly_target
- `useMonthlyEarnings()` -- fetches task_commissions for current month where status = 'confirmed'

### Modify: `src/components/personal/PersonalDashboard.tsx`
- Add UserWallet card to the dashboard grid (alongside TodayTimeCard)

---

## 7. Kanban Board Integration

### Modify: `src/components/kanban/KanbanBoard.tsx`
- Show `ProjectFinancials` card below breadcrumb (only when plugin enabled)
- Show project lead badge next to owner in the header area
- When a task is moved to "Done" column, the DB trigger auto-recalculates and confirms commissions

---

## Files Summary

### New files (5):
1. `src/hooks/useOrganizationPlugins.ts`
2. `src/components/projects/ProjectFinancials.tsx`
3. `src/hooks/useProjectFinancials.ts`
4. `src/hooks/useUserWallet.ts`
5. `src/components/personal/UserWallet.tsx`

### Modified files (9):
1. `src/types/database.ts` -- new interfaces/fields
2. `src/components/organizations/OrganizationSettings.tsx` -- plugins section
3. `src/components/projects/ProjectSettings.tsx` -- lead selector, financials section
4. `src/components/projects/ProjectCard.tsx` -- show lead
5. `src/components/projects/ProjectList.tsx` -- budget input (plugin-gated)
6. `src/components/kanban/KanbanBoard.tsx` -- financials card, lead badge
7. `src/components/kanban/CreateTaskDialog.tsx` -- cost input
8. `src/components/kanban/TaskDetailSheet.tsx` -- cost/weight/commission display
9. `src/components/personal/PersonalDashboard.tsx` -- wallet card
10. `src/hooks/useProjects.ts` -- lead/budget in mutations
11. `src/hooks/useTasks.ts` -- cost/weight in mutations

### Database migration:
- Add columns to projects and tasks
- Create organization_plugins, project_financials, task_commissions, user_wallets tables with RLS
- Create recalculate_project_financials function
- Create triggers for auto-recalculation, lead notification, wallet auto-creation
- Enable realtime on project_financials, task_commissions, user_wallets

---

## Key Design Decisions

1. **Plugin gating**: All financial UI checks `useIsPluginEnabled(orgId, 'expenses')` before rendering. If disabled, zero financial UI appears -- clean experience.

2. **Commission on task done**: When a task moves to the "Done" column, the trigger recalculates and sets commissions to 'confirmed', immediately crediting the user's wallet. No separate payment confirmation step.

3. **Frozen commissions**: If gross profit goes negative, all commissions freeze (status = 'frozen', amount = 0). They unfreeze automatically when profit recovers.

4. **Wallet is read-heavy**: The balance is updated by the DB function, not by the frontend. The frontend only reads the wallet and can update the monthly_target.

5. **Future plugins**: The organization_plugins table is generic. Adding a new plugin only requires a new row and corresponding UI gating -- no schema changes needed.

