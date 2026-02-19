
# Multi-Page Sheet Navigation Pattern

## The Problem
Right now, every side panel (Task Detail, Project Settings) dumps all content into a single scrollable view. Users must scroll through assignees, budget, time tracking, subtasks (each with their own nested collapsibles), and comments -- all stacked vertically. It feels overwhelming and cluttered. Editing subtask details requires expanding nested collapsibles within a collapsible, which is confusing.

## The Solution
Introduce a **page stack** pattern inside sheets. The main view shows a clean overview with clickable section cards. Tapping a section slides in a detail "page" with a back arrow and dedicated editing UI. This keeps each view focused and uncluttered.

---

## How It Works

**Task Detail Sheet** -- currently 673 lines of one long scroll -- becomes:

**Main Page (Overview)**
- Title (inline editable, same as now)
- Priority / Due Date / Status row (compact, same as now)
- Description (inline editable, same as now)
- Section cards (clickable rows that navigate to detail pages):
  - **Assignees** -- shows avatar stack + count, tap to manage
  - **Budget & Commission** -- shows budget amount, tap to edit (only if expenses plugin enabled)
  - **Time Tracked** -- shows total time, tap to see/edit entries
  - **Subtasks** -- shows progress bar + count, tap to see full list
  - **Comments** -- shows comment count, tap to view thread
- Delete Task button at the bottom

**Assignees Page**: Full assignee list with add/remove -- back arrow returns to main

**Budget Page**: Budget input, weight, manager commission info -- back arrow returns to main

**Time Tracking Page**: Total time, full entry list with edit/delete, add entry button -- back arrow returns to main

**Subtasks Page**: Add subtask form, full subtask list. Each subtask row is tappable to go to...

**Subtask Detail Page**: A dedicated page for a single subtask showing its assignees, time entries, commission settings, and comments -- all laid out clearly without nesting. Back arrow returns to subtasks list.

**Comments Page**: Full comment thread -- back arrow returns to main

---

**Project Settings Sheet** -- same pattern:

**Main Page**
- Project info summary card (tap to edit details)
- Owner card (display only)
- Team Members card (shows count, tap to see list)
- Budget card (shows amount, tap to edit -- if expenses enabled)
- Danger Zone (delete)

**Project Details Page**: Name, description, start date, lead -- Save & Back

**Team Members Page**: Full member list -- Back

**Budget Page**: Budget editing -- Save & Back

---

## Technical Approach

### New Reusable Component: `SheetPageStack`
A lightweight component that manages a page stack with animated transitions inside any Sheet.

```text
SheetPageStack
  - pages: Array of { id, title, content }
  - activePage: string (page id)
  - onNavigate(pageId): push page
  - onBack(): pop to previous page
```

Each "page" inside the sheet gets:
- A header with back arrow (when not on main page) and page title
- Full scrollable content area
- Slide-left/slide-right CSS transitions between pages

### State Management
Simple `useState` with a page stack array. No router needed -- it's all local state within each Sheet component.

```text
const [pageStack, setPageStack] = useState(['main']);
const currentPage = pageStack[pageStack.length - 1];

const navigateTo = (page) => setPageStack([...pageStack, page]);
const goBack = () => setPageStack(pageStack.slice(0, -1));
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/sheet-page.tsx` | Reusable SheetPageStack component with back navigation and slide transitions |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/kanban/TaskDetailSheet.tsx` | Refactor into multi-page layout: main overview + 5 detail pages (Assignees, Budget, Time, Subtasks, Comments) |
| `src/components/kanban/SubtaskRow.tsx` | Simplify -- remove the Collapsible entirely. Instead, accept an `onOpen` callback that navigates to a Subtask Detail page inside the sheet |
| `src/components/projects/ProjectSettings.tsx` | Refactor into multi-page layout: main overview + detail pages (Project Details, Team Members, Budget) |

## Visual Design

Each section card on the main page looks like a list item:

```text
+------------------------------------------+
| [icon]  Assignees          3 people   >  |
+------------------------------------------+
| [icon]  Time Tracked       4h 30m     >  |
+------------------------------------------+
| [icon]  Subtasks           3/5 done   >  |
+------------------------------------------+
| [icon]  Comments           12          > |
+------------------------------------------+
```

When you tap a row, the current view slides left and the detail page slides in from the right. A back arrow in the top-left returns you. This is the same pattern used in iOS Settings / Android preferences.

## Detail Pages Layout

Each detail page has:
- **Header**: Back arrow + Page title
- **Content**: Full editing UI for that section, no nesting
- Changes save immediately (same as current behavior -- no explicit "Save & Exit" needed since all mutations are instant)

The subtask detail page is the biggest win -- instead of a deeply nested collapsible-within-a-collapsible, it becomes a clean full-width page showing assignees, time entries, commission, and comments in clearly separated sections.

---

## What Stays the Same
- All data hooks and mutations remain unchanged
- Sheet width (`sm:max-w-2xl`) stays the same
- The inline editing for title/description on the main page stays
- All existing functionality is preserved, just reorganized into pages
