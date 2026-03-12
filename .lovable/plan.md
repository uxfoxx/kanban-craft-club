

# UX & Visual Polish Overhaul

## Problems Identified

1. **Cards lack depth** — flat borders, no shadow hierarchy, inconsistent padding
2. **Top bar is bland** — plain `border-b` with no visual separation from content
3. **Dashboard card title sizes are inconsistent** — `text-sm`, `text-base`, `text-2xl` mixed across cards
4. **Sidebar has weak visual separation** — same background as content, logo area cramped
5. **Kanban columns look basic** — `bg-muted/30` is nearly invisible, no clear container feel
6. **TaskCard is dense** — timer button, move dropdown, avatars, earning badge, dates, time all crammed into a small card
7. **Auth page is generic** — basic centered card, no brand personality
8. **Color accents** — the coral/red primary is fine but the supporting palette (chart colors) is muddy and low-contrast
9. **Empty/loading states** — plain "Loading..." text instead of proper skeletons
10. **Bottom nav (mobile)** — functional but visually flat, no active indicator beyond color

## Changes

### 1. Global CSS Refinements (`src/index.css`)
- Increase `--radius` to `0.75rem` for softer cards
- Improve shadow variables for more visible depth
- Add subtle background texture/gradient to `--background` (very light warm gray instead of pure white)
- Improve dark mode contrast

### 2. Top Bar (`src/pages/Index.tsx`)
- Add `shadow-sm` and slightly more height (`h-16`)
- Better spacing between title and actions
- Make avatar button more polished with ring on hover

### 3. Dashboard (`PersonalDashboard.tsx`)
- Unify card title sizes to `text-base font-semibold`
- Add subtle gradient accent to the welcome section
- Better grid proportions

### 4. Dashboard Cards (TodayTimeCard, TodayEarningsCard, UpcomingDeadlines, TaskDueToday)
- Consistent `CardHeader` sizing with proper icon colors
- Add subtle colored left border or top accent to differentiate card types
- Improve skeleton/loading states
- TodayEarningsCard: use a green accent instead of generic
- UpcomingDeadlines: improve deadline item styling with better contrast

### 5. Sidebar (`AppSidebar.tsx`)
- Add a subtle `bg-sidebar` distinction
- Better logo area padding
- Active nav item: add a left accent bar instead of just background change

### 6. Kanban Columns (`KanbanColumn.tsx`)
- Use `bg-muted/50` with a subtle border for column containers
- Improve column header with bolder styling
- Add rounded corners and proper shadow

### 7. TaskCard (`TaskCard.tsx`)
- Increase card padding slightly (`p-3.5`)
- Better visual grouping: title area → meta row → footer (avatars + earning)
- Softer priority border (reduce from `border-l-4` to `border-l-3`)
- Timer button: smaller, less prominent when inactive
- Move button: only show on hover (already partly done but improve)

### 8. Auth Page (`AuthPage.tsx`)
- Add a gradient background
- Larger logo with proper spacing
- Subtle brand accent on the card

### 9. Project Cards (`ProjectCard.tsx`)
- Add hover scale effect
- Better description truncation
- Cleaner date display

### 10. Workspace Page (`WorkspacePage.tsx`)
- Cleaner header layout
- Better tab styling

### 11. Bottom Navigation (`BottomNavigation.tsx`)
- Add active indicator dot/bar under active item
- Slightly taller for better touch targets

---

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Improved radius, shadows, background tones |
| `src/pages/Index.tsx` | Better top bar styling |
| `src/components/personal/PersonalDashboard.tsx` | Unified card layout, welcome section accent |
| `src/components/personal/TodayTimeCard.tsx` | Consistent title, accent border |
| `src/components/personal/TodayEarningsCard.tsx` | Green accent, consistent sizing |
| `src/components/personal/UpcomingDeadlines.tsx` | Better deadline items |
| `src/components/personal/TaskDueToday.tsx` | Cleaner task rows |
| `src/components/layout/AppSidebar.tsx` | Active indicator, logo spacing |
| `src/components/layout/BottomNavigation.tsx` | Active indicator bar |
| `src/components/kanban/KanbanColumn.tsx` | Better container styling |
| `src/components/kanban/TaskCard.tsx` | Improved spacing and visual grouping |
| `src/components/auth/AuthPage.tsx` | Gradient background, brand polish |
| `src/components/projects/ProjectCard.tsx` | Hover effects, cleaner layout |
| `src/components/workspace/WorkspacePage.tsx` | Header cleanup |

