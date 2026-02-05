
## Plan: Personal View, Time Tracking Dashboard, and Organization Team Analytics

This plan introduces a comprehensive personal workspace and time tracking system with organization-level team analytics.

---

### Overview of New Features

1. **Personal Dashboard** - A "My Tasks" view showing tasks due today, personal task management, and daily time summary
2. **Personal Time Tracking Page** - Dedicated page for managing all time entries across all projects
3. **Organization Team Analytics** - View team members' work hours and click to see individual work history
4. **Navigation Improvements** - Tab-based navigation to switch between Personal/Projects/Team views
5. **Mobile-First Responsive Design** - All new pages optimized for mobile devices

---

### Phase 1: Navigation Restructure

**1.1 Update Header with Tab Navigation**

Modify `src/components/layout/Header.tsx` to include navigation tabs:

```text
+--------------------------------------------------+
| TaskFlow  [Org Switcher]  [My Tasks] [Projects] [Team]  [Timer] [Bell] [Avatar] |
+--------------------------------------------------+
```

On mobile, tabs collapse into a hamburger menu or bottom navigation bar.

**1.2 Update Index Page with View State**

Modify `src/pages/Index.tsx` to manage current view:
- `personal` - My Tasks / Personal Dashboard
- `projects` - Current project list view
- `team` - Organization team view
- `timetracking` - Personal time tracking page

---

### Phase 2: Personal Dashboard ("My Tasks")

**2.1 Create `src/components/personal/PersonalDashboard.tsx`**

Dashboard layout:

```text
+------------------------------------------+
|  Welcome, [Name]!                        |
|  Today: Wednesday, Feb 5, 2026           |
+------------------------------------------+
|  Today's Time Worked                     |
|  [====== 2h 34m ======]                  |
|  Active Timer: Task Name (00:12:34)      |
+------------------------------------------+
|  Tasks Due Today (3)                     |
|  [ ] Task 1 - Project A      [Start]    |
|  [ ] Task 2 - Project B      [Start]    |
|  [x] Task 3 - Project A      1h 20m     |
+------------------------------------------+
|  Quick Add Personal Task                 |
|  [Enter task...        ] [Add]           |
+------------------------------------------+
|  [View Time Tracking -->]                |
+------------------------------------------+
```

**2.2 Create `src/hooks/usePersonalTasks.ts`**

New hooks for personal task queries:
- `useMyTasksToday()` - Tasks assigned to user due today (across all orgs/projects)
- `useMyTodayTimeTotal()` - Sum of all time entries for today
- `useMyRecentTimeEntries()` - Recent time entries across all tasks

**2.3 Add Quick Task Feature**

Allow users to create tasks for themselves directly from personal dashboard. These get assigned to a "Personal" project or the user can select a project.

---

### Phase 3: Personal Time Tracking Page

**3.1 Create `src/components/personal/TimeTrackingPage.tsx`**

Full-page time tracking management:

```text
+------------------------------------------+
|  Time Tracking                           |
|  [Today] [This Week] [This Month] [All]  |
+------------------------------------------+
|  Total: 8h 45m  |  [+ Add Entry]         |
+------------------------------------------+
|  Today - Feb 5                           |
|  +------------------------------------+  |
|  | 9:00 - 11:30  | Task A | Proj 1   |  |
|  | Description: Fixed bug...   [Edit] |  |
|  +------------------------------------+  |
|  | 1:00 - 3:45   | Task B | Proj 2   |  |
|  | No description          [Edit]    |  |
|  +------------------------------------+  |
+------------------------------------------+
|  Yesterday - Feb 4                       |
|  +------------------------------------+  |
|  | ...                                |  |
|  +------------------------------------+  |
+------------------------------------------+
```

**3.2 Create `src/hooks/useAllTimeEntries.ts`**

New hooks:
- `useAllMyTimeEntries(dateRange)` - Fetch all time entries for current user with task/project info
- Include both `time_entries` (task level) and `subtask_time_entries` (subtask level)

**3.3 Time Entry Grouping**

Group entries by date and show:
- Task name with link to task
- Project name
- Duration
- Description
- Edit/Delete actions

---

### Phase 4: Organization Team Analytics

**4.1 Create `src/components/organizations/TeamAnalyticsPage.tsx`**

Team overview showing all members' time:

```text
+------------------------------------------+
|  Team - [Organization Name]              |
+------------------------------------------+
|  Today  |  This Week  |  This Month     |
+------------------------------------------+
|  Member             | Today | This Week  |
|  +-----------------------------------------+
|  | [Avatar] John Doe    | 3h 20m | 28h   |
|  | [Click to view details]              |
|  +-----------------------------------------+
|  | [Avatar] Jane Smith  | 2h 45m | 24h   |
|  +-----------------------------------------+
|  | [Avatar] Bob Jones   | 4h 10m | 32h   |
|  +-----------------------------------------+
+------------------------------------------+
```

**4.2 Create `src/hooks/useTeamTimeTracking.ts`**

New hooks for organization-level time queries:
- `useOrganizationTimeEntries(orgId, dateRange)` - All time entries for org members
- `useTeamMemberTimeSummary(orgId)` - Aggregated time per member

