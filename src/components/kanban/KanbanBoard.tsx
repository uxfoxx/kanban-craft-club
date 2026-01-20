import React, { useState } from 'react';
import { useTasks, useUpdateTaskColumn } from '@/hooks/useTasks';
import { useProject, useProjectMembers, useAddProjectMember } from '@/hooks/useProjects';
import { useKanbanColumns } from '@/hooks/useKanbanColumns';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailSheet } from './TaskDetailSheet';
import { ColumnManager } from './ColumnManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, UserPlus, Loader2, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  onBack: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: columns, isLoading: columnsLoading } = useKanbanColumns(projectId);
  const updateTaskColumn = useUpdateTaskColumn();
  const addMember = useAddProjectMember();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');

  const isOwner = project?.owner_id === user?.id;
  const currentUserMember = members?.find(m => m.user_id === user?.id);
  const isAdmin = isOwner || currentUserMember?.role === 'admin';

  const handleDrop = async (taskId: string, columnId: string) => {
    try {
      await updateTaskColumn.mutateAsync({ taskId, columnId, projectId });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addMember.mutateAsync({
        projectId,
        email: newMemberEmail,
        role: newMemberRole,
      });
      toast.success('Member added!');
      setMemberDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member');
    }
  };

  const getTasksByColumn = (columnId: string): Task[] => {
    return tasks?.filter((task) => task.column_id === columnId) || [];
  };

  const isLoading = tasksLoading || columnsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project?.name}</h1>
            <p className="text-sm text-muted-foreground">{project?.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {members && members.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
              <Users className="h-4 w-4" />
              {members.length + 1} members
            </div>
          )}
          
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setColumnManagerOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
              
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Invite a user to this project by their email address.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-email">Email Address</Label>
                      <Input
                        id="member-email"
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-role">Role</Label>
                      <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as 'admin' | 'member')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin (can manage tasks & members)</SelectItem>
                          <SelectItem value="member">Member (can work on tasks)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={addMember.isPending}>
                      {addMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Member
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div 
          className="grid gap-4"
          style={{ 
            gridTemplateColumns: `repeat(${columns?.length || 3}, minmax(280px, 1fr))` 
          }}
        >
          {columns?.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onDrop={handleDrop}
            >
              {getTasksByColumn(column.id).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  columnName={column.name}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>
      )}

      <CreateTaskDialog
        projectId={projectId}
        columns={columns}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        members={members}
      />

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        columns={columns}
        members={members}
        onClose={() => setSelectedTask(null)}
      />

      <ColumnManager
        projectId={projectId}
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
      />
    </div>
  );
};
