

# Fix: Un-typable Input Fields in Modals

## Problem
When a Dialog opens inside a Sheet (or another Dialog), Radix UI creates competing focus traps. The outer overlay's `FocusScope` steals focus from the inner overlay's inputs, making them un-typable.

Affected components:
- `TimeEntryDialog` -- opens inside `TaskDetailSheet` (Sheet)
- `SubtaskTimeEntryDialog` -- opens inside `TaskDetailSheet` (Sheet)
- `ColumnManager` -- has nested Dialogs for Add/Edit column inside the main Dialog

## Solution
Add `onOpenAutoFocus` and `onCloseAutoFocus` handlers with `e.preventDefault()` to the inner `DialogContent` components. This prevents the parent overlay from re-stealing focus when the inner dialog opens or closes.

## Changes

### 1. `src/components/time/TimeEntryDialog.tsx`
On the `DialogContent` element (line 146), add:
```tsx
<DialogContent
  className="sm:max-w-md"
  onOpenAutoFocus={(e) => e.preventDefault()}
  onCloseAutoFocus={(e) => e.preventDefault()}
>
```

### 2. `src/components/time/SubtaskTimeEntryDialog.tsx`
On the `DialogContent` element (line 67), add the same two handlers.

### 3. `src/components/kanban/ColumnManager.tsx`
Three nested `DialogContent` elements need the fix:
- The inner "Add Column" dialog (line 91)
- The inner "Edit Column" dialog (line 133)
- The `AlertDialogContent` for delete confirmation (line 123)

### 4. `src/components/personal/PersonalTimeEntryDialog.tsx`
Add the handlers as a preventive measure since this dialog may also be opened from contexts with overlays.

## Technical Details

The fix uses two Radix UI event handlers on `DialogContent`:
- `onOpenAutoFocus={(e) => e.preventDefault()}` -- Prevents the parent overlay from stealing focus when the inner dialog mounts
- `onCloseAutoFocus={(e) => e.preventDefault()}` -- Prevents focus-fight when the inner dialog closes

This is the officially recommended approach for nested Radix overlays. No other components or logic need to change.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/time/TimeEntryDialog.tsx` | Add focus handlers to DialogContent |
| `src/components/time/SubtaskTimeEntryDialog.tsx` | Add focus handlers to DialogContent |
| `src/components/kanban/ColumnManager.tsx` | Add focus handlers to 3 nested DialogContent/AlertDialogContent elements |
| `src/components/personal/PersonalTimeEntryDialog.tsx` | Add focus handlers to DialogContent |

