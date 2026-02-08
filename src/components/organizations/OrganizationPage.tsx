import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateOrganization } from '@/hooks/useOrganizations';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { OrganizationSettings } from './OrganizationSettings';
import { TeamAnalyticsPage } from './TeamAnalyticsPage';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Check, Plus, Loader2, Settings, FolderOpen, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationPageProps {
  onSelectProject?: (projectId: string) => void;
}

export const OrganizationPage: React.FC<OrganizationPageProps> = ({ onSelectProject }) => {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();
  const createOrganization = useCreateOrganization();
  const { data: orgProjects, isLoading: projectsLoading } = useProjects(currentOrganization?.id);
  const createProject = useCreateProject();

  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [activeTab, setActiveTab] = useState('projects');

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrg = await createOrganization.mutateAsync({ name: orgName, description: orgDescription });
      setCurrentOrganization(newOrg);
      toast.success('Organization created!');
      setCreateOrgDialogOpen(false);
      setOrgName('');
      setOrgDescription('');
    } catch {
      toast.error('Failed to create organization');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    try {
      await createProject.mutateAsync({
        name: projectName,
        description: projectDescription,
        organizationId: currentOrganization.id,
      });
      toast.success('Project created!');
      setCreateProjectDialogOpen(false);
      setProjectName('');
      setProjectDescription('');
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with org switcher */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Organization</h1>
            <p className="text-muted-foreground">Manage your team, projects and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOrgDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Org
            </Button>
            {currentOrganization && (
              <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Org switcher pills */}
        {organizations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {organizations.map((org) => (
              <Button
                key={org.id}
                variant={currentOrganization?.id === org.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentOrganization(org)}
                className="gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{org.name}</span>
                {currentOrganization?.id === org.id && <Check className="h-3.5 w-3.5" />}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      {currentOrganization ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="projects" className="gap-1.5">
                <FolderOpen className="h-4 w-4" /> Projects
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Analytics
              </TabsTrigger>
            </TabsList>
            {activeTab === 'projects' && (
              <Button size="sm" onClick={() => setCreateProjectDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Project
              </Button>
            )}
          </div>

          <TabsContent value="projects" className="mt-4">
            {projectsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : orgProjects?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create the first project for {currentOrganization.name}.
                  </p>
                  <Button onClick={() => setCreateProjectDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orgProjects?.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={onSelectProject || (() => {})}
                    organizationName={currentOrganization.name}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <TeamAnalyticsPage />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Organization Selected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create or select an organization to get started.
            </p>
            <Button onClick={() => setCreateOrgDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Organization
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Org Dialog */}
      <Dialog open={createOrgDialogOpen} onOpenChange={setCreateOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>Create a new organization to manage projects and team members.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea id="org-description" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} placeholder="What does your organization do?" rows={3} />
            </div>
            <Button type="submit" className="w-full" disabled={createOrganization.isPending}>
              {createOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Create a new project for {currentOrganization?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project Name</Label>
              <Input id="proj-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="New Project" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-description">Description</Label>
              <Textarea id="proj-description" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="What's this project about?" rows={3} />
            </div>
            <Button type="submit" className="w-full" disabled={createProject.isPending}>
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings */}
      {currentOrganization && (
        <OrganizationSettings
          organizationId={currentOrganization.id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
};
