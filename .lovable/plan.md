

# Replace All Branding with Bandit Theory Logo

## What This Does
Replaces the current generic "TaskFlow" icon (a Lucide icon) and all PWA/favicon assets with the uploaded Bandit Theory Creatives logo image everywhere it appears.

## Changes

### 1. Copy the Logo to the Project
- Copy `user-uploads://BANDIT_THEORY-_red.png` to both:
  - `public/logo.png` -- for favicon, PWA icons, apple-touch-icon, and push notification icons
  - `src/assets/logo.png` -- for React component imports (sidebar, header, auth page, PWA banner)

### 2. Update `index.html`
- Change the favicon link to point to `/logo.png`
- Update apple-touch-icon to `/logo.png`
- Update the page title from "Kanban Craft Club" to "Bandit Theory Creatives"
- Update OG/meta tags to "Bandit Theory Creatives"

### 3. Update `vite.config.ts` (PWA Manifest)
- Change `name` to "Bandit Theory Creatives"
- Change `short_name` to "Bandit Theory"
- Update `includeAssets` to include `logo.png`
- Point all PWA icon entries to `logo.png`

### 4. Update `src/components/layout/AppSidebar.tsx`
- Import the logo from `@/assets/logo.png`
- Replace `<LayoutDashboard>` icon with `<img src={logo}>` (sized similarly, ~24x24)
- Change the text from "TaskFlow" to "Bandit Theory"

### 5. Update `src/components/layout/Header.tsx`
- Same as sidebar: replace `<LayoutDashboard>` icon with `<img>` using the imported logo
- Change "TaskFlow" text to "Bandit Theory"

### 6. Update `src/components/auth/AuthPage.tsx`
- Replace `<LayoutDashboard>` icon with the logo image
- Change "TaskFlow" to "Bandit Theory Creatives"

### 7. Update `src/components/pwa/PWAInstallBanner.tsx`
- Change "Install TaskFlow" to "Install Bandit Theory"

### 8. Update `src/hooks/usePushNotifications.ts`
- Change notification icon references from `/pwa-192x192.png` to `/logo.png`

## Files Summary

| File | Change |
|------|--------|
| `public/logo.png` | New -- copied from upload |
| `src/assets/logo.png` | New -- copied from upload |
| `index.html` | Favicon, title, meta tags |
| `vite.config.ts` | PWA manifest name + icons |
| `src/components/layout/AppSidebar.tsx` | Logo image + name |
| `src/components/layout/Header.tsx` | Logo image + name |
| `src/components/auth/AuthPage.tsx` | Logo image + name |
| `src/components/pwa/PWAInstallBanner.tsx` | Banner text |
| `src/hooks/usePushNotifications.ts` | Notification icon path |

