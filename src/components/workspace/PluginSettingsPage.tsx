import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationPlugins, useTogglePlugin } from '@/hooks/useOrganizationPlugins';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DollarSign, Puzzle, Settings2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { RateCardSettings } from './RateCardSettings';
import { TierSettings } from './TierSettings';

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
  const [showRateCard, setShowRateCard] = useState(false);
  const [showTiers, setShowTiers] = useState(false);

  const expensesEnabled = plugins.find(p => p.plugin_name === 'expenses')?.enabled ?? false;

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

  if (showRateCard) {
    return <RateCardSettings onBack={() => setShowRateCard(false)} />;
  }

  if (showTiers) {
    return <TierSettings onBack={() => setShowTiers(false)} />;
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

      {expensesEnabled && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Settings2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Rate Card</CardTitle>
                    <CardDescription className="text-xs">Manage commission rates for roles and deliverables per project tier.</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowRateCard(true)}>
                  Manage
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Project Tiers</CardTitle>
                    <CardDescription className="text-xs">Define budget-based tiers that control rate card pricing.</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowTiers(true)}>
                  Manage
                </Button>
              </div>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
};
