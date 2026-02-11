import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationPlugin } from '@/types/database';

export const useOrganizationPlugins = (organizationId?: string | null) => {
  return useQuery({
    queryKey: ['organization-plugins', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_plugins')
        .select('*')
        .eq('organization_id', organizationId);
      if (error) throw error;
      return (data || []) as OrganizationPlugin[];
    },
    enabled: !!organizationId,
  });
};

export const useIsPluginEnabled = (organizationId?: string | null, pluginName?: string) => {
  const { data: plugins } = useOrganizationPlugins(organizationId);
  return plugins?.find(p => p.plugin_name === pluginName)?.enabled ?? false;
};

export const useTogglePlugin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, pluginName, enabled }: { organizationId: string; pluginName: string; enabled: boolean }) => {
      // Try upsert
      const { data: existing } = await supabase
        .from('organization_plugins')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('plugin_name', pluginName)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('organization_plugins')
          .update({ enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_plugins')
          .insert({ organization_id: organizationId, plugin_name: pluginName, enabled });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['organization-plugins', variables.organizationId] });
    },
  });
};
