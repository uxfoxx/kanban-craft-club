

# Fix: Admin Password Reset Edge Function

## Problem
The `admin-reset-password` edge function returns a non-2xx error because:
1. **No `verify_jwt = false` in config.toml** -- Lovable Cloud uses ES256 signing keys, and the default JWT verification rejects them before the function code runs.
2. **Wrong env var name** -- The function references `SUPABASE_PUBLISHABLE_KEY`, but the actual secret is named `SUPABASE_ANON_KEY`.
3. **Incomplete CORS headers** -- Missing headers that the client sends (e.g., `x-supabase-client-platform`).

## Changes

### 1. Update `supabase/config.toml`
Add the `verify_jwt = false` setting for the edge function:

```toml
[functions.admin-reset-password]
verify_jwt = false
```

### 2. Update `supabase/functions/admin-reset-password/index.ts`

- Fix CORS headers to include all required headers
- Change `SUPABASE_PUBLISHABLE_KEY` to `SUPABASE_ANON_KEY`
- Add environment variable presence checks for better error logging

### Technical Details

```text
File: supabase/config.toml
  - Add [functions.admin-reset-password] section with verify_jwt = false

File: supabase/functions/admin-reset-password/index.ts
  - Line 5-6: Update corsHeaders to include full set of allowed headers
  - Line 27: Change SUPABASE_PUBLISHABLE_KEY -> SUPABASE_ANON_KEY
```

These are small, targeted fixes. No database or frontend changes needed.
