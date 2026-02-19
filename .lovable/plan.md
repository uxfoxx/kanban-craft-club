
# Update Sidebar Logo

## Changes (single file: `src/components/layout/AppSidebar.tsx`)

1. **Remove "Bandit Theory" text** -- delete the `<span>` on line 68
2. **Increase logo size** -- change from `h-6 w-6` to `w-auto` with `max-h-[60px]` so it scales up but crops/clips when it exceeds 60px height
3. **Add `object-cover` and `overflow-hidden`** to ensure clean cropping at the 60px boundary

### Before (lines 64-83):
```tsx
<SidebarHeader className="p-4">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <img src={logo} alt="Bandit Theory" className="h-6 w-6 flex-shrink-0" />
      {!isCollapsed && <span className="text-lg font-bold truncate">Bandit Theory</span>}
    </div>
    ...
```

### After:
```tsx
<SidebarHeader className="p-4">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center min-w-0 overflow-hidden max-h-[60px]">
      <img src={logo} alt="Bandit Theory" className="w-auto max-h-[60px] object-cover flex-shrink-0" />
    </div>
    ...
```

- The text span is removed entirely
- The logo uses `w-auto max-h-[60px]` so it renders at its natural aspect ratio up to 60px tall
- `object-cover` ensures if the image is taller it crops rather than squishes
- Works in both expanded and collapsed sidebar states
