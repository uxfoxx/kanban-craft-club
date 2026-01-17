import React, { useState } from 'react';
import { useTasks, useUpdateTaskStatus } from '@/hooks/useTasks';
import { useProject, useProjectMembers, useAddProjectMember } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Task, TaskStatus } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailSheet } from './TaskDetailSheet';
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
import { ArrowLeft, Plus, UserPlus, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  onBack: () => void;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, onBack }) => {
  const { profile, user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading } = useTasks(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateTaskStatus = useUpdateTaskStatus();
  const addMember = useAddProjectMember();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const isOwner = project?.owner_id === user?.id;
  const canManage = isOwner || profile?.role === 'manager';

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus.mutateAsync({ taskId, status: newStatus, projectId });
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addMember.mutateAsync({
        projectId,
        email: newMemberEmail,
        role: 'member',
      });
      toast.success('Member added!');
      setMemberDialogOpen(false);
      setNewMemberEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member');
    }
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks?.filter((task) => task.status === status) || [];
  };

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
          
          {canManage && (
            <>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              title={column.title}
              status={column.id}
              onDrop={handleDrop}
            >
              {getTasksByStatus(column.id).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>
      )}

      <CreateTaskDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        members={members}
      />

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
