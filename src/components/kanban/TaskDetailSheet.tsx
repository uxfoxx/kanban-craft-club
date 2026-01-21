import React, { useState } from 'react';
import { Task, Subtask, Profile, KanbanColumn } from '@/types/database';
import { useSubtasks, useCreateSubtask, useToggleSubtask, useUpdateTask, useDeleteTask, useDeleteSubtask, useUpdateSubtask } from '@/hooks/useTasks';
import { useTimeEntries, formatDuration, useDeleteTimeEntry } from '@/hooks/useTimeTracking';
import { useTaskAssignees, useAddTaskAssignee, useRemoveTaskAssignee } from '@/hooks/useAssignees';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Clock, ListTodo, Flag, Calendar as CalendarIcon, Users, X, Trash2, Pencil, Check, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  task: Task | null;
  projectId: string;
  columns?: KanbanColumn[];
  members?: { user_id: string; role: string; profiles: Profile }[];
  onClose: () => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  projectId,
  columns,
  members,
  onClose,
}) => {
  const { data: subtasks } = useSubtasks(task?.id);
  const { data: timeEntries } = useTimeEntries(task?.id);
  const { data: assignees } = useTaskAssignees(task?.id);
  const createSubtask = useCreateSubtask();
  const toggleSubtask = useToggleSubtask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const deleteSubtask = useDeleteSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteTimeEntry = useDeleteTimeEntry();
  const addAssignee = useAddTaskAssignee();
  const removeAssignee = useRemoveTaskAssignee();
  
  const [newSubtask, setNewSubtask] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editedSubtaskTitle, setEditedSubtaskTitle] = useState('');

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtask.trim()) return;
    
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: newSubtask.trim() });
      setNewSubtask('');
      toast.success('Subtask added');
    } catch (error) {
      toast.error('Failed to add subtask');
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      await toggleSubtask.mutateAsync({
        subtaskId: subtask.id,
        completed: !subtask.completed,
        taskId: subtask.task_id,
      });
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const handleColumnChange = async (columnId: string) => {
    if (!task) return;
    
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { column_id: columnId },
        projectId,
      });
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high') => {
    if (!task) return;
    
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { priority },
        projectId,
      });
      toast.success('Priority updated');
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    if (!task) return;
    
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { due_date: date ? format(date, 'yyyy-MM-dd') : null },
        projectId,
      });
      toast.success('Due date updated');
    } catch (error) {
      toast.error('Failed to update due date');
    }
  };

  const handleSaveTitle = async () => {
    if (!task || !editedTitle.trim()) return;
    
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { title: editedTitle.trim() },
        projectId,
      });
      setIsEditingTitle(false);
      toast.success('Title updated');
    } catch (error) {
      toast.error('Failed to update title');
    }
  };

  const handleSaveDescription = async () => {
    if (!task) return;
    
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        updates: { description: editedDescription.trim() || null },
        projectId,
      });
      setIsEditingDescription(false);
      toast.success('Description updated');
    } catch (error) {
      toast.error('Failed to update description');
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    try {
      await deleteTask.mutateAsync({ taskId: task.id, projectId });
      toast.success('Task deleted');
      onClose();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task) return;
    
    try {
      await deleteSubtask.mutateAsync({ subtaskId, taskId: task.id });
      toast.success('Subtask deleted');
    } catch (error) {
      toast.error('Failed to delete subtask');
    }
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    if (!task || !editedSubtaskTitle.trim()) return;
    
    try {
      await updateSubtask.mutateAsync({
        subtaskId,
        title: editedSubtaskTitle.trim(),
        taskId: task.id,
      });
      setEditingSubtaskId(null);
      toast.success('Subtask updated');
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!task) return;
    
    try {
      await deleteTimeEntry.mutateAsync({ entryId, taskId: task.id });
      toast.success('Time entry deleted');
    } catch (error) {
      toast.error('Failed to delete time entry');
    }
  };

  const handleAddAssignee = async (userId: string) => {
    if (!task) return;
    
    try {
      await addAssignee.mutateAsync({ taskId: task.id, userId });
      toast.success('Assignee added');
    } catch (error) {
      toast.error('Failed to add assignee');
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!task) return;
    
    try {
      await removeAssignee.mutateAsync({ taskId: task.id, userId });
      toast.success('Assignee removed');
    } catch (error) {
      toast.error('Failed to remove assignee');
    }
  };

  const totalTimeSpent = timeEntries?.reduce((acc, entry) => {
    return acc + (entry.duration_seconds || 0);
  }, 0) || 0;

  const completedSubtasks = subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;

  const currentColumn = columns?.find(c => c.id === task?.column_id);

  // Get assignee user ids
  const assigneeUserIds = assignees?.map(a => a.user_id) || [];

  // Get unassigned members
  const unassignedMembers = members?.filter(m => !assigneeUserIds.includes(m.user_id)) || [];

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {task && (
          <>
            <SheetHeader>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
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
                {/* Priority Selector */}
                <Select value={task.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-auto h-7 text-xs">
                    <SelectValue>
                      <Badge variant="outline" className={cn('capitalize', {
                        'bg-destructive/10 text-destructive': task.priority === 'high',
                        'bg-chart-4/10 text-chart-4': task.priority === 'medium',
                        'bg-chart-5/10 text-chart-5': task.priority === 'low',
                      })}>
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                {/* Due Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Set due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={task.due_date ? new Date(task.due_date) : undefined}
                      onSelect={handleDueDateChange}
                      initialFocus
                    />
                    {task.due_date && (
                      <div className="p-2 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-destructive"
                          onClick={() => handleDueDateChange(undefined)}
                        >
                          Remove due date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Status Column Selector */}
              {columns && columns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Status</h4>
                  <Select value={task.column_id || ''} onValueChange={handleColumnChange}>
                    <SelectTrigger>
                      <SelectValue>
                        {currentColumn && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: currentColumn.color || '#6366f1' }}
                            />
                            {currentColumn.name}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: column.color || '#6366f1' }}
                            />
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
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Add a description..."
                      rows={4}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors group"
                    onClick={() => { setEditedDescription(task.description || ''); setIsEditingDescription(true); }}
                  >
                    {task.description || (
                      <span className="italic">Click to add description...</span>
                    )}
                    <Pencil className="h-3 w-3 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              
              <Separator />

              {/* Assignees */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Assignees</h4>
                </div>
                
                <div className="space-y-2">
                  {assignees && assignees.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignees.map((assignee) => (
                        <Badge key={assignee.id} variant="secondary" className="flex items-center gap-1">
                          {assignee.profiles?.full_name || 'Unknown'}
                          <button
                            onClick={() => handleRemoveAssignee(assignee.user_id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No assignees</p>
                  )}
                  
                  {unassignedMembers.length > 0 && (
                    <Select onValueChange={handleAddAssignee}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Add assignee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.profiles.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Time Tracking Summary */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Time Tracked</h4>
                </div>
                <p className="text-2xl font-bold">
                  {totalTimeSpent > 0 ? formatDuration(totalTimeSpent) : 'No time logged'}
                </p>
                {timeEntries && timeEntries.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {timeEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="text-xs text-muted-foreground flex justify-between items-center group">
                        <span>{format(new Date(entry.started_at), 'MMM d, h:mm a')}</span>
                        <div className="flex items-center gap-2">
                          <span>{entry.duration_seconds ? formatDuration(entry.duration_seconds) : '-'}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleDeleteTimeEntry(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Subtasks</h4>
                  </div>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {completedSubtasks}/{totalSubtasks} completed
                    </span>
                  )}
                </div>
                
                <form onSubmit={handleAddSubtask} className="flex gap-2 mb-3">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newSubtask.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
                
                <div className="space-y-2">
                  {subtasks?.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => handleToggleSubtask(subtask)}
                      />
                      {editingSubtaskId === subtask.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editedSubtaskTitle}
                            onChange={(e) => setEditedSubtaskTitle(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveSubtaskTitle(subtask.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingSubtaskId(null)}>
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
                            onClick={() => { setEditingSubtaskId(subtask.id); setEditedSubtaskTitle(subtask.title); }}
                          >
                            {subtask.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => handleDeleteSubtask(subtask.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {(!subtasks || subtasks.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No subtasks yet
                    </p>
                  )}
                </div>
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
                      This will permanently delete "{task.title}" and all its subtasks and time entries.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTask}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
