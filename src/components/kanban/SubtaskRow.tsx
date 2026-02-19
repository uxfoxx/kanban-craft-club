import React, { useState } from 'react';
import { Subtask } from '@/types/database';
import { useToggleSubtask, useDeleteSubtask, useUpdateSubtask } from '@/hooks/useTasks';
import { useSubtaskTimeEntries } from '@/hooks/useSubtaskTimeTracking';
import { formatDuration } from '@/hooks/useTimeTracking';
import { formatLKR } from '@/lib/currency';
import { useSubtaskAssignees } from '@/hooks/useAssignees';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, XCircle, Pencil, Trash2, Clock, DollarSign, MoreHorizontal, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OrganizationMemberWithProfile } from '@/hooks/useOrganizations';

interface SubtaskRowProps {
  subtask: Subtask;
  organizationMembers?: OrganizationMemberWithProfile[];
  taskBudget?: number;
  isOrgAdmin?: boolean;
  expensesEnabled?: boolean;
  onOpenDetail?: () => void;
}

export const SubtaskRow: React.FC<SubtaskRowProps> = ({ subtask, organizationMembers, taskBudget = 0, isOrgAdmin = false, expensesEnabled = false, onOpenDetail }) => {
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const updateSubtask = useUpdateSubtask();

  const { data: timeEntries = [] } = useSubtaskTimeEntries(subtask.id);
  const { data: assignees = [] } = useSubtaskAssignees(subtask.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);

  const handleToggle = async () => {
    try {
      await toggleSubtask.mutateAsync({ subtaskId: subtask.id, completed: !subtask.completed, taskId: subtask.task_id });
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) { toast.error('Title cannot be empty'); return; }
    try {
      await updateSubtask.mutateAsync({ subtaskId: subtask.id, title: editedTitle, taskId: subtask.task_id });
      setIsEditing(false);
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleDelete = async () => {
    try {
      await deleteSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id });
      toast.success('Subtask deleted');
    } catch { toast.error('Failed to delete subtask'); }
  };

  const totalTime = timeEntries.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <Checkbox checked={subtask.completed} onCheckedChange={handleToggle} />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)}
            className="h-7 text-sm" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setIsEditing(false); }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}><Check className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}><XCircle className="h-3 w-3" /></Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenDetail}>
            <span className={cn('text-sm block truncate', subtask.completed && 'line-through text-muted-foreground')}>
              {subtask.title}
            </span>
            {/* Summary line */}
            <div className="flex items-center gap-2 mt-0.5">
              {assignees.length > 0 && (
                <span className="text-xs text-muted-foreground">{assignees.length} assignee{assignees.length > 1 ? 's' : ''}</span>
              )}
              {totalTime > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {formatDuration(totalTime)}
                </span>
              )}
              {expensesEnabled && subtask.commission_type && subtask.commission_value > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  <DollarSign className="h-2.5 w-2.5" />
                  {subtask.commission_type === 'percentage' ? `${subtask.commission_value}%` : formatLKR(subtask.commission_value)}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenDetail && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onOpenDetail}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3 w-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="h-3 w-3 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}><Trash2 className="h-3 w-3 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};
