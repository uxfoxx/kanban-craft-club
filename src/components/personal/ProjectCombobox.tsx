import React, { useState, useRef, useEffect } from 'react';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProjectComboboxProps {
  value: string;
  onChange: (projectId: string) => void;
}

export const ProjectCombobox: React.FC<ProjectComboboxProps> = ({ value, onChange }) => {
  const { data: projects = [] } = useProjects();
  const { currentOrganization } = useOrganization();
  const createProject = useCreateProject();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find(p => p.id === value);

  // Display selected project name when not focused
  useEffect(() => {
    if (!open && selectedProject) {
      setSearch(selectedProject.name);
    } else if (!open && !selectedProject) {
      setSearch('');
    }
  }, [open, selectedProject]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = projects.some(p => p.name.toLowerCase() === search.trim().toLowerCase());
  const showCreateOption = search.trim().length > 0 && !exactMatch;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    try {
      const newProject = await createProject.mutateAsync({
        name: search.trim(),
        organizationId: currentOrganization?.id,
      });
      onChange(newProject.id);
      setOpen(false);
      toast.success(`Project "${search.trim()}" created!`);
    } catch {
      toast.error('Failed to create project');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-[220px]">
      <div className="relative">
        <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Search or create project..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (selectedProject) setSearch('');
          }}
          className="pl-8 pr-3"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md max-h-[200px] overflow-y-auto">
          {filtered.length === 0 && !showCreateOption && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No projects found. Type to create one.
            </div>
          )}

          {filtered.map(project => (
            <button
              key={project.id}
              type="button"
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                value === project.id && 'bg-accent'
              )}
              onClick={() => handleSelect(project.id)}
            >
              <Check className={cn('h-4 w-4 flex-shrink-0', value === project.id ? 'opacity-100' : 'opacity-0')} />
              <span className="truncate">{project.name}</span>
            </button>
          ))}

          {showCreateOption && (
            <>
              {filtered.length > 0 && <div className="border-t" />}
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent text-primary font-medium transition-colors"
                onClick={handleCreate}
                disabled={createProject.isPending}
              >
                {createProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 flex-shrink-0" />
                )}
                <span>Create &ldquo;{search.trim()}&rdquo;</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
