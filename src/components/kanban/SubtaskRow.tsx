import React, { useState } from 'react';
import { Subtask, Profile } from '@/types/database';
import { useToggleSubtask, useDeleteSubtask, useUpdateSubtask } from '@/hooks/useTasks';
import { useSubtaskTimeEntries, useDeleteSubtaskTimeEntry, useActiveSubtaskTimeEntry, useStartSubtaskTimeEntry, useStopSubtaskTimeEntry } from '@/hooks/useSubtaskTimeTracking';
import { formatDuration } from '@/hooks/useTimeTracking';
import { useSubtaskAssignees, useAddSubtaskAssignee, useRemoveSubtaskAssignee } from '@/hooks/useAssignees';
import { SubtaskTimeEntryDialog } from '@/components/time/SubtaskTimeEntryDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Check, XCircle, Pencil, Trash2, Clock, ChevronDown, Play, Square, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OrganizationMemberWithProfile } from '@/hooks/useOrganizations';

interface SubtaskRowProps {
  subtask: Subtask;
  organizationMembers?: OrganizationMemberWithProfile[];
}

export const SubtaskRow: React.FC<SubtaskRowProps> = ({ subtask, organizationMembers }) => {
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const updateSubtask = useUpdateSubtask();

  const { data: timeEntries = [] } = useSubtaskTimeEntries(subtask.id);
  const { data: assignees = [] } = useSubtaskAssignees(subtask.id);
  const { data: globalActiveTimer } = useActiveSubtaskTimeEntry();
  const deleteTimeEntry = useDeleteSubtaskTimeEntry();
  const addAssignee = useAddSubtaskAssignee();
  const removeAssignee = useRemoveSubtaskAssignee();
  const startTimer = useStartSubtaskTimeEntry();
  const stopTimer = useStopSubtaskTimeEntry();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

  const activeTimer = globalActiveTimer?.subtask_id === subtask.id ? globalActiveTimer : null;

  React.useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 1000);
        setTimerElapsed(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  const handleToggle = async () => {
    try {
      await toggleSubtask.mutateAsync({
        subtaskId: subtask.id,
        completed: !subtask.completed,
        taskId: subtask.task_id
      });
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    try {
      await updateSubtask.mutateAsync({
        subtaskId: subtask.id,
        title: editedTitle,
        taskId: subtask.task_id
      });
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubtask.mutateAsync({
        subtaskId: subtask.id,
        taskId: subtask.task_id
      });
      toast.success('Subtask deleted');
    } catch (error) {
      toast.error('Failed to delete subtask');
    }
  };

  const handleStartTimer = async () => {
    try {
      await startTimer.mutateAsync({ subtaskId: subtask.id });
      toast.success('Timer started');
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      await stopTimer.mutateAsync({ entryId: activeTimer.id });
      toast.success('Timer stopped');
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const handleAddAssignee = async (userId: string) => {
    try {
      await addAssignee.mutateAsync({ subtaskId: subtask.id, userId });
      toast.success('Assignee added');
    } catch (error) {
      toast.error('Failed to add assignee');
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    try {
      await removeAssignee.mutateAsync({
        subtaskId: subtask.id,
        userId
      });
      toast.success('Assignee removed');
    } catch (error) {
      toast.error('Failed to remove assignee');
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    try {
      await deleteTimeEntry.mutateAsync({ entryId, subtaskId: subtask.id });
      toast.success('Time entry deleted');
    } catch (error) {
      toast.error('Failed to delete time entry');
    }
  };

  const totalTime = timeEntries.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0) +
    (activeTimer ? timerElapsed : 0);

  const availableMembers = organizationMembers?.filter(
    member => !assignees.some(a => a.user_id === member.user_id)
  ) || [];

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
          <Checkbox checked={subtask.completed} onCheckedChange={handleToggle} />

          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                <XCircle className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span
                className={cn(
                  'text-sm flex-1 cursor-pointer',
                  subtask.completed && 'line-through text-muted-foreground'
                )}
                onClick={() => setIsEditing(true)}
              >
                {subtask.title}
              </span>

              {totalTime > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(totalTime)}
                </Badge>
              )}

              {assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((assignee) => (
                    <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={assignee.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {assignee.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {assignees.length > 3 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {activeTimer ? (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleStopTimer}>
                    <Square className="h-3 w-3 fill-current" />
                  </Button>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleStartTimer}>
                    <Play className="h-3 w-3" />
                  </Button>
                )}

                <CollapsibleTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>

                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        <CollapsibleContent className="ml-11 mr-2 mt-2 space-y-3 pb-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Assignees</span>
              {availableMembers.length > 0 && (
                <Select onValueChange={handleAddAssignee}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue placeholder="Add assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {assignees.length > 0 ? (
              <div className="space-y-1">
                {assignees.map((assignee) => (
                  <div key={assignee.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {assignee.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignee.profiles?.full_name || assignee.profiles?.email}</span>
                    </div>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => handleRemoveAssignee(assignee.user_id)}
                                    >
                                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No assignees</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Time Tracking</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowTimeEntryDialog(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Entry
              </Button>
            </div>

            {timeEntries.length > 0 ? (
              <div className="space-y-1">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm">{formatDuration(entry.duration_seconds || 0)}</span>
                      {entry.description && (
                        <span className="text-xs text-muted-foreground">- {entry.description}</span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleDeleteTimeEntry(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No time entries</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <SubtaskTimeEntryDialog
        subtaskId={subtask.id}
        open={showTimeEntryDialog}
        onClose={() => setShowTimeEntryDialog(false)}
      />
    </>
  );
};
