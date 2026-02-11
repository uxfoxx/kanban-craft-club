import React, { useState, useCallback } from 'react';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { MentionInput } from './MentionInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MentionUser {
  user_id: string;
  full_name: string;
  email: string;
}

interface CommentSectionProps {
  taskId?: string;
  subtaskId?: string;
  members: MentionUser[];
}

export const CommentSection: React.FC<CommentSectionProps> = ({ taskId, subtaskId, members }) => {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(taskId, subtaskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);

  const handleMentionsChange = useCallback((newMentions: string[]) => {
    setMentions(newMentions);
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createComment.mutateAsync({
        taskId,
        subtaskId,
        content: content.trim(),
        mentions,
      });
      setContent('');
      setMentions([]);
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ commentId, parentId: (taskId || subtaskId)! });
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Highlight @mentions in content
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w[\w\s]*?)(?=\s@|\s|$)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-primary font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Comments</h4>
        {comments.length > 0 && (
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {/* Comments list */}
      <div className="space-y-3 mb-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2 group">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {comment.profile ? getInitials(comment.profile.full_name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.profile?.full_name || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                  </span>
                  {comment.user_id === user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {renderContent(comment.content)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2" onKeyDown={handleKeyDown}>
        <div className="flex-1">
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionsChange={handleMentionsChange}
            members={members}
          />
        </div>
        <Button
          size="icon"
          className="flex-shrink-0 self-end"
          onClick={handleSubmit}
          disabled={!content.trim() || createComment.isPending}
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Press ⌘+Enter to send</p>
    </div>
  );
};
