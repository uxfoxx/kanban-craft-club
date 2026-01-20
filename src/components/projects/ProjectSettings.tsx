import React from 'react';
import { useProject, useProjectMembers, useUpdateMemberRole, useRemoveProjectMember } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Trash2, Crown, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectSettingsProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  projectId,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: members, isLoading } = useProjectMembers(projectId);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveProjectMember();

  const isOwner = project?.owner_id === user?.id;

  const handleRoleChange = async (memberId: string, role: 'admin' | 'member') => {
    try {
      await updateRole.mutateAsync({ projectId, memberId, role });
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMember.mutateAsync({ projectId, memberId });
      toast.success(`${memberName} has been removed from the project`);
    } catch (error) {
      toast.error('Failed to remove member');
    }
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
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Project Settings</SheetTitle>
          <SheetDescription>
            Manage project members and their roles.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Project Owner</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  <Crown className="h-4 w-4 text-amber-500" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Project Owner</p>
                <p className="text-xs text-muted-foreground">Full access to all settings</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3 text-amber-500" />
                Owner
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Team Members</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member) => {
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

                      {isOwner ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}
                            disabled={updateRole.isPending}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <span className="flex items-center gap-2">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </span>
                              </SelectItem>
                              <SelectItem value="member">
                                <span className="flex items-center gap-2">
                                  <User className="h-3 w-3" />
                                  Member
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {memberName} from this project?
                                  They will lose access to all project tasks and data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id, memberName)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          {getRoleIcon(member.role)}
                          {member.role}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members yet</p>
                <p className="text-xs">Add members using the "Add Member" button</p>
              </div>
            )}
          </div>

          {!isOwner && (
            <p className="text-xs text-muted-foreground text-center">
              Only the project owner can manage member roles.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
