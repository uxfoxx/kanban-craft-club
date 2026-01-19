import React, { useState } from 'react';
import { useCreateTask } from '@/hooks/useTasks';
import { useAddTaskAssignee } from '@/hooks/useAssignees';
import { Profile, TaskPriority, KanbanColumn } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTaskDialogProps {
  projectId: string;
  columns?: KanbanColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members?: { user_id: string; role: string; profiles: Profile }[];
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  projectId,
  columns,
  open,
  onOpenChange,
  members,
}) => {
  const createTask = useCreateTask();
  const addAssignee = useAddTaskAssignee();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [columnId, setColumnId] = useState<string>('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  // Get default column (first one or one marked as default)
  const defaultColumn = columns?.find(c => c.is_default) || columns?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const task = await createTask.mutateAsync({
        projectId,
        title,
        description: description || undefined,
        priority,
        columnId: columnId || defaultColumn?.id,
        dueDate: dueDate || undefined,
      });

      // Add assignees
      for (const userId of selectedAssignees) {
        await addAssignee.mutateAsync({ taskId: task.id, userId });
      }
      
      toast.success('Task created!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setColumnId('');
    setSelectedAssignees([]);
    setDueDate('');
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {columns && columns.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="task-column">Status Column</Label>
              <Select value={columnId || defaultColumn?.id} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
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
          
          {members && members.length > 0 && (
            <div className="space-y-2">
              <Label>Assign To</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <Checkbox
                      id={`assignee-${member.user_id}`}
                      checked={selectedAssignees.includes(member.user_id)}
                      onCheckedChange={() => toggleAssignee(member.user_id)}
                    />
                    <label 
                      htmlFor={`assignee-${member.user_id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {member.profiles.full_name}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({member.role})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={createTask.isPending}>
            {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
