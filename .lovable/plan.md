

# Glassmorphism UI Redesign

## Design Analysis from Reference Image

The reference uses a **glassmorphism / frosted-glass** aesthetic:
- Translucent white cards with `backdrop-blur` and subtle white borders
- Large border-radius (~16-20px)
- Soft, diffused box shadows
- Cool-toned gradient background (light blue-gray)
- Very generous whitespace and padding
- Clean typography with clear hierarchy
- Minimal, icon-focused sidebar

## Changes (keeping brand logo + primary coral color)

### 1. Design Tokens (`src/index.css`)
- Background: soft blue-gray gradient (`210 20% 94%`) instead of warm beige
- Card: semi-transparent white (`0 0% 100% / 0.7`) with backdrop-blur
- Increase `--radius` to `1rem` (16px)
- Softer, more diffused shadows with blur
- Border: very light (`210 20% 90%`) with low opacity
- Add `.glass-card` utility class: `bg-white/70 backdrop-blur-xl border-white/40 shadow-lg`
- Add subtle gradient background to body

### 2. Card Component (`src/components/ui/card.tsx`)
- Default card: `rounded-2xl bg-white/70 backdrop-blur-xl border-white/40 shadow-lg` (glassmorphism)
- Softer, more spacious padding

### 3. Sidebar (`AppSidebar.tsx`)
- Frosted glass background with `backdrop-blur`
- Active item: dark pill/rounded background (like reference's dark square icon) using primary color
- Cleaner separator styling
- Logo area: more breathing room

### 4. Top Bar (`src/pages/Index.tsx`)
- Frosted glass header: `bg-white/60 backdrop-blur-xl border-b border-white/30`
- Remove hard `shadow-sm`, use subtle glass border instead
- Softer typography

### 5. Dashboard (`PersonalDashboard.tsx`)
- Welcome section: cleaner, lighter weight heading
- Better grid spacing with `gap-6`

### 6. Dashboard Cards (TodayTimeCard, TodayEarningsCard, UpcomingDeadlines, TaskDueToday)
- Remove colored left borders (too heavy for glassmorphism)
- Use subtle top accent or colored icon instead
- Lighter card backgrounds
- More generous internal padding

### 7. Kanban Column (`KanbanColumn.tsx`)
- Glass container: `bg-white/40 backdrop-blur-sm rounded-2xl border border-white/30`
- Softer column header with pill-shaped count badge

### 8. Task Card (`TaskCard.tsx`)
- Glass card style with `bg-white/80 backdrop-blur-sm rounded-xl`
- Subtler priority indicator (thin top border or small dot instead of thick left border)
- More padding and breathing room

### 9. Auth Page (`AuthPage.tsx`)
- Gradient background matching the cool-toned system
- Glass card for the login form
- Remove `border-t-4` (too heavy)

### 10. Bottom Navigation (`BottomNavigation.tsx`)
- Frosted glass: `bg-white/70 backdrop-blur-xl border-t border-white/30`
- Rounded active indicator pill

### 11. Project Card (`ProjectCard.tsx`)
- Glass card style consistent with system
- Softer hover state

### 12. Notification Popover (`NotificationBell.tsx`)
- Glass popover background
- Softer dividers

### 13. Profile Settings (`ProfileSettings.tsx`)
- Notification sounds section with master toggle, volume slider, per-type switches with test buttons

### 14. Notification Sound System (New Files)
- `src/lib/notificationSounds.ts`: Web Audio API tones for each notification type
- `src/hooks/useNotificationSoundSettings.ts`: localStorage preferences hook
- Integrate into `NotificationBell.tsx`

### 15. Dashboard Scroll Fixes
- `UpcomingDeadlines.tsx`: Use `h-[280px]` instead of `max-h-[300px]` for ScrollArea
- `TaskDueToday.tsx`: Wrap task list in ScrollArea with fixed height
- Ensure main content area scrolls properly

---

## Files Summary

| File | Change |
|------|--------|
| `src/index.css` | Cool gradient background, glass variables, utility classes |
| `src/components/ui/card.tsx` | Glassmorphism defaults |
| `src/components/layout/AppSidebar.tsx` | Frosted sidebar, dark active pill |
| `src/components/layout/BottomNavigation.tsx` | Glass bottom bar |
| `src/pages/Index.tsx` | Glass top bar |
| `src/components/personal/PersonalDashboard.tsx` | Lighter welcome, spacing |
| `src/components/personal/TodayTimeCard.tsx` | Remove left border, glass style |
| `src/components/personal/TodayEarningsCard.tsx` | Remove left border, glass style |
| `src/components/personal/UpcomingDeadlines.tsx` | Glass style, fix scroll height |
| `src/components/personal/TaskDueToday.tsx` | Glass style, add ScrollArea |
| `src/components/kanban/KanbanColumn.tsx` | Glass column containers |
| `src/components/kanban/TaskCard.tsx` | Glass cards, subtle priority |
| `src/components/auth/AuthPage.tsx` | Cool gradient, glass login card |
| `src/components/projects/ProjectCard.tsx` | Glass card style |
| `src/components/workspace/WorkspacePage.tsx` | Glass tab styling |
| `src/components/notifications/NotificationBell.tsx` | Play sounds on new notifications |
| `src/components/profile/ProfileSettings.tsx` | Add notification sound settings |
| `src/lib/notificationSounds.ts` | **New** — Web Audio API sound generator |
| `src/hooks/useNotificationSoundSettings.ts` | **New** — localStorage sound prefs |

## Implementation Order

1. Design tokens + glass utilities in `index.css`
2. Card component glassmorphism defaults
3. Layout: sidebar, top bar, bottom nav
4. Dashboard cards
5. Kanban: columns + task cards
6. Auth page, project cards, workspace
7. Notification sounds system
8. Scroll fixes

