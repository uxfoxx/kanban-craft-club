

# Super Admin System, Admin Page, Email Search UX, and PWA Update Prompt

## What This Does
1. Creates a "super admin" role for the system owner (naveen.f.senanayake@gmail.com)
2. Adds an "Admin" page with password reset and user management capabilities
3. Improves email input UX with search-as-you-type when adding members
4. Changes PWA update behavior to show a popup asking the user to update instead of auto-updating silently

---

## 1. Database: `super_admins` Table and Helper Function

Create a new table and a security-definer function to identify super admins. Seed it with the known user ID.

- **Table**: `super_admins` (user_id unique, references nothing in auth schema directly -- just stores the UUID)
- **Function**: `is_super_admin(uuid)` returns boolean, SECURITY DEFINER
- **RLS**: Only super admins can SELECT from this table
- **Additional policy on `profiles`**: Super admins can view ALL profiles (needed for user search in admin page)
- **Seed**: Insert `a434c9c6-90ea-4f5d-972c-b7f050c054a5` as the super admin

## 2. Edge Function: `admin-reset-password`

A backend function that:
- Validates the caller is a super admin by checking the `super_admins` table with the service role key
- Accepts `user_id` and `new_password` in the request body
- Calls the admin API to update the user's password
- Returns success or error

## 3. New Hook: `useSuperAdmin`

`src/hooks/useSuperAdmin.ts` -- queries the `super_admins` table for the current user's ID. Returns `{ isSuperAdmin, isLoading }`.

## 4. New Component: Email Search Input

`src/components/shared/EmailSearchInput.tsx` -- a reusable text input that:
- Debounces input (300ms, minimum 2 characters)
- Searches `profiles` table by email (using `ilike`)
- Shows a dropdown with matching profiles (avatar, name, email)
- On select, fills the input and returns the selected profile's `user_id`

This will replace the plain email `<Input>` in `OrganizationSettings.tsx` (lines 285-290) where members are added.

## 5. New Page: Admin Panel

`src/components/admin/AdminPage.tsx` with two sections:

**Reset User Password**
- Uses EmailSearchInput to find a user
- Password input field with confirmation
- Calls the `admin-reset-password` edge function
- Shows success/error toast

**All Users List**
- Displays all profiles in a table (name, email, role, created date)
- Read-only overview for the super admin

## 6. Navigation Updates

- Add `'admin'` to the `ViewType` union in `AppSidebar.tsx`
- Add a conditional "Admin" nav item (Shield icon) in the sidebar, only visible when `isSuperAdmin` is true
- Add the same conditional item in the "More" sheet in `BottomNavigation.tsx`
- Add `admin` case in `Index.tsx` `renderContent()` and `viewTitles`

## 7. PWA Update Popup

Instead of silently auto-updating, show a toast/dialog when a new version is available:

- Change `main.tsx` to NOT auto-call `updateSW(true)` in `onNeedRefresh`
- Instead, create a global event or React state that triggers a visible popup
- Create `src/components/pwa/PWAUpdatePrompt.tsx` -- a fixed banner/dialog that says "A new version is available" with an "Update Now" button
- When clicked, calls `updateSW(true)` which activates the new service worker and reloads
- Render this component in `Index.tsx` (or `App.tsx`)

The approach: use a custom event dispatched from `main.tsx` (since it runs outside React), listened to by the React component.

---

## Technical Details

### Database Migration

```sql
-- 1. Helper function (must exist before RLS policy references it)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = check_user_id
  )
$$;

-- 2. Super admins table
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view super_admins"
ON public.super_admins FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- 3. Seed
INSERT INTO public.super_admins (user_id)
VALUES ('a434c9c6-90ea-4f5d-972c-b7f050c054a5');

-- 4. Allow super admins to see all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_super_admin(auth.uid()));
```

### Edge Function: `supabase/functions/admin-reset-password/index.ts`

- Reads `Authorization` header, verifies user via `getUser()`
- Checks `super_admins` table using service role client
- Calls `supabase.auth.admin.updateUserById(userId, { password })`

### PWA Update Mechanism

In `main.tsx`, instead of:
```ts
onNeedRefresh() { updateSW(true); }
```

Change to:
```ts
onNeedRefresh() {
  window.dispatchEvent(new CustomEvent('pwa-update-available'));
  window.__pwaUpdateSW = () => updateSW(true);
}
```

The `PWAUpdatePrompt` component listens for this event and shows a banner with "Update Now" that calls `window.__pwaUpdateSW()`.

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | super_admins table, is_super_admin function, RLS policies |
| `supabase/functions/admin-reset-password/index.ts` | Create | Password reset edge function |
| `src/hooks/useSuperAdmin.ts` | Create | Hook to check super admin status |
| `src/components/shared/EmailSearchInput.tsx` | Create | Reusable email search-as-you-type component |
| `src/components/admin/AdminPage.tsx` | Create | Admin panel UI |
| `src/components/pwa/PWAUpdatePrompt.tsx` | Create | PWA update popup component |
| `src/main.tsx` | Modify | Dispatch event instead of auto-updating |
| `src/components/layout/AppSidebar.tsx` | Modify | Add 'admin' to ViewType, conditional nav item |
| `src/components/layout/BottomNavigation.tsx` | Modify | Conditional admin item in More menu |
| `src/pages/Index.tsx` | Modify | Add admin view rendering + PWAUpdatePrompt |
| `src/components/organizations/OrganizationSettings.tsx` | Modify | Replace plain email input with EmailSearchInput |

