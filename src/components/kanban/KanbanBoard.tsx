import React, { useState, useMemo } from 'react';
import { useTasks, useUpdateTaskColumn } from '@/hooks/useTasks';
import { useProject, useProjectMembers, useAddProjectMember, useProjectOwner } from '@/hooks/useProjects';
import { useKanbanColumns } from '@/hooks/useKanbanColumns';
import { useTaskAssigneesForProject, useTaskTimeForProject } from '@/hooks/useTaskAssigneesForProject';
import { useAuth } from '@/contexts/AuthContext';
import { Task, Profile } from '@/types/database';
import { useIsPluginEnabled } from '@/hooks/useOrganizationPlugins';
import { ProjectFinancials } from '@/components/projects/ProjectFinancials';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { TaskDetailSheet } from './TaskDetailSheet';
import { ColumnManager } from './ColumnManager';
import { KanbanFilters, KanbanFilterState } from './KanbanFilters';
import { ProjectSettings } from '@/components/projects/ProjectSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, UserPlus, Loader2, Users, Settings, UserCheck } from 'lucide-react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { isPast, differenceInHours } from 'date-fns';

interface KanbanBoardProps {
  projectId: string;
  onBack: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, onBack }) => {
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: ownerProfile } = useProjectOwner(project?.owner_id);
  const { data: columns, isLoading: columnsLoading } = useKanbanColumns(projectId);
  const { data: taskAssignees = [] } = useTaskAssigneesForProject(projectId);
  const { data: taskTimeMap } = useTaskTimeForProject(projectId);
  const updateTaskColumn = useUpdateTaskColumn();
  const addMember = useAddProjectMember();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [filters, setFilters] = useState<KanbanFilterState>({
    assigneeIds: [],
    priorities: [],
    deadlineStatuses: [],
  });

  const isOwner = project?.owner_id === user?.id;
  const currentUserMember = members?.find(m => m.user_id === user?.id);
  const isAdmin = isOwner || currentUserMember?.role === 'admin';
  const isMember = isOwner || !!currentUserMember;
  const expensesEnabled = useIsPluginEnabled(project?.organization_id, 'expenses');
  const leadMember = allMembers.find(m => m.user_id === project?.lead_id);

  const allMembers = useMemo(() => {
    const membersList: { user_id: string; role: string; profiles: Profile }[] = [];
    if (ownerProfile && project?.owner_id) {
      membersList.push({ user_id: project.owner_id, role: 'owner', profiles: ownerProfile });
    }
    if (members) {
      members.forEach(m => {
        if (m.profiles) {
          membersList.push({ user_id: m.user_id, role: m.role, profiles: m.profiles as Profile });
        }
      });
    }
    return membersList;
  }, [members, ownerProfile, project?.owner_id]);

  const assigneesByTask = useMemo(() => {
    const map = new Map<string, { user_id: string; profile: Profile }[]>();
    taskAssignees.forEach(a => {
      const list = map.get(a.task_id) || [];
      list.push({ user_id: a.user_id, profile: a.profile });
      map.set(a.task_id, list);
    });
    return map;
  }, [taskAssignees]);

  const handleDrop = async (taskId: string, columnId: string) => {
    try {
      await updateTaskColumn.mutateAsync({ taskId, columnId, projectId });
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleMoveToColumn = async (taskId: string, columnId: string) => {
    try {
      await updateTaskColumn.mutateAsync({ taskId, columnId, projectId });
      toast.success('Task moved');
    } catch (error) {
      toast.error('Failed to move task');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMember.mutateAsync({ projectId, email: newMemberEmail, role: newMemberRole });
      toast.success('Member added!');
      setMemberDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add member');
    }
  };

  const getDeadlineStatus = (task: Task) => {
    const isDone = task.column_id === columns?.find(c => c.name.toLowerCase() === 'done')?.id || task.status === 'done';
    if (!task.due_date || isDone) return null;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    if (isPast(dueDate)) return 'overdue';
    const hoursUntilDue = differenceInHours(dueDate, now);
    if (hoursUntilDue <= 24) return 'urgent';
    if (hoursUntilDue <= 48) return 'warning';
    return null;
  };

  const matchesFilters = (task: Task): boolean => {
    if (filters.assigneeIds.length > 0) {
      const taskAssignees = assigneesByTask.get(task.id) || [];
      const hasMatchingAssignee = taskAssignees.some(a => filters.assigneeIds.includes(a.user_id));
      if (!hasMatchingAssignee) return false;
    }
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) return false;
    }
    if (filters.deadlineStatuses.length > 0) {
      const deadlineStatus = getDeadlineStatus(task);
      if (!deadlineStatus || !filters.deadlineStatuses.includes(deadlineStatus)) {
        const hasNoDeadline = !task.due_date || task.status === 'done';
        if (hasNoDeadline) return false;
      }
    }
    return true;
  };

  const getTasksByColumn = (columnId: string): Task[] => {
    return tasks?.filter((task) => task.column_id === columnId && matchesFilters(task)) || [];
  };

  const isLoading = tasksLoading || columnsLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={onBack}>Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project?.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {project?.description && (
            <p className="text-sm text-muted-foreground truncate">{project?.description}</p>
          )}
          {leadMember && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Lead: {leadMember.profiles.full_name}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {allMembers.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setSettingsOpen(true)}>
              <Users className="h-4 w-4" /> {allMembers.length}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setColumnManagerOpen(true)}>
                <Settings className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Columns</span>
              </Button>
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Add Member</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>Invite a user to this project by their email address.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-email">Email Address</Label>
                      <Input id="member-email" type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="user@example.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-role">Role</Label>
                      <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as 'admin' | 'member')}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
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
            </>
          )}
          {isMember && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Add Task</span>
            </Button>
          )}
        </div>

        <KanbanFilters
          members={allMembers}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Financial Summary - Plugin Gated */}
        {expensesEnabled && project && project.budget > 0 && (
          <ProjectFinancials
            projectId={projectId}
            budget={project.budget}
            companyPct={project.company_share_pct}
            teamPct={project.team_share_pct}
            finderPct={project.finder_commission_pct}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-4">
          <div
            className="flex md:grid gap-4 snap-x snap-mandatory md:snap-none"
            style={{ gridTemplateColumns: `repeat(${columns?.length || 3}, minmax(280px, 1fr))` }}
          >
            {columns?.map((column) => (
              <div key={column.id} className="min-w-[280px] w-[80vw] md:w-auto flex-shrink-0 md:flex-shrink snap-center">
                <KanbanColumn column={column} onDrop={handleDrop}>
                  {getTasksByColumn(column.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      columnName={column.name}
                      onClick={() => setSelectedTask(task)}
                      assignees={assigneesByTask.get(task.id)}
                      timeSpent={taskTimeMap?.get(task.id)}
                      columns={columns}
                      onMoveToColumn={handleMoveToColumn}
                    />
                  ))}
                </KanbanColumn>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskDialog projectId={projectId} columns={columns} open={createDialogOpen} onOpenChange={setCreateDialogOpen} members={allMembers} />
      <TaskDetailSheet task={selectedTask} projectId={projectId} columns={columns} onClose={() => setSelectedTask(null)} />
      <ColumnManager projectId={projectId} open={columnManagerOpen} onOpenChange={setColumnManagerOpen} />
      <ProjectSettings projectId={projectId} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
