

# TaskFlow UX/UI Audit and Improvement Plan

## Problems Identified

### 1. Excessive Font Imports (Performance)
The app loads 11 Google Font imports in `index.css` but only uses 2 (Source Sans Pro and Playfair Display). This adds 500ms+ to initial page load, especially on mobile.

### 2. Push Notification Banner Disrupts Layout
The notification banner sits between the header and content, pushing everything down and creating an awkward visual break. It competes with the header for attention.

### 3. Dashboard Layout Imbalance
The Personal Dashboard has an unbalanced 2-column grid: left column has TodayTimeCard + QuickAddTask (both compact), right column has TaskDueToday (potentially very tall). The "View Full Time Tracking" button sits alone at the bottom as an orphan element.

### 4. Redundant Project Views
Projects appear in both the "Projects" tab AND the Organization page's "Projects" tab. Users see the same projects in two places with different UI patterns, creating confusion about where to manage them.

### 5. No Breadcrumb Context in Kanban
When a user clicks into a project's Kanban board, there's no indication of which section they came from. The back button just says "back" with no context. Users lose their place.

### 6. Sidebar Footer Clutter
The sidebar footer has Settings + Sign Out buttons AND the user profile info. The profile info only shows when expanded but disappears entirely when collapsed, losing identity context.

### 7. Move-to-Column Only on Mobile
The helpful "Move to column" dropdown on task cards is only shown on mobile. Desktop users must drag, which is not always intuitive and provides no alternative.

### 8. Organization Page Header Spacing
The org page header has too much vertical spacing with the title, description, dropdown, and buttons all on separate lines on mobile, consuming valuable screen real estate.

### 9. No Visual Hierarchy in Kanban Board Header
The Kanban board header has the project name, description, member count, column settings, add member, and add task buttons all in a flat layout without clear grouping.

### 10. Time Tracking Page Has Redundant Back Button
The TimeTrackingPage has a "Back to Dashboard" button that duplicates sidebar navigation. It wastes header space.

---

## Proposed Changes

### Phase 1: Performance and Cleanup
**File: `src/index.css`**
- Remove 9 unused font imports (lines 1-9), keeping only Playfair Display and Source Sans Pro

### Phase 2: Move Notification Banner into NotificationBell
**File: `src/pages/Index.tsx`**
- Remove the push notification banner entirely from the main layout
- The NotificationBell popover already has a push notification prompt inside it -- this is sufficient

**File: `src/components/notifications/NotificationBell.tsx`**
- Make the existing in-popover push notification prompt slightly more prominent with better copy

### Phase 3: Redesign Dashboard Layout
**File: `src/components/personal/PersonalDashboard.tsx`**
- Restructure to a single-column layout on mobile, 2-column on desktop
- Top: Welcome + QuickAddTask inline (combine greeting with action)
- Left column: TaskDueToday (primary focus -- what to work on)
- Right column: TodayTimeCard + "View Time History" link (secondary info)
- Remove the orphaned bottom button; integrate time tracking link into TodayTimeCard

**File: `src/components/personal/TodayTimeCard.tsx`**
- Add a "View history" link at the bottom of the card instead of having a separate button

### Phase 4: Remove Duplicate Project Tab from Organization
**File: `src/components/organizations/OrganizationPage.tsx`**
- Remove the "Projects" tab entirely -- projects are already in the dedicated Projects section
- Keep only: Activity | Analytics tabs (plus Members managed via settings)
- This eliminates the confusing duplicate project listing

### Phase 5: Add Breadcrumb to Kanban Board
**File: `src/components/kanban/KanbanBoard.tsx`**
- Replace the plain back arrow with a breadcrumb: "Projects > [Project Name]" or "Organization > [Project Name]"
- Use the existing `src/components/ui/breadcrumb.tsx` component

### Phase 6: Show Move-to-Column on Desktop Too
**File: `src/components/kanban/TaskCard.tsx`**
- Show the "Move to column" dropdown on all devices, not just mobile
- This provides an accessible alternative to drag-and-drop for all users

### Phase 7: Streamline Time Tracking Page
**File: `src/components/personal/TimeTrackingPage.tsx`**
- Remove the "Back to Dashboard" button -- the sidebar already handles navigation
- Add a page title that's more descriptive with the date range context

### Phase 8: Tighten Organization Page Header
**File: `src/components/organizations/OrganizationPage.tsx`**
- Make the org selector and action buttons sit inline on a single row
- Reduce the title/description size to match other pages

### Phase 9: Improve Sidebar User Section
**File: `src/components/layout/AppSidebar.tsx`**
- Show user avatar in collapsed mode (it currently disappears)
- Move the sign-out action into a dropdown triggered by clicking the user avatar, reducing footer clutter

---

## Technical Details

### Files to Modify (9 files)
1. `src/index.css` -- Remove 9 unused font imports
2. `src/pages/Index.tsx` -- Remove notification banner (lines 100-122)
3. `src/components/notifications/NotificationBell.tsx` -- Improve push prompt styling
4. `src/components/personal/PersonalDashboard.tsx` -- Restructure grid, remove bottom button
5. `src/components/personal/TodayTimeCard.tsx` -- Add "View history" link
6. `src/components/organizations/OrganizationPage.tsx` -- Remove Projects tab, tighten header
7. `src/components/kanban/KanbanBoard.tsx` -- Add breadcrumb navigation
8. `src/components/kanban/TaskCard.tsx` -- Show move-to-column on all devices
9. `src/components/personal/TimeTrackingPage.tsx` -- Remove redundant back button
10. `src/components/layout/AppSidebar.tsx` -- Show avatar when collapsed, move sign-out to avatar dropdown

### No Database Changes Required
All changes are purely frontend layout and UX improvements.

