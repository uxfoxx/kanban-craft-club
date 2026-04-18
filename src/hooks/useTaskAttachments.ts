import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskAttachment } from '@/types/database';

const BUCKET = 'task-attachments';

export const useAttachments = (target: { taskId?: string; subtaskId?: string }) => {
  const key = target.taskId ? ['attachments', 'task', target.taskId] : ['attachments', 'subtask', target.subtaskId];
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from('task_attachments').select('*').order('created_at', { ascending: false });
      if (target.taskId) q = q.eq('task_id', target.taskId);
      else if (target.subtaskId) q = q.eq('subtask_id', target.subtaskId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TaskAttachment[];
    },
    enabled: !!(target.taskId || target.subtaskId),
  });
};

export const useUploadAttachment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ file, projectId, taskId, subtaskId }: { file: File; projectId: string; taskId?: string; subtaskId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const folder = subtaskId ? `${projectId}/sub-${subtaskId}` : `${projectId}/task-${taskId}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${folder}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('task_attachments').insert({
        task_id: taskId || null,
        subtask_id: subtaskId || null,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        uploaded_by: user.id,
      } as any);
      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbErr;
      }
    },
    onSuccess: (_, v) => {
      if (v.taskId) qc.invalidateQueries({ queryKey: ['attachments', 'task', v.taskId] });
      if (v.subtaskId) qc.invalidateQueries({ queryKey: ['attachments', 'subtask', v.subtaskId] });
    },
  });
};

export const useDeleteAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ attachment }: { attachment: TaskAttachment }) => {
      await supabase.storage.from(BUCKET).remove([attachment.file_path]);
      const { error } = await supabase.from('task_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      if (v.attachment.task_id) qc.invalidateQueries({ queryKey: ['attachments', 'task', v.attachment.task_id] });
      if (v.attachment.subtask_id) qc.invalidateQueries({ queryKey: ['attachments', 'subtask', v.attachment.subtask_id] });
    },
  });
};

export const getSignedUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
};
