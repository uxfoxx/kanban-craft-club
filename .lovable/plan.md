

The user wants 4 features:
1. File uploads on main tasks AND subtasks
2. Subtask deadlines (due dates)
3. Auto-generated "What's New" popup shown once per user per release — triggered automatically every time the AI ships a change
4. PWA: manual "Update / Clear Cache / Reload" controls in settings

Let me plan tightly.

**Re #3 — automatic system-generated**: There's no way for the AI to literally inject release notes the moment the server updates without code. The realistic mechanism is: maintain a `RELEASE_NOTES` array in the codebase with an incrementing `version` constant. On every shipped change, the AI bumps the version and adds an entry. The client compares `localStorage.lastSeenVersion` against the current `APP_VERSION` and shows the popup once. From the user's POV this *is* automatic. I'll save a memory rule so I always update it on every change.

**Re storage**: Need a `task-attachments` storage bucket (private, RLS-gated to project members) + an `attachments` table linking files to either `task_id` or `subtask_id`.

# Plan

## 1. Subtask deadlines
- Migration: add `due_date date` column to `subtasks`
- Update `Subtask` type, `useCreateSubtask` / `useUpdateSubtask`
- UI: due date input in `SubtaskRow` quick-add and `TaskDetailSheet` subtask detail; show overdue badge

## 2. File uploads on tasks & subtasks
- Migration: 
  - Create private storage bucket `task-attachments`
  - Create `task_attachments` table: `id, task_id (nullable), subtask_id (nullable), file_path, file_name, mime_type, size_bytes, uploaded_by, created_at`
  - RLS: project members can SELECT/INSERT/DELETE attachments for tasks/subtasks they can access
  - Storage policies: same-project members read/write, owner can delete
- New hook: `useTaskAttachments(taskId | subtaskId)` — list, upload, delete, get signed URL
- New component: `<AttachmentsSection target={{ taskId | subtaskId }} />`
  - Drag-drop / file picker, list of files with icon by mime type, download, delete
- Mount in `TaskDetailSheet` (Overview or new "Files" tab) and in subtask detail view

## 3. "What's New" popup (auto on every release)
- New file `src/lib/releaseNotes.ts`:
  ```ts
  export const APP_VERSION = "2026.04.18.1";
  export const RELEASE_NOTES = [
    { version: "2026.04.18.1", date: "2026-04-18", title: "Files, Subtask Deadlines & PWA Controls",
      items: ["Upload files to tasks and subtasks", "Subtasks now support due dates", "PWA cache + update controls in settings", "Automatic release-note popups"] },
    // older entries...
  ];
  ```
- New component `WhatsNewDialog.tsx` mounted in `App.tsx`. On mount: read `localStorage.lastSeenVersion`. If `!== APP_VERSION`, show dialog listing notes since last seen, then write current version on close.
- **Memory rule** saved at `mem://workflow/release-notes`: every shipped change must bump `APP_VERSION` (timestamp format) and prepend an entry to `RELEASE_NOTES`. This makes it "automatic" from the user's perspective.

## 4. PWA controls in settings
- Add a "App & Cache" section to `ProfileSettings.tsx` with three buttons:
  - **Check for updates** — call `navigator.serviceWorker.getRegistration()?.update()`
  - **Clear cache & reload** — `caches.keys()` → delete all → `serviceWorker.getRegistrations()` → unregister each → `location.reload()`
  - **Hard reload** — `location.reload()`
- Show current `APP_VERSION` at bottom of section

## Files to add / modify

| File | Change |
|------|--------|
| Migration SQL | `subtasks.due_date`, `task_attachments` table + RLS, `task-attachments` storage bucket + policies |
| `src/types/database.ts` | `due_date` on Subtask; new `TaskAttachment` type |
| `src/hooks/useTasks.ts` | due_date in create/update subtask |
| `src/hooks/useTaskAttachments.ts` (new) | list/upload/delete/signed URL |
| `src/components/shared/AttachmentsSection.tsx` (new) | reusable file-list UI |
| `src/components/kanban/SubtaskRow.tsx` | due date input + overdue badge |
| `src/components/kanban/TaskDetailSheet.tsx` | mount AttachmentsSection on task & subtask views; subtask due date field |
| `src/lib/releaseNotes.ts` (new) | APP_VERSION + RELEASE_NOTES |
| `src/components/system/WhatsNewDialog.tsx` (new) | version-gated popup |
| `src/App.tsx` | mount WhatsNewDialog |
| `src/components/profile/ProfileSettings.tsx` | App & Cache section |
| `mem://workflow/release-notes` (memory) | rule: bump version + add entry on every change |
| `mem://index.md` | reference new memory |

## Expected result
- Files attach to tasks and subtasks, gated by project membership
- Subtasks show due dates and overdue indicators
- Every time I ship a change going forward, users automatically see a one-time "What's New" popup listing what changed
- Users can force-update the PWA and clear caches from their profile settings

