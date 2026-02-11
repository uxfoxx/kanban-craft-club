import React, { useState } from 'react';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProjectCard } from './ProjectCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FolderOpen, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProjectListProps {
  organizationId?: string;
  onSelectProject: (projectId: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
  const { data: allProjects, isLoading } = useProjects();
  const { organizations } = useOrganization();
  const createProject = useCreateProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('personal');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState('all');

  const orgMap = new Map(organizations.map(o => [o.id, o.name]));

  const personalProjects = allProjects?.filter(p => !p.organization_id) || [];
  const orgProjects = allProjects?.filter(p => !!p.organization_id) || [];

  const displayProjects = activeTab === 'all' ? allProjects
    : activeTab === 'personal' ? personalProjects
    : orgProjects;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync({
        name,
        description,
        organizationId: selectedOrgId === 'personal' ? undefined : selectedOrgId,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      });
      toast.success('Project created!');
      setDialogOpen(false);
      setName('');
      setDescription('');
      setSelectedOrgId('personal');
      setStartDate(undefined);
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your personal and organization projects</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a personal project or assign it to an organization.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Project" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this project about?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createProject.isPending}>
                {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({allProjects?.length || 0})</TabsTrigger>
            <TabsTrigger value="personal">Personal ({personalProjects.length})</TabsTrigger>
            <TabsTrigger value="organization">Org ({orgProjects.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {displayProjects?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayProjects?.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={onSelectProject}
              organizationName={project.organization_id ? orgMap.get(project.organization_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};