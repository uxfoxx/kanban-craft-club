

# Rate Card Commission System - Full Implementation

## Overview

This plan converts the current 10%-based commission system to a **rate card model** based on the Bandit Theory price menu. It includes full CRUD for work types, roles, and complexity tiers -- everything is editable by org admins.

## The Full User Flow

1. **Create a Project** -- set a budget, system auto-calculates tier (MAJOR/MINOR/NANO)
2. **Create a Task** -- pick a Work Type (e.g. "Video Edit") and Complexity (Quick/Standard/Advanced), budget auto-fills from rate card
3. **Assign someone** -- pick their Role (e.g. "Editor", "DOP"), their commission shows immediately from the rate card
4. **View commissions** -- Finance tab shows role-based fixed amounts instead of 10%

## Database Changes (1 migration)

### New table: `commission_rate_card`
Stores all roles AND deliverable types with rates per project tier. Fully editable by org admins.

```text
id                uuid PK (gen_random_uuid())
organization_id   uuid NOT NULL
category          text NOT NULL  -- 'role' or 'deliverable'
name              text NOT NULL  -- e.g. 'DOP', 'Video Edit'
complexity        text NULL      -- NULL for roles; 'quick'/'standard'/'advanced' for deliverables
rate_major        numeric DEFAULT 0
rate_minor        numeric DEFAULT 0
rate_nano         numeric DEFAULT 0
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
UNIQUE(organization_id, category, name, complexity)
```

RLS: Org members can SELECT; org owners/admins can INSERT, UPDATE, DELETE.

### New columns on existing tables
- `projects.project_tier` text NULL -- auto-set: 'major', 'minor', 'nano'
- `tasks.work_type` text NULL -- e.g. 'Video Edit'
- `tasks.complexity` text NULL -- 'quick', 'standard', 'advanced'
- `task_assignees.role` text NULL -- e.g. 'DOP', 'Editor'

### Updated DB function: `recalculate_project_financials`
- Instead of `task_budget * 0.10` for the first assignee, look up each assignee's `role` in `commission_rate_card` for the project's tier
- If no role is set or no rate card match, fall back to 0 (no commission)
- Subtask commissions remain as-is (percentage/fixed)

### Seed data
Pre-populate rate card for each existing organization with the spreadsheet values (DOP, Photographer, Editor, Colorist, etc. + Video Edit, Photography, Social Media Design, Color Grade deliverables with complexity tiers).

## Frontend Changes

### 1. New hook: `src/hooks/useRateCard.ts`
- `useRateCard(orgId)` -- fetches all rate card entries for the org
- `useCreateRateCardEntry()` -- add new role or deliverable
- `useUpdateRateCardEntry()` -- edit rates
- `useDeleteRateCardEntry()` -- remove entry
- Helper: `getRateForTier(entry, tier)` returns the correct rate

### 2. New component: `src/components/workspace/RateCardSettings.tsx`
Admin page to manage the rate card. Features:
- Two tabs: **Roles** and **Deliverables**
- Table view with editable inline rates (Major/Minor/Nano columns)
- "Add Role" / "Add Deliverable" button with name + complexity input
- Delete button per row
- Accessible from Plugin Settings page

### 3. Modified: `src/components/projects/ProjectSettings.tsx`
- Auto-compute `project_tier` when budget is saved:
  - budget >= 350,000 = 'major'
  - budget >= 100,000 = 'minor'
  - else = 'nano'
- Show tier badge next to budget (e.g. colored "MAJOR" badge)
- Save `project_tier` to DB alongside budget

### 4. Modified: `src/components/kanban/CreateTaskDialog.tsx`
When expenses are enabled:
- Add **Work Type** dropdown (populated from rate card deliverables for the org)
- Add **Complexity** dropdown (Quick/Standard/Advanced) -- shown when work type is selected
- When both selected, auto-fill the budget field from the rate card based on project tier
- User can still override budget manually

### 5. Modified: `src/components/kanban/TaskDetailSheet.tsx`

**Finance tab changes:**
- Add Work Type + Complexity selectors (editable, same as create dialog)
- When changed, auto-update task budget from rate card
- Replace the hardcoded "Task Manager Commission (10%)" display with rate-card-based display per assignee

**Assignee section changes:**
- When adding an assignee, show a **Role** dropdown next to each assignee (populated from rate card roles)
- Display their commission amount: e.g. "Editor = LKR 25,000 (Major rate)"
- Role is saved to `task_assignees.role` column

### 6. Modified: `src/components/workspace/FinancialsTab.tsx`
- Show role name in commission records alongside amount
- Show rate card source (e.g. "DOP - Major Rate")

### 7. Modified: `src/components/workspace/PluginSettingsPage.tsx`
- Add a "Rate Card" link/button that navigates to the Rate Card Settings page when expenses plugin is enabled

### 8. Modified: `src/types/database.ts`
- Add `RateCardEntry` type
- Update `Task` type with `work_type` and `complexity` fields
- Update `TaskAssignee` type with `role` field
- Update `Project` type with `project_tier` field

## Technical Details

### Project Tier Logic (client-side + saved to DB)
```text
if budget >= 350,000 -> 'major'
else if budget >= 100,000 -> 'minor'
else -> 'nano'
```

### Rate Lookup
```text
getRate(role, projectTier):
  entry = rate_card WHERE category='role' AND name=role AND organization_id=orgId
  return entry[`rate_${projectTier}`]

getTaskBudget(workType, complexity, projectTier):
  entry = rate_card WHERE category='deliverable' AND name=workType AND complexity=complexity
  return entry[`rate_${projectTier}`]
```

### DB Function Update
The `recalculate_project_financials` function will:
1. Get `project_tier` from the project
2. For each done task, for each assignee with a `role`:
   - Look up `commission_rate_card` WHERE category='role' AND name=assignee.role AND organization_id=project.organization_id
   - Use `rate_major`, `rate_minor`, or `rate_nano` based on tier
   - Insert commission with that fixed amount instead of 10%
3. Subtask commissions remain unchanged (percentage/fixed as before)

### Backward Compatibility
- Existing tasks without `work_type` continue to work normally
- Existing assignees without `role` get 0 commission (instead of 10%) -- this is the intended new behavior
- Manual override commissions are preserved
- The rate card is per-organization, so different orgs can have different rates

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | New table, new columns, updated function, seed data |
| `src/types/database.ts` | Add types, update existing types |
| `src/hooks/useRateCard.ts` | **New** -- CRUD hooks for rate card |
| `src/hooks/useProjects.ts` | Update to save project_tier with budget |
| `src/components/workspace/RateCardSettings.tsx` | **New** -- admin rate card management UI |
| `src/components/workspace/PluginSettingsPage.tsx` | Add Rate Card link |
| `src/components/projects/ProjectSettings.tsx` | Tier badge, auto-compute tier |
| `src/components/kanban/CreateTaskDialog.tsx` | Work Type + Complexity selectors |
| `src/components/kanban/TaskDetailSheet.tsx` | Role on assignees, work type on finance tab |
| `src/components/workspace/FinancialsTab.tsx` | Show role in commission records |
| `src/hooks/useAssignees.ts` | Update addAssignee to accept role |

