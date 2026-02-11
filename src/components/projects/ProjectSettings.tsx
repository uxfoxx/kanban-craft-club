import React, { useState } from 'react';
import { useProject, useProjectOwner, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useOrganizationMembers } from '@/hooks/useOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2, Crown, Shield, User, Pencil, Save, XCircle, Building2, Calendar as CalendarIcon, DollarSign, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsPluginEnabled } from '@/hooks/useOrganizationPlugins';

interface ProjectSettingsProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectDeleted?: () => void;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  projectId,
  open,
  onOpenChange,
  onProjectDeleted,
}) => {
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: orgMembers, isLoading } = useOrganizationMembers(project?.organization_id || undefined);
  const { data: ownerProfile } = useProjectOwner(project?.owner_id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStartDate, setEditedStartDate] = useState<Date | undefined>();
  const [editedLeadId, setEditedLeadId] = useState<string>('');
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [editedBudget, setEditedBudget] = useState('');
  const [editedOverhead, setEditedOverhead] = useState('');
  const [editedCompanyPct, setEditedCompanyPct] = useState('');
  const [editedTeamPct, setEditedTeamPct] = useState('');
  const [editedFinderPct, setEditedFinderPct] = useState('');

  const isOwner = project?.owner_id === user?.id;
  const expensesEnabled = useIsPluginEnabled(project?.organization_id, 'expenses');

  const handleSaveProject = async () => {
    if (!editedName.trim()) {
      toast.error('Project name is required');
      return;
    }
    
    try {
      await updateProject.mutateAsync({
        projectId,
        name: editedName.trim(),
        description: editedDescription.trim() || undefined,
        startDate: editedStartDate ? format(editedStartDate, 'yyyy-MM-dd') : null,
        leadId: editedLeadId === 'none' ? null : editedLeadId || undefined,
      });
      toast.success('Project updated');
      setIsEditingProject(false);
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleSaveFinancials = async () => {
    const company = parseFloat(editedCompanyPct);
    const team = parseFloat(editedTeamPct);
    const finder = parseFloat(editedFinderPct);
    if (Math.abs(company + team + finder - 100) > 0.01) {
      toast.error('Share percentages must sum to 100%');
      return;
    }
    try {
      await updateProject.mutateAsync({
        projectId,
        name: project?.name || '',
        budget: parseFloat(editedBudget) || 0,
        overheadExpenses: parseFloat(editedOverhead) || 0,
        companySharePct: company,
        teamSharePct: team,
        finderCommissionPct: finder,
      });
      toast.success('Financials updated');
      setIsEditingFinancials(false);
    } catch {
      toast.error('Failed to update financials');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync({ projectId });
      toast.success('Project deleted');
      onOpenChange(false);
      onProjectDeleted?.();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const startEditing = () => {
    setEditedName(project?.name || '');
    setEditedDescription(project?.description || '');
    setEditedStartDate(project?.start_date ? new Date(project.start_date) : undefined);
    setIsEditingProject(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Project Settings</SheetTitle>
          <SheetDescription>
            Manage project details. Team members are managed at the organization level.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Project Details */}
          {isOwner && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Project Details</h3>
                  {!isEditingProject && (
                    <Button variant="ghost" size="sm" onClick={startEditing}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {isEditingProject ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Name</Label>
                      <Input
                        id="project-name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Project name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea
                        id="project-description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Project description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editedStartDate && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedStartDate ? format(editedStartDate, 'PPP') : 'Pick a start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={editedStartDate} onSelect={setEditedStartDate} initialFocus />
                          {editedStartDate && (
                            <div className="p-2 border-t">
                              <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => setEditedStartDate(undefined)}>
                                Remove start date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveProject} disabled={updateProject.isPending}>
                        {updateProject.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingProject(false)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="font-medium">{project?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project?.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>
              
              <Separator />
            </>
          )}

          {/* Project Owner */}
          <div>
            <h3 className="text-sm font-medium mb-4">Project Owner</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                <AvatarFallback>
                  {ownerProfile ? getInitials(ownerProfile.full_name) : <Crown className="h-4 w-4 text-amber-500" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{ownerProfile?.full_name || 'Loading...'}</p>
                <p className="text-xs text-muted-foreground">{ownerProfile?.email || 'Full access to all settings'}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3 text-amber-500" />
                Owner
              </Badge>
            </div>
          </div>

          {/* Organization Members */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">Team Members</h3>
              {project?.organization_id && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Building2 className="h-3 w-3" />
                  From Organization
                </Badge>
              )}
            </div>

            {!project?.organization_id ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No organization assigned</p>
                <p className="text-xs">Create this project within an organization to add team members</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orgMembers && orgMembers.length > 0 ? (
              <div className="space-y-2">
                {orgMembers.map((member) => {
                  const profile = member.profiles;
                  const memberName = profile?.full_name || profile?.email || 'Unknown';
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(memberName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{memberName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.email}
                        </p>
                      </div>

                      <Badge variant="outline" className="gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members yet</p>
                <p className="text-xs">Add members via Organization Settings</p>
              </div>
            )}

            {project?.organization_id && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Manage team members in Organization Settings
              </p>
            )}
          </div>

          {/* Delete Project */}
          {isOwner && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-4 text-destructive">Danger Zone</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{project?.name}" and all its tasks, columns, and data.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProject}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Project
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};