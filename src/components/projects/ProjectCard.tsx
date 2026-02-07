import React, { useState } from 'react';
import { Project } from '@/types/database';
import { useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderOpen, MoreVertical, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: Project;
  onSelect: (projectId: string) => void;
  organizationName?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelect, organizationName }) => {
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProject.mutateAsync({ projectId: project.id, name, description });
      toast.success('Project updated!');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync({ projectId: project.id });
      toast.success('Project deleted!');
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  return (
    <>
      <Card className="transition-all hover:shadow-md hover:border-primary/50 relative group">
        <div className="cursor-pointer" onClick={() => onSelect(project.id)}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2 flex-1">
                <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="line-clamp-1">{project.name}</span>
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setName(project.name); setDescription(project.description || ''); setEditDialogOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Organization badge */}
            {organizationName && (
              <Badge variant="secondary" className="w-fit gap-1 text-xs mt-1">
                <Building2 className="h-3 w-3" />
                {organizationName}
              </Badge>
            )}
            <CardDescription className="line-clamp-2">
              {project.description || 'No description'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(project.created_at), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project name and description.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input id="edit-project-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea id="edit-project-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateProject.isPending}>
                {updateProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{project.name}" and all its tasks, subtasks, and time entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
