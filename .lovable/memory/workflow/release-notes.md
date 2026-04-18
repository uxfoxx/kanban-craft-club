---
name: Release Notes Workflow
description: Bump APP_VERSION and prepend a RELEASE_NOTES entry on every shipped change so the auto "What's New" popup fires once per user.
type: preference
---
Every shipped change MUST update `src/lib/releaseNotes.ts`:

1. Bump `APP_VERSION` to a new unique string (use timestamp format `YYYY.MM.DD.N`, where N increments per same-day release).
2. **Prepend** (not append) a new entry to the `RELEASE_NOTES` array with:
   - `version` matching the new `APP_VERSION`
   - `date` in `YYYY-MM-DD` format
   - Concise `title` describing the release theme
   - `items` — bulleted, user-facing summary of what changed (no jargon, no file names)

**Why:** `WhatsNewDialog` reads `localStorage.lastSeenAppVersion` and compares against `APP_VERSION`. When they differ, it shows entries newer than the last seen version, then writes the current version to localStorage. From the user's POV this means every update automatically surfaces a one-time popup explaining what's new.

**How to apply:** Treat this as part of the change — never ship code edits without bumping the version. Skip only for pure non-code work (docs, planning).
