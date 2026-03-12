

# Reference-Matched UI Redesign

## Analysis of Reference Image

The reference shows a **minimal, icon-strip sidebar** with dark rounded-square active states, very light blue-gray ambient background, oversized card radius (~20px), heavy whitespace, and muted monochrome palette with minimal color. Current app has too-wide sidebar, cluttered headers, and inconsistent spacing.

## Key Changes

### 1. Sidebar → Icon-Strip Default (`AppSidebar.tsx`, `sidebar.tsx`)
- Default to collapsed/icon mode on desktop (like reference's ~60px icon strip)
- Active icon: dark rounded square (`bg-foreground text-background`) instead of coral pill
- Remove group labels when collapsed, show only icons
- Logo: show only icon mark when collapsed
- `SIDEBAR_WIDTH_ICON` from `3rem` → `4rem` for better touch targets

### 2. Background & Tokens (`index.css`)
- Background: shift to cooler blue-gray `210 25% 96%`
- Body gradient: use soft blue-gray radials matching reference's icy tone
- Card: `0 0% 100% / 0.75` (more opaque, cleaner)
- Reduce `--radius` to `0.875rem` (14px) — reference uses ~16-20px on cards but smaller on inner elements
- Borders: lighter `210 20% 92%`

### 3. Top Bar (`Index.tsx`)
- Thinner: `h-14` instead of `h-16`
- Remove glass effect, use simple `bg-white/60 backdrop-blur-lg border-b border-border/50`
- Smaller page title: `text-base`
- Compact action buttons

### 4. Dashboard Cards (TodayTimeCard, TodayEarningsCard, UpcomingDeadlines, TaskDueToday)
- Remove icon-in-colored-box pattern (reference uses plain text headers)
- Simpler card headers: just text, no icon wrappers
- More generous padding `p-5`/`p-6`
- UpcomingDeadlines: remove `border-l-4` urgency bars, use simpler badges
- TaskDueToday: simpler row layout, remove heavy border styling

### 5. Card Component (`card.tsx`)
- Base: `rounded-2xl bg-white/75 backdrop-blur-xl border border-white/50 shadow-sm`
- Remove `shadow-md` default — reference uses very subtle shadows

### 6. Kanban (`KanbanColumn.tsx`, `TaskCard.tsx`)
- Column: `bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40`
- TaskCard: lighter, more padding, remove thick priority borders, use small dot only
- Reduce card content density

### 7. Bottom Nav (`BottomNavigation.tsx`)
- Match glass style with thinner border
- Reduce height from `4.5rem` to `4rem`
- Smaller icons and text

### 8. Auth Page (`AuthPage.tsx`)
- Cleaner gradient background matching new tokens
- Remove decorative blurred circles — use simple gradient

### 9. Responsive Fixes
- Dashboard grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with proper gap
- Main content: ensure `overflow-y-auto` on inner scroll containers
- Bottom nav padding: `pb-20` on mobile
- Sidebar: hide completely on mobile (use bottom nav only)
- KanbanBoard horizontal scroll: ensure `overflow-x-auto` on column container

### 10. WorkspacePage / ProjectCard
- Simpler header with less vertical space
- ProjectCard: remove hover translate, use subtle shadow transition only

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Cooler background, lighter tokens, updated glass classes |
| `src/components/ui/card.tsx` | Lighter glass defaults, subtle shadow |
| `src/components/ui/sidebar.tsx` | Increase icon-mode width to 4rem |
| `src/components/layout/AppSidebar.tsx` | Icon-strip default, dark active square |
| `src/components/layout/BottomNavigation.tsx` | Compact sizing, thinner border |
| `src/pages/Index.tsx` | Thinner top bar, simpler styling |
| `src/components/personal/PersonalDashboard.tsx` | Grid responsive fix |
| `src/components/personal/TodayTimeCard.tsx` | Simpler header, more padding |
| `src/components/personal/TodayEarningsCard.tsx` | Simpler header |
| `src/components/personal/UpcomingDeadlines.tsx` | Remove heavy borders, simpler items |
| `src/components/personal/TaskDueToday.tsx` | Simpler row layout |
| `src/components/kanban/KanbanColumn.tsx` | Lighter glass container |
| `src/components/kanban/TaskCard.tsx` | More padding, lighter style |
| `src/components/auth/AuthPage.tsx` | Cleaner background |
| `src/components/projects/ProjectCard.tsx` | Remove hover translate |
| `src/components/workspace/WorkspacePage.tsx` | Compact header |

