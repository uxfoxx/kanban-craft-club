

# Fix: Role Input Fields in Tasks + Stale Task State

## Problems Found

1. **Role/Type inputs invisible when no tier selected** — The subtask add form only shows role/deliverable inputs when `isMajor` or `isMinorOrNano` is true. If no tier is set on the task, these are both false, so no commission inputs appear at all.

2. **Role dropdown empty when no rates configured** — For minor/nano, the role select filters by `getRateForTier(r, taskTier.id) > 0`. If no rate_card_rates rows exist for the tier, the dropdown renders empty.

3. **Stale selectedTask after tier update** — Previously approved fix: `KanbanBoard.tsx` doesn't sync `selectedTask` with fresh query data, so after updating tier_id the sheet still shows old values.

## Changes

### 1. `src/components/kanban/TaskDetailSheet.tsx`
- Show role/type inputs even when expenses are enabled but no tier is selected yet — display a hint "Select a tier to configure subtask rates"
- For the role dropdown: show ALL roles from rate card (not just ones with rate > 0), but append the rate if available. This way users can still select a role even if rates aren't fully configured
- Same for MAJOR type roles: show all roles matching the sub_category, even if rate is 0

### 2. `src/components/kanban/KanbanBoard.tsx`
- Add `useEffect` import
- Add effect to sync `selectedTask` with fresh `tasks` data after mutations (the previously approved fix)

## Files Modified

| File | Change |
|------|--------|
| `src/components/kanban/TaskDetailSheet.tsx` | Show roles without rate filter, add "select tier" hint |
| `src/components/kanban/KanbanBoard.tsx` | Sync selectedTask with fresh query data |

