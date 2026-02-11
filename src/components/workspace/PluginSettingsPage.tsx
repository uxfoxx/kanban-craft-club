import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationPlugins, useTogglePlugin } from '@/hooks/useOrganizationPlugins';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Puzzle } from 'lucide-react';
import { toast } from 'sonner';

const availablePlugins = [
  {
    name: 'expenses',
    label: 'Expenses & Commissions',
    description: 'Track project budgets, expenses, profit splits, and team commissions. When enabled, all org projects gain financial tracking capabilities.',
    icon: DollarSign,
  },
];

export const PluginSettingsPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: plugins = [] } = useOrganizationPlugins(currentOrganization?.id);
  const togglePlugin = useTogglePlugin();

  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Plugin Settings</h1>
          <p className="text-sm text-muted-foreground">Select an organization to manage plugins</p>
        </div>
      </div>
    );
  }

  const handleToggle = async (pluginName: string, enabled: boolean) => {
    try {
      await togglePlugin.mutateAsync({
        organizationId: currentOrganization.id,
        pluginName,
        enabled,
      });
      toast.success(`${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update plugin');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plugin Settings</h1>
        <p className="text-sm text-muted-foreground">
          Enable or disable modules for <span className="font-medium">{currentOrganization.name}</span>. Enabled plugins apply to all projects in this organization.
        </p>
      </div>

      <div className="grid gap-4">
        {availablePlugins.map(plugin => {
          const current = plugins.find(p => p.plugin_name === plugin.name);
          const isEnabled = current?.enabled ?? false;
          const Icon = plugin.icon;

          return (
            <Card key={plugin.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{plugin.label}</CardTitle>
                      <CardDescription className="text-xs">{plugin.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(plugin.name, checked)}
                    disabled={togglePlugin.isPending}
                  />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
