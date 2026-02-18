

# Comprehensive UX/UI Audit and Fix Plan

## Audit Findings

### CRITICAL Issues

**1. Task Detail Sheet is too narrow (TaskDetailSheet.tsx:239)**
The sheet uses `sm:max-w-lg` (512px) to display description, assignees, budget/commission, time tracking, subtasks (each with their own expandable content), and comments. Everything is cramped and scrolling is excessive.

**2. Subtask actions completely hidden on mobile (SubtaskRow.tsx:231)**
Timer, expand chevron, edit, and delete buttons are wrapped in `opacity-0 group-hover:opacity-100`. On touch devices these are invisible and inaccessible -- users literally cannot interact with subtasks beyond toggling the checkbox.

**3. No bottom navigation on mobile (Index.tsx)**
The `BottomNavigation` component exists in the codebase but is never rendered in `Index.tsx`. Mobile users must rely entirely on the sidebar, which is collapsed by default and requires multiple taps to open. Financials and Plugin Settings are completely unreachable without the sidebar.

---

### MODERATE Issues

**4. TaskCard timer button wastes space (TaskCard.tsx:164-173)**
Shows "Start" or "Active" text on every card. On dense boards with many cards, this clutters the layout and competes visually with the task title.

**5. CreateTaskDialog is slightly narrow (CreateTaskDialog.tsx)**
Uses `sm:max-w-md` (448px) for a form with 7+ fields including a scrollable assignee list. The two-column grid for priority/date feels tight.

**6. Subtask commission info buried (SubtaskRow.tsx:344-413)**
Commission details only appear at the bottom of the expanded collapsible content, after assignees and time entries. Users must scroll through the expansion to find financial info -- which is often the most important detail.

**7. Time entry actions in TaskDetailSheet hidden on hover (TaskDetailSheet.tsx:523-536)**
Edit and delete buttons for time entries use `opacity-0 group-hover:opacity-100`, making them inaccessible on touch devices.

**8. No subtask progress indicator (TaskDetailSheet.tsx:565-569)**
Only shows "X/Y completed" as small text. No visual progress bar to quickly assess completion status.

---

### MINOR Issues

**9. Calendar tasks not clickable (PersonalCalendar.tsx)**
Tasks listed for a selected date are display-only. Users cannot tap a task to open its detail sheet.

**10. Commission table shows truncated task IDs (FinancialsTab.tsx:47)**
Displays `task_id.slice(0,8)...` which is a meaningless UUID fragment to users. Should show the task title instead.

**11. No empty state visuals for time tracking (TaskDetailSheet.tsx:511)**
Shows plain text "No time logged" without any icon or illustration, making the section feel incomplete.

**12. Content hidden behind mobile bottom nav**
When BottomNavigation is added, content at the bottom of scrollable pages will be obscured. All main content areas need bottom padding.

---

## Implementation Plan

### Phase 1: Critical Fixes

**A. Widen Task Detail Sheet**
- File: `src/components/kanban/TaskDetailSheet.tsx`
- Change `sm:max-w-lg` to `sm:max-w-2xl` on line 239
- Add `pb-20 md:pb-6` to the inner content div (line 321) so content is not hidden behind mobile bottom nav

**B. Fix subtask actions visibility**
- File: `src/components/kanban/SubtaskRow.tsx`
- Remove `opacity-0 group-hover:opacity-100` from the action button container (line 231)
- Keep timer and expand chevron always visible
- Move edit and delete into a compact `DropdownMenu` (three-dot "more" button) to reduce visual clutter while keeping them accessible
- Add a summary line below the subtask title when collapsed showing assignee count and total time (e.g., "2 assignees -- 1h 30m") so users can see context without expanding
- Show commission as inline badge when collapsed (e.g., "$50" or "15%")

**C. Add BottomNavigation to mobile layout**
- File: `src/pages/Index.tsx`
- Import and render `BottomNavigation` component below the main content area
- Add a 5th "More" item that opens a sheet with links to Financials, Plugin Settings, and Profile
- File: `src/components/layout/BottomNavigation.tsx`
- Add `MoreHorizontal` icon as 5th nav item
- Add state + Sheet for the "More" menu with navigation options

### Phase 2: Moderate Fixes

**D. Compact TaskCard timer**
- File: `src/components/kanban/TaskCard.tsx`
- Replace text button ("Start"/"Active") with icon-only button wrapped in a Tooltip
- Active state: show pulsing dot indicator instead of text

**E. Widen CreateTaskDialog**
- File: `src/components/kanban/CreateTaskDialog.tsx`
- Change `sm:max-w-md` to `sm:max-w-lg` on the DialogContent

**F. Surface commission info on SubtaskRow**
- Already addressed in Phase 1B (inline badge when collapsed)
- Additionally, move the commission section above time tracking in the expanded view so it appears right after assignees

**G. Fix time entry hover-only actions**
- File: `src/components/kanban/TaskDetailSheet.tsx`
- Remove `opacity-0 group-hover:opacity-100` from time entry edit/delete buttons (lines 523, 533)
- Make them always visible but use smaller, more subtle styling

**H. Add subtask progress bar**
- File: `src/components/kanban/TaskDetailSheet.tsx`
- Add a `Progress` component below the "Subtasks" header showing `completedSubtasks/totalSubtasks` visually

### Phase 3: Minor Fixes

**I. Empty state for time tracking**
- File: `src/components/kanban/TaskDetailSheet.tsx`
- Replace plain "No time logged" text with a `Clock` icon + descriptive text

**J. Content bottom padding for mobile**
- File: `src/pages/Index.tsx`
- Add `pb-20 md:pb-0` to the main content area to prevent bottom nav overlap

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/components/kanban/TaskDetailSheet.tsx` -- widen sheet, fix time entry actions, add progress bar, empty state |
| Modify | `src/components/kanban/SubtaskRow.tsx` -- always-visible actions, summary line, inline commission badge, reorder sections |
| Modify | `src/components/kanban/TaskCard.tsx` -- icon-only compact timer |
| Modify | `src/components/kanban/CreateTaskDialog.tsx` -- widen dialog |
| Modify | `src/components/layout/BottomNavigation.tsx` -- add "More" tab with sheet menu |
| Modify | `src/pages/Index.tsx` -- render BottomNavigation, add bottom padding |

No new files. No database changes.

