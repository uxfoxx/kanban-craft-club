import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Upload, Trash2, Download, FileText, Image as ImageIcon, FileVideo, FileAudio, File as FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAttachments, useUploadAttachment, useDeleteAttachment, getSignedUrl } from '@/hooks/useTaskAttachments';
import { cn } from '@/lib/utils';

interface AttachmentsSectionProps {
  projectId: string;
  taskId?: string;
  subtaskId?: string;
  compact?: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const iconFor = (mime: string | null) => {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime.startsWith('audio/')) return FileAudio;
  if (mime.includes('pdf') || mime.includes('text')) return FileText;
  return FileIcon;
};

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ projectId, taskId, subtaskId, compact }) => {
  const target = taskId ? { taskId } : { subtaskId };
  const { data: attachments = [], isLoading } = useAttachments(target);
  const upload = useUploadAttachment();
  const del = useDeleteAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB`);
        continue;
      }
      try {
        await upload.mutateAsync({ file, projectId, taskId, subtaskId });
        toast.success(`Uploaded ${file.name}`);
      } catch (e: any) {
        toast.error(`Failed: ${e.message || file.name}`);
      }
    }
  };

  const handleDownload = async (path: string, name: string) => {
    try {
      const url = await getSignedUrl(path);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to fetch file');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className={cn('font-medium flex items-center gap-1.5', compact ? 'text-xs' : 'text-sm')}>
          <Paperclip className={cn(compact ? 'h-3 w-3' : 'h-4 w-4')} /> Files
          {attachments.length > 0 && <span className="text-muted-foreground">({attachments.length})</span>}
        </h4>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Upload
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          'rounded-lg border border-dashed transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
          attachments.length === 0 ? 'p-6 text-center' : 'p-2'
        )}
      >
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-2">Loading...</p>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Drag files here or click Upload</p>
        ) : (
          <div className="space-y-1">
            {attachments.map((a) => {
              const Icon = iconFor(a.mime_type);
              return (
                <div key={a.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{a.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(a.size_bytes)}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(a.file_path, a.file_name)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={async () => {
                    if (!confirm(`Delete ${a.file_name}?`)) return;
                    try { await del.mutateAsync({ attachment: a }); toast.success('Deleted'); } catch { toast.error('Failed'); }
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
