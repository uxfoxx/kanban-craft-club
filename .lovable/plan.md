

# Fix: Un-typable Input Fields in Task Detail Sheet

## Problem

Several number inputs inside the Task Detail Sheet save to the database on every keystroke **without using local state**. Their displayed value is bound directly to server/query data (`task.estimated_hours`, `task.budget`, `task.weight_pct`, `subtask.commission_value`). When you type:

1. You press a key (e.g. "5")
2. `onChange` fires a database mutation with value "5"
3. React re-renders the input with the OLD server value (before the mutation response returns)
4. Your keystroke visually disappears
5. When you close and reopen the modal, the refetched data finally shows the value

## Solution

Replace the direct-mutation-on-keystroke pattern with **local state + debounced save**. Each input will:
- Use a local `useState` to hold the value (so typing is instant)
- Sync from server data when the sheet opens or the server value changes externally
- Debounce saves (e.g., 800ms after the user stops typing) to avoid excessive mutations

## Changes

### `src/components/kanban/TaskDetailSheet.tsx`

**Add local state variables** for the four affected inputs:
- `localEstimatedHours`
- `localBudget`
- `localWeightPct`

**Add `useEffect` hooks** to sync local state from server data when the task changes (by task ID).

**Add debounced save `useEffect` hooks** that save to the server 800ms after the user stops typing.

**Update the four Input elements** to use local state for `value` and local setter for `onChange`, removing the inline async mutation.

### `SubtaskDetailPage` (bottom of same file)

**Add local state** for `localCommissionValue`.

**Same pattern**: sync from server, debounce save, update Input to use local state.

## Technical Details

The pattern for each input follows this structure:

```tsx
// Local state
const [localValue, setLocalValue] = useState(serverValue ?? '');

// Sync from server (when task changes)
useEffect(() => {
  setLocalValue(serverValue ?? '');
}, [taskId]); // keyed on task identity, not value

// Debounced save
useEffect(() => {
  const timeout = setTimeout(() => {
    const parsed = localValue ? parseFloat(localValue) : null;
    if (parsed !== serverValue) {
      updateTask.mutateAsync({ ... });
    }
  }, 800);
  return () => clearTimeout(timeout);
}, [localValue]);

// Input uses local state
<Input value={localValue} onChange={(e) => setLocalValue(e.target.value)} />
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/kanban/TaskDetailSheet.tsx` | Add local state + debounced save for estimated_hours, budget, weight_pct, and commission_value inputs (4 inputs total across TaskDetailSheet and SubtaskDetailPage) |

No other files need changes. The focus trap fixes from earlier remain in place and are still useful for nested dialog scenarios.
