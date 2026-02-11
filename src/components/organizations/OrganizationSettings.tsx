import React, { useState } from 'react';
import { useOrganization, useOrganizationMembers, useUpdateOrganization, useDeleteOrganization, useAddOrganizationMember, useRemoveOrganizationMember, useUpdateOrganizationMemberRole } from '@/hooks/useOrganizations';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization as useOrgContext } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trash2, Crown, Shield, User, Pencil, Save, XCircle, UserPlus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationPlugins, useTogglePlugin } from '@/hooks/useOrganizationPlugins';

interface OrganizationSettingsProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrganizationDeleted?: () => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organizationId,
  open,
  onOpenChange,
  onOrganizationDeleted,
}) => {
  const { user } = useAuth();
  const { setCurrentOrganization } = useOrgContext();
  const { data: organization } = useOrganization(organizationId);
  const { data: members, isLoading } = useOrganizationMembers(organizationId);
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();
  const addMember = useAddOrganizationMember();
  const removeMember = useRemoveOrganizationMember();
  const updateMemberRole = useUpdateOrganizationMemberRole();

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const { data: plugins = [] } = useOrganizationPlugins(organizationId);
  const togglePlugin = useTogglePlugin();

  const AVAILABLE_PLUGINS = [
    {
      name: 'expenses',
      label: 'Expenses & Commissions',
      description: 'Track project budgets, expenses, and team commissions',
      icon: DollarSign,
    },
  ];

  const handleTogglePlugin = async (pluginName: string, enabled: boolean) => {
    try {
      await togglePlugin.mutateAsync({ organizationId, pluginName, enabled });
      toast.success(enabled ? 'Plugin enabled' : 'Plugin disabled');
    } catch {
      toast.error('Failed to update plugin');
    }
  };

  const isOwner = organization?.owner_id === user?.id;
  const currentUserMember = members?.find(m => m.user_id === user?.id);
  const isAdmin = isOwner || currentUserMember?.role === 'admin';

  const handleSaveOrganization = async () => {
    if (!editedName.trim()) {
      toast.error('Organization name is required');
      return;
    }

    try {
      await updateOrganization.mutateAsync({
        organizationId,
        updates: {
          name: editedName.trim(),
          description: editedDescription.trim() || null,
        },
      });
      toast.success('Organization updated');
      setIsEditingOrg(false);
    } catch (error) {
      toast.error('Failed to update organization');
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      await deleteOrganization.mutateAsync(organizationId);
      toast.success('Organization deleted');
      setCurrentOrganization(null);
      onOpenChange(false);
      onOrganizationDeleted?.();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsAddingMember(true);
    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', newMemberEmail.trim())
        .single();

      if (profileError || !profile) {
        toast.error('User not found with that email');
        return;
      }

      // Check if already a member
      if (members?.some(m => m.user_id === profile.user_id)) {
        toast.error('User is already a member');
        return;
      }

      await addMember.mutateAsync({
        organizationId,
        userId: profile.user_id,
        role: newMemberRole,
      });
      toast.success('Member added');
      setNewMemberEmail('');
      setNewMemberRole('member');
    } catch (error) {
      toast.error('Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'member') => {
    try {
      await updateMemberRole.mutateAsync({ memberId, organizationId, role });
      toast.success('Role updated');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeMember.mutateAsync({ memberId, organizationId });
      toast.success(`${memberName} has been removed`);
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const startEditing = () => {
    setEditedName(organization?.name || '');
    setEditedDescription(organization?.description || '');
    setIsEditingOrg(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Organization Settings</SheetTitle>
          <SheetDescription>
            Manage your organization and team members.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Organization Details */}
          {isOwner && (
            <>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Organization Details</h3>
                  {!isEditingOrg && (
                    <Button variant="ghost" size="sm" onClick={startEditing}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                {isEditingOrg ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Name</Label>
                      <Input
                        id="org-name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Organization name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-description">Description</Label>
                      <Textarea
                        id="org-description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Organization description (optional)"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveOrganization} disabled={updateOrganization.isPending}>
                        {updateOrganization.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingOrg(false)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="font-medium">{organization?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {organization?.description || 'No description'}
                    </p>
                  </div>
                )}
              </div>

              <Separator />
            </>
          )}

          {/* Add Member Form */}
          {isAdmin && (
            <div>
              <h3 className="text-sm font-medium mb-4">Add Team Member</h3>
              <form onSubmit={handleAddMember} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={newMemberRole}
                    onValueChange={(v) => setNewMemberRole(v as 'admin' | 'member')}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="sm" disabled={isAddingMember || !newMemberEmail.trim()}>
                  {isAddingMember ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Add Member
                </Button>
              </form>
            </div>
          )}

          <Separator />

          {/* Team Members */}
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
                  const isOwnerMember = organization?.owner_id === member.user_id;
                  const isSelf = member.user_id === user?.id;

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
                        <p className="text-sm font-medium truncate">
                          {memberName}
                          {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.email}
                        </p>
                      </div>

                      {isOwnerMember ? (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="h-3 w-3 text-amber-500" />
                          Owner
                        </Badge>
                      ) : isAdmin && !isSelf ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value as 'admin' | 'member')}
                            disabled={updateMemberRole.isPending}
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
                                  Are you sure you want to remove {memberName} from this organization?
                                  They will lose access to all organization projects.
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
                          {member.role === 'admin' ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
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
              </div>
            )}
          </div>

          {/* Plugins */}
          {isAdmin && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-4">Plugins</h3>
                <div className="space-y-3">
                  {AVAILABLE_PLUGINS.map((plugin) => {
                    const isEnabled = plugins.find(p => p.plugin_name === plugin.name)?.enabled ?? false;
                    const Icon = plugin.icon;
                    return (
                      <Card key={plugin.name}>
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              {plugin.label}
                            </CardTitle>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleTogglePlugin(plugin.name, checked)}
                              disabled={togglePlugin.isPending}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <CardDescription className="text-xs">{plugin.description}</CardDescription>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Delete Organization */}
          {isOwner && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-4 text-destructive">Danger Zone</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Organization
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{organization?.name}" and remove all member associations.
                        Projects will remain but will no longer be associated with this organization.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteOrganization}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Organization
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