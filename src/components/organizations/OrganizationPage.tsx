import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateOrganization } from '@/hooks/useOrganizations';
import { OrganizationSettings } from './OrganizationSettings';
import { TeamAnalyticsPage } from './TeamAnalyticsPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Check, ChevronDown, Plus, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const OrganizationPage: React.FC = () => {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();
  const createOrganization = useCreateOrganization();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrg = await createOrganization.mutateAsync({ name, description });
      setCurrentOrganization(newOrg);
      toast.success('Organization created!');
      setCreateDialogOpen(false);
      setName('');
      setDescription('');
    } catch {
      toast.error('Failed to create organization');
    }
  };

  return (
    <div className="space-y-6">
      {/* Organization Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Organization</h1>
          <p className="text-muted-foreground">Manage your team and view analytics</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Org Switcher Tabs */}
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
                {currentOrganization?.id === org.id && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">New</span>
          </Button>

          {currentOrganization && (
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Team Analytics Content */}
      {currentOrganization ? (
        <TeamAnalyticsPage />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Organization Selected</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create or select an organization to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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

      {/* Organization Settings Sheet */}
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