This requires updating RLS policies to allow organization admins/owners to view time entries of members.

**4.3 Database Migration: Add RLS for Team Time Viewing**

New policy on `time_entries` table:
```sql
CREATE POLICY "Organization admins can view member time entries"
ON time_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = time_entries.task_id
    AND p.organization_id IS NOT NULL
    AND (
      is_organization_owner(p.organization_id, auth.uid())
      OR is_organization_admin(p.organization_id, auth.uid())
    )
  )
);
```

**4.4 Member Detail View: `src/components/organizations/MemberTimeHistory.tsx`**

Clicking on a team member opens a sheet showing their work history:

```text
+------------------------------------------+
|  John Doe's Work History                 |
|  [This Week] [This Month] [All Time]     |
+------------------------------------------+
|  Summary                                 |
|  Total This Week: 28h 15m                |
|  Most Active Project: Project Alpha      |
+------------------------------------------+
|  Recent Entries                          |
|  +------------------------------------+  |
|  | Feb 5, 9:00 AM - 12:30 PM         |  |
|  | Task: Implement feature X          |  |
|  | Project: Project Alpha             |  |
|  | Duration: 3h 30m                   |  |
|  +------------------------------------+  |
|  | Feb 4, 2:00 PM - 5:45 PM          |  |
|  | Task: Code review                  |  |
|  | Project: Project Beta              |  |
|  | Duration: 3h 45m                   |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

### Phase 5: Mobile Responsiveness

**5.1 Responsive Navigation**

- **Desktop**: Horizontal tabs in header
- **Mobile**: Bottom navigation bar with icons

Create `src/components/layout/BottomNavigation.tsx`:
```text
+------------------------------------------+
|          CONTENT AREA                    |
+------------------------------------------+
| [Home] [Projects] [Team] [Time] [Profile]|
+------------------------------------------+
```

**5.2 Mobile-Optimized Components**

- Stack layouts vertically on small screens
- Use collapsible sections for data-heavy views
- Touch-friendly tap targets (min 44x44px)
- Swipe gestures for editing time entries (optional)

**5.3 Update All New Components with Responsive Classes**

Use Tailwind breakpoints:
- `flex flex-col md:flex-row`
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `text-sm md:text-base`
- `p-4 md:p-6`

---

### Files to Create

| File | Description |
|------|-------------|
| `src/components/personal/PersonalDashboard.tsx` | My Tasks dashboard with today's tasks and time summary |
| `src/components/personal/TimeTrackingPage.tsx` | Full time tracking management page |
| `src/components/personal/QuickAddTask.tsx` | Quick task creation form |
| `src/components/personal/TodayTimeCard.tsx` | Card showing today's total time worked |
| `src/components/personal/TaskDueToday.tsx` | List of tasks due today |
| `src/components/personal/TimeEntryListItem.tsx` | Individual time entry row with edit/delete |
| `src/components/organizations/TeamAnalyticsPage.tsx` | Team time overview |
| `src/components/organizations/MemberTimeHistory.tsx` | Individual member work history sheet |
| `src/components/organizations/TeamMemberRow.tsx` | Row in team list with time summary |
| `src/components/layout/BottomNavigation.tsx` | Mobile bottom navigation |
| `src/hooks/usePersonalTasks.ts` | Hooks for personal task queries |
| `src/hooks/useAllTimeEntries.ts` | Hooks for fetching all user time entries |
| `src/hooks/useTeamTimeTracking.ts` | Hooks for organization time analytics |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Add view state management, render different views based on navigation |
| `src/components/layout/Header.tsx` | Add navigation tabs, make responsive |
| `src/hooks/useTimeTracking.ts` | Add hooks for today's time total |
| Database Migration | Add RLS policy for organization admins to view member time entries |

---

### Database Changes

**Migration: Allow org admins to view member time entries**

```sql
-- Create policy for organization admins to view time entries of org members
CREATE POLICY "Organization members can view time entries for org projects"
ON time_entries FOR SELECT
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE t.id = time_entries.task_id
    AND om.user_id = auth.uid()
    AND (om.role = 'admin' OR p.owner_id = om.user_id)
  )
);
```

---

### UI/UX Improvements

1. **Consistent Card Design** - Use consistent card styling across all new components
2. **Loading States** - Skeleton loaders for all data-fetching components
3. **Empty States** - Friendly messages when no data (e.g., "No tasks due today!")
4. **Date Filtering** - Consistent date range picker across time views
5. **Animations** - Subtle transitions when switching views
6. **Dark Mode Support** - Ensure all new components work in dark mode

---

### Implementation Order

1. Navigation restructure and view state management
2. Personal Dashboard with today's tasks
3. Today's time summary card
4. Personal Time Tracking page
5. Database migration for team time viewing
6. Team Analytics page
7. Member Time History detail view
8. Mobile bottom navigation
9. Responsive design polish
10. Testing and refinements

---

### Technical Considerations

- **Performance**: Use React Query for caching and pagination on large time entry lists
- **Real-time**: Continue using Supabase realtime for time entries
- **Date handling**: Use date-fns consistently for all date operations
- **Type safety**: Create proper TypeScript interfaces for all new data structures
