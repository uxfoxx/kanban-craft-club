import React, { useState, useEffect, useRef } from 'react';
import { Task, KanbanColumn, TimeEntry } from '@/types/database';
import { useIsOrgAdmin } from '@/hooks/useIsOrgAdmin';
import { useSubtasks, useCreateSubtask, useUpdateTask, useDeleteTask, useUpdateSubtask } from '@/hooks/useTasks';
import { useTimeEntries, formatDuration, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
import { formatLKR } from '@/lib/currency';
import { useTaskAssignees, useAddTaskAssignee, useRemoveTaskAssignee, useAddSubtaskAssignee as useAddSubAssignee } from '@/hooks/useAssignees';
import { useOrganizationMembersForProject } from '@/hooks/useOrganizations';
import { useOrganizationTiers, getTierForBudget } from '@/hooks/useOrganizationTiers';
import { useRateCard, useRateCardRoles, useRateCardDeliverables, getRateForTier, useRateCardForTier } from '@/hooks/useRateCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/hooks/useProjects';
import { useProjectSubtaskEarnings } from '@/hooks/useProjectSubtaskEarnings';
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
import { Plus, Clock, Flag, Calendar as CalendarIcon, X, Trash2, Pencil, Check, XCircle, DollarSign, ArrowLeft, PartyPopper, Shield, TrendingUp, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const { user } = useAuth();
  const { data: subtasks } = useSubtasks(task?.id);
  const { data: isAdmin = false } = useIsOrgAdmin();
  const { data: timeEntries } = useTimeEntries(task?.id);
  const { data: assignees } = useTaskAssignees(task?.id);
  const { data: organizationMembers = [] } = useOrganizationMembersForProject(projectId);
  const { data: comments } = useComments(task?.id);
  const { currentOrganization } = useOrganization();
  const { data: project } = useProject(projectId);
  const createSubtask = useCreateSubtask();
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();
  const deleteTask = useDeleteTask();
  const deleteTimeEntry = useDeleteTimeEntry();
  const addAssignee = useAddTaskAssignee();
  const removeAssignee = useRemoveTaskAssignee();
  const addSubtaskAssignee = useAddSubAssignee();

  const { data: orgTiers = [] } = useOrganizationTiers(currentOrganization?.id);
  const rateCardRoles = useRateCardRoles(currentOrganization?.id);
  const rateCardDeliverables = useRateCardDeliverables(currentOrganization?.id);

  // Get current user's earnings for this task
  const { data: earningsMap = {} } = useProjectSubtaskEarnings(
    projectId, user?.id, currentOrganization?.id, Number(project?.budget || 0)
  );
  const myTaskEarning = task ? earningsMap[task.id] || 0 : 0;

  // Task's tier — manual tier_id or fall back to budget-based detection
  const taskBudget = task ? Number((task as any).budget || task.cost || 0) : 0;
  const manualTierId = (task as any)?.tier_id;
  const taskTier = manualTierId 
    ? orgTiers.find(t => t.id === manualTierId) 
    : (taskBudget > 0 ? getTierForBudget(orgTiers, taskBudget) : null);
  const tierSlug = taskTier?.slug?.toLowerCase();
  const isMajor = tierSlug === 'major';
  const isMinorOrNano = tierSlug === 'minor' || tierSlug === 'nano';

  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskType, setNewSubtaskType] = useState<string>('');
  const [newSubtaskRole, setNewSubtaskRole] = useState<string>('');
  const [newSubtaskMode, setNewSubtaskMode] = useState<'role' | 'type'>('role');
  const [newSubtaskDeliverable, setNewSubtaskDeliverable] = useState<string>('');
  const [newSubtaskComplexity, setNewSubtaskComplexity] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDelivering, setIsDelivering] = useState(false);

  // Local state for debounced budget input
  const [localBudget, setLocalBudget] = useState('');

  const taskId = task?.id;
  useEffect(() => {
    setLocalBudget((task as any)?.budget || task?.cost ? String((task as any)?.budget || task?.cost) : '');
  }, [taskId]);

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

  const handleTierChange = async (tierId: string) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ taskId: task.id, updates: { tier_id: tierId } as any, projectId });
      toast.success('Tier updated');
    } catch { toast.error('Failed to update tier'); }
  };

  const { currentPage, navigateTo, goBack, isRoot, resetTo } = useSheetPageStack();

  // Get roles filtered by sub_category for MAJOR tier
  const majorTypes = ['Films', 'Photography', 'Design'];
  const rolesForType = (type: string) => {
    return rateCardRoles.filter(r => r.sub_category === type);
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtask.trim()) return;
    try {
      const subtaskData: any = { taskId: task.id, title: newSubtask.trim() };
      
      if (isMajor && newSubtaskType) {
        subtaskData.work_type = newSubtaskType;
        subtaskData.commission_mode = 'role';
      } else if (isMinorOrNano) {
        subtaskData.commission_mode = newSubtaskMode;
        if (newSubtaskMode === 'role') {
          // role set on subtask-level
        } else {
          subtaskData.work_type = newSubtaskDeliverable || null;
          subtaskData.complexity = newSubtaskComplexity || null;
        }
      }

      await createSubtask.mutateAsync(subtaskData);
      setNewSubtask('');
      setNewSubtaskType('');
      setNewSubtaskRole('');
      setNewSubtaskMode('role');
      setNewSubtaskDeliverable('');
      setNewSubtaskComplexity('');
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
      const isFirst = !assignees || assignees.length === 0;
      await addAssignee.mutateAsync({ taskId: task.id, userId, role: isFirst ? 'Task Manager' : undefined });
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

  // Split assignees into Team Lead and Others
  const teamLead = assignees?.find(a => (a as any).role === 'Task Manager');
  const otherAssignees = assignees?.filter(a => (a as any).role !== 'Task Manager') || [];

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
        {/* Header */}
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
              {taskTier && (
                <Badge variant="secondary" className="text-xs">{taskTier.name}</Badge>
              )}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col mt-2">
          {isOnSubtaskDetail && selectedSubtask ? (
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
                  taskBudget={taskBudget}
                  isOrgAdmin={isAdmin}
                  expensesEnabled={expensesEnabled}
                  taskTier={taskTier}
                  orgId={currentOrganization?.id}
                />
              </div>
            </div>
          ) : (
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

                  {/* Team Lead */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                      <Shield className="h-4 w-4" /> Team Lead
                    </h4>
                    {teamLead ? (
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={teamLead.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{teamLead.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{teamLead.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{teamLead.profiles?.email}</p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveAssignee(teamLead.user_id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">No team lead assigned</p>
                        {unassignedMembers.length > 0 && (
                          <Select onValueChange={handleAddAssignee}>
                            <SelectTrigger><SelectValue placeholder="Assign team lead..." /></SelectTrigger>
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
                    )}
                  </div>

                  <Separator />

                  {/* Assignees */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Assignees</h4>
                    {otherAssignees.length > 0 ? (
                      <div className="space-y-2">
                        {otherAssignees.map((assignee) => (
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
                      <p className="text-sm text-muted-foreground text-center py-2">No additional assignees</p>
                    )}
                    {unassignedMembers.filter(m => m.user_id !== teamLead?.user_id).length > 0 && (
                      <div className="mt-3">
                        <Select onValueChange={handleAddAssignee}>
                          <SelectTrigger><SelectValue placeholder="Add assignee..." /></SelectTrigger>
                          <SelectContent>
                            {unassignedMembers.filter(m => m.user_id !== teamLead?.user_id).map((member) => (
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

                    {/* Add subtask form - tier-aware */}
                    <form onSubmit={handleAddSubtask} className="space-y-3 mb-4 p-3 rounded-lg border bg-muted/30">
                      <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Subtask title..." className="flex-1" />
                      
                      {expensesEnabled && !taskTier && (
                        <p className="text-xs text-muted-foreground italic">Select a tier in the Finance tab to configure subtask rates</p>
                      )}

                      {expensesEnabled && isMajor && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={newSubtaskType} onValueChange={(v) => { setNewSubtaskType(v); setNewSubtaskRole(''); }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type..." /></SelectTrigger>
                            <SelectContent>
                              {majorTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {newSubtaskType && (
                            <Select value={newSubtaskRole} onValueChange={setNewSubtaskRole}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role..." /></SelectTrigger>
                              <SelectContent>
                                {rolesForType(newSubtaskType).map(r => (
                                  <SelectItem key={r.id} value={r.name}>
                                    {r.name} {taskTier && getRateForTier(r, taskTier.id) > 0 ? ` (${formatLKR(getRateForTier(r, taskTier.id))})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}

                      {expensesEnabled && isMinorOrNano && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Button type="button" variant={newSubtaskMode === 'role' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setNewSubtaskMode('role')}>
                              Role-based
                            </Button>
                            <Button type="button" variant={newSubtaskMode === 'type' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setNewSubtaskMode('type')}>
                              Deliverable
                            </Button>
                          </div>
                          {newSubtaskMode === 'role' ? (
                            <Select value={newSubtaskRole} onValueChange={setNewSubtaskRole}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select role..." /></SelectTrigger>
                              <SelectContent>
                                {rateCardRoles.map(r => (
                                  <SelectItem key={r.id} value={r.name}>
                                    {r.name} {taskTier && getRateForTier(r, taskTier.id) > 0 ? `(${formatLKR(getRateForTier(r, taskTier.id))})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={newSubtaskDeliverable} onValueChange={setNewSubtaskDeliverable}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Deliverable..." /></SelectTrigger>
                                <SelectContent>
                                  {[...new Set(rateCardDeliverables.map(d => d.name))].map(name => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={newSubtaskComplexity} onValueChange={setNewSubtaskComplexity}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Complexity..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Quick">Quick</SelectItem>
                                  <SelectItem value="Standard">Standard</SelectItem>
                                  <SelectItem value="Advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      <Button type="submit" size="sm" disabled={!newSubtask.trim()} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> Add Subtask
                      </Button>
                    </form>

                    <div className="space-y-2">
                      {subtasks?.map((subtask) => (
                        <SubtaskRow
                          key={subtask.id}
                          subtask={subtask}
                          organizationMembers={organizationMembers}
                          taskBudget={taskBudget}
                          isOrgAdmin={isAdmin}
                          expensesEnabled={expensesEnabled}
                          currentUserId={user?.id}
                          projectTierId={taskTier?.id}
                          orgId={currentOrganization?.id}
                          tierSlug={tierSlug}
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
                        <span className="text-2xl font-bold">{formatDuration(totalTimeSpent)}</span>
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
                    ) : <p className="text-xs text-muted-foreground">No time logged yet</p>}
                  </div>
                </div>
              </TabsContent>

              {/* Finance Tab */}
              {expensesEnabled && (
                <TabsContent value="finance" className="flex-1 overflow-y-auto px-6 pb-20 md:pb-6 mt-0 pt-4">
                  <div className="space-y-4">
                    {isAdmin ? (
                      <>
                        {/* Tier dropdown */}
                        {orgTiers.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tier</label>
                            <Select value={manualTierId || ''} onValueChange={handleTierChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tier..." />
                              </SelectTrigger>
                              <SelectContent>
                                {orgTiers.map((tier) => (
                                  <SelectItem key={tier.id} value={tier.id}>
                                    {tier.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Task Budget (LKR)</label>
                          <Input
                            type="number"
                            value={localBudget}
                            onChange={(e) => setLocalBudget(e.target.value)}
                            min="0" step="0.01"
                          />
                        </div>
                      </>
                    ) : (
                      /* Non-admin: show only their own potential earning */
                      <div className="p-4 rounded-lg border bg-chart-2/5 border-chart-2/20">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-chart-2" />
                          <span className="text-sm font-medium">Your Potential Earning</span>
                        </div>
                        <p className="text-2xl font-bold text-chart-2">
                          {myTaskEarning > 0 ? formatLKR(myTaskEarning) : 'No earnings yet'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on your subtask assignments and the rate card
                        </p>
                      </div>
                    )}

                    {/* Show current user's earning for admins too */}
                    {isAdmin && myTaskEarning > 0 && (
                      <div className="p-3 rounded-lg border bg-chart-2/5 border-chart-2/20">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-chart-2" />
                          <span className="text-sm font-medium">Your Earning</span>
                          <span className="text-sm font-bold text-chart-2 ml-auto">{formatLKR(myTaskEarning)}</span>
                        </div>
                      </div>
                    )}
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
import { useSubtaskAssignees, useAddSubtaskAssignee, useRemoveSubtaskAssignee, useUpdateSubtaskAssigneeRole } from '@/hooks/useAssignees';
import { SubtaskTimeEntryDialog } from '@/components/time/SubtaskTimeEntryDialog';
import { Subtask, OrganizationTier } from '@/types/database';
import { OrganizationMemberWithProfile } from '@/hooks/useOrganizations';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square } from 'lucide-react';
import { useRateCardRoles as useRCRoles, useRateCardDeliverables as useRCDeliverables, getRateForTier as getRate } from '@/hooks/useRateCard';

const SubtaskDetailPage: React.FC<{
  subtask: Subtask;
  organizationMembers: OrganizationMemberWithProfile[];
  taskBudget: number;
  isOrgAdmin: boolean;
  expensesEnabled?: boolean;
  taskTier?: OrganizationTier | null;
  orgId?: string;
}> = ({ subtask, organizationMembers, taskBudget, isOrgAdmin, expensesEnabled, taskTier, orgId }) => {
  const { data: timeEntries = [] } = useSubtaskTimeEntries(subtask.id);
  const { data: assignees = [] } = useSubtaskAssignees(subtask.id);
  const { data: globalActiveTimer } = useActiveSubtaskTimeEntry();
  const deleteTimeEntry = useDeleteSubtaskTimeEntry();
  const addAssignee = useAddSubtaskAssignee();
  const removeAssignee = useRemoveSubtaskAssignee();
  const updateAssigneeRole = useUpdateSubtaskAssigneeRole();
  const startTimer = useStartSubtaskTimeEntry();
  const stopTimer = useStopSubtaskTimeEntry();
  const updateSubtask = useUpdateSubtask();
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

  const roles = useRCRoles(orgId);
  const deliverables = useRCDeliverables(orgId);
  const tierSlug = taskTier?.slug?.toLowerCase();
  const isMajor = tierSlug === 'major';
  const isMinorOrNano = tierSlug === 'minor' || tierSlug === 'nano';

  // Compute auto commission from rate card
  const getSubtaskRate = () => {
    if (!taskTier) return 0;
    const mode = subtask.commission_mode || 'role';
    if (mode === 'role') {
      // For major: use work_type as sub_category filter
      const role = assignees[0]?.role;
      if (!role) return 0;
      const entry = roles.find(r => r.name === role && (!isMajor || r.sub_category === subtask.work_type));
      return entry ? getRate(entry, taskTier.id) : 0;
    } else if (mode === 'type' && subtask.work_type) {
      const entry = deliverables.find(d => d.name === subtask.work_type && d.complexity === subtask.complexity);
      return entry ? getRate(entry, taskTier.id) : 0;
    }
    return 0;
  };

  const autoRate = getSubtaskRate();
  const perPersonRate = assignees.length > 0 ? autoRate / assignees.length : autoRate;

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

  // Major type roles for the subtask's type
  const majorTypes = ['Films', 'Photography', 'Design'];
  const rolesForType = (type: string) => roles.filter(r => r.sub_category === type);

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

      {/* Tier-based commission info */}
      {expensesEnabled && taskTier && (
        <>
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Commission</h4>
            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{taskTier.name}</Badge>
                {subtask.commission_mode === 'role' && <Badge variant="outline" className="text-xs">Role-based</Badge>}
                {subtask.commission_mode === 'type' && <Badge variant="outline" className="text-xs">Deliverable</Badge>}
                {subtask.work_type && <Badge variant="outline" className="text-xs">{subtask.work_type}</Badge>}
                {subtask.complexity && <Badge variant="outline" className="text-xs">{subtask.complexity}</Badge>}
              </div>
              {autoRate > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Rate: </span>
                  <span className="font-semibold text-chart-2">{formatLKR(autoRate)}</span>
                  {assignees.length > 1 && (
                    <span className="text-muted-foreground"> ÷ {assignees.length} = {formatLKR(perPersonRate)} each</span>
                  )}
                </div>
              )}

              {/* MAJOR: change type */}
              {isOrgAdmin && isMajor && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Select value={subtask.work_type || ''} onValueChange={async (v) => {
                    try { await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, work_type: v }); toast.success('Updated'); } catch { toast.error('Failed'); }
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type..." /></SelectTrigger>
                    <SelectContent>
                      {majorTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* MINOR/NANO: mode toggle + fields */}
              {isOrgAdmin && isMinorOrNano && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant={subtask.commission_mode === 'role' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={async () => {
                      try { await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, commission_mode: 'role' }); toast.success('Updated'); } catch { toast.error('Failed'); }
                    }}>
                      Role-based
                    </Button>
                    <Button type="button" variant={subtask.commission_mode === 'type' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={async () => {
                      try { await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, commission_mode: 'type' }); toast.success('Updated'); } catch { toast.error('Failed'); }
                    }}>
                      Deliverable
                    </Button>
                  </div>
                  {subtask.commission_mode === 'type' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={subtask.work_type || ''} onValueChange={async (v) => {
                        try { await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, work_type: v }); toast.success('Updated'); } catch { toast.error('Failed'); }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Deliverable..." /></SelectTrigger>
                        <SelectContent>
                          {[...new Set(deliverables.map(d => d.name))].map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={subtask.complexity || ''} onValueChange={async (v) => {
                        try { await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, complexity: v }); toast.success('Updated'); } catch { toast.error('Failed'); }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Complexity..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Quick">Quick</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Assignees with role selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Assignees</h4>
        {assignees.length > 0 ? (
          <div className="space-y-2">
            {assignees.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-7 w-7"><AvatarImage src={a.profiles?.avatar_url || undefined} /><AvatarFallback className="text-xs">{a.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                  <span className="text-sm truncate">{a.profiles?.full_name || a.profiles?.email}</span>
                  {/* Role selector for MAJOR or role-based MINOR/NANO */}
                  {expensesEnabled && taskTier && (subtask.commission_mode === 'role' || isMajor) && isOrgAdmin && (
                    <Select value={a.role || ''} onValueChange={async (v) => {
                      try { await updateAssigneeRole.mutateAsync({ subtaskId: subtask.id, userId: a.user_id, role: v || null }); toast.success('Role updated'); } catch { toast.error('Failed'); }
                    }}>
                      <SelectTrigger className="h-7 w-[120px] text-xs ml-auto"><SelectValue placeholder="Role..." /></SelectTrigger>
                      <SelectContent>
                        {(isMajor && subtask.work_type ? rolesForType(subtask.work_type) : roles.filter(r => taskTier && getRate(r, taskTier.id) > 0)).map(r => (
                          <SelectItem key={r.id} value={r.name}>
                            {r.name} ({formatLKR(taskTier ? getRate(r, taskTier.id) : 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {a.role && <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">{a.role}</Badge>}
                  {perPersonRate > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 border-chart-2/30 bg-chart-2/10 text-chart-2">
                      {formatLKR(perPersonRate)}
                    </Badge>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={async () => { try { await removeAssignee.mutateAsync({ subtaskId: subtask.id, userId: a.user_id }); toast.success('Removed'); } catch { toast.error('Failed'); } }}>
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

      {/* Time Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Time Entries</h4>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowTimeEntryDialog(true)}>
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
