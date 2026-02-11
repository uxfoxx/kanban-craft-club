
# Combine Projects and Organization into a Unified Workspace

## Overview
Currently "Projects" and "Organization" are separate sidebar views. This plan merges them into a single **Workspace** page that shows the organization context with projects, team activity, analytics, and financial records all in one place. The User Wallet moves from the personal dashboard into the organization context since earnings come from org projects.

---

## Navigation Changes

### Sidebar (AppSidebar.tsx)
Current nav items:
- Dashboard | Projects | Organization | Time Tracking

New nav items:
- **Dashboard** -- personal tasks, time card (wallet removed from here)
- **Workspace** -- replaces both "Projects" and "Organization"
- **Time Tracking** -- unchanged

The `ViewType` changes from `'personal' | 'projects' | 'team' | 'timetracking'` to `'personal' | 'workspace' | 'timetracking'`.

### Index.tsx
- Remove the separate `projects` and `team` cases from `renderContent()`
- Add single `workspace` case that renders the new `WorkspacePage` component
- Update `viewTitles` accordingly

---

## New Unified Workspace Page

### New file: `src/components/workspace/WorkspacePage.tsx`

This is the main combined view. At the top: org switcher + create org + settings button + create project button. Below: a tabbed layout.

**Layout:**
```text
+----------------------------------------------------------+
| [Org Switcher Dropdown]  [+ New Org] [Settings]          |
+----------------------------------------------------------+
| [Projects] [Activity] [Analytics] [Financials]           |
+----------------------------------------------------------+
|                                                          |
|  (Tab content area)                                      |
|                                                          |
+----------------------------------------------------------+
```

**Tabs:**

1. **Projects** (default) -- Shows project cards for the selected org (and personal projects when no org). Includes the "New Project" button. Filter chips: All | Personal | Organization. Reuses existing `ProjectCard` component.

2. **Activity** -- Reuses existing `TeamActivityTab` showing who is working on what, active timers, etc.

3. **Analytics** -- Reuses existing `TeamAnalyticsPage` showing team time summaries and member details.

4. **Financials** (plugin-gated, only visible when expenses plugin is enabled) -- New tab showing:
   - **User Wallet card** at the top (balance, this month earnings, monthly target)
   - **Organization Financial Summary**: total budget across all org projects, total expenses, total gross profit
   - **Per-Project Financial Breakdown**: a table/card list showing each project's budget, expenses, profit, commission pool, frozen status
   - **Commission Records**: a table showing individual task commissions with user, task, amount, status (pending/confirmed/frozen), date
   - **Percentage Splits**: visual breakdown of company/team/finder shares

---

## Financials Tab Detail

### New file: `src/components/workspace/FinancialsTab.tsx`

Sections within this tab:

**A. My Wallet** (top)
- Reuses the `UserWallet` component (moved from personal dashboard)
- Shows balance, this month's earnings, monthly target progress

**B. Organization Overview Cards** (row of summary cards)
- Total Budget (sum of all org project budgets)
- Total Expenses (sum of all project total_expenses)
- Total Gross Profit (sum of all project gross_profits)
- Frozen Projects count

**C. Project Financial Table**
- Collapsible card/accordion per project showing:
  - Project name, budget, direct expenses, overhead, gross profit
  - Company/Team/Finder split amounts and percentages
  - Frozen badge if applicable
  - Click to expand shows task-level commission breakdown

**D. Commission Records**
- Sortable/filterable table showing:
  - Task name, assignee, amount, status, date
  - Filter by status (all/confirmed/pending/frozen)
  - Filter by project

### New file: `src/hooks/useOrgFinancials.ts`
- `useOrgProjectFinancials(orgId)` -- fetches all project_financials for projects in an org
- `useOrgCommissions(orgId)` -- fetches all task_commissions for the org's projects
- Uses existing tables, no schema changes needed

---

## Files Summary

### New files (3):
1. `src/components/workspace/WorkspacePage.tsx` -- unified workspace with tabs
2. `src/components/workspace/FinancialsTab.tsx` -- financial records, analytics, wallet
3. `src/hooks/useOrgFinancials.ts` -- hooks for org-level financial data

### Modified files (4):
1. `src/components/layout/AppSidebar.tsx` -- change nav items: remove "Projects" and "Organization", add "Workspace"
2. `src/pages/Index.tsx` -- update ViewType, remove `projects`/`team` cases, add `workspace` case, update viewTitles
3. `src/components/personal/PersonalDashboard.tsx` -- remove UserWallet import and component (it moves to Financials tab)
4. `src/components/organizations/OrganizationPage.tsx` -- no longer used as a standalone page (kept for reference but not rendered)

### No database changes needed
All data is already available in existing tables (project_financials, task_commissions, user_wallets, projects, organization_plugins). The new hooks simply query across projects for a given organization.

---

## Key Design Decisions

1. **Single "Workspace" replaces two nav items**: reduces navigation complexity. The org switcher at the top gives context, and tabs give access to everything -- projects, people, analytics, and money.

2. **Wallet lives under Financials tab**: since earnings come from organization project commissions, it makes sense contextually. The personal dashboard remains focused on tasks and time.

3. **Financials tab is plugin-gated**: only shows when the expenses plugin is enabled for the selected org. No clutter for orgs that don't use financial tracking.

4. **Commission records table**: provides full transparency into who earned what, on which task, with what status -- the "records analysis and percentages and everything" the user asked for.

5. **No database migration needed**: all the data structures already exist. This is purely a UI reorganization with new query hooks.
