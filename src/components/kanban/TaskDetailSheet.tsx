import React, { useState } from 'react';
import { Task, KanbanColumn, TimeEntry } from '@/types/database';
import { useIsOrgAdmin } from '@/hooks/useIsOrgAdmin';
import { useSubtasks, useCreateSubtask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTimeEntries, formatDuration, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
import { useTaskAssignees, useAddTaskAssignee, useRemoveTaskAssignee } from '@/hooks/useAssignees';
import { useOrganizationMembersForProject } from '@/hooks/useOrganizations';
import { TimeEntryDialog } from '@/components/time/TimeEntryDialog';
import { CommentSection } from '@/components/comments/CommentSection';
import { SubtaskRow } from './SubtaskRow';
import { SheetPageStack, SectionCard, useSheetPageStack } from '@/components/ui/sheet-page';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Clock, ListTodo, Flag, Calendar as CalendarIcon, Users, X, Trash2, Pencil, Check, XCircle, DollarSign, Weight, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useComments } from '@/hooks/useComments';

interface TaskDetailSheetProps {
  task: Task | null;
  projectId: string;
  columns?: KanbanColumn[];
  onClose: () => void;
  expensesEnabled?: boolean;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  projectId,
  columns,
  onClose,
  expensesEnabled,
}) => {
  const { data: subtasks } = useSubtasks(task?.id);
  const { data: isAdmin = false } = useIsOrgAdmin();
  const { data: timeEntries } = useTimeEntries(task?.id);
  const { data: assignees } = useTaskAssignees(task?.id);
  const { data: organizationMembers = [] } = useOrganizationMembersForProject(projectId);
  const { data: comments } = useComments(task?.id);
  const createSubtask = useCreateSubtask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const deleteTimeEntry = useDeleteTimeEntry();
  const addAssignee = useAddTaskAssignee();
  const removeAssignee = useRemoveTaskAssignee();

  const [newSubtask, setNewSubtask] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);

  const { currentPage, navigateTo, goBack, isRoot, resetTo } = useSheetPageStack();

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtask.trim()) return;
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: newSubtask.trim() });
      setNewSubtask('');
      toast.success('Subtask added');
    } catch { toast.error('Failed to add subtask'); }
  };

  const handleColumnChange = async (columnId: string) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { column_id: columnId }, projectId });
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high') => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { priority }, projectId });
      toast.success('Priority updated');
    } catch { toast.error('Failed to update priority'); }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { due_date: date ? format(date, 'yyyy-MM-dd') : null }, projectId });
      toast.success('Due date updated');
    } catch { toast.error('Failed to update due date'); }
  };

  const handleSaveTitle = async () => {
    if (!task || !editedTitle.trim()) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { title: editedTitle.trim() }, projectId });
      setIsEditingTitle(false);
      toast.success('Title updated');
    } catch { toast.error('Failed to update title'); }
  };

  const handleSaveDescription = async () => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { description: editedDescription.trim() || null }, projectId });
      setIsEditingDescription(false);
      toast.success('Description updated');
    } catch { toast.error('Failed to update description'); }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync({ taskId: task.id, projectId });
      toast.success('Task deleted');
      onClose();
    } catch { toast.error('Failed to delete task'); }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!task) return;
    try {
      await deleteTimeEntry.mutateAsync({ entryId, taskId: task.id });
      toast.success('Time entry deleted');
    } catch { toast.error('Failed to delete time entry'); }
  };

  const handleAddAssignee = async (userId: string) => {
    if (!task) return;
    try {
      await addAssignee.mutateAsync({ taskId: task.id, userId });
      toast.success('Assignee added');
    } catch { toast.error('Failed to add assignee'); }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!task) return;
    try {
      await removeAssignee.mutateAsync({ taskId: task.id, userId });
      toast.success('Assignee removed');
    } catch { toast.error('Failed to remove assignee'); }
  };

  const totalTimeSpent = timeEntries?.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0) || 0;
  const completedSubtasks = subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const currentColumn = columns?.find(c => c.id === task?.column_id);
  const assigneeUserIds = assignees?.map(a => a.user_id) || [];
  const unassignedMembers = organizationMembers.filter(m => !assigneeUserIds.includes(m.user_id));
  const commentCount = comments?.length || 0;

  const selectedSubtask = subtasks?.find(s => s.id === selectedSubtaskId);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetTo('main');
    }
  };

  if (!task) return null;

  // ---- PAGE DEFINITIONS ----

  const mainPage = (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Status */}
      {columns && columns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Status</h4>
          <Select value={task.column_id || ''} onValueChange={handleColumnChange}>
            <SelectTrigger>
              <SelectValue>
                {currentColumn && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentColumn.color || '#6366f1' }} />
                    {currentColumn.name}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color || '#6366f1' }} />
                    {column.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div>
        <h4 className="text-sm font-medium mb-2">Description</h4>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} placeholder="Add a description..." rows={4} autoFocus />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors group" onClick={() => { setEditedDescription(task.description || ''); setIsEditingDescription(true); }}>
            {task.description || <span className="italic">Click to add description...</span>}
            <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      <Separator />

      {/* Section Cards */}
      <div className="space-y-2">
        <SectionCard
          icon={<Users className="h-4 w-4" />}
          label="Assignees"
          value={assignees && assignees.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={a.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{a.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs">{assignees.length}</span>
            </div>
          ) : <span className="text-xs">None</span>}
          onClick={() => navigateTo('assignees')}
        />

        {expensesEnabled && (
          <SectionCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Budget & Commission"
            value={<span className="text-xs">${(task as any).budget || task.cost || 0}</span>}
            onClick={() => navigateTo('budget')}
          />
        )}

        <SectionCard
          icon={<Clock className="h-4 w-4" />}
          label="Time Tracked"
          value={<span className="text-xs">{totalTimeSpent > 0 ? formatDuration(totalTimeSpent) : 'None'}</span>}
          onClick={() => navigateTo('time')}
        />

        <SectionCard
          icon={<ListTodo className="h-4 w-4" />}
          label="Subtasks"
          value={totalSubtasks > 0 ? (
            <div className="flex items-center gap-2">
              <Progress value={(completedSubtasks / totalSubtasks) * 100} className="h-1.5 w-16" />
              <span className="text-xs">{completedSubtasks}/{totalSubtasks}</span>
            </div>
          ) : <span className="text-xs">None</span>}
          onClick={() => navigateTo('subtasks')}
        />

        <SectionCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Comments"
          value={<span className="text-xs">{commentCount}</span>}
          onClick={() => navigateTo('comments')}
        />
      </div>

      <Separator />

      {/* Delete Task */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Task
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{task.title}" and all its subtasks and time entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const assigneesPage = (
    <div className="space-y-4">
      {assignees && assignees.length > 0 ? (
        <div className="space-y-2">
          {assignees.map((assignee) => (
            <div key={assignee.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignee.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{assignee.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{assignee.profiles?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{assignee.profiles?.email}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveAssignee(assignee.user_id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No assignees yet</p>
      )}
      {unassignedMembers.length > 0 && (
        <Select onValueChange={handleAddAssignee}>
          <SelectTrigger>
            <SelectValue placeholder="Add assignee..." />
          </SelectTrigger>
          <SelectContent>
            {unassignedMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const budgetPage = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Task Budget ($)</label>
        <Input
          type="number"
          value={(task as any).budget || task.cost || ''}
          onChange={async (e) => {
            const val = parseFloat(e.target.value) || 0;
            try { await updateTask.mutateAsync({ taskId: task.id, updates: { cost: val, budget: val } as any, projectId }); } catch {}
          }}
          min="0" step="0.01"
        />
      </div>
      {assignees && assignees.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-xs text-muted-foreground mb-1">Task Manager Commission (10%)</p>
          <p className="font-medium">
            {assignees[0]?.profiles?.full_name || 'First Assignee'}: ${(((task as any).budget || task.cost || 0) * 0.1).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Weight %</label>
        <Input
          type="number"
          value={task.weight_pct ?? ''}
          onChange={async (e) => {
            const val = e.target.value ? parseFloat(e.target.value) : null;
            try { await updateTask.mutateAsync({ taskId: task.id, updates: { weight_pct: val } as any, projectId }); } catch {}
          }}
          min="0" max="100" step="0.01"
        />
      </div>
    </div>
  );

  const timePage = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {totalTimeSpent > 0 ? (
          <p className="text-2xl font-bold">{formatDuration(totalTimeSpent)}</p>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="text-sm">No time logged yet</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => { setEditingTimeEntry(null); setShowTimeEntryDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </div>
      {timeEntries && timeEntries.length > 0 && (
        <div className="space-y-1">
          {timeEntries.map((entry) => (
            <div key={entry.id} className="flex justify-between items-center p-2 rounded-lg border text-sm">
              <div>
                <span>{format(new Date(entry.started_at), 'MMM d, h:mm a')}</span>
                {entry.description && <span className="text-muted-foreground ml-2">— {entry.description}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.duration_seconds ? formatDuration(entry.duration_seconds) : '-'}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTimeEntry(entry); setShowTimeEntryDialog(true); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTimeEntry(entry.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const subtasksPage = (
    <div className="space-y-4">
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={(completedSubtasks / totalSubtasks) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground">{completedSubtasks}/{totalSubtasks}</span>
        </div>
      )}
      <form onSubmit={handleAddSubtask} className="flex gap-2">
        <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add a subtask..." className="flex-1" />
        <Button type="submit" size="sm" disabled={!newSubtask.trim()}><Plus className="h-4 w-4" /></Button>
      </form>
      <div className="space-y-2">
        {subtasks?.map((subtask) => (
          <SubtaskRow
            key={subtask.id}
            subtask={subtask}
            organizationMembers={organizationMembers}
            taskBudget={(task as any).budget || task.cost || 0}
            isOrgAdmin={isAdmin}
            expensesEnabled={expensesEnabled}
            onOpenDetail={() => {
              setSelectedSubtaskId(subtask.id);
              navigateTo('subtask-detail');
            }}
          />
        ))}
        {(!subtasks || subtasks.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No subtasks yet</p>
        )}
      </div>
    </div>
  );

  const subtaskDetailPage = selectedSubtask ? (
    <SubtaskDetailPage
      subtask={selectedSubtask}
      organizationMembers={organizationMembers}
      taskBudget={(task as any).budget || task.cost || 0}
      isOrgAdmin={isAdmin}
      expensesEnabled={expensesEnabled}
    />
  ) : null;

  const commentsPage = (
    <CommentSection
      taskId={task.id}
      members={organizationMembers.map(m => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || 'Unknown',
        email: m.profiles?.email || '',
      }))}
    />
  );

  const pages = [
    { id: 'main', title: 'Task Details', content: mainPage },
    { id: 'assignees', title: 'Assignees', content: assigneesPage },
    { id: 'budget', title: 'Budget & Commission', content: budgetPage },
    { id: 'time', title: 'Time Tracking', content: timePage },
    { id: 'subtasks', title: 'Subtasks', content: subtasksPage },
    { id: 'subtask-detail', title: selectedSubtask?.title || 'Subtask', content: subtaskDetailPage },
    { id: 'comments', title: 'Comments', content: commentsPage },
  ];

  return (
    <Sheet open={!!task} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="text-xl font-semibold" autoFocus />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}><XCircle className="h-4 w-4" /></Button>
            </div>
          ) : (
            <SheetTitle
              className="text-xl cursor-pointer hover:text-primary transition-colors group flex items-center gap-2"
              onClick={() => { setEditedTitle(task.title); setIsEditingTitle(true); }}
            >
              {task.title}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </SheetTitle>
          )}
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <Select value={task.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-auto h-7 text-xs">
                <SelectValue>
                  <Badge variant="outline" className={cn('capitalize', {
                    'bg-destructive/10 text-destructive': task.priority === 'high',
                    'bg-chart-4/10 text-chart-4': task.priority === 'medium',
                    'bg-chart-5/10 text-chart-5': task.priority === 'low',
                  })}>
                    <Flag className="h-3 w-3 mr-1" />{task.priority}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Set due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={task.due_date ? new Date(task.due_date) : undefined} onSelect={handleDueDateChange} initialFocus />
                {task.due_date && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => handleDueDateChange(undefined)}>Remove due date</Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto">
          <SheetPageStack pages={pages} currentPage={currentPage} onBack={goBack} isRoot={isRoot} />
        </div>
      </SheetContent>

      {task && (
        <TimeEntryDialog
          taskId={task.id}
          entry={editingTimeEntry}
          open={showTimeEntryDialog}
          onOpenChange={(open) => { setShowTimeEntryDialog(open); if (!open) setEditingTimeEntry(null); }}
        />
      )}
    </Sheet>
  );
};

// --- Subtask Detail Page (shown inside the task sheet) ---
import { useSubtaskTimeEntries, useDeleteSubtaskTimeEntry, useActiveSubtaskTimeEntry, useStartSubtaskTimeEntry, useStopSubtaskTimeEntry } from '@/hooks/useSubtaskTimeTracking';
import { useSubtaskAssignees, useAddSubtaskAssignee, useRemoveSubtaskAssignee } from '@/hooks/useAssignees';
import { SubtaskTimeEntryDialog } from '@/components/time/SubtaskTimeEntryDialog';
import { Subtask } from '@/types/database';
import { OrganizationMemberWithProfile } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square } from 'lucide-react';

const SubtaskDetailPage: React.FC<{
  subtask: Subtask;
  organizationMembers: OrganizationMemberWithProfile[];
  taskBudget: number;
  isOrgAdmin: boolean;
  expensesEnabled?: boolean;
}> = ({ subtask, organizationMembers, taskBudget, isOrgAdmin, expensesEnabled }) => {
  const { data: timeEntries = [] } = useSubtaskTimeEntries(subtask.id);
  const { data: assignees = [] } = useSubtaskAssignees(subtask.id);
  const { data: globalActiveTimer } = useActiveSubtaskTimeEntry();
  const deleteTimeEntry = useDeleteSubtaskTimeEntry();
  const addAssignee = useAddSubtaskAssignee();
  const removeAssignee = useRemoveSubtaskAssignee();
  const startTimer = useStartSubtaskTimeEntry();
  const stopTimer = useStopSubtaskTimeEntry();
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

  const activeTimer = globalActiveTimer?.subtask_id === subtask.id ? globalActiveTimer : null;

  React.useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - new Date(activeTimer.started_at).getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  const totalTime = timeEntries.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0) + (activeTimer ? timerElapsed : 0);
  const availableMembers = organizationMembers?.filter(m => !assignees.some(a => a.user_id === m.user_id)) || [];

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className="flex items-center gap-3">
        {activeTimer ? (
          <Button size="sm" variant="destructive" onClick={async () => { try { await stopTimer.mutateAsync({ entryId: activeTimer.id }); toast.success('Timer stopped'); } catch { toast.error('Failed'); } }}>
            <Square className="h-3 w-3 mr-1 fill-current" /> Stop — {formatDuration(timerElapsed)}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={async () => { try { await startTimer.mutateAsync({ subtaskId: subtask.id }); toast.success('Timer started'); } catch { toast.error('Failed'); } }}>
            <Play className="h-3 w-3 mr-1" /> Start Timer
          </Button>
        )}
        {totalTime > 0 && <span className="text-sm text-muted-foreground">Total: {formatDuration(totalTime)}</span>}
      </div>

      <Separator />

      {/* Assignees */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Assignees</h4>
        {assignees.length > 0 ? (
          <div className="space-y-2">
            {assignees.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7"><AvatarImage src={a.profiles?.avatar_url || undefined} /><AvatarFallback className="text-xs">{a.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                  <span className="text-sm">{a.profiles?.full_name || a.profiles?.email}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { try { await removeAssignee.mutateAsync({ subtaskId: subtask.id, userId: a.user_id }); toast.success('Removed'); } catch { toast.error('Failed'); } }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">No assignees</p>}
        {availableMembers.length > 0 && (
          <Select onValueChange={async (userId) => { try { await addAssignee.mutateAsync({ subtaskId: subtask.id, userId }); toast.success('Added'); } catch { toast.error('Failed'); } }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Add assignee..." /></SelectTrigger>
            <SelectContent>
              {availableMembers.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email || 'Unknown'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator />

      {/* Commission */}
      {expensesEnabled && taskBudget > 0 && (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Commission</h4>
            {isOrgAdmin ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={subtask.commission_type || 'none'}
                    onValueChange={async (val) => {
                      const type = val === 'none' ? null : val;
                      try { await supabase.from('subtasks').update({ commission_type: type } as any).eq('id', subtask.id); toast.success('Updated'); } catch { toast.error('Failed'); }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Commission</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {subtask.commission_type && (
                    <Input
                      type="number"
                      value={subtask.commission_value || ''}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value) || 0;
                        try { await supabase.from('subtasks').update({ commission_value: val } as any).eq('id', subtask.id); } catch {}
                      }}
                      className="h-8 w-24 text-sm" min="0" step="0.01"
                      placeholder={subtask.commission_type === 'percentage' ? '%' : '$'}
                    />
                  )}
                </div>
                {subtask.commission_type && subtask.commission_value > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = ${(subtask.commission_type === 'percentage' ? (subtask.commission_value / 100) * taskBudget : subtask.commission_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    {subtask.commission_type === 'percentage' && ` (${subtask.commission_value}% of $${taskBudget})`}
                  </p>
                )}
              </div>
            ) : (
              subtask.commission_type && subtask.commission_value > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Commission: ${(subtask.commission_type === 'percentage' ? (subtask.commission_value / 100) * taskBudget : subtask.commission_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              ) : <p className="text-xs text-muted-foreground italic">No commission set</p>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Time Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Time Entries</h4>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowTimeEntryDialog(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Entry
          </Button>
        </div>
        {timeEntries.length > 0 ? (
          <div className="space-y-1">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(entry.duration_seconds || 0)}</span>
                  {entry.description && <span className="text-xs text-muted-foreground">— {entry.description}</span>}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { try { await deleteTimeEntry.mutateAsync({ entryId: entry.id, subtaskId: subtask.id }); toast.success('Deleted'); } catch { toast.error('Failed'); } }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">No time entries</p>}
      </div>

      <Separator />

      {/* Comments */}
      <CommentSection
        subtaskId={subtask.id}
        members={organizationMembers?.map(m => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name || 'Unknown',
          email: m.profiles?.email || '',
        })) || []}
      />

      <SubtaskTimeEntryDialog subtaskId={subtask.id} open={showTimeEntryDialog} onClose={() => setShowTimeEntryDialog(false)} />
    </div>
  );
};
