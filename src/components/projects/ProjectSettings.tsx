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
import { formatLKR } from '@/lib/currency';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { SheetPageStack, SectionCard, useSheetPageStack } from '@/components/ui/sheet-page';
import { Loader2, Trash2, Crown, Shield, User, Pencil, Save, XCircle, Building2, Calendar as CalendarIcon, DollarSign, UserCheck, Users, FileSpreadsheet, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsPluginEnabled } from '@/hooks/useOrganizationPlugins';
import { ProjectCostSheet } from './ProjectCostSheet';

interface ProjectSettingsProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectDeleted?: () => void;
}

const TIER_OPTIONS = [
  { value: 'major', label: 'MAJOR', description: 'Production Model (≥ 350K)' },
  { value: 'minor', label: 'MINOR', description: 'Content Model (< 350K)' },
  { value: 'nano', label: 'NANO', description: 'Creator Model (< 100K)' },
];

const CATEGORY_OPTIONS = [
  { value: 'films', label: 'Films' },
  { value: 'photography', label: 'Photography' },
  { value: 'design', label: 'Design' },
  { value: 'tech', label: 'Tech' },
];

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({ projectId, open, onOpenChange, onProjectDeleted }) => {
  const { user } = useAuth();
  const { data: project } = useProject(projectId);
  const { data: orgMembers, isLoading } = useOrganizationMembers(project?.organization_id || undefined);
  const { data: ownerProfile } = useProjectOwner(project?.owner_id);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStartDate, setEditedStartDate] = useState<Date | undefined>();
  const [editedLeadId, setEditedLeadId] = useState<string>('');
  const [editedBudget, setEditedBudget] = useState('');

  const isOwner = project?.owner_id === user?.id;
  const expensesEnabled = useIsPluginEnabled(project?.organization_id, 'expenses');
  const { currentPage, navigateTo, goBack, isRoot, resetTo } = useSheetPageStack();

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getRoleIcon = (role: string) => role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />;

  const startEditing = () => {
    setEditedName(project?.name || '');
    setEditedDescription(project?.description || '');
    setEditedStartDate(project?.start_date ? new Date(project.start_date) : undefined);
    setEditedLeadId(project?.lead_id || '');
    navigateTo('details');
  };

  const handleSaveProject = async () => {
    if (!editedName.trim()) { toast.error('Project name is required'); return; }
    try {
      await updateProject.mutateAsync({ projectId, name: editedName.trim(), description: editedDescription.trim() || undefined, startDate: editedStartDate ? format(editedStartDate, 'yyyy-MM-dd') : null, leadId: editedLeadId === 'none' ? null : editedLeadId || undefined });
      toast.success('Project updated');
      goBack();
    } catch { toast.error('Failed to update project'); }
  };

  const handleSaveBudget = async () => {
    try {
      await updateProject.mutateAsync({ projectId, name: project?.name || '', budget: parseFloat(editedBudget) || 0 });
      toast.success('Budget updated');
      goBack();
    } catch { toast.error('Failed to update budget'); }
  };

  const handleTierChange = async (tier: string) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ projectId, name: project.name, projectTier: tier });
      toast.success('Project tier updated');
    } catch { toast.error('Failed to update tier'); }
  };

  const handleCategoryChange = async (cat: string) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ projectId, name: project.name, projectCategory: cat === 'none' ? null : cat });
      toast.success('Category updated');
    } catch { toast.error('Failed to update category'); }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync({ projectId });
      toast.success('Project deleted');
      onOpenChange(false);
      onProjectDeleted?.();
    } catch { toast.error('Failed to delete project'); }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetTo('main');
    onOpenChange(v);
  };

  // --- Pages ---

  const mainPage = (
    <div className="space-y-6">
      <div className="space-y-2">
        {isOwner && (
          <SectionCard
            icon={<Pencil className="h-4 w-4" />}
            label="Project Details"
            value={<span className="text-xs truncate max-w-[150px]">{project?.name}</span>}
            onClick={startEditing}
          />
        )}

        {/* Owner display */}
        <div className="flex items-center gap-3 p-3 rounded-lg border">
          <Avatar className="h-8 w-8">
            <AvatarImage src={ownerProfile?.avatar_url || undefined} />
            <AvatarFallback>{ownerProfile ? getInitials(ownerProfile.full_name) : <Crown className="h-4 w-4 text-amber-500" />}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ownerProfile?.full_name || 'Loading...'}</p>
            <p className="text-xs text-muted-foreground truncate">{ownerProfile?.email}</p>
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0"><Crown className="h-3 w-3 text-amber-500" /> Owner</Badge>
        </div>

        <SectionCard
          icon={<Users className="h-4 w-4" />}
          label="Team Members"
          value={<span className="text-xs">{orgMembers?.length || 0}</span>}
          onClick={() => navigateTo('members')}
        />

        {expensesEnabled && isOwner && (
          <>
            {/* Tier Selector */}
            <div className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Project Tier</Label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIER_OPTIONS.map(t => (
                  <Button
                    key={t.value}
                    size="sm"
                    variant={project?.project_tier === t.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-2"
                    onClick={() => handleTierChange(t.value)}
                  >
                    <span className="font-bold text-xs">{t.label}</span>
                    <span className="text-[10px] opacity-70 font-normal">{t.description}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Selector (MAJOR only) */}
            {project?.project_tier === 'major' && (
              <div className="p-3 rounded-lg border space-y-2">
                <Label className="text-sm font-medium">Project Category</Label>
                <Select value={project?.project_category || 'none'} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {CATEGORY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <SectionCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Budget"
              value={
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{formatLKR(Number(project?.budget || 0))}</span>
                  {project?.project_tier && (
                    <Badge variant="outline" className={cn("text-[10px] uppercase", {
                      'border-primary text-primary': project.project_tier === 'major',
                      'border-chart-4 text-chart-4': project.project_tier === 'minor',
                      'border-muted-foreground text-muted-foreground': project.project_tier === 'nano',
                    })}>{project.project_tier}</Badge>
                  )}
                </div>
              }
              onClick={() => { setEditedBudget(String(project?.budget || 0)); navigateTo('budget'); }}
            />

            <SectionCard
              icon={<FileSpreadsheet className="h-4 w-4" />}
              label="Cost Sheet"
              value={<span className="text-xs text-muted-foreground">Build cost breakdown</span>}
              onClick={() => navigateTo('costsheet')}
            />
          </>
        )}
      </div>

      {/* Delete */}
      {isOwner && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-4 text-destructive">Danger Zone</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full"><Trash2 className="h-4 w-4 mr-2" /> Delete Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete "{project?.name}" and all its tasks, columns, and data. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Project</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );

  const detailsPage = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Project name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea id="project-description" value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} placeholder="Project description (optional)" rows={3} />
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
              <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => setEditedStartDate(undefined)}>Remove start date</Button></div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      {orgMembers && orgMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Project Lead</Label>
          <Select value={editedLeadId || 'none'} onValueChange={setEditedLeadId}>
            <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No lead</SelectItem>
              {orgMembers.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email || 'Unknown'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSaveProject} disabled={updateProject.isPending}>
          {updateProject.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
        </Button>
        <Button size="sm" variant="outline" onClick={goBack}><XCircle className="h-4 w-4 mr-1" /> Cancel</Button>
      </div>
    </div>
  );

  const membersPage = (
    <div className="space-y-3">
      {!project?.organization_id ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No organization assigned</p>
          <p className="text-xs">Create this project within an organization to add team members</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orgMembers && orgMembers.length > 0 ? (
        <div className="space-y-2">
          {orgMembers.map((member) => {
            const profile = member.profiles;
            const memberName = profile?.full_name || profile?.email || 'Unknown';
            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Avatar className="h-10 w-10"><AvatarImage src={profile?.avatar_url || undefined} /><AvatarFallback>{getInitials(memberName)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{memberName}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
                <Badge variant="outline" className="gap-1">{getRoleIcon(member.role)} {member.role}</Badge>
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
        <p className="text-xs text-muted-foreground text-center mt-4">Manage team members in Organization Settings</p>
      )}
    </div>
  );

  const budgetPage = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Project Budget</Label>
        <Input type="number" value={editedBudget} onChange={(e) => setEditedBudget(e.target.value)} min="0" step="0.01" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSaveBudget} disabled={updateProject.isPending}>
          {updateProject.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
        </Button>
        <Button size="sm" variant="outline" onClick={goBack}>Cancel</Button>
      </div>
    </div>
  );

  const costSheetPage = (
    <ProjectCostSheet projectId={projectId} onBack={goBack} />
  );

  const pages = [
    { id: 'main', title: 'Project Settings', content: mainPage },
    { id: 'details', title: 'Project Details', content: detailsPage },
    { id: 'members', title: 'Team Members', content: membersPage },
    { id: 'budget', title: 'Budget', content: budgetPage },
    { id: 'costsheet', title: 'Cost Sheet', content: costSheetPage },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Project Settings</SheetTitle>
          <SheetDescription>Manage project details and team.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex-1 overflow-y-auto">
          <SheetPageStack pages={pages} currentPage={currentPage} onBack={goBack} isRoot={isRoot} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
