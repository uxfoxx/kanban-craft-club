---
name: Task Attachments
description: File uploads on tasks and subtasks using private storage bucket with project-member access control.
type: feature
---
- Storage bucket: `task-attachments` (private)
- Path layout: `<project_id>/task-<task_id>/<filename>` or `<project_id>/sub-<subtask_id>/<filename>`
- DB table: `task_attachments` with mutually-exclusive `task_id`/`subtask_id` (CHECK constraint)
- RLS: project members (direct or via org) can read/insert; uploader or project owner can delete
- UI: `<AttachmentsSection projectId taskId|subtaskId />` in TaskDetailSheet (Overview) and subtask detail
- Hook: `useAttachments`, `useUploadAttachment`, `useDeleteAttachment`, `getSignedUrl` (5min)
- 50MB per-file client-side limit; downloads use signed URLs
