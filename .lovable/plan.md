

# Comprehensive Feature Update Plan

## Overview
This plan adds task delivery flow, dashboard improvements, estimated hours tracking, custom time entries, enhanced calendar, project lead notifications, and PWA install prompts.

---

## 1. "Deliver to Client" Button (Task Completion Flow)

### Concept
A prominent animated button in the Task Detail Sheet that marks a task as fully delivered. Completed tasks are removed from the kanban board and moved to a new "Completed" view accessible from the project page. Tasks can be restarted from there.

### Database Changes
- Add `completed_at` (timestamp, nullable) to the `tasks` table
- When a task is "delivered", set `completed_at = now()` and move it to the "Done" column

### UI Changes
- **TaskDetailSheet.tsx**: Add a "Deliver to Client" button in the Overview tab (above Delete). Button has a gradient style with a sparkle/confetti animation on click. On delivery, show a celebratory toast with confetti effect.
- **KanbanBoard.tsx**: Filter out tasks where `completed_at IS NOT NULL` from the board view. Add a "Completed" toggle/tab to view delivered tasks.
- **New component**: `CompletedTasksView.tsx` -- shows archived tasks in a simple list with a "Restart" button that clears `completed_at` and puts the task back in "To Do".

---

## 2. Dashboard Overhaul

### Remove QuickAddTask
- **PersonalDashboard.tsx**: Remove the `QuickAddTask` component import and usage.

### Add Upcoming Deadline Tasks
- **New hook**: `useUpcomingDeadlineTasks` in `usePersonalTasks.ts` -- fetches tasks assigned to user with due dates in the next 7 days, ordered by due date ascending.
- **New component**: `UpcomingDeadlines.tsx` -- card showing tasks with approaching deadlines, color-coded by urgency (overdue = red, today = orange, this week = yellow).

### Add Today's Earnings Card
- **New component**: `TodayEarningsCard.tsx` -- uses a new hook `useTodayEarnings` that queries `task_commissions` where `status = 'confirmed'` and `updated_at` is today. Shows the total amount earned today.
- Place alongside TodayTimeCard in the dashboard grid.

### Updated Dashboard Layout
```
Welcome back, [Name]!
[Date]

[Upcoming Deadlines (2 cols)]  [Today's Time + Today's Earnings (1 col)]
[Tasks Due Today (2 cols)]
```

---

## 3. Estimated Hours for Tasks and Subtasks

### Database Changes
- Add `estimated_hours` (numeric, nullable, default null) to `tasks` table
- Add `estimated_hours` (numeric, nullable, default null) to `subtasks` table

### UI Changes
- **TaskDetailSheet.tsx** (Overview tab): Add an "Estimated Hours" input field next to the description
- **SubtaskDetailPage**: Add estimated hours input
- **TaskCard.tsx**: When total tracked time exceeds estimated hours, show a red "Over estimate" badge
- **SubtaskRow.tsx**: Show warning indicator when subtask time exceeds its estimate
- **Work tab**: Show estimated vs actual comparison next to the time total (e.g., "4h 30m / 6h estimated" with a progress bar that turns red when over)

---

## 4. Enhanced Calendar

### Make Calendar Bigger
- **PersonalCalendar.tsx**: Change layout from side-by-side to stacked on all screens. Calendar takes full width. Selected date tasks appear below.
- Apply custom CSS to make the calendar cells larger.

### Make Tasks Clickable
- When a task is clicked in the calendar, open a mini task detail sheet or navigate to the project with that task selected.
- Add `onTaskClick` callback that sets a selected task and opens `TaskDetailSheet` directly from the calendar page.
- Need to also fetch `columns` for the task's project to pass to TaskDetailSheet.

---

## 5. Custom Time Tracking (Personal Entries)

### Database Changes
- Create new table `personal_time_entries`:
  - `id` (uuid, PK, default gen_random_uuid())
  - `user_id` (uuid, NOT NULL)
  - `name` (text, NOT NULL) -- custom label like "Meeting", "Research"
  - `started_at` (timestamptz, NOT NULL)
  - `ended_at` (timestamptz, nullable)
  - `duration_seconds` (integer, nullable)
  - `created_at` (timestamptz, default now())
- RLS: Users can CRUD their own entries only

### UI Changes
- **TimeTrackingPage.tsx**: Add a "Log Personal Time" button that opens a dialog for custom entries (name, start time, end time)
- **New component**: `PersonalTimeEntryDialog.tsx` -- form with name input, date picker, start/end time inputs
- Show personal entries in the time tracking list with a different badge/icon to distinguish from task entries
- **Also**: Add ability to log time entries to specific project tasks from this page using a project/task selector

