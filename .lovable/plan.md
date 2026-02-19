

# Tab-Based Task Detail Sheet Redesign

## Current Problem
The page-stack pattern requires too many back-and-forth navigations. Users click a section card, view content, go back, click another -- it's tedious. The overview page is just a list of links with no real content visible upfront.

## Solution: Tabs Inside the Sheet
Replace the page-stack navigation with horizontal tabs that group related content together. Users can switch between contexts instantly without navigating back and forth.

## Tab Structure

```text
+--------------------------------------------------+
| Task Title (editable)                        [X]  |
| [Priority] [Due Date] [Status]                    |
+--------------------------------------------------+
| [ Overview ]  [ Work ]  [ Finance ]  [ Chat ]    |
+--------------------------------------------------+
|                                                    |
|   (tab content here)                              |
|                                                    |
+--------------------------------------------------+
```

### Tab 1: Overview (default)
- Description (inline editable)
- Assignees list with add/remove
- This is the "what is this task" view -- the essentials

### Tab 2: Work
- Subtasks with progress bar and add form
- Tapping a subtask opens its detail as a sub-page (keeps the page-stack just for this one drill-down)
- Time tracking: total time, entry list, add entry button
- This is the "what needs doing" view

### Tab 3: Finance (only shown if expenses plugin enabled)
- Task budget input
- Weight percentage
- Manager commission info
- This keeps financial details out of the way for non-financial users

### Tab 4: Chat
- Full comment/discussion thread
- Clean separation from task data

## Subtask Detail: Still Uses Page Stack
When a user taps a subtask in the Work tab, it navigates to a subtask detail page (same page-stack pattern as before). This is the one case where drill-down makes sense -- you're going deeper into a specific item, not switching context.

## Technical Details

### Files to Modify

**`src/components/kanban/TaskDetailSheet.tsx`**
- Remove the `SectionCard`-based main page
- Add Radix `Tabs` component with 3-4 tabs (Finance tab conditionally rendered)
- Move assignees content inline into the Overview tab
- Combine subtasks and time tracking into the Work tab
- Keep the `SheetPageStack` but only for subtask detail drill-down
- When on a subtask detail sub-page, hide the tabs and show back navigation instead
- The tab bar stays fixed below the header; tab content scrolls independently

**`src/components/ui/sheet-page.tsx`**
- No changes needed -- still used for subtask detail navigation

**`src/components/kanban/SubtaskRow.tsx`**
- No changes needed

**`src/components/projects/ProjectSettings.tsx`**
- No changes needed (page-stack pattern works well here since it's a settings panel with distinct edit forms)

### Layout Structure
```text
SheetContent
  SheetHeader (title + priority/date/status)
  if (on subtask detail page):
    Back button + SubtaskDetailPage
  else:
    Tabs
      TabsList (Overview | Work | Finance? | Chat)
      TabsContent for each tab (scrollable)
  TimeEntryDialog (modal, unchanged)
```

### Key Decisions
- Finance tab only renders when `expensesEnabled` is true, so non-financial projects get a cleaner 3-tab layout
- Delete Task button goes at the bottom of the Overview tab (danger zone)
- The header (title, priority, due date, status) stays above the tabs -- it's always visible regardless of which tab you're on
- Tab state resets when the sheet closes

