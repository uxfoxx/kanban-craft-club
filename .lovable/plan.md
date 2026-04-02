

# Fix: Tier not showing in dropdown & badge after update

## Root Cause

`selectedTask` in `KanbanBoard.tsx` is stored in `useState<Task | null>`. When the user clicks a task, the task object is captured at that moment. After `handleTierChange` updates `tier_id` via `updateTask`, the query is invalidated and fresh data arrives — but `selectedTask` still holds the stale object without the updated `tier_id`.

This means:
- The tier dropdown in Finance tab shows empty (stale `manualTierId` is still null/old value)
- The tier badge pill in the header also shows stale data
- Same issue when creating a task with a tier — clicking the task after creation shows the old snapshot

## Fix

### `src/components/kanban/KanbanBoard.tsx`
- Add `useEffect` to keep `selectedTask` in sync with the latest `tasks` query data
- When `tasks` array updates and `selectedTask` is set, find the matching task by ID and update state

```typescript
// After line 56: const [selectedTask, setSelectedTask] = useState<Task | null>(null);
// Add:
useEffect(() => {
  if (selectedTask && tasks) {
    const fresh = tasks.find(t => t.id === selectedTask.id);
    if (fresh) {
      setSelectedTask(fresh);
    }
  }
}, [tasks]);
```

- Change import from `useState, useMemo` to `useState, useMemo, useEffect`

This single change fixes both the dropdown value and the tier badge pill, since `task.tier_id` will now be up-to-date after any mutation.

## Files Modified

| File | Change |
|------|--------|
| `src/components/kanban/KanbanBoard.tsx` | Add useEffect to sync selectedTask with fresh query data |

