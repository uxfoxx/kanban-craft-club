import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateOrganization } from '@/hooks/useOrganizations';
import { OrganizationSettings } from './OrganizationSettings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Check, ChevronDown, Plus, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';

export const OrganizationSwitcher: React.FC = () => {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();
  const createOrganization = useCreateOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newOrg = await createOrganization.mutateAsync({ name, description });
      setCurrentOrganization(newOrg);
      toast.success('Organization created!');
      setDialogOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to create organization');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {currentOrganization?.name || 'Select Organization'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setCurrentOrganization(org)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{org.name}</span>
                {currentOrganization?.id === org.id && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {currentOrganization && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Manage Organization
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            New Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization to manage projects and team members.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your organization do?"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createOrganization.isPending}>
              {createOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {currentOrganization && (
        <OrganizationSettings
          organizationId={currentOrganization.id}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </>
  );
};