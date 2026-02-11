
# Feature Implementation Plan

## Overview
This plan adds four major features: project start dates, a comments system with @mentions and notifications, sidebar/top-bar redesign, and consistent task/subtask detail flows.

---

## 1. Database Changes (Migration)

### New table: `comments`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | NOT NULL, references profiles(user_id) |
| task_id | uuid | nullable, references tasks(id) ON DELETE CASCADE |
| subtask_id | uuid | nullable, references subtasks(id) ON DELETE CASCADE |
| content | text | NOT NULL |
| mentions | uuid[] | array of mentioned user_ids |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

- CHECK constraint: exactly one of task_id or subtask_id must be set
- RLS: project members can view/insert/update/delete comments on their project's tasks
- Enable realtime on the comments table

### New column on `projects` table
- `start_date` (date, nullable) -- the project start date

### New database trigger: `notify_comment_mention`
- Fires after INSERT on `comments`
- For each user_id in the `mentions` array, inserts a row into `notifications` with type `'mention'`
- Message includes the commenter's name and a snippet of the comment

### Update `NotificationType` in `src/types/database.ts`
- Add `'mention'` to the union type

---

## 2. Comments Feature

### New file: `src/hooks/useComments.ts`
- `useComments(taskId?, subtaskId?)` -- fetches comments with user profiles joined
- `useCreateComment()` -- mutation to insert a comment, extracts @mentions from content
- `useDeleteComment()` -- mutation to delete own comment
- Realtime subscription for live comment updates

### New file: `src/components/comments/CommentSection.tsx`
- Displays a list of comments with user avatar, name, timestamp
- Input area at the bottom with a textarea
- @mention support: typing `@` opens a popover/dropdown showing project members filtered by typed text
- Selecting a member inserts `@Name` into the text and stores the user_id in a mentions array
- Mentioned names are highlighted in rendered comments

### New file: `src/components/comments/MentionInput.tsx`
- Textarea wrapper that detects `@` trigger
- Shows a floating list of matching project members
- On select, inserts the mention text and tracks the user_id

### Integration into `TaskDetailSheet.tsx`
- Add a "Comments" section below existing content (after the subtasks/time tracking sections)
- Pass `taskId` and project members to `CommentSection`

### Integration into `SubtaskRow.tsx`
- Inside the collapsible expanded area, add a `CommentSection` for the subtask
- Pass `subtaskId` and project members

---

## 3. Project Start Date

### Modify: `src/types/database.ts`
- Add `start_date: string | null` to the `Project` interface

### Modify: `src/components/projects/ProjectList.tsx`
- Add a date picker for "Start Date" in the create project dialog

### Modify: `src/components/projects/ProjectCard.tsx`
- Display the start date on project cards (e.g., "Started: Mar 15, 2026")

### Modify: `src/components/projects/ProjectSettings.tsx`
- Add start date picker in the edit project section

### Modify: `src/hooks/useProjects.ts`
- Accept `startDate` in `useCreateProject` and `useUpdateProject` mutations

---

## 4. Sidebar Redesign -- Move Toggle Inside

### Modify: `src/components/layout/AppSidebar.tsx`
- Add the sidebar collapse/expand toggle button inside the sidebar header (next to the logo)
- When collapsed, show only the toggle icon
- Use `useSidebar().toggleSidebar` for the action
- Remove the separate Settings menu item; keep settings accessible via the user avatar dropdown only

### Modify: `src/pages/Index.tsx`
- Remove `SidebarTrigger` from the top bar
- Add page title display to the top bar (shows current view name: "Dashboard", "Projects", "Organization", "Time Tracking", or the project name when in Kanban view)
- Add user avatar to the top bar (for quick profile access) alongside ActiveTimer and NotificationBell
- Top bar layout: `[Page Title] ... [ActiveTimer] [NotificationBell] [Avatar]`

---

## 5. Consistent Task/Subtask Detail Flow

### Modify: `src/components/kanban/SubtaskRow.tsx`
- Add the comments section in the collapsible expanded area (same as tasks)
- Ensure assignees, time tracking, and comments are all present in both task and subtask detail views

---

## Files Summary

### New files (4):
1. `src/hooks/useComments.ts`
2. `src/components/comments/CommentSection.tsx`
3. `src/components/comments/MentionInput.tsx`

### Modified files (8):
1. `src/types/database.ts` -- add `mention` to NotificationType, add `start_date` to Project
2. `src/pages/Index.tsx` -- top bar redesign with page title and avatar, remove SidebarTrigger
3. `src/components/layout/AppSidebar.tsx` -- add toggle button inside sidebar header
4. `src/components/kanban/TaskDetailSheet.tsx` -- add CommentSection
5. `src/components/kanban/SubtaskRow.tsx` -- add CommentSection in expanded area
6. `src/components/projects/ProjectList.tsx` -- add start date picker to create dialog
7. `src/components/projects/ProjectCard.tsx` -- display start date
8. `src/components/projects/ProjectSettings.tsx` -- add start date picker to edit form
9. `src/hooks/useProjects.ts` -- accept startDate in create/update mutations

### Database migration:
- Add `start_date` column to `projects`
- Create `comments` table with RLS policies
- Create `notify_comment_mention` trigger function
- Enable realtime on `comments` table
