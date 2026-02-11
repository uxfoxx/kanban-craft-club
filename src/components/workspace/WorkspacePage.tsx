import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCreateOrganization } from '@/hooks/useOrganizations';
import { useIsPluginEnabled } from '@/hooks/useOrganizationPlugins';

import { ProjectList } from '@/components/projects/ProjectList';
import { TeamActivityTab } from '@/components/organizations/TeamActivityTab';
import { TeamAnalyticsPage } from '@/components/organizations/TeamAnalyticsPage';
import { OrganizationSettings } from '@/components/organizations/OrganizationSettings';
import { FinancialsTab } from './FinancialsTab';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2, Plus, Settings, FolderOpen, Activity, BarChart3, DollarSign, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkspacePageProps {
  onSelectProject: (projectId: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ onSelectProject }) => {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();
  const createOrganization = useCreateOrganization();
  const expensesEnabled = useIsPluginEnabled(currentOrganization?.id, 'expenses');

  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
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

  return (
    <div className="space-y-6">
      {/* Header: Org switcher + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workspace</h1>
          <p className="text-sm text-muted-foreground">Projects, team, analytics & financials</p>
        </div>
        <div className="flex items-center gap-2">
          {organizations.length > 0 && (
            <Select
              value={currentOrganization?.id || ''}
              onValueChange={(val) => {
                const org = organizations.find(o => o.id === val);
                if (org) setCurrentOrganization(org);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setCreateOrgDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Org
          </Button>
          {currentOrganization && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderOpen className="h-4 w-4" /> Projects
            </TabsTrigger>
            {currentOrganization && (
              <>
                <TabsTrigger value="activity" className="gap-1.5">
                  <Activity className="h-4 w-4" /> Activity
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5">
                  <BarChart3 className="h-4 w-4" /> Analytics
                </TabsTrigger>
                {expensesEnabled && (
                  <TabsTrigger value="financials" className="gap-1.5">
                    <DollarSign className="h-4 w-4" /> Financials
                  </TabsTrigger>
                )}
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="projects" className="mt-4">
          <ProjectList onSelectProject={onSelectProject} />
        </TabsContent>

        {currentOrganization && (
          <>
            <TabsContent value="activity" className="mt-4">
              <TeamActivityTab />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <TeamAnalyticsPage />
            </TabsContent>
            {expensesEnabled && (
              <TabsContent value="financials" className="mt-4">
                <FinancialsTab />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>

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
