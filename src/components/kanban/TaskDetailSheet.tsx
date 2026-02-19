import React, { useState, useEffect, useRef } from 'react';
import { Task, KanbanColumn, TimeEntry } from '@/types/database';
import { useIsOrgAdmin } from '@/hooks/useIsOrgAdmin';
import { useSubtasks, useCreateSubtask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useTimeEntries, formatDuration, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
import { formatLKR } from '@/lib/currency';
import { useTaskAssignees, useAddTaskAssignee, useRemoveTaskAssignee } from '@/hooks/useAssignees';
import { useOrganizationMembersForProject } from '@/hooks/useOrganizations';
import { TimeEntryDialog } from '@/components/time/TimeEntryDialog';
import { CommentSection } from '@/components/comments/CommentSection';
import { SubtaskRow } from './SubtaskRow';
import { useSheetPageStack } from '@/components/ui/sheet-page';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Plus, Clock, Flag, Calendar as CalendarIcon, X, Trash2, Pencil, Check, XCircle, DollarSign, ArrowLeft, PartyPopper, AlertTriangle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isDelivering, setIsDelivering] = useState(false);

  // Local state for debounced inputs
  const [localEstimatedHours, setLocalEstimatedHours] = useState<string>('');
  const [localBudget, setLocalBudget] = useState<string>('');
  const [localWeightPct, setLocalWeightPct] = useState<string>('');

  // Sync local state from server when task changes
  const taskId = task?.id;
  useEffect(() => {
    setLocalEstimatedHours(task?.estimated_hours != null ? String(task.estimated_hours) : '');
    setLocalBudget((task as any)?.budget || task?.cost ? String((task as any)?.budget || task?.cost) : '');
    setLocalWeightPct(task?.weight_pct != null ? String(task.weight_pct) : '');
  }, [taskId]);

  // Debounced save for estimated_hours
  const isFirstRenderEH = useRef(true);
  useEffect(() => {
    if (isFirstRenderEH.current) { isFirstRenderEH.current = false; return; }
    const timeout = setTimeout(() => {
      if (!task) return;
      const val = localEstimatedHours ? parseFloat(localEstimatedHours) : null;
      updateTask.mutateAsync({ taskId: task.id, updates: { estimated_hours: val } as any, projectId }).catch(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, [localEstimatedHours]);

  // Debounced save for budget
  const isFirstRenderBudget = useRef(true);
  useEffect(() => {
    if (isFirstRenderBudget.current) { isFirstRenderBudget.current = false; return; }
    const timeout = setTimeout(() => {
      if (!task) return;
      const val = parseFloat(localBudget) || 0;
      updateTask.mutateAsync({ taskId: task.id, updates: { cost: val, budget: val } as any, projectId }).catch(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, [localBudget]);

  // Debounced save for weight_pct
  const isFirstRenderWeight = useRef(true);
  useEffect(() => {
    if (isFirstRenderWeight.current) { isFirstRenderWeight.current = false; return; }
    const timeout = setTimeout(() => {
      if (!task) return;
      const val = localWeightPct ? parseFloat(localWeightPct) : null;
      updateTask.mutateAsync({ taskId: task.id, updates: { weight_pct: val } as any, projectId }).catch(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, [localWeightPct]);
  // Page stack only for subtask detail drill-down
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

  const handleDeliverTask = async () => {
    if (!task) return;
    setIsDelivering(true);
    try {
      // Find the "Done" column
      const doneColumn = columns?.find(c => c.name.toLowerCase() === 'done');
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: {
          completed_at: new Date().toISOString(),
          ...(doneColumn ? { column_id: doneColumn.id } : {}),
        } as any,
        projectId,
      });
      toast.success('🎉 Task delivered successfully!', { duration: 4000 });
      setTimeout(() => {
        setIsDelivering(false);
        onClose();
      }, 1200);
    } catch {
      setIsDelivering(false);
      toast.error('Failed to deliver task');
    }
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
  const estimatedSeconds = task?.estimated_hours ? task.estimated_hours * 3600 : 0;
  const isOverEstimate = estimatedSeconds > 0 && totalTimeSpent > estimatedSeconds;

  const selectedSubtask = subtasks?.find(s => s.id === selectedSubtaskId);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      resetTo('main');
      setActiveTab('overview');
    }
  };

  if (!task) return null;

  const isOnSubtaskDetail = currentPage === 'subtask-detail';

  return (
    <Sheet open={!!task} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        {/* Header - always visible */}
        <div className="px-6 pt-6 pb-0">
          <SheetHeader>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="text-xl font-semibold" autoFocus />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}><XCircle className="h-4 w-4" /></Button>
              </div>
            ) : (
              <SheetTitle
                className="text-xl cursor-pointer hover:text-primary transition-colors group flex items-center gap-2 pr-8"
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
              {columns && columns.length > 0 && (
                <Select value={task.column_id || ''} onValueChange={handleColumnChange}>
                  <SelectTrigger className="w-auto h-7 text-xs">
                    <SelectValue>
                      {currentColumn && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentColumn.color || '#6366f1' }} />
                          <span>{currentColumn.name}</span>
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
              )}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col mt-2">
          {isOnSubtaskDetail && selectedSubtask ? (
            /* Subtask detail drill-down - hide tabs, show back nav */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex items-center gap-2 px-6 pb-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <h3 className="text-sm font-semibold truncate">{selectedSubtask.title}</h3>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <SubtaskDetailPage
                  subtask={selectedSubtask}
                  organizationMembers={organizationMembers}
                  taskBudget={(task as any).budget || task.cost || 0}
                  isOrgAdmin={isAdmin}
                  expensesEnabled={expensesEnabled}
                />
              </div>
            </div>
          ) : (
            /* Tabs view */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="work" className="flex-1">Work</TabsTrigger>
                  {expensesEnabled && <TabsTrigger value="finance" className="flex-1">Finance</TabsTrigger>}
                  <TabsTrigger value="chat" className="flex-1 relative">
                    Chat
                    {commentCount > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">{commentCount}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 mt-0 pt-4">
                <div className="space-y-6">
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

                  {/* Assignees */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Assignees</h4>
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
                      <div className="mt-3">
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
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Estimated Hours */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Estimated Hours</h4>
                    <Input
                      type="number"
                      value={localEstimatedHours}
                      onChange={(e) => setLocalEstimatedHours(e.target.value)}
                      placeholder="e.g. 8"
                      min="0"
                      step="0.5"
                      className="w-32"
                    />
                    {isOverEstimate && (
                      <div className="flex items-center gap-1.5 mt-2 text-destructive text-xs font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Time tracked exceeds estimate by {formatDuration(totalTimeSpent - estimatedSeconds)}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Assignees */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Assignees</h4>
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
                      <div className="mt-3">
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
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Deliver to Client Button */}
                  {!task.completed_at && (
                    <Button
                      className={cn(
                        "w-full h-12 text-base font-semibold gap-2 transition-all duration-300",
                        "bg-gradient-to-r from-primary to-chart-2 hover:from-primary/90 hover:to-chart-2/90 text-primary-foreground",
                        isDelivering && "animate-pulse scale-105"
                      )}
                      onClick={handleDeliverTask}
                      disabled={isDelivering}
                    >
                      <PartyPopper className={cn("h-5 w-5", isDelivering && "animate-bounce")} />
                      {isDelivering ? 'Delivering...' : 'Deliver to Client'}
                    </Button>
                  )}

                  {task.completed_at && (
                    <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 text-center">
                      <p className="text-sm font-medium text-chart-2">✅ Delivered</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}

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
              </TabsContent>

              {/* Work Tab */}
              <TabsContent value="work" className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 mt-0 pt-4">
                <div className="space-y-6">
                  {/* Subtasks section */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Subtasks</h4>
                    {totalSubtasks > 0 && (
                      <div className="flex items-center gap-3 mb-3">
                        <Progress value={(completedSubtasks / totalSubtasks) * 100} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">{completedSubtasks}/{totalSubtasks}</span>
                      </div>
                    )}
                    <form onSubmit={handleAddSubtask} className="flex gap-2 mb-3">
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

                  <Separator />

                  {/* Time Tracking section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Time Tracking</h4>
                      <Button variant="outline" size="sm" onClick={() => { setEditingTimeEntry(null); setShowTimeEntryDialog(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Entry
                      </Button>
                    </div>
                    {totalTimeSpent > 0 && (
                      <div className="mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{formatDuration(totalTimeSpent)}</span>
                          {estimatedSeconds > 0 && (
                            <span className="text-sm text-muted-foreground">/ {(task as any).estimated_hours}h estimated</span>
                          )}
                        </div>
                        {estimatedSeconds > 0 && (
                          <Progress
                            value={Math.min((totalTimeSpent / estimatedSeconds) * 100, 100)}
                            className={cn("h-2 mt-2", isOverEstimate && "[&>div]:bg-destructive")}
                          />
                        )}
                        {isOverEstimate && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Over estimate
                          </p>
                        )}
                      </div>
                    )}
                    {timeEntries && timeEntries.length > 0 ? (
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
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
                        <Clock className="h-5 w-5" />
                        <span className="text-sm">No time logged yet</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Finance Tab */}
              {expensesEnabled && (
                <TabsContent value="finance" className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 mt-0 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Task Budget ($)</label>
                      <Input
                        type="number"
                        value={localBudget}
                        onChange={(e) => setLocalBudget(e.target.value)}
                        min="0" step="0.01"
                      />
                    </div>
                    {assignees && assignees.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Task Manager Commission (10%)</p>
                        <p className="font-medium">
                          {assignees[0]?.profiles?.full_name || 'First Assignee'}: {formatLKR(((task as any).budget || task.cost || 0) * 0.1)}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Weight %</label>
                      <Input
                        type="number"
                        value={localWeightPct}
                        onChange={(e) => setLocalWeightPct(e.target.value)}
                        min="0" max="100" step="0.01"
                      />
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 mt-0 pt-4">
                <CommentSection
                  taskId={task.id}
                  members={organizationMembers.map(m => ({
                    user_id: m.user_id,
                    full_name: m.profiles?.full_name || 'Unknown',
                    email: m.profiles?.email || '',
                  }))}
                />
              </TabsContent>
            </Tabs>
          )}
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

  // Local state for commission_value debounced input
  const [localCommissionValue, setLocalCommissionValue] = useState<string>('');
  const subtaskIdRef = subtask.id;
  useEffect(() => {
    setLocalCommissionValue(subtask.commission_value ? String(subtask.commission_value) : '');
  }, [subtaskIdRef]);

  const isFirstRenderCommission = useRef(true);
  useEffect(() => {
    if (isFirstRenderCommission.current) { isFirstRenderCommission.current = false; return; }
    const timeout = setTimeout(() => {
      const val = parseFloat(localCommissionValue) || 0;
      supabase.from('subtasks').update({ commission_value: val } as any).eq('id', subtask.id).then(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, [localCommissionValue]);

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
                      value={localCommissionValue}
                      onChange={(e) => setLocalCommissionValue(e.target.value)}
                      className="h-8 w-24 text-sm" min="0" step="0.01"
                      placeholder={subtask.commission_type === 'percentage' ? '%' : 'LKR'}
                    />
                  )}
                </div>
                {subtask.commission_type && subtask.commission_value > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {formatLKR(subtask.commission_type === 'percentage' ? (subtask.commission_value / 100) * taskBudget : subtask.commission_value)}
                    {subtask.commission_type === 'percentage' && ` (${subtask.commission_value}% of ${formatLKR(taskBudget)})`}
                  </p>
                )}
              </div>
            ) : (
              subtask.commission_type && subtask.commission_value > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Commission: {formatLKR(subtask.commission_type === 'percentage' ? (subtask.commission_value / 100) * taskBudget : subtask.commission_value)}
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
