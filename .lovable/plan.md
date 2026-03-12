

# Full Plan: Tier-Based Commission Overhaul with LKR Currency

## What We're Building

A complete restructuring of the commission system to match the real-world rate card structure shown in the reference images. The system behavior changes based on which tier a task belongs to.

### Tier Behavior Summary

```text
MAJOR (≥350k):  Subtasks have Type (Films/Photography/Design) + Role → fixed rate from rate card, split among assignees
MINOR (<350k):  Subtasks are either Role-based OR Deliverable-based (with Quick/Standard/Advanced complexity)
NANO  (<100k):  Same structure as MINOR, different rates
```

## Database Change

**Add `team_share` column to `tasks` table** — this is the amount actually divided among workers. `budget` remains display-only.

```sql
ALTER TABLE public.tasks ADD COLUMN team_share numeric DEFAULT 0;
```

No other schema changes needed — `work_type`, `complexity`, `commission_mode` already exist on subtasks; `sub_category` already exists on `commission_rate_card`.

**Update `recalculate_project_financials`** to use `team_share` instead of `budget` when calculating subtask payouts.

---

## UI Changes

### 1. CreateTaskDialog — Rename + Add Fields
- Rename "Assign To" → **"Team Lead"** (first selected person gets `Task Manager` role — keep existing logic, just change label)
- Add **"Team Share"** field (LKR amount that gets divided among subtask workers)
- Change tier from auto-detected badge to a **Tier dropdown** (select from org tiers)
- Keep Task Budget as display-only field
- Remove any leftover work_type/complexity/commission_mode fields

### 2. TaskDetailSheet — Overview Tab
- **Separate sections**: "Team Lead" (first assignee with Task Manager role) and "Assignees" (all other assignees)
- **Remove Estimated Hours** section entirely
- Keep Description, Deliver to Client, Delete Task

### 3. TaskDetailSheet — Finance Tab
- Show **Task Budget** (display only) and **Team Share** (editable for admins)
- Show **Tier** as a dropdown (editable for admins)
- Remove Weight % field
- Keep personal earning display for non-admins

### 4. Subtask System — Complete Rework Based on Tier

**When adding a subtask (Work tab):**

**MAJOR tier:**
- Subtask form shows: Title + **Type** dropdown (Films, Photography, Design) + **Role** dropdown (filtered by selected type from rate card `sub_category`) 
- Commission auto-calculated from role's rate for the MAJOR tier
- If 2+ assignees on a subtask, the role rate is split equally

**MINOR/NANO tier:**
- Subtask form shows: Title + **Commission Mode** toggle (Role-based / Deliverable-based)
- **Role-based**: Role dropdown (all roles in rate card for this tier that have rates > 0)
- **Deliverable-based**: Deliverable name dropdown + Complexity dropdown (Quick/Standard/Advanced)
- Commission auto-calculated from rate card
- Split among assignees

### 5. SubtaskRow — Show Earning Info
- Show the subtask's type/role or deliverable/complexity as badges
- Show the per-person rate (total rate ÷ assignee count)

### 6. SubtaskDetailPage — Rework Commission Section
- Replace current percentage/fixed commission controls with the tier-based system described above
- Show role dropdown per assignee (MAJOR) or on the subtask (MINOR/NANO)
- Show auto-calculated commission amount from rate card
- Remove manual commission type/value inputs (percentage/fixed) — commissions are always rate-card-driven

### 7. RateCardSettings — Already Correct
- The existing rate card settings already support roles with sub_categories and deliverables with complexity per tier. No changes needed.

### 8. Remove Unused Fields
- Remove `work_type`, `complexity` display from main task level (these are subtask-only)
- Remove manual `commission_type`/`commission_value` editing on subtasks (replaced by rate card lookups)
- Remove `estimated_hours` from TaskDetailSheet overview

---

## Files Summary

| File | Change |
|------|--------|
| **Migration SQL** | Add `team_share` to tasks; update `recalculate_project_financials` to use `team_share` |
| `CreateTaskDialog.tsx` | Rename "Assign To" → "Team Lead"; add Team Share field; add Tier dropdown |
| `TaskDetailSheet.tsx` (Overview) | Split assignees into Team Lead + Assignees sections; remove Estimated Hours |
| `TaskDetailSheet.tsx` (Finance) | Add Team Share + Tier dropdown; remove Weight % |
| `TaskDetailSheet.tsx` (Work tab) | Rework subtask add form based on tier (type+role for MAJOR, mode toggle for MINOR/NANO) |
| `SubtaskRow.tsx` | Show type/role or deliverable/complexity badges with rate |
| `SubtaskDetailPage` (inside TaskDetailSheet) | Replace commission controls with tier-based role/deliverable selectors |
| `useProjectSubtaskEarnings.ts` | Update to use `team_share` and tier-aware lookups |
| `TaskCard.tsx` | No changes needed (earning badge already works) |
| `RateCardSettings.tsx` | No changes needed |
| `TierSettings.tsx` | No changes needed |

## Implementation Order

1. Migration: add `team_share` column, update financial function
2. CreateTaskDialog: Team Lead label, Team Share field, Tier dropdown
3. TaskDetailSheet Overview: split Team Lead / Assignees, remove Estimated Hours
4. TaskDetailSheet Finance: Team Share + Tier dropdown
5. Subtask system: rework add form + SubtaskDetailPage based on tier
6. SubtaskRow: tier-aware badges
7. Update earnings hook for `team_share`

