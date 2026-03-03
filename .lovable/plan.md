

# Tier-Based Hybrid Costing System + Kanban Fix

## Bug Fix: Can't Move Tasks to Done

The `recalculate_project_financials` function has a **variable name collision bug**: the outer loop variable `r` (iterating tasks) is reused in the inner subtask loop (`FOR r IN SELECT s.id as subtask_id...`), overwriting the outer loop's state. This causes the function to error when tasks are moved to the Done column, because the trigger fires `recalculate_project_financials` which crashes.

Additionally, there are **triplicate rate card entries** in the database from the seed migration running multiple times. These need to be cleaned up.

**Fix**: Rename the inner loop variable from `r` to `sub_r` in the DB function, and deduplicate the rate card data.

## Database Changes (1 migration)

### 1. Fix `recalculate_project_financials` function
- Rename inner-loop variable `r` to `sub_r` in both the confirmed and potential balance sections to avoid collision with the outer task loop variable

### 2. New columns on `projects`
- `project_category text NULL` -- 'films', 'photography', 'design', 'tech' (for MAJOR tier filtering)
- `agency_markup_pct numeric DEFAULT 0`
- `equipment_cost numeric DEFAULT 0`
- `miscellaneous_cost numeric DEFAULT 0`
- `discount numeric DEFAULT 0`

### 3. New column on `commission_rate_card`
- `sub_category text NULL` -- groups roles by category (e.g., 'films', 'photography', 'design', 'tech')

### 4. New table: `project_line_items`
Stores the selected roles, deliverables, and documentation for a project's cost sheet.

```text
id               uuid PK
project_id       uuid NOT NULL (references projects)
item_type        text NOT NULL  -- 'role', 'deliverable', 'documentation'
item_name        text NOT NULL
complexity       text NULL
unit_price       numeric DEFAULT 0
quantity         integer DEFAULT 1
total            numeric DEFAULT 0
assigned_user_id uuid NULL
created_at       timestamptz DEFAULT now()
```

RLS: Same access as project (project members/owners/org members can CRUD).

### 5. Clean up duplicate rate card entries
Delete duplicates, keeping one entry per unique (organization_id, category, name, complexity).

### 6. Update rate card data
- Delete old deliverable entries (Video Edit, Photography, Social Media Design, Color Grade)
- Insert new deliverables per the instruction: Reel, Static Post, Retouch Photo, Animation, Video, Corporate / Music Video
- Add documentation entries: Moodboard / Script, Pitch Deck
- Update role rates to match the new tier-specific values
- Add new roles: Director, Art Director, Gaffer, Retoucher, Designer, Animator, 3D Artist, Product Designer, Developer, QA
- Set `sub_category` on all role entries (films/photography/design/tech)
- Set rates to 0 where a role is not available for a tier (e.g., Director only available in MAJOR)

### 7. Update `recalculate_project_financials`
Beyond the variable name fix, update to also consider `project_line_items` for cost calculation when line items exist.

## Frontend Changes

### 1. Update `src/types/database.ts`
- Add `ProjectLineItem` type
- Update `Project` type: add `project_category`, `agency_markup_pct`, `equipment_cost`, `miscellaneous_cost`, `discount`
- Update `RateCardEntry` type: add `sub_category`

### 2. Update `src/hooks/useRateCard.ts`
- Add `sub_category` to `RateCardEntry` interface
- Add `useRateCardForTier(orgId, tier, subCategory?)` helper -- returns only entries with rate > 0 for that tier
- Add `useRateCardDocumentation(orgId)` -- returns documentation entries
- Add documentation category support

### 3. New hook: `src/hooks/useProjectLineItems.ts`
- CRUD operations for `project_line_items` table
- `useProjectLineItems(projectId)` -- fetch all line items
- `useAddLineItem()`, `useRemoveLineItem()`, `useUpdateLineItem()`

### 4. New component: `src/components/projects/ProjectCostSheet.tsx`
Full cost breakdown page accessible from project settings:
- **Roles section**: "Add Role" button filtered by tier + category. Each added role = a line item with fixed rate.
- **Deliverables section** (required for Minor/Nano, optional for Major): "Add Deliverable" with complexity picker.
- **Documentation section** (Minor/Nano): Moodboard/Script, Pitch Deck as addable line items.
- **Additional costs**: Agency markup %, Equipment, Miscellaneous, Discount fields.
- **Real-time total** at bottom with full line-by-line breakdown.

### 5. Update `src/components/projects/ProjectSettings.tsx`
- Add mandatory tier selector (MAJOR/MINOR/NANO) as a prominent control, not just auto-computed
- Add category selector for MAJOR projects (Films/Photography/Design/Tech)
- Add "Cost Sheet" section card that navigates to `ProjectCostSheet`
- Save `project_tier` and `project_category` to DB

### 6. Update `src/hooks/useProjects.ts`
- Add `project_category`, `agency_markup_pct`, `equipment_cost`, `miscellaneous_cost`, `discount` to `useUpdateProject`

### 7. Update `src/components/workspace/RateCardSettings.tsx`
- Add a third tab: **Documentation**
- Add `sub_category` display/editing for roles (group by Films/Photography/Design/Tech)
- Support adding documentation entries with Minor/Nano rates only

### 8. Update `src/components/kanban/CreateTaskDialog.tsx`
- Filter deliverable options by project tier (only show items with rate > 0 for that tier)
- For MAJOR projects, deliverables are optional
- Show the selected deliverable's rate next to the budget field

### 9. Update `src/components/kanban/TaskDetailSheet.tsx`
- Filter role dropdown by project tier (only show roles with rate > 0 for that tier)
- For MAJOR projects, also filter by project category's sub_category
- Show commission amount next to role

### 10. Update `src/components/workspace/FinancialsTab.tsx`
- Show role name in commission records
- Show project tier badge next to project name in breakdown

## Implementation Order

1. **Migration**: Fix the DB function variable collision, add new columns/tables, clean up duplicates, re-seed rate card data
2. **Types + hooks**: Update database types, rate card hook, create line items hook
3. **ProjectSettings + ProjectCostSheet**: Tier/category selector, cost sheet UI
4. **RateCardSettings**: Documentation tab, sub-category grouping
5. **CreateTaskDialog + TaskDetailSheet**: Tier-filtered dropdowns
6. **FinancialsTab**: Enhanced commission display

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Fix function, add columns/tables, clean data, re-seed |
| `src/types/database.ts` | Add ProjectLineItem, update Project/RateCardEntry |
| `src/hooks/useRateCard.ts` | Add tier-filtered helpers, documentation support |
| `src/hooks/useProjectLineItems.ts` | **New** -- CRUD for project line items |
| `src/hooks/useProjects.ts` | Support new project fields |
| `src/components/projects/ProjectCostSheet.tsx` | **New** -- cost breakdown UI |
| `src/components/projects/ProjectSettings.tsx` | Tier/category selector, cost sheet link |
| `src/components/workspace/RateCardSettings.tsx` | Documentation tab, sub-category |
| `src/components/kanban/CreateTaskDialog.tsx` | Tier-filtered deliverables |
| `src/components/kanban/TaskDetailSheet.tsx` | Tier-filtered roles |
| `src/components/workspace/FinancialsTab.tsx` | Role name in commissions |