### Hook Changes
- **useAllTimeEntries.ts**: Also fetch `personal_time_entries` and merge into the unified list with `type: 'personal'`
- **New hook**: `usePersonalTimeEntries` for CRUD on the personal entries table

---

## 6. Project Lead Notifications

### Database Changes
- Create a new trigger `notify_project_updates_to_lead` that fires when:
  - A new task is created in a project (`INSERT` on `tasks`)
  - A task status changes (column change on `tasks`)
  - A new member joins the project (`INSERT` on `project_members`)
- The trigger checks if the project has a `lead_id` set and sends a notification to that user

### Implementation
- Add 3 database triggers:
  1. `notify_lead_task_created` -- on INSERT to tasks, notify the project lead
  2. `notify_lead_task_status_changed` -- on UPDATE to tasks when column_id changes, notify lead
  3. `notify_lead_member_added` -- on INSERT to project_members, notify lead (this partially exists but only notifies the new member, not the lead)

---

## 7. PWA Install Prompt

### Concept
Show a dismissible banner/toast prompting users to install the PWA. If dismissed, show again after 12 hours (twice daily). Once installed, never show again.

### Implementation
- **New component**: `PWAInstallBanner.tsx`
  - Uses `beforeinstallprompt` event on Android/Chrome
  - On iOS, shows instructions to "Add to Home Screen"
  - Tracks last dismiss time in localStorage (`pwa-install-dismissed-at`)
  - Shows if: not installed AND (never dismissed OR dismissed more than 12 hours ago)
  - Animated slide-in banner at the bottom of the screen (above bottom nav)
- **Index.tsx**: Render `PWAInstallBanner` inside the main layout
- **vite.config.ts**: Add `/~oauth` to `navigateFallbackDenylist` (missing per guidelines)

### Push Notifications
The existing `usePushNotifications` hook and `NotificationBell` component already handle push notification permissions and local notifications. The service worker approach is already in place. No additional changes needed for push -- the trigger-based notifications (from step 6) will fire real-time updates via Supabase's postgres_changes, which the `NotificationBell` already listens to and sends local push notifications.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/personal/UpcomingDeadlines.tsx` | Upcoming deadline tasks card |
| `src/components/personal/TodayEarningsCard.tsx` | Today's earnings display |
| `src/components/personal/PersonalTimeEntryDialog.tsx` | Dialog for custom time entries |
| `src/components/personal/CompletedTasksView.tsx` | Archived/delivered tasks list |
| `src/components/pwa/PWAInstallBanner.tsx` | PWA install prompt banner |
| `src/hooks/usePersonalTimeEntries.ts` | CRUD for custom time entries |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/database.ts` | Add `completed_at`, `estimated_hours` to Task/Subtask types; add PersonalTimeEntry type |
| `src/components/kanban/TaskDetailSheet.tsx` | Add "Deliver to Client" button, estimated hours input, time vs estimate comparison |
| `src/components/kanban/KanbanBoard.tsx` | Filter completed tasks, add Completed toggle |
| `src/components/kanban/SubtaskRow.tsx` | Show estimate exceeded warning |
| `src/components/kanban/TaskCard.tsx` | Show over-estimate badge |
| `src/components/personal/PersonalDashboard.tsx` | Remove QuickAddTask, add UpcomingDeadlines + TodayEarningsCard |
| `src/components/personal/PersonalCalendar.tsx` | Full-width calendar, clickable tasks with TaskDetailSheet |
| `src/components/personal/TimeTrackingPage.tsx` | Add personal time entry button, project task entry selector |
| `src/hooks/usePersonalTasks.ts` | Add useUpcomingDeadlineTasks hook |
| `src/hooks/useUserWallet.ts` | Add useTodayEarnings hook |
| `src/hooks/useAllTimeEntries.ts` | Merge personal time entries into unified list |
| `src/pages/Index.tsx` | Add PWAInstallBanner |
| `src/hooks/useTasks.ts` | Update types for estimated_hours |
| `vite.config.ts` | Add /~oauth to navigateFallbackDenylist |

### Database Migrations
1. `ALTER TABLE tasks ADD COLUMN completed_at timestamptz DEFAULT NULL`
2. `ALTER TABLE tasks ADD COLUMN estimated_hours numeric DEFAULT NULL`
3. `ALTER TABLE subtasks ADD COLUMN estimated_hours numeric DEFAULT NULL`
4. Create `personal_time_entries` table with RLS
5. Create `notify_lead_task_created` trigger function + trigger
6. Create `notify_lead_task_status_changed` trigger function + trigger
7. Create `notify_lead_member_joined` trigger function + trigger

